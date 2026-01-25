/**
 * Script to find Comfort Colors 1467 Lightweight Hoodie in Printify catalog
 * Run: node backend/scripts/find-comfort-colors-hoodie.js
 */

require('dotenv').config();

const PRINTIFY_API_BASE = 'https://api.printify.com/v1';
const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY;
const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID;

async function printifyRequest(endpoint) {
  const url = `${PRINTIFY_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${PRINTIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Printify API error: ${response.status}`);
  }

  return response.json();
}

async function findComfortColorsHoodie() {
  try {
    console.log('🔍 Searching Printify catalog for Comfort Colors 1467...\n');

    // Get all blueprints
    const blueprints = await printifyRequest('/catalog/blueprints.json');
    
    // Search for Comfort Colors hoodies
    const comfortColorsHoodies = blueprints.filter(bp => 
      bp.title.toLowerCase().includes('comfort colors') && 
      bp.title.toLowerCase().includes('hoodie')
    );

    console.log(`Found ${comfortColorsHoodies.length} Comfort Colors hoodies:\n`);

    for (const hoodie of comfortColorsHoodies) {
      console.log(`📦 ${hoodie.title}`);
      console.log(`   Blueprint ID: ${hoodie.id}`);
      console.log(`   Model: ${hoodie.model || 'N/A'}`);
      console.log(`   Brand: ${hoodie.brand || 'N/A'}`);
      console.log(`   Description: ${hoodie.description || 'N/A'}`);
      
      // Check if this is the 1467 model
      if (hoodie.title.includes('1467') || hoodie.model === '1467') {
        console.log('\n✅ FOUND: Comfort Colors 1467!');
        console.log(`\n🔍 Fetching print providers for Blueprint ${hoodie.id}...`);
        
        const providers = await printifyRequest(`/catalog/blueprints/${hoodie.id}/print_providers.json`);
        
        console.log(`\nAvailable Print Providers:`);
        for (const provider of providers) {
          console.log(`   - ${provider.title} (ID: ${provider.id})`);
        }
        
        // Get Printify Choice provider (usually ID 99)
        const printifyChoice = providers.find(p => p.title.includes('Printify Choice') || p.id === 99);
        
        if (printifyChoice) {
          console.log(`\n✅ Using Printify Choice (ID: ${printifyChoice.id})`);
          console.log(`\n🔍 Fetching variants for Blueprint ${hoodie.id}, Provider ${printifyChoice.id}...`);
          
          const variants = await printifyRequest(`/catalog/blueprints/${hoodie.id}/print_providers/${printifyChoice.id}/variants.json`);
          
          console.log(`\nTotal variants: ${variants.variants.length}`);
          
          // Organize by color and size
          const variantsByColor = {};
          
          for (const variant of variants.variants) {
            const colorName = variant.title.split(' / ')[0].toLowerCase(); // e.g., "Black / S" -> "black"
            const size = variant.title.split(' / ')[1]; // e.g., "Black / S" -> "S"
            
            if (!variantsByColor[colorName]) {
              variantsByColor[colorName] = {};
            }
            variantsByColor[colorName][size] = variant.id;
          }
          
          console.log(`\n📋 Variant IDs by Color and Size:\n`);
          console.log('const BLUEPRINTS = {');
          console.log('  hoodie: {');
          console.log(`    id: ${hoodie.id}, // ${hoodie.title}`);
          console.log(`    printProviderId: ${printifyChoice.id}, // ${printifyChoice.title}`);
          console.log('    variants: {');
          
          for (const [color, sizes] of Object.entries(variantsByColor)) {
            console.log(`      '${color}': {`);
            for (const [size, variantId] of Object.entries(sizes)) {
              console.log(`        '${size}': ${variantId},`);
            }
            console.log('      },');
          }
          
          console.log('    },');
          console.log('    placeholders: [{');
          console.log('      position: \'front\',');
          console.log('      height: 4000,');
          console.log('      width: 4000,');
          console.log('    }]');
          console.log('  }');
          console.log('};');
        }
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findComfortColorsHoodie();
