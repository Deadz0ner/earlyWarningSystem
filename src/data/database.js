/**
 * Database initialization and management
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/portfolio.db');

let db = null;

const SCHEMA_SQL = {
  dealers: `
    CREATE TABLE IF NOT EXISTS dealers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      anchorId TEXT NOT NULL,
      profile TEXT NOT NULL,
      sanctionedLimit REAL NOT NULL,
      baselineDPO REAL NOT NULL,
      defaultRisk REAL NOT NULL,
      createdAt TEXT NOT NULL
    )
  `,
  transactions: `
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dealerId INTEGER NOT NULL,
      month TEXT NOT NULL,
      year INTEGER NOT NULL,
      monthIndex INTEGER NOT NULL,
      sanctionedLimit REAL NOT NULL,
      currentBalance REAL NOT NULL,
      utilization REAL NOT NULL,
      orderCount INTEGER NOT NULL,
      totalOrderValue REAL NOT NULL,
      avgOrderValue REAL NOT NULL,
      daysPayableOutstanding INTEGER NOT NULL,
      expectedMonthlyEMI REAL NOT NULL,
      paymentReceived REAL NOT NULL,
      latePaymentCount INTEGER NOT NULL,
      isLatePayment BOOLEAN NOT NULL,
      isDefault BOOLEAN NOT NULL,
      FOREIGN KEY (dealerId) REFERENCES dealers(id)
    )
  `,
  risk_assessments: `
    CREATE TABLE IF NOT EXISTS risk_assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dealerId INTEGER NOT NULL UNIQUE,
      dealerName TEXT NOT NULL,
      anchorId TEXT NOT NULL,
      profile TEXT NOT NULL,
      tier TEXT NOT NULL,
      tierScore INTEGER NOT NULL,
      defaultProbability REAL DEFAULT 0,
      metrics TEXT NOT NULL,
      signals TEXT NOT NULL,
      explanation TEXT,
      llmExplanation TEXT,
      analyzedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dealerId) REFERENCES dealers(id)
    )
  `
};

/**
 * Initialize database and create tables
 */
function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.serialize(() => {
        db.run(SCHEMA_SQL.dealers);
        db.run(SCHEMA_SQL.transactions);
        db.run(SCHEMA_SQL.risk_assessments, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(db);
          }
        });
      });
    });
  });
}

/**
 * Get database connection
 */
function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Insert dealer
 */
function insertDealer(dealer) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.run(
      `INSERT INTO dealers (id, name, anchorId, profile, sanctionedLimit, baselineDPO, defaultRisk, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [dealer.id, dealer.name, dealer.anchorId, dealer.profile, dealer.sanctionedLimit, dealer.baselineDPO, dealer.defaultRisk, dealer.createdAt],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

/**
 * Insert transaction
 */
function insertTransaction(transaction) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.run(
      `INSERT INTO transactions (dealerId, month, year, monthIndex, sanctionedLimit, currentBalance, utilization,
                                 orderCount, totalOrderValue, avgOrderValue, daysPayableOutstanding, expectedMonthlyEMI,
                                 paymentReceived, latePaymentCount, isLatePayment, isDefault)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [transaction.dealerId, transaction.month, transaction.year, transaction.monthIndex, transaction.sanctionedLimit,
       transaction.currentBalance, transaction.utilization, transaction.orderCount, transaction.totalOrderValue,
       transaction.avgOrderValue, transaction.daysPayableOutstanding, transaction.expectedMonthlyEMI,
       transaction.paymentReceived, transaction.latePaymentCount, transaction.isLatePayment ? 1 : 0, transaction.isDefault ? 1 : 0],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

/**
 * Get all dealers
 */
function getAllDealers() {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.all('SELECT * FROM dealers ORDER BY id', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Get dealer by ID
 */
function getDealerById(dealerId) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.get('SELECT * FROM dealers WHERE id = ?', [dealerId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Get transactions for dealer
 */
function getDealerTransactions(dealerId) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.all('SELECT * FROM transactions WHERE dealerId = ? ORDER BY monthIndex', [dealerId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

/**
 * Upsert risk assessment — keyed on dealerId (UNIQUE constraint)
 * Uses INSERT OR REPLACE so re-running analysis updates existing rows
 */
function upsertRiskAssessment(assessment) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const metricsJson = JSON.stringify(assessment.metrics);
    const signalsJson = JSON.stringify(assessment.signals);

    db.run(
      `INSERT INTO risk_assessments (dealerId, dealerName, anchorId, profile, tier, tierScore, defaultProbability, metrics, signals, explanation, llmExplanation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(dealerId) DO UPDATE SET
         dealerName = excluded.dealerName,
         anchorId = excluded.anchorId,
         profile = excluded.profile,
         tier = excluded.tier,
         tierScore = excluded.tierScore,
         defaultProbability = excluded.defaultProbability,
         metrics = excluded.metrics,
         signals = excluded.signals,
         explanation = excluded.explanation,
         llmExplanation = excluded.llmExplanation,
         analyzedAt = CURRENT_TIMESTAMP`,
      [assessment.dealerId, assessment.dealerName, assessment.anchorId, assessment.profile,
       assessment.tier, assessment.tierScore, assessment.defaultProbability || 0,
       metricsJson, signalsJson, assessment.explanation, assessment.llmExplanation || null],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

/**
 * Get risk assessments (sorted by tier score)
 * Uses parameterized query to prevent SQL injection
 */
function getRiskAssessments(limit = null) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    let query = `SELECT * FROM risk_assessments ORDER BY tierScore DESC, analyzedAt DESC`;
    const params = [];

    if (limit) {
      query += ` LIMIT ?`;
      params.push(parseInt(limit, 10));
    }

    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else {
        const parsed = (rows || []).map(row => ({
          ...row,
          metrics: JSON.parse(row.metrics),
          signals: JSON.parse(row.signals)
        }));
        resolve(parsed);
      }
    });
  });
}

/**
 * Clear all data and reinitialize
 */
async function resetDatabase() {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.serialize(() => {
      db.run('DROP TABLE IF EXISTS risk_assessments');
      db.run('DROP TABLE IF EXISTS transactions');
      db.run('DROP TABLE IF EXISTS dealers', (err) => {
        if (err) {
          reject(err);
        } else {
          db.run(SCHEMA_SQL.dealers);
          db.run(SCHEMA_SQL.transactions);
          db.run(SCHEMA_SQL.risk_assessments, (err) => {
            if (err) reject(err);
            else resolve();
          });
        }
      });
    });
  });
}

module.exports = {
  initDatabase,
  getDatabase,
  insertDealer,
  insertTransaction,
  getAllDealers,
  getDealerById,
  getDealerTransactions,
  upsertRiskAssessment,
  getRiskAssessments,
  resetDatabase
};
