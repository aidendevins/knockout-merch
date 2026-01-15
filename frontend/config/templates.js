// Template configurations for Valentine's Day merch
// Templates are now fetched from the backend API
// This file contains helper functions for working with templates

// Field types for panel schema:
// - 'text': Text input field
// - 'textarea': Multi-line text input
// - 'colorPicker': Color picker with hex output
// - 'select': Dropdown select
// - 'toggle': On/off toggle

import apiClient from '@/api/apiClient';

/**
 * Build the full prompt for bootleg-rap template
 * @param {Object} fieldValues - Values from the AI panel fields
 * @param {string} backgroundColor - Background color hex from product color selection
 * @param {number} photoCount - Number of photos uploaded
 * @returns {string} Complete prompt for Gemini
 */
function buildBootlegRapPrompt(fieldValues, backgroundColor, photoCount) {
  const subjectName = fieldValues.customName || 'LOVE';
  const primaryColor = fieldValues.primaryColor || '#ec4899';
  const secondaryColor = fieldValues.secondaryColor || '#8b5cf6';
  const bgColor = backgroundColor || '#1a1a1a';

  return `**Role:** You are a professional T-shirt designer creating a high-energy 90s bootleg "rap tee" collage. You must execute this design as distinct, non-overlapping visual layers.

**REFERENCE STYLE:** Use the composition, bold typography, and electrified background aesthetic of the first image (image_0.png) as your primary stylistic guide for overall impact and layout.

**INPUT DATA:**
* **Subject Name:** ${subjectName}
* **Primary Color (Text):** ${primaryColor}
* **Secondary Color (Thunder):** ${secondaryColor}
* **Background Color (Base):** ${bgColor}

**LAYERED EXECUTION INSTRUCTIONS:**

**Layer 1: The Base Background**
* Create a solid, flat, uniform background layer using exactly ${bgColor}. This is the absolute bottom layer.

**Layer 2: The FX & Typography Layer**
* **Thunder/Lightning:** Generate dynamic, high-contrast lightning bolts and electrical energy crackles. This effect must be rendered ONLY in vibrant ${secondaryColor} and bright white. This layer sits directly on top of the base background.
* **Typography:** Position the "${subjectName}" prominently at the top of the design. The text style must be a massive, bold, 3D metallic-chrome font, similar to the reference. Use ${primaryColor} as the dominant chrome hue for the lettering, with subtle outer glow or bevel accents in ${secondaryColor}.
* **Constraint:** The ${secondaryColor} and ${primaryColor} are exclusive to this layer and should not influence any other part of the image, especially not the subjects.

**Layer 3: The Subject "Cut-out" Layer (CRITICAL - NO BORDERS)**
* **Placement:** Arrange the ${photoCount} provided subject images into an immersive, overlapping collage. These subjects should appear to be cut out cleanly from their original photos and placed directly onto the lightning layer.
* **No Borders/Outlines:** **Crucially, do NOT add any white, black, or colored borders, outlines, or stroke effects around the subjects.** They should integrate without any artificial "sticker edge."
* **Zero Manipulation Policy:** The subjects must retain their original photographic integrity. This means:
    * **NO color grading, tinting, or filters** applied to skin tones, clothing, or hair.
    * **NO alterations** to original lighting, shadows, contrast, or vibrancy within the subject's image itself.
    * **NO changes** to poses, facial features, expressions, clothing details, or any physical aspect of the subjects.
* **Integration:** The subjects should appear sharply defined against the background, without blending into it, maintaining their distinct photographic reality.

**Final Output:**
Produce a single, high-resolution, sharp, and print-ready graphic. Ensure the different layers are clearly defined, with subjects maintaining their original, unedited photographic appearance, free of any artificial borders, and standing out against the ${secondaryColor} lightning.`;
}

/**
 * Build the full prompt for photo-collage template
 * @param {Object} fieldValues - Values from the AI panel fields
 * @param {string} backgroundColor - Background color hex from product color selection
 * @param {number} photoCount - Number of photos uploaded
 * @param {string} styleTweaks - Optional style tweaks from user
 * @returns {string} Complete prompt for Gemini
 */
function buildPhotoCollagePrompt(fieldValues, backgroundColor, photoCount, styleTweaks = '') {
  const customText = fieldValues.customText || '';
  const bgColor = backgroundColor || '#1a1a1a';

  let prompt = `Create a romantic heart-shaped photo collage design. 

**INPUT DATA:**
* **Background Color:** ${bgColor}
* **Number of Photos:** ${photoCount}
${customText ? `* **Custom Text:** "${customText}"` : ''}

**DESIGN INSTRUCTIONS:**
1. Arrange the ${photoCount} provided photos into a heart-shaped pattern
2. The background should be solid ${bgColor}
3. Photos should slightly overlap to create a cohesive collage effect
4. Add romantic elements like smaller hearts scattered around
5. Keep the design clean and modern - Valentine's aesthetic
${customText ? `6. Include the text "${customText}" prominently in the design` : ''}

**PHOTO HANDLING:**
* Do NOT alter the original photos - preserve their colors, lighting, and quality
* Cut out subjects cleanly without adding borders
* Arrange them naturally within the heart shape

**Final Output:**
Produce a high-resolution, print-ready graphic suitable for t-shirt printing.`;

  if (styleTweaks) {
    prompt += `\n\n**Additional Style Instructions:** ${styleTweaks}`;
  }

  return prompt;
}

/**
 * Fetch templates from API
 * This replaces the hardcoded TEMPLATES array
 */
export async function fetchTemplates() {
  try {
    const templates = await apiClient.entities.Template.list();
    
    // Transform backend format to frontend format and attach buildPrompt functions
    return templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      exampleImage: t.example_image,
      referenceImage: t.reference_image,
      prompt: t.prompt, // Database prompt (prioritized over buildPrompt function)
      gradient: t.gradient,
      maxPhotos: t.max_photos,
      uploadTips: t.upload_tips,
      panelSchema: t.panel_schema,
      removeBackground: t.remove_background, // Background removal flag
      remove_background: t.remove_background, // Keep snake_case for compatibility
      buildPrompt: getBuildPromptFunction(t.id), // Fallback build function if no DB prompt
    }));
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    // Return empty array if fetch fails
    return [];
  }
}

/**
 * Get the appropriate buildPrompt function for a template
 */
function getBuildPromptFunction(templateId) {
  switch (templateId) {
    case 'bootleg-rap':
      return buildBootlegRapPrompt;
    case 'photo-collage':
      return buildPhotoCollagePrompt;
    default:
      return null; // Will use prompt from backend directly
  }
}

// Keep TEMPLATES as a cached variable for backwards compatibility
export let TEMPLATES = [];

/**
 * LOCAL TEMPLATES - Source of truth for new templates
 * Add new templates here, then sync to database using "Sync All Local Templates" button in admin
 * 
 * Format:
 * {
 *   id: string (unique identifier),
 *   name: string,
 *   description: string,
 *   example_image: string | null,
 *   reference_image: string | null (will be set via admin),
 *   prompt: string (with placeholders like [NAME], [PRIMARY_COLOR], etc.),
 *   panel_schema: {
 *     showStyleTweaks: boolean,
 *     fields: Array<{type, id, label, placeholder?, hint?, defaultValue?, required, promptTemplate?}>
 *   },
 *   upload_tips: {
 *     title: string,
 *     tips: string[]
 *   },
 *   max_photos: number,
 *   gradient: string (Tailwind gradient classes)
 * }
 */
export const LOCAL_TEMPLATES = [
  {
    id: 'bootleg-rap',
    name: 'Bootleg Rap Tee',
    description: 'Classic bootleg concert tee style with photos and custom text',
    example_image: null,
    reference_image: null, // Set via admin panel
    remove_background: true, // Enable background removal before sending to Printify
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
    reference_image: null, // Set via admin panel
    remove_background: true, // Enable background removal before sending to Printify
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

// Product types available
export const PRODUCT_TYPES = [
  {
    id: 'tshirt',
    name: 'T-Shirt',
    icon: '👕',
    basePrice: 29.99,
  },
  {
    id: 'hoodie',
    name: 'Hoodie',
    icon: '🧥',
    basePrice: 49.99,
  },
];

// Color options - add exact hex values as needed
export const COLOR_OPTIONS = [
  {
    id: 'black',
    name: 'Black',
    hex: '#1a1a1a',
    textColor: 'white',
  },
  {
    id: 'white',
    name: 'White',
    hex: '#f5f5f5',
    textColor: 'black',
  },
  {
    id: 'light-pink',
    name: 'Light Pink',
    hex: '#fce7f3',
    textColor: 'black',
  },
];

// Preset colors for color pickers
export const COLOR_PRESETS = [
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#ffffff', // White
  '#000000', // Black
];

// Helper to get color hex from color id
export function getColorHex(colorId) {
  const color = COLOR_OPTIONS.find(c => c.id === colorId);
  return color?.hex || '#1a1a1a';
}

export default {
  TEMPLATES,
  LOCAL_TEMPLATES,
  fetchTemplates,
  PRODUCT_TYPES,
  COLOR_OPTIONS,
  COLOR_PRESETS,
  getColorHex,
};
