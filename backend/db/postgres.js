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
  // Enable SSL for cloud databases (Railway, AWS RDS, etc. require SSL)
  ssl: process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('amazonaws.com') || process.env.DATABASE_URL.includes('railway.app') || process.env.NODE_ENV === 'production') 
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
    console.error('💡 For cloud databases, ensure SSL is enabled if required.');
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

    // Create users table for authentication (using UUID to match Railway's default)
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on email for fast lookups
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
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

    // Add separate product IDs for T-shirt and Hoodie variants
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'designs' AND column_name = 'printify_tshirt_id') THEN
          ALTER TABLE designs ADD COLUMN printify_tshirt_id VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'designs' AND column_name = 'printify_hoodie_id') THEN
          ALTER TABLE designs ADD COLUMN printify_hoodie_id VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'designs' AND column_name = 'tshirt_mockups') THEN
          ALTER TABLE designs ADD COLUMN tshirt_mockups JSONB DEFAULT '[]'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'designs' AND column_name = 'hoodie_mockups') THEN
          ALTER TABLE designs ADD COLUMN hoodie_mockups JSONB DEFAULT '[]'::jsonb;
        END IF;
      END $$;
    `);

    // Add Pink variant product IDs and mockups columns
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'designs' AND column_name = 'printify_tshirt_pink_id') THEN
          ALTER TABLE designs ADD COLUMN printify_tshirt_pink_id VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'designs' AND column_name = 'printify_hoodie_pink_id') THEN
          ALTER TABLE designs ADD COLUMN printify_hoodie_pink_id VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'designs' AND column_name = 'tshirt_pink_mockups') THEN
          ALTER TABLE designs ADD COLUMN tshirt_pink_mockups JSONB DEFAULT '[]'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'designs' AND column_name = 'hoodie_pink_mockups') THEN
          ALTER TABLE designs ADD COLUMN hoodie_pink_mockups JSONB DEFAULT '[]'::jsonb;
        END IF;
      END $$;
    `);

    // Add available_colors column to track which color variants exist for each design
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'designs' AND column_name = 'available_colors') THEN
          ALTER TABLE designs ADD COLUMN available_colors JSONB DEFAULT '["black", "white", "light-pink"]'::jsonb;
        END IF;
      END $$;
    `);

    // Add user_id column to link designs to users (nullable for backward compatibility)
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'designs' AND column_name = 'user_id') THEN
          ALTER TABLE designs ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Create index on user_id for fast user design lookups
    await query(`
      CREATE INDEX IF NOT EXISTS idx_designs_user_id ON designs(user_id)
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
        remove_background VARCHAR(50) DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add or alter remove_background column to support string values (migrate from boolean)
    await query(`
      DO $$ 
      BEGIN
        -- Check if column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'remove_background') THEN
          -- Column exists - check if it's boolean type and migrate to VARCHAR
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'templates' 
            AND column_name = 'remove_background' 
            AND data_type = 'boolean'
          ) THEN
            -- Convert boolean to VARCHAR: true -> 'remove-simple', false -> NULL
            ALTER TABLE templates 
            ALTER COLUMN remove_background TYPE VARCHAR(50) 
            USING CASE 
              WHEN remove_background = true THEN 'remove-simple' 
              ELSE NULL 
            END;
          END IF;
        ELSE
          -- Column doesn't exist - add it as VARCHAR
          ALTER TABLE templates ADD COLUMN remove_background VARCHAR(50) DEFAULT NULL;
        END IF;
      END $$;
    `);

    // Add is_hidden column if it doesn't exist (for existing databases)
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'is_hidden') THEN
          ALTER TABLE templates ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;
    `);

    // Add printify_product_id column to templates if it doesn't exist
    // This links a template to a Printify product for display on landing page
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'printify_product_id') THEN
          ALTER TABLE templates ADD COLUMN printify_product_id VARCHAR(255) DEFAULT NULL;
        END IF;
      END $$;
    `);

    // Add canvas_config column for template-specific positioning rules
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'canvas_config') THEN
          ALTER TABLE templates ADD COLUMN canvas_config JSONB DEFAULT NULL;
        END IF;
      END $$;
    `);

    // Add text_behavior column for text/fabric color compatibility rules
    // Values: 'none', 'static-light', 'static-dark', 'user-controlled'
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'text_behavior') THEN
          ALTER TABLE templates ADD COLUMN text_behavior VARCHAR(50) DEFAULT 'none';
        END IF;
      END $$;
    `);

    // Note: example_image is now uploaded via admin panel and stored in S3 examples folder
    // The static files in /frontend/public/templates/ are legacy and no longer used

    // Set Retro Name Portrait positioning from Printify reference
    // Based on Printify measurements:
    //   Print area: 13.17" wide × 16" tall
    //   Design size: 12.93" wide × 14.72" tall
    //   Position: left 0.91%, top 2%
    // 
    // COORDINATE SYSTEM MAPPING (1:1 with Printify):
    // - width_scale = design_width / print_area_width = 12.93 / 13.17 = 0.9818
    // - height_scale = design_height / print_area_height = 14.72 / 16 = 0.9200
    // - x_offset = position_left = 0.0091 (0.91% from left edge of print area, moving right)
    // - y_offset = position_top = 0.02 (2% from top edge of print area, moving down)
    const retroConfigResult = await query(`
      UPDATE templates 
      SET canvas_config = '{"width_scale": 0.9818, "height_scale": 0.9200, "x_offset": 0.0091, "y_offset": 0.02, "rotation": 0}'::jsonb
      WHERE id = 'retro-name-portrait'
      RETURNING id, canvas_config
    `);
    if (retroConfigResult.rows && retroConfigResult.rows.length > 0) {
      console.log('✅ Retro Name Portrait template canvas_config set:', retroConfigResult.rows[0].canvas_config);
    } else {
      console.warn('⚠️  Retro Name Portrait template not found - canvas_config not set');
    }

    // Update Photo Collage template cover image to local file
    // This runs automatically on deployment to set the cover image
    await query(`
      UPDATE templates 
      SET example_image = '/templates/photo_collage_cover.png'
      WHERE id = 'photo-collage' 
      AND (example_image IS NULL OR example_image != '/templates/photo_collage_cover.png')
    `);

    // Set Photo Collage positioning from Printify reference
    // Using SAME dimensions as Retro Name Portrait, but CLOSER to top
    // Based on Printify measurements:
    //   Print area: 13.17" wide × 16" tall
    //   Design size: 12.93" wide × 14.72" tall
    //   Position: left 0.91%, top 0.5%
    // 
    // COORDINATE SYSTEM MAPPING (1:1 with Printify):
    // - width_scale = design_width / print_area_width = 12.93 / 13.17 = 0.9818
    // - height_scale = design_height / print_area_height = 14.72 / 16 = 0.9200
    // - x_offset = position_left = 0.0091 (0.91% from left edge of print area, moving right)
    // - y_offset = position_top = 0.005 (0.5% from top edge of print area, moving down)
    const photoCollageConfigResult = await query(`
      UPDATE templates 
      SET canvas_config = '{"width_scale": 0.9818, "height_scale": 0.9200, "x_offset": 0.0091, "y_offset": 0.005, "rotation": 0}'::jsonb
      WHERE id = 'photo-collage'
      RETURNING id, canvas_config
    `);
    if (photoCollageConfigResult.rows && photoCollageConfigResult.rows.length > 0) {
      console.log('✅ Photo Collage template canvas_config set:', photoCollageConfigResult.rows[0].canvas_config);
    } else {
      console.warn('⚠️  Photo Collage template not found - canvas_config not set');
    }

    // Update Romantic Save-the-Date template cover image to local file
    // This runs automatically on deployment to set the cover image
    await query(`
      UPDATE templates 
      SET example_image = '/templates/romantic_cover.webp'
      WHERE id = 'romantic-save-the-date' 
      AND (example_image IS NULL OR example_image != '/templates/romantic_cover.webp')
    `);

    // Set Romantic Save-the-Date positioning from Printify reference
    // SMALL DESIGN positioned in TOP RIGHT corner
    // Based on Printify measurements:
    //   Print area: 13.17" wide × 16" tall
    //   Design size: 4.19" wide × 4.77" tall (small - about 31% of print area)
    //   Position: left 66.94%, top 3.02% (TOP RIGHT CORNER placement)
    // 
    // COORDINATE SYSTEM MAPPING (1:1 with Printify):
    // - width_scale = design_width / print_area_width = 4.19 / 13.17 = 0.3181
    // - height_scale = design_height / print_area_height = 4.77 / 16 = 0.2981
    // - x_offset = position_left = 0.6694 (66.94% from left edge - positioned to the right!)
    // - y_offset = position_top = 0.0302 (3.02% from top edge - very close to top)
    const romanticConfigResult = await query(`
      UPDATE templates 
      SET canvas_config = '{"width_scale": 0.3181, "height_scale": 0.2981, "x_offset": 0.6694, "y_offset": 0.0302, "rotation": 0}'::jsonb
      WHERE id = 'romantic-save-the-date'
      RETURNING id, canvas_config
    `);
    if (romanticConfigResult.rows && romanticConfigResult.rows.length > 0) {
      console.log('✅ Romantic Save-the-Date template canvas_config set:', romanticConfigResult.rows[0].canvas_config);
    } else {
      console.warn('⚠️  Romantic Save-the-Date template not found - canvas_config not set');
    }

    // Update Minimalist Line Art template cover image to local file
    // This runs automatically on deployment to set the cover image
    await query(`
      UPDATE templates 
      SET example_image = '/templates/minimalist_cover.webp'
      WHERE id = 'minimalist-line-art' 
      AND (example_image IS NULL OR example_image != '/templates/minimalist_cover.webp')
    `);

    // Set Minimalist Line Art positioning from Printify reference
    // Using SAME dimensions and position as Romantic Save-the-Date
    // SMALL DESIGN positioned in TOP RIGHT corner
    // Based on Printify measurements:
    //   Print area: 13.17" wide × 16" tall
    //   Design size: 4.19" wide × 4.77" tall (small - about 31% of print area)
    //   Position: left 66.94%, top 3.02% (TOP RIGHT CORNER placement)
    // 
    // COORDINATE SYSTEM MAPPING (1:1 with Printify):
    // - width_scale = design_width / print_area_width = 4.19 / 13.17 = 0.3181
    // - height_scale = design_height / print_area_height = 4.77 / 16 = 0.2981
    // - x_offset = position_left = 0.6694 (66.94% from left edge - positioned to the right!)
    // - y_offset = position_top = 0.0302 (3.02% from top edge - very close to top)
    const minimalistConfigResult = await query(`
      UPDATE templates 
      SET canvas_config = '{"width_scale": 0.3181, "height_scale": 0.2981, "x_offset": 0.6694, "y_offset": 0.0302, "rotation": 0}'::jsonb
      WHERE id = 'minimalist-line-art'
      RETURNING id, canvas_config
    `);
    if (minimalistConfigResult.rows && minimalistConfigResult.rows.length > 0) {
      console.log('✅ Minimalist Line Art template canvas_config set:', minimalistConfigResult.rows[0].canvas_config);
    } else {
      console.warn('⚠️  Minimalist Line Art template not found - canvas_config not set');
    }

    // Set Polaroid Ransom Note positioning from Printify reference
    // Based on Printify measurements:
    //   Print area: 13.17" wide × 16" tall
    //   Design size: 12.16" wide × 13.93" tall
    //   Position: left 3.84%, top 6.48%
    // 
    // COORDINATE SYSTEM MAPPING (1:1 with Printify):
    // - width_scale = design_width / print_area_width = 12.16 / 13.17 = 0.9233
    // - height_scale = design_height / print_area_height = 13.93 / 16 = 0.8706
    // - x_offset = position_left = 0.0384 (3.84% from left edge of print area, moving right)
    // - y_offset = position_top = 0.0648 (6.48% from top edge of print area, moving down)
    const polaroidConfigResult = await query(`
      UPDATE templates 
      SET canvas_config = '{"width_scale": 0.9233, "height_scale": 0.8706, "x_offset": 0.0384, "y_offset": 0.0648, "rotation": 0}'::jsonb
      WHERE id = 'polaroid-ransom-note'
      RETURNING id, canvas_config
    `);
    if (polaroidConfigResult.rows && polaroidConfigResult.rows.length > 0) {
      console.log('✅ Polaroid template canvas_config set:', polaroidConfigResult.rows[0].canvas_config);
    } else {
      console.warn('⚠️  Polaroid template not found - canvas_config not set');
    }

    // Update Couple Portrait template cover image to local file
    // This runs automatically on deployment to set the cover image
    await query(`
      UPDATE templates 
      SET example_image = '/templates/couple_portrait_cover.png'
      WHERE id = 'couple-portrait' 
      AND (example_image IS NULL OR example_image != '/templates/couple_portrait_cover.png')
    `);

    // Set Couple Portrait positioning
    // Based on hand-drawn couple portrait design requirements:
    //   Print area: 13.17" wide × 16" tall
    //   Design size: 12.1" wide × 13.92" tall (large portrait - similar to polaroid)
    //   Position: left 4%, top 2% (centered horizontally with minimal top margin)
    // 
    // COORDINATE SYSTEM MAPPING:
    // - width_scale = design_width / print_area_width = 12.1 / 13.17 = 0.92
    // - height_scale = design_height / print_area_height = 13.92 / 16 = 0.87
    // - x_offset = position_left = 0.04 (4% from left edge of print area, moving right)
    // - y_offset = position_top = 0.02 (2% from top edge of print area, moving down)
    const couplePortraitConfigResult = await query(`
      UPDATE templates 
      SET canvas_config = '{"width_scale": 0.92, "height_scale": 0.87, "x_offset": 0.04, "y_offset": 0.02, "rotation": 0}'::jsonb
      WHERE id = 'couple-portrait'
      RETURNING id, canvas_config
    `);
    if (couplePortraitConfigResult.rows && couplePortraitConfigResult.rows.length > 0) {
      console.log('✅ Couple Portrait template canvas_config set:', couplePortraitConfigResult.rows[0].canvas_config);
    } else {
      console.warn('⚠️  Couple Portrait template not found - canvas_config not set');
    }

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

