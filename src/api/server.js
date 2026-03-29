/**
 * Express API Server
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('../data/database');
const riskEngine = require('../engine/riskEngine');
const { Anthropic } = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize LLM client (may be null if no key)
let llmClient = null;
const apiKey = process.env.LLM_API_KEY || process.env.ANTHROPIC_API_KEY;
if (apiKey) {
  llmClient = new Anthropic({ apiKey });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

/**
 * Generate LLM-based explanation for flagged dealers.
 *
 * WHY AI HERE (not deterministic):
 *   The deterministic explanation (generateExplanation) lists which signals fired.
 *   But ops teams need synthesized, actionable context — e.g., "this combination of
 *   DPO + order decline suggests the dealer may be losing their customer base, not
 *   just having a cash flow issue." An LLM can reason about signal interactions and
 *   suggest next steps in natural language. This is a presentation layer enhancement,
 *   not a scoring decision — the tier/score are fully deterministic.
 *
 * WHY HAIKU (not Opus):
 *   This is a summarization task on structured data. A smaller/cheaper model is
 *   sufficient and fast enough for batch analysis of 10-20 flagged dealers.
 *   A larger model would be appropriate for complex reasoning (e.g., anomaly
 *   detection on raw time series), not for reformatting structured signals.
 */
async function generateLLMExplanation(dealer, assessment) {
  if (!llmClient) return null;

  const { metrics, signals, defaultProbability } = assessment;

  const prompt = `You are a financial risk analyst for an NBFC (non-banking financial company).
Analyze this dealer's financial signals and provide a brief, actionable explanation for ops teams.

Dealer: ${dealer.name}
Profile: ${dealer.profile}
Sanctioned Limit: ₹${(dealer.sanctionedLimit / 100000).toFixed(1)}L
30-Day Default Probability: ${(defaultProbability * 100).toFixed(1)}%

Current Metrics:
- Days Payable Outstanding: ${metrics.daysPayableOutstanding} days
- DPO Velocity (month-over-month): ${metrics.dpoVelocity > 0 ? '+' : ''}${Math.round(metrics.dpoVelocity || 0)} days
- Loan Utilization: ${(metrics.utilization * 100).toFixed(1)}%
- Recent Order Value: ₹${Math.round(metrics.totalOrderValue || 0)}
- Payments This Month: ₹${Math.round(metrics.paymentReceived || 0)}
- Payment Coverage (vs EMI): ${((metrics.paymentCoverage || 0) * 100).toFixed(0)}%
- Order Decline (seasonal-adjusted): ${((metrics.seasonalAdjustedOrderDecline || 0) * 100).toFixed(1)}%

Risk Signals:
- DPO Status: ${signals.dpo || 'N/A'}
- DPO Velocity: ${signals.dpoVelocity || 'N/A'}
- Utilization Status: ${signals.utilization || 'N/A'}
- Late Payment Status: ${signals.latePayments || 'N/A'}
- Payment Coverage: ${signals.paymentCoverage || 'N/A'}
- Order Trend: ${signals.orderTrend || 'N/A'}
- Order Volatility: ${signals.volatility || 'N/A'}

Provide a 2-3 sentence explanation suitable for an operations team deciding whether to call this dealer.
Focus on the most critical signals and what they mean together (not separately).
End with a recommended action.`;

  try {
    const message = await llmClient.messages.create({
      model: process.env.LLM_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return message.content[0].type === 'text' ? message.content[0].text : null;
  } catch (error) {
    console.error('LLM explanation failed (non-fatal):', error.message);
    return null;
  }
}

/**
 * Run risk analysis on all dealers
 */
async function runRiskAnalysis() {
  const dealers = await db.getAllDealers();
  const assessments = [];

  for (const dealer of dealers) {
    const transactions = await db.getDealerTransactions(dealer.id);
    const assessment = riskEngine.analyzeDealerRisk(dealer, transactions);
    assessment.explanation = riskEngine.generateExplanation(assessment);

    // Generate LLM explanation for CRITICAL and AT_RISK dealers
    if (assessment.tier === 'CRITICAL' || assessment.tier === 'AT_RISK') {
      const llmExplanation = await generateLLMExplanation(dealer, assessment);
      if (llmExplanation) {
        assessment.llmExplanation = llmExplanation;
      }
    }

    await db.upsertRiskAssessment(assessment);
    assessments.push(assessment);
  }

  return assessments;
}

/**
 * GET /api/status - Server status
 */
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    llmAvailable: !!llmClient,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/dealers - Get all dealers
 */
app.get('/api/dealers', async (req, res) => {
  try {
    const dealers = await db.getAllDealers();
    res.json({ success: true, count: dealers.length, data: dealers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/dealers/:id - Get dealer details
 */
app.get('/api/dealers/:id', async (req, res) => {
  try {
    const dealer = await db.getDealerById(req.params.id);
    if (!dealer) {
      return res.status(404).json({ success: false, error: 'Dealer not found' });
    }

    const transactions = await db.getDealerTransactions(req.params.id);
    res.json({ success: true, data: { dealer, transactions } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/analyze - Run risk analysis
 */
app.post('/api/analyze', async (req, res) => {
  try {
    console.log('Starting risk analysis...');
    const assessments = await runRiskAnalysis();

    // Top 10 by 30-day default probability (the actual "most likely to default" ranking)
    const top10 = assessments
      .filter(a => a.tier !== 'HEALTHY' && a.tier !== 'UNKNOWN')
      .sort((a, b) => b.defaultProbability - a.defaultProbability || b.tierScore - a.tierScore)
      .slice(0, 10);

    console.log(`Analysis complete: ${assessments.length} dealers, ${top10.length} flagged in top 10`);

    res.json({
      success: true,
      totalDealers: assessments.length,
      flaggedCount: assessments.filter(a => a.tier !== 'HEALTHY' && a.tier !== 'UNKNOWN').length,
      top10
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/risk-assessments - Get latest risk assessments
 */
app.get('/api/risk-assessments', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const assessments = await db.getRiskAssessments(limit);

    // Group by tier
    const byTier = {
      CRITICAL: assessments.filter(a => a.tier === 'CRITICAL'),
      AT_RISK: assessments.filter(a => a.tier === 'AT_RISK'),
      WATCH: assessments.filter(a => a.tier === 'WATCH'),
      HEALTHY: assessments.filter(a => a.tier === 'HEALTHY')
    };

    res.json({
      success: true,
      count: assessments.length,
      byTier,
      all: assessments
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/risk-assessments/top10 - Get top 10 dealers most likely to default in next 30 days
 */
app.get('/api/risk-assessments/top10', async (req, res) => {
  try {
    const assessments = await db.getRiskAssessments();
    const top10 = assessments
      .filter(a => a.tier === 'CRITICAL' || a.tier === 'AT_RISK' || a.tier === 'WATCH')
      .sort((a, b) => (b.defaultProbability || 0) - (a.defaultProbability || 0) || b.tierScore - a.tierScore)
      .slice(0, 10);

    res.json({
      success: true,
      count: top10.length,
      data: top10
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/reset - Reset database and regenerate data
 */
app.post('/api/reset', async (req, res) => {
  try {
    const { generateDataset } = require('../data/generateSyntheticData');

    console.log('Resetting database...');
    await db.resetDatabase();

    console.log('Generating synthetic data...');
    const dataset = generateDataset();

    console.log(`Inserting ${dataset.dealers.length} dealers...`);
    for (const dealer of dataset.dealers) {
      await db.insertDealer(dealer);
    }

    console.log(`Inserting ${dataset.transactions.length} transactions...`);
    for (const transaction of dataset.transactions) {
      await db.insertTransaction(transaction);
    }

    res.json({
      success: true,
      message: 'Database reset and synthetic data generated',
      dealers: dataset.dealers.length,
      transactions: dataset.transactions.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve React app for all non-API routes
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

module.exports = { app, runRiskAnalysis };
