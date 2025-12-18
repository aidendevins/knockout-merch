const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'database.sqlite');

let db = null;

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call init() first.');
  }
  return db;
}

function init() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('📦 Connected to SQLite database');
      createTables().then(resolve).catch(reject);
    });
  });
}

function createTables() {
  return new Promise((resolve, reject) => {
    const queries = [
      // FightStills table
      `CREATE TABLE IF NOT EXISTS fight_stills (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        image_url TEXT NOT NULL,
        round TEXT,
        is_featured INTEGER DEFAULT 0,
        usage_count INTEGER DEFAULT 0,
        created_date TEXT DEFAULT (datetime('now'))
      )`,
      
      // Designs table
      `CREATE TABLE IF NOT EXISTS designs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        design_image_url TEXT NOT NULL,
        mockup_urls TEXT,
        prompt_used TEXT,
        stills_used TEXT,
        canvas_data TEXT,
        is_published INTEGER DEFAULT 0,
        is_featured INTEGER DEFAULT 0,
        price REAL DEFAULT 29.99,
        sales_count INTEGER DEFAULT 0,
        product_type TEXT DEFAULT 'tshirt',
        creator_name TEXT,
        created_date TEXT DEFAULT (datetime('now'))
      )`,
      
      // Orders table
      `CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        design_id TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        customer_name TEXT,
        shipping_address TEXT,
        product_type TEXT,
        size TEXT,
        quantity INTEGER DEFAULT 1,
        total_amount REAL,
        status TEXT DEFAULT 'pending',
        stripe_payment_id TEXT,
        printify_order_id TEXT,
        created_date TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (design_id) REFERENCES designs(id)
      )`
    ];

    let completed = 0;
    queries.forEach(query => {
      db.run(query, (err) => {
        if (err) {
          reject(err);
          return;
        }
        completed++;
        if (completed === queries.length) {
          console.log('✅ Database tables created/verified');
          resolve();
        }
      });
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

module.exports = {
  init,
  getDb,
  run,
  get,
  all
};

