require('dotenv').config();
const db = require('../db/postgres');

const studioDesigns = [
  {
    title: 'Valentine\'s Love',
    design_image_url: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&h=800&fit=crop',
    mockup_urls: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=800&fit=crop'],
    product_type: 'tshirt',
    prompt_used: 'Bold Valentine\'s Day typography with hearts and love theme',
    creator_name: 'Studio',
    is_published: false,
    is_featured: false,
    price: 19.99,
    sales_count: 0
  },
  {
    title: 'Ring Warrior',
    design_image_url: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&h=800&fit=crop&sat=-100',
    mockup_urls: ['https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&h=800&fit=crop'],
    product_type: 'hoodie',
    prompt_used: 'Vintage boxing ring illustration with dramatic lighting',
    creator_name: 'Studio',
    is_published: false,
    is_featured: false,
    price: 29.99,
    sales_count: 0
  },
  {
    title: 'Gloves Up',
    design_image_url: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=800&h=800&fit=crop',
    mockup_urls: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=800&fit=crop'],
    product_type: 'tshirt',
    prompt_used: 'Minimalist boxing gloves with bold text',
    creator_name: 'Studio',
    is_published: false,
    is_featured: false,
    price: 19.99,
    sales_count: 0
  },
  {
    title: 'Fight Night',
    design_image_url: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&h=800&fit=crop&brightness=0.8',
    mockup_urls: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=800&fit=crop'],
    product_type: 'tshirt',
    prompt_used: 'Gritty fight night poster style design',
    creator_name: 'Studio',
    is_published: false,
    is_featured: false,
    price: 19.99,
    sales_count: 0
  },
  {
    title: 'Champion Status',
    design_image_url: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=800&h=800&fit=crop&sat=-50',
    mockup_urls: ['https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&h=800&fit=crop'],
    product_type: 'hoodie',
    prompt_used: 'Championship belt with bold typography',
    creator_name: 'Studio',
    is_published: false,
    is_featured: false,
    price: 29.99,
    sales_count: 0
  },
  {
    title: 'The Underdog',
    design_image_url: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&h=800&fit=crop&hue=180',
    mockup_urls: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=800&fit=crop'],
    product_type: 'tshirt',
    prompt_used: 'Underdog fighter rising up, dramatic silhouette',
    creator_name: 'Studio',
    is_published: false,
    is_featured: false,
    price: 19.99,
    sales_count: 0
  }
];

async function seedStudioDesigns() {
  try {
    console.log('🌱 Seeding studio designs...');
    
    for (const design of studioDesigns) {
      const result = await db.query(
        `INSERT INTO designs 
         (title, design_image_url, mockup_urls, product_type, prompt_used, 
          creator_name, is_published, is_featured, price, sales_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, title`,
        [
          design.title,
          design.design_image_url,
          JSON.stringify(design.mockup_urls),
          design.product_type,
          design.prompt_used,
          design.creator_name,
          design.is_published,
          design.is_featured,
          design.price,
          design.sales_count
        ]
      );
      
      console.log(`✅ Created: ${result.rows[0].title} (${result.rows[0].id})`);
    }
    
    console.log('🎉 Successfully seeded 6 studio designs!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding designs:', error);
    process.exit(1);
  }
}

// Initialize DB and seed
db.init().then(() => {
  seedStudioDesigns();
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

