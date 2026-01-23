/**
 * Update Polaroid Ransom Note template cover image
 * This script updates the example_image to point to the local file
 * The reference_image (AI reference) remains unchanged
 */

require('dotenv').config();
const db = require('../db/postgres');

async function updatePolaroidCover() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🎨 UPDATING POLAROID RANSOM NOTE COVER IMAGE');
    console.log('='.repeat(80));
    console.log('');

    // Check current state
    const before = await db.get('SELECT * FROM templates WHERE id = $1', ['polaroid-ransom-note']);
    
    if (!before) {
      console.error('❌ Template not found: polaroid-ransom-note');
      process.exit(1);
    }

    console.log('📋 BEFORE UPDATE:');
    console.log('   - Name:', before.name);
    console.log('   - Cover image (example_image):', before.example_image || '(none)');
    console.log('   - AI reference (reference_image):', before.reference_image || '(none)');
    console.log('');

    // Update the cover image
    console.log('🔄 Updating cover image to: /templates/polaroid_cover.webp');
    const result = await db.query(
      `UPDATE templates 
       SET example_image = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      ['/templates/polaroid_cover.webp', 'polaroid-ransom-note']
    );

    const after = result.rows[0];
    console.log('');
    console.log('✅ UPDATE SUCCESSFUL!');
    console.log('');
    console.log('📋 AFTER UPDATE:');
    console.log('   - Name:', after.name);
    console.log('   - Cover image (example_image):', after.example_image);
    console.log('   - AI reference (reference_image):', after.reference_image || '(none)');
    console.log('');
    console.log('='.repeat(80));
    console.log('✅ SUCCESS!');
    console.log('   Users will now see: /templates/polaroid_cover.webp');
    console.log('   AI will still use:', after.reference_image || '(original reference)');
    console.log('='.repeat(80) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ ERROR:', error.message);
    console.error('='.repeat(80) + '\n');
    console.error(error);
    process.exit(1);
  }
}

// Run the update
updatePolaroidCover();
