/**
 * Main entry point for Dealer Portfolio Early Warning System
 */

require('dotenv').config();
const db = require('./src/data/database');
const { app } = require('./src/api/server');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    console.log('🚀 Initializing Dealer Portfolio Early Warning System...');

    // Initialize database
    console.log('📦 Initializing database...');
    await db.initDatabase();

    // Check if database is empty
    const dealers = await db.getAllDealers();

    if (dealers.length === 0) {
      console.log('📊 Database is empty. Generating synthetic data...');
      const { generateDataset } = require('./src/data/generateSyntheticData');

      const dataset = generateDataset();

      console.log(`   Inserting ${dataset.dealers.length} dealers...`);
      for (const dealer of dataset.dealers) {
        await db.insertDealer(dealer);
      }

      console.log(`   Inserting ${dataset.transactions.length} transactions...`);
      for (const transaction of dataset.transactions) {
        await db.insertTransaction(transaction);
      }

      console.log(`✅ Synthetic data generated: ${dataset.dealers.length} dealers, ${dataset.transactions.length} transactions`);
    } else {
      console.log(`✅ Database loaded: ${dealers.length} dealers found`);
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`\n✨ Server running at http://localhost:${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}`);
      console.log(`🔗 API: http://localhost:${PORT}/api\n`);
      console.log('Available endpoints:');
      console.log('  GET  /api/status                  - Check server status');
      console.log('  GET  /api/dealers                 - Get all dealers');
      console.log('  GET  /api/dealers/:id             - Get dealer details');
      console.log('  POST /api/analyze                 - Run risk analysis');
      console.log('  GET  /api/risk-assessments        - Get all assessments');
      console.log('  GET  /api/risk-assessments/top10  - Get top 10 at-risk dealers');
      console.log('  POST /api/reset                   - Reset and regenerate data\n');
    });
  } catch (error) {
    console.error('❌ Error starting application:', error);
    process.exit(1);
  }
}

start();
