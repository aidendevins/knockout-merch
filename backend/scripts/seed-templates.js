/**
 * Seed initial templates for Valentine's Day merch
 * Run with: node backend/scripts/seed-templates.js
 */
require('dotenv').config();
const db = require('../db/postgres');

const initialTemplates = [
  {
    id: 'bootleg-rap',
    name: 'Bootleg Rap Tee',
    description: 'Classic bootleg concert tee style with photos and custom text',
    example_image: null, // Will be set via admin panel
    reference_image: null, // Will be set via admin panel
    prompt: `**Role:** You are a professional T-shirt designer creating a high-energy 90s bootleg "rap tee" collage. You must execute this design as distinct, non-overlapping visual layers.

**REFERENCE STYLE:** Use the composition, bold typography, and electrified background aesthetic of the first image (image_0.png) as your primary stylistic guide for overall impact and layout.

**INPUT DATA:**
* **Subject Name:** [NAME]
* **Primary Color (Text):** [PRIMARY_COLOR]
* **Secondary Color (Thunder):** [SECONDARY_COLOR]
* **Background Color (Base):** [BACKGROUND_COLOR]

**LAYERED EXECUTION INSTRUCTIONS:**

**Layer 1: The Base Background**
* Create a solid, flat, uniform background layer using exactly [BACKGROUND_COLOR]. This is the absolute bottom layer.

**Layer 2: The FX & Typography Layer**
* **Thunder/Lightning:** Generate dynamic, high-contrast lightning bolts and electrical energy crackles. This effect must be rendered ONLY in vibrant [SECONDARY_COLOR] and bright white. This layer sits directly on top of the base background.
* **Typography:** Position the "[NAME]" prominently at the top of the design. The text style must be a massive, bold, 3D metallic-chrome font, similar to the reference. Use [PRIMARY_COLOR] as the dominant chrome hue for the lettering, with subtle outer glow or bevel accents in [SECONDARY_COLOR].
* **Constraint:** The [SECONDARY_COLOR] and [PRIMARY_COLOR] are exclusive to this layer and should not influence any other part of the image, especially not the subjects.

**Layer 3: The Subject "Cut-out" Layer (CRITICAL - NO BORDERS)**
* **Placement:** Arrange the [PHOTO_COUNT] provided subject images into an immersive, overlapping collage. These subjects should appear to be cut out cleanly from their original photos and placed directly onto the lightning layer.
* **No Borders/Outlines:** **Crucially, do NOT add any white, black, or colored borders, outlines, or stroke effects around the subjects.** They should integrate without any artificial "sticker edge."
* **Zero Manipulation Policy:** The subjects must retain their original photographic integrity. This means:
    * **NO color grading, tinting, or filters** applied to skin tones, clothing, or hair.
    * **NO alterations** to original lighting, shadows, contrast, or vibrancy within the subject's image itself.
    * **NO changes** to poses, facial features, expressions, clothing details, or any physical aspect of the subjects.
* **Integration:** The subjects should appear sharply defined against the background, without blending into it, maintaining their distinct photographic reality.

**Final Output:**
Produce a single, high-resolution, sharp, and print-ready graphic. Ensure the different layers are clearly defined, with subjects maintaining their original, unedited photographic appearance, free of any artificial borders, and standing out against the [SECONDARY_COLOR] lightning.`,
    panel_schema: {
      showStyleTweaks: false,
      fields: [
        {
          type: 'text',
          id: 'customName',
          label: 'Add Name',
          placeholder: 'Enter name (e.g., Sarah)',
          required: true,
        },
        {
          type: 'colorPicker',
          id: 'primaryColor',
          label: 'Primary Color',
          hint: '(Name)',
          defaultValue: '#ec4899',
        },
        {
          type: 'colorPicker',
          id: 'secondaryColor',
          label: 'Secondary Color',
          hint: '(Background Thunder)',
          defaultValue: '#8b5cf6',
        },
      ],
    },
    upload_tips: {
      title: 'Best Photos for Bootleg Style',
      tips: [
        'Use photos with a <strong>clear subject</strong> (person, pet, object)',
        'Choose images with a <strong>simple or transparent background</strong> for best results',
        'Portrait-style photos work great for this template',
        'Higher resolution photos (but max 10MB per file)',
        'Well-lit photos produce the best bootleg-style designs',
      ],
    },
    max_photos: 6,
    gradient: 'from-purple-600 to-pink-600',
  },
  {
    id: 'photo-collage',
    name: 'Photo Collage Heart',
    description: 'Heart-shaped collage of your favorite memories',
    example_image: null,
    reference_image: null,
    prompt: `Create a romantic heart-shaped photo collage design. 

**INPUT DATA:**
* **Background Color:** [BACKGROUND_COLOR]
* **Number of Photos:** [PHOTO_COUNT]
* **Custom Text:** [CUSTOM_TEXT]

**DESIGN INSTRUCTIONS:**
1. Arrange the [PHOTO_COUNT] provided photos into a heart-shaped pattern
2. The background should be solid [BACKGROUND_COLOR]
3. Photos should slightly overlap to create a cohesive collage effect
4. Add romantic elements like smaller hearts scattered around
5. Keep the design clean and modern - Valentine's aesthetic
6. Include the text "[CUSTOM_TEXT]" prominently in the design if provided

**PHOTO HANDLING:**
* Do NOT alter the original photos - preserve their colors, lighting, and quality
* Cut out subjects cleanly without adding borders
* Arrange them naturally within the heart shape

**Final Output:**
Produce a high-resolution, print-ready graphic suitable for t-shirt printing.`,
    panel_schema: {
      showStyleTweaks: true,
      fields: [
        {
          type: 'text',
          id: 'customText',
          label: 'Custom Text (optional)',
          placeholder: 'e.g., "I ❤️ You" or names',
          required: false,
        },
      ],
    },
    upload_tips: {
      title: 'Best Image Quality',
      tips: [
        'Use photos with a <strong>clear subject</strong> (person, pet, object)',
        'Choose images with a <strong>simple or transparent background</strong>',
        'Higher resolution photos work better (but max 10MB per file)',
        'Well-lit photos produce the best designs',
      ],
    },
    max_photos: 9,
    gradient: 'from-red-600 to-pink-500',
  },
];

async function seedTemplates() {
  try {
    console.log('🌱 Starting template seeding...');

    // Initialize database connection
    await db.init();

    for (const template of initialTemplates) {
      console.log(`\n📝 Processing template: ${template.name}`);

      // Check if template already exists
      const existing = await db.get('SELECT id FROM templates WHERE id = $1', [template.id]);

      if (existing) {
        console.log(`   ⚠️  Template '${template.id}' already exists. Updating...`);
        
        // Update existing template
        await db.query(
          `UPDATE templates 
           SET name = $1, description = $2, prompt = $3, panel_schema = $4, 
               upload_tips = $5, max_photos = $6, gradient = $7, updated_at = CURRENT_TIMESTAMP
           WHERE id = $8`,
          [
            template.name,
            template.description,
            template.prompt,
            JSON.stringify(template.panel_schema),
            JSON.stringify(template.upload_tips),
            template.max_photos,
            template.gradient,
            template.id,
          ]
        );
        console.log(`   ✅ Updated template '${template.id}'`);
      } else {
        // Insert new template
        await db.query(
          `INSERT INTO templates 
           (id, name, description, example_image, reference_image, prompt, panel_schema, upload_tips, max_photos, gradient)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            template.id,
            template.name,
            template.description,
            template.example_image,
            template.reference_image,
            template.prompt,
            JSON.stringify(template.panel_schema),
            JSON.stringify(template.upload_tips),
            template.max_photos,
            template.gradient,
          ]
        );
        console.log(`   ✅ Created template '${template.id}'`);
      }
    }

    console.log('\n🎉 Template seeding completed successfully!');
    console.log(`📊 Total templates: ${initialTemplates.length}`);
    
    // Display all templates
    const allTemplates = await db.all('SELECT id, name, created_at FROM templates ORDER BY created_at');
    console.log('\n📋 Current templates in database:');
    allTemplates.forEach(t => {
      console.log(`   - ${t.id}: ${t.name}`);
    });

  } catch (error) {
    console.error('❌ Error seeding templates:', error);
    process.exit(1);
  } finally {
    await db.close();
    process.exit(0);
  }
}

// Run the seed script
seedTemplates();
