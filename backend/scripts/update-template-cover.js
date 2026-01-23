/**
 * Script to update a template's cover image (example_image)
 * This updates the preview shown to users, not the AI reference image
 * 
 * Usage: node scripts/update-template-cover.js <template-id> <image-path>
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../db/postgres');
const s3 = require('../services/s3');

async function updateTemplateCover(templateId, imagePath) {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🎨 UPDATING TEMPLATE COVER IMAGE');
    console.log('='.repeat(80));
    console.log('📋 Template ID:', templateId);
    console.log('📷 Image path:', imagePath);
    console.log('');

    // Check if template exists
    const template = await db.get('SELECT * FROM templates WHERE id = $1', [templateId]);
    if (!template) {
      console.error('❌ Template not found:', templateId);
      process.exit(1);
    }

    console.log('✅ Template found:', template.name);
    console.log('📝 Current example_image:', template.example_image || '(none)');
    console.log('📝 Current reference_image:', template.reference_image || '(none)');
    console.log('');

    // Check if image file exists
    if (!fs.existsSync(imagePath)) {
      console.error('❌ Image file not found:', imagePath);
      process.exit(1);
    }

    // Read the image file
    console.log('📤 Reading image file...');
    const imageBuffer = fs.readFileSync(imagePath);
    const fileExt = path.extname(imagePath).toLowerCase();
    const mimeType = fileExt === '.webp' ? 'image/webp' : 
                     fileExt === '.png' ? 'image/png' : 
                     fileExt === '.jpg' || fileExt === '.jpeg' ? 'image/jpeg' : 
                     'image/png';
    
    console.log('   - File size:', (imageBuffer.length / 1024).toFixed(2), 'KB');
    console.log('   - MIME type:', mimeType);
    console.log('');

    // Upload to S3
    console.log('☁️  Uploading to S3...');
    const filename = `template-${templateId}-cover-${Date.now()}${fileExt}`;
    const uploaded = await s3.uploadBuffer(imageBuffer, filename, 'templates', mimeType);
    
    console.log('✅ Upload successful!');
    console.log('   - URL:', uploaded.url);
    console.log('');

    // Update database - ONLY update example_image, keep reference_image unchanged
    console.log('💾 Updating database (example_image only)...');
    const result = await db.query(
      `UPDATE templates 
       SET example_image = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [uploaded.url, templateId]
    );

    console.log('✅ Database updated successfully!');
    console.log('');
    console.log('📊 Template after update:');
    console.log('   - Name:', result.rows[0].name);
    console.log('   - Example image (COVER):', result.rows[0].example_image);
    console.log('   - Reference image (AI):', result.rows[0].reference_image);
    console.log('');
    console.log('='.repeat(80));
    console.log('✅ SUCCESS - Cover image updated!');
    console.log('   Users will see the new cover image in template picker.');
    console.log('   AI will continue using the original reference image.');
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

// Get command line arguments
const templateId = process.argv[2];
const imagePath = process.argv[3];

if (!templateId || !imagePath) {
  console.error('\n❌ Usage: node scripts/update-template-cover.js <template-id> <image-path>');
  console.error('Example: node scripts/update-template-cover.js polaroid-ransom-note /path/to/cover.webp\n');
  process.exit(1);
}

// Run the update
updateTemplateCover(templateId, imagePath);
