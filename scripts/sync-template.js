/**
 * Script to sync the retro-name-portrait template and upload its reference image
 * Run with: node scripts/sync-template.js
 */

const fs = require('fs');
const path = require('path');

// Read the templates config file
const templatesPath = path.join(__dirname, '../frontend/config/templates.js');
const templatesContent = fs.readFileSync(templatesPath, 'utf8');

// Extract LOCAL_TEMPLATES array using a simple regex (not perfect but works for this case)
const templatesMatch = templatesContent.match(/export const LOCAL_TEMPLATES = \[([\s\S]*?)\];/);
if (!templatesMatch) {
  console.error('❌ Could not find LOCAL_TEMPLATES in templates.js');
  process.exit(1);
}

// We'll use eval in a controlled way to parse the array
// In production, you'd want a proper parser, but for this script it's fine
const templatesCode = `[${templatesMatch[1]}]`;

// Replace export and const declarations to make it evaluable
const cleanedCode = templatesCode
  .replace(/export const LOCAL_TEMPLATES = /g, '')
  .replace(/\/\/.*$/gm, '') // Remove single-line comments
  .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments

let LOCAL_TEMPLATES;
try {
  // Use Function constructor to safely evaluate (no require/module access)
  LOCAL_TEMPLATES = new Function('return ' + cleanedCode)();
} catch (error) {
  console.error('❌ Error parsing templates:', error.message);
  console.error('Please ensure templates.js has valid JavaScript syntax');
  process.exit(1);
}

// Find the retro-name-portrait template
const retroTemplate = LOCAL_TEMPLATES.find(t => t.id === 'retro-name-portrait');
if (!retroTemplate) {
  console.error('❌ Could not find retro-name-portrait template in LOCAL_TEMPLATES');
  process.exit(1);
}

// Read the reference image - try multiple path variations
const possiblePaths = [
  '/Users/aiden/Desktop/Screenshot 2026-01-15 at 10.05.42 PM.png',
  path.join(process.env.HOME || '/Users/aiden', 'Desktop', 'Screenshot 2026-01-15 at 10.05.42 PM.png'),
];

let imagePath = null;
for (const testPath of possiblePaths) {
  if (fs.existsSync(testPath)) {
    imagePath = testPath;
    break;
  }
}

if (!imagePath) {
  // Try to find it by pattern
  const desktopPath = path.join(process.env.HOME || '/Users/aiden', 'Desktop');
  if (fs.existsSync(desktopPath)) {
    const files = fs.readdirSync(desktopPath);
    const matchingFile = files.find(f => f.includes('Screenshot 2026-01-15') && f.includes('10.05.42'));
    if (matchingFile) {
      imagePath = path.join(desktopPath, matchingFile);
    }
  }
}

if (!imagePath || !fs.existsSync(imagePath)) {
  console.error(`❌ Reference image not found. Tried:`);
  possiblePaths.forEach(p => console.error(`   - ${p}`));
  process.exit(1);
}

const imageBuffer = fs.readFileSync(imagePath);
const imageBase64 = imageBuffer.toString('base64');
const mimeType = 'image/png'; // Assuming PNG
const imageDataUrl = `data:${mimeType};base64,${imageBase64}`;

// Get API URL from environment or use default
// For Railway: https://knockout-merch-production.up.railway.app/api
const apiUrl = process.env.VITE_API_URL || process.env.API_URL || 'https://knockout-merch-production.up.railway.app/api';

console.log('📋 Template to sync:');
console.log(`   ID: ${retroTemplate.id}`);
console.log(`   Name: ${retroTemplate.name}`);
console.log(`   Max Photos: ${retroTemplate.max_photos}`);
console.log(`   Reference Image Size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
console.log(`   API URL: ${apiUrl}`);
console.log('');

// Sync template
async function syncTemplate() {
  try {
    console.log('🔄 Syncing template to database...');
    const syncResponse = await fetch(`${apiUrl}/templates/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templates: [retroTemplate],
      }),
    });

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      throw new Error(`Sync failed: ${syncResponse.status} ${errorText}`);
    }

    const syncResult = await syncResponse.json();
    console.log('✅ Template synced successfully!');
    console.log(`   Created: ${syncResult.results.created.join(', ') || 'none'}`);
    console.log(`   Updated: ${syncResult.results.updated.join(', ') || 'none'}`);
    console.log(`   Errors: ${syncResult.results.errors.length || 0}`);
    console.log('');

    // Upload reference image
    console.log('📤 Uploading reference image...');
    const uploadResponse = await fetch(`${apiUrl}/templates/${retroTemplate.id}/reference-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: imageDataUrl,
      }),
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${uploadResponse.status} ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('✅ Reference image uploaded successfully!');
    console.log(`   URL: ${uploadResult.reference_image}`);
    console.log('');

    console.log('🎉 All done! Template is ready to use.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('fetch')) {
      console.error('   Make sure the backend server is running and accessible at:', apiUrl);
    }
    process.exit(1);
  }
}

syncTemplate();

