const { Pool } = require('pg');

// Debug: Check if DATABASE_URL is loaded
console.log('🔍 DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set! Check your environment variables.');
}

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Enable SSL for Neon and other cloud databases (they require SSL)
  ssl: process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('neon.tech') || process.env.DATABASE_URL.includes('amazonaws.com') || process.env.NODE_ENV === 'production') 
    ? { rejectUnauthorized: false } 
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased timeout for network issues
});

// Test connection
pool.on('connect', () => {
  console.log('📦 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Query helper
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
}

// Get single row
async function get(text, params) {
  const res = await query(text, params);
  return res.rows[0] || null;
}

// Get all rows
async function all(text, params) {
  const res = await query(text, params);
  return res.rows;
}

// Initialize database tables
async function init() {
  console.log('🔄 Initializing database tables...');
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set! Cannot initialize database.');
    console.error('💡 Set DATABASE_URL in your .env file or environment variables.');
    throw new Error('DATABASE_URL is not configured');
  }
  
  // Test connection first
  try {
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('💡 Check your DATABASE_URL and network connectivity.');
    console.error('💡 For Neon databases, ensure SSL is enabled.');
    throw error;
  }
  
  try {
    // Create fight_stills table
    await query(`
      CREATE TABLE IF NOT EXISTS fight_stills (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        image_url TEXT NOT NULL,
        round VARCHAR(50),
        is_featured BOOLEAN DEFAULT FALSE,
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create designs table
    await query(`
      CREATE TABLE IF NOT EXISTS designs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        design_image_url TEXT NOT NULL,
        mockup_urls JSONB DEFAULT '[]'::jsonb,
        printify_product_id VARCHAR(255),
        printify_blueprint_id INTEGER,
        prompt_used TEXT,
        stills_used JSONB DEFAULT '[]'::jsonb,
        canvas_data JSONB DEFAULT '{}'::jsonb,
        is_published BOOLEAN DEFAULT FALSE,
        is_featured BOOLEAN DEFAULT FALSE,
        price DECIMAL(10,2) DEFAULT 29.99,
        sales_count INTEGER DEFAULT 0,
        product_type VARCHAR(50) DEFAULT 'tshirt',
        color VARCHAR(20) DEFAULT 'black',
        creator_name VARCHAR(255),
        creator_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add color column if it doesn't exist (for existing databases)
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'designs' AND column_name = 'color') THEN
          ALTER TABLE designs ADD COLUMN color VARCHAR(20) DEFAULT 'black';
        END IF;
      END $$;
    `);

    // Create orders table
    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        design_id UUID NOT NULL REFERENCES designs(id),
        printify_order_id VARCHAR(255),
        stripe_payment_id VARCHAR(255),
        stripe_session_id VARCHAR(255),
        customer_email VARCHAR(255) NOT NULL,
        customer_name VARCHAR(255),
        shipping_address JSONB,
        product_type VARCHAR(50),
        color VARCHAR(20) DEFAULT 'black',
        size VARCHAR(10),
        quantity INTEGER DEFAULT 1,
        total_amount DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add color column to orders if it doesn't exist (for existing databases)
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'color') THEN
          ALTER TABLE orders ADD COLUMN color VARCHAR(20) DEFAULT 'black';
        END IF;
      END $$;
    `);

    // Create users table (optional, for Firebase auth)
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        firebase_uid VARCHAR(255) UNIQUE,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create templates table for Valentine's Day merch templates
    await query(`
      CREATE TABLE IF NOT EXISTS templates (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        example_image TEXT,
        reference_image TEXT,
        prompt TEXT,
        panel_schema JSONB DEFAULT '{}'::jsonb,
        upload_tips JSONB DEFAULT '{}'::jsonb,
        max_photos INTEGER DEFAULT 6,
        gradient VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add template_id to designs table if it doesn't exist
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'designs' AND column_name = 'template_id') THEN
          ALTER TABLE designs ADD COLUMN template_id VARCHAR(50) REFERENCES templates(id);
        END IF;
      END $$;
    `);

    // Create indexes for better performance
    await query(`CREATE INDEX IF NOT EXISTS idx_designs_published ON designs(is_published)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_designs_featured ON designs(is_featured)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_designs_sales ON designs(sales_count DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_orders_design ON orders(design_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_stills_featured ON fight_stills(is_featured)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_designs_template ON designs(template_id)`);

    console.log('✅ Database tables created/verified');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Close pool (for graceful shutdown)
async function close() {
  await pool.end();
  console.log('Database pool closed');
}

module.exports = {
  query,
  get,
  all,
  init,
  close,
  pool
};

