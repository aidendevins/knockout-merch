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
 * Build the full prompt for retro-name-portrait template
 * @param {Object} fieldValues - Values from the AI panel fields
 * @param {string} backgroundColor - Background color hex from product color selection
 * @param {number} photoCount - Number of photos uploaded
 * @param {string} styleTweaks - Optional style tweaks from user
 * @returns {string} Complete prompt for Gemini
 */
function buildRetroNamePortraitPrompt(fieldValues, backgroundColor, photoCount, styleTweaks = '') {
  const personName = fieldValues.customName || 'AMELIA';
  const textColor = fieldValues.textColor || '#3b82f6';
  const bgColor = backgroundColor || '#fef3c7'; // Default cream color

  let prompt = `MASTER PROMPT — FACE + 5-LINE SINGLE-NAME REPEAT (EXACT SPELLING + MAX FONT MATCH + UNIFORM LETTER SPACING)

**Goal:**
Create a flat, print-ready graphic (NOT a mockup) that matches the provided reference image's typography as closely as possible: same retro psychedelic bubble font vibe AND the same line-by-line curve/warp style, with a large centered face cutout on top. Also enforce uniform, consistent spacing between letters.

**USER INPUTS (must be followed EXACTLY):**
- FACE_REFERENCE_IMAGE: The uploaded photo (image_1.png) - ONE person's face
- STYLE_REFERENCE_IMAGE: The provided reference design image (image_0.png) - to match the font + curve style
- PERSON_NAME_EXACT: "${personName}"
- BACKGROUND_COLOR: "${bgColor}" (solid fill)
- TEXT_COLOR: "${textColor}" (solid fill)

**ABSOLUTE TEXT ACCURACY RULE (NON-NEGOTIABLE / HIGHEST PRIORITY FOR TEXT):**
- You MUST render PERSON_NAME_EXACT exactly as provided, with:
  - the exact same spelling
  - the exact same capitalization (upper/lowercase)
  - the exact same number of characters
  - the exact same punctuation, spaces, and special characters
- Do NOT autocorrect, "fix," abbreviate, add or remove letters, add accents, or change characters.
- Each of the 5 lines must contain PERSON_NAME_EXACT exactly ONCE (no additional characters before/after).

**UNIFORM LETTER SPACING RULE (NON-NEGOTIABLE CONSTRAINT):**
- Maintain uniform, consistent kerning/tracking across the entire name on every line:
  - No letter should be noticeably closer or farther than the others.
  - Avoid awkward gaps (e.g., between "A M", "M E", etc.).
  - Use consistent tracking so spacing looks even across all characters.
- If warping/curving causes spacing to look uneven, correct it so visual spacing remains uniform after warping.
- Prioritize visually uniform spacing over "natural" kerning.

**OUTPUT REQUIREMENTS:**
- Output a single final graphic ONLY (no shirt photo, no mockup, no fabric texture).
- High resolution: 4500×5400 px (or closest available), crisp edges, clean cutout, screen-print friendly.
- No watermark, no signatures, no extra text beyond PERSON_NAME_EXACT.

**NON-NEGOTIABLE STRUCTURE CONSTRAINTS (must match reference):**
- EXACTLY 5 text lines total, stacked vertically.
- EACH line contains PERSON_NAME_EXACT exactly ONCE. (Never repeated twice on the same line.)
- The 5 lines are large and fill most of the canvas, like the reference.
- The centered face overlaps the middle portion of the 5 lines, and the text is partially hidden behind the face.

**TYPE / FONT MATCHING (make it as close as humanly possible):**
- Match the STYLE_REFERENCE_IMAGE (image_0.png) typography as closely as physically possible:
  1) Font style: retro/psychedelic 60s–70s "bubble" display type with chunky, playful, slightly irregular letterforms.
  2) Letter anatomy: match width, stroke thickness, inner counters, and the distinctive shapes seen in the reference.
  3) Weight: bold, heavy, consistent stroke thickness with clean curves.
  4) Optical feel: replicate the same "poster" look—bold, friendly, vintage.
- If the exact font is unknown, approximate it so it is nearly indistinguishable at a glance from STYLE_REFERENCE_IMAGE.
- Do NOT substitute to a generic font; prioritize closest-possible match over everything except face identity and text accuracy.

**CURVE / WARP MATCHING (must closely match reference):**
- Each of the 5 lines must use the same curve/warp style as STYLE_REFERENCE_IMAGE (image_0.png):
  - Smooth, cohesive, gently arched and wavy baseline (not chaotic).
  - Similar amplitude and rhythm per line to the reference.
  - Preserve stroke thickness through warping (no thinning/tearing).
  - Maintain similar left/right edge lift/drop behavior as the reference.
- IMPORTANT: Warping must NOT introduce uneven letter spacing—correct spacing so it remains uniform.

**CRITICAL FACE IDENTITY LOCK (highest priority overall):**
- Use ONLY the face/head from FACE_REFERENCE_IMAGE (image_1.png). Do not invent a new face. Do not use "a similar person."
- Preserve identity perfectly: same facial structure, nose, lips, skin texture, hairline/bangs, glasses (if present), and expression.
- Do NOT beautify, stylize, de-age, change ethnicity, change makeup, change hairstyle, change hair length, add/remove glasses, or alter expression.
- Remove the original photo background completely. Create a clean head cutout (include hair) with a sharp, natural edge.
- No additional people, no extra faces, no face blending, no duplicates.

**DESIGN / LAYOUT (match reference composition):**
1) Background:
- Fill the entire canvas with a flat solid BACKGROUND_COLOR = "${bgColor}".
- Absolutely no gradients, patterns, textures, shadows, or noise on the background.

2) Text color:
- All name text must be a single solid TEXT_COLOR = "${textColor}" (no gradient, no texture, no outline unless strictly necessary for readability).

3) Five-line layout (exact behavior):
- Create EXACTLY 5 stacked rows of text, centered horizontally.
- Each row shows PERSON_NAME_EXACT exactly ONCE and only once.
- Maintain the same spacing/scale relationship as the reference: big letters, evenly stacked, filling most of the canvas height.
- Ensure consistent vertical spacing between the five lines (balanced, even stacking).

4) Face placement:
- Place the face cutout centered and large, overlapping the middle of the five lines.
- The face must be on the top layer; the text must be partially occluded behind it.
- Keep the face realistic and un-stylized (photographic cutout look), clean edges, no haloing.

**PRINT-FRIENDLY CONSTRAINTS:**
- Flat colors, crisp edges, no tiny micro-details that won't print well.
- Keep balanced margins and center alignment like the reference.

**NEGATIVE CONSTRAINTS (must NOT appear in the output):**
- No mockup, no shirt folds, no fabric texture, no tags, no brand logos.
- No extra words, no slogans, no additional letters/characters beyond PERSON_NAME_EXACT.
- No misspellings; do not change the name by even one character.
- No repeating the name more than once per line.
- No additional people, no extra faces, no face swaps, no "similar face," no duplicates.
- No cartoon/anime/comic styling, no painterly effects, no airbrushing, no beautification, no skin smoothing, no identity changes.
- No background gradients, patterns, textures, shadows, vignette, noise, or lighting effects.
- No watermark, no signature, no frame, no border.

**FINAL CHECK BEFORE OUTPUT (must pass all):**
- EXACT text match: PERSON_NAME_EXACT is identical to input in spelling/case/characters on ALL 5 lines. If not, redo.
- Uniform spacing: letter spacing within the name is visually uniform on ALL 5 lines (no odd kerning gaps). If not, redo.
- Exactly 5 lines and each line contains the name exactly once. If not, redo.
- Font + curve match STYLE_REFERENCE_IMAGE (image_0.png) as closely as possible at a glance. If not, redo.
- Face identity matches FACE_REFERENCE_IMAGE (image_1.png) with no changes. If not, redo.
- Output is the graphic only on a solid background. If not, redo.

Now generate the final design using image_1.png (FACE_REFERENCE_IMAGE) for the face and image_0.png (STYLE_REFERENCE_IMAGE) for the typography + curve match.`;

  if (styleTweaks) {
    prompt += `\n\n**Additional Style Instructions:** ${styleTweaks}`;
  }

  return prompt;
}

/**
 * Fetch templates from API
 * This replaces the hardcoded TEMPLATES array
 */
export async function fetchTemplates(includeHidden = false) {
  try {
    const templates = await apiClient.entities.Template.list();
    
    // Debug: Check if canvas_config is present in fetched templates
    const polaroid = templates.find(t => t.id === 'polaroid-ransom-note');
    if (polaroid) {
      console.log('🔍 Frontend fetchTemplates - Polaroid data:', {
        id: polaroid.id,
        has_canvas_config: !!polaroid.canvas_config,
        canvas_config: polaroid.canvas_config,
        all_keys: Object.keys(polaroid)
      });
    }
    
    // Filter out hidden templates unless explicitly requested (for admin)
    // Handle boolean, string, null, or undefined values
    const filteredTemplates = includeHidden 
      ? templates 
      : templates.filter(t => {
          // Explicitly check - only hide if is_hidden is explicitly true
          const isHidden = t.is_hidden;
          
          // Handle boolean true, string "true", number 1, or PostgreSQL 't'
          // Only filter out if explicitly hidden
          const shouldHide = isHidden === true || 
                             isHidden === 'true' || 
                             isHidden === 1 || 
                             isHidden === 't' ||
                             String(isHidden).toLowerCase() === 'true';
          
          return !shouldHide;
        });
    
    // Transform backend format to frontend format and attach buildPrompt functions
    return filteredTemplates.map(t => ({
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
export function getBuildPromptFunction(templateId) {
  console.log('🔍 getBuildPromptFunction called with templateId:', templateId);
  console.log('   Available functions:', {
    buildBootlegRapPrompt: typeof buildBootlegRapPrompt,
    buildPhotoCollagePrompt: typeof buildPhotoCollagePrompt,
    buildRetroNamePortraitPrompt: typeof buildRetroNamePortraitPrompt,
  });
  
  let result = null;
  switch (templateId) {
    case 'bootleg-rap':
      result = buildBootlegRapPrompt;
      break;
    case 'photo-collage':
      result = buildPhotoCollagePrompt;
      break;
    case 'retro-name-portrait':
      result = buildRetroNamePortraitPrompt;
      break;
    default:
      result = null; // Will use prompt from backend directly
  }
  
  console.log('   getBuildPromptFunction returning:', typeof result);
  return result;
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
    remove_background: 'remove-simple', // Enable background removal before sending to Printify
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
    remove_background: 'remove-simple', // Enable background removal before sending to Printify
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
    max_photos: 1,
    gradient: 'from-red-600 to-pink-500',
  },
  {
    id: 'retro-name-portrait',
    name: 'Retro Name Portrait',
    description: 'Vintage 60s-70s psychedelic style with repeating name text and portrait photo',
    example_image: null,
    reference_image: null, // Set via admin panel - upload the reference image there
    remove_background: 'remove-simple', // Enable background removal before sending to Printify
    prompt: null, // Uses buildRetroNamePortraitPrompt function to generate prompt with proper placeholder replacement
    panel_schema: {
      showStyleTweaks: false,
      fields: [
        {
          type: 'text',
          id: 'customName',
          label: 'Name',
          placeholder: 'Enter name (e.g., Amelia)',
          required: true,
        },
        {
          type: 'colorPicker',
          id: 'textColor',
          label: 'Text Color',
          hint: '(Name letters)',
          defaultValue: '#3b82f6',
        },
      ],
    },
    upload_tips: {
      title: 'Best Photos for Retro Portrait Style',
      tips: [
        'Use a <strong>clear portrait photo</strong> (head and shoulders work best)',
        'Choose photos with a <strong>simple or plain background</strong> for best results',
        'Well-lit photos with good contrast produce the best retro designs',
        'Portrait orientation photos work great for this template',
        'Higher resolution photos (but max 10MB per file)',
      ],
    },
    max_photos: 1,
    gradient: 'from-blue-600 to-purple-600',
  },
  {
    id: 'polaroid-ransom-note',
    name: 'Polaroid Ransom Note',
    description: 'Nostalgic polaroid-style photo with ransom note text aesthetic',
    example_image: null,
    reference_image: null, // Set via admin panel
    remove_background: false, // Keep the polaroid frame
    prompt: `Create a nostalgic polaroid-style photo design with the following specifications:

CRITICAL RULE - BACKGROUND:
- THE ENTIRE OUTPUT IMAGE MUST BE ONLY THE POLAROID ITSELF
- NO solid background, NO colored backdrop, NO surface underneath
- The polaroid frame IS the image - nothing else should exist
- The edges of the canvas ARE the edges of the polaroid
- Do NOT place the polaroid on top of any background color or surface
- The white border of the polaroid should extend to the very edges of the image in places

LAYOUT & FORMAT:
- Rectangular landscape orientation polaroid format
- White polaroid border frame around the entire image
- The polaroid fills the entire canvas edge-to-edge

IMAGE TREATMENT:
- Place the provided image (the uploaded photo) inside the polaroid frame
- Apply a soft, slightly faded vintage photo filter
- Warm, nostalgic color grading with slightly muted tones
- Subtle vignette effect around the edges

TEXT ELEMENT:
- At the bottom of the polaroid (on the white border area), add the user's text: "[USER TEXT]"
- Style: Ransom note aesthetic using mixed cut-out letter styles
- Letters should appear as individual cut-out pieces from different sources
- Vary the letter styles: some from magazines, some handwritten-style, different fonts
- Use black, white, and red as the primary colors for the letters
- Letters should be slightly irregular in alignment and size for authentic ransom note look
- Center the text horizontally

OVERALL AESTHETIC:
- Nostalgic, intimate, personal feel
- Slightly imperfect, authentic polaroid appearance
- Warm and sentimental mood

REMINDER: The output should be ONLY the polaroid photo itself - the polaroid IS the entire image, not an object placed on a background.`,
    panel_schema: {
      showStyleTweaks: false,
      fields: [
        {
          type: 'text',
          id: 'customText',
          label: 'Text (max 20 characters)',
          placeholder: 'Enter text...',
          required: true,
          maxLength: 20,
        },
      ],
    },
    upload_tips: {
      title: 'Best Photos for Polaroid Style',
      tips: [
        'Use photos with a <strong>clear subject</strong> (person, pet, object)',
        'Choose images with a <strong>simple or plain background</strong> for best results',
        'Well-lit photos with good contrast produce the best polaroid designs',
        'Portrait or landscape orientation photos work great',
        'Higher resolution photos (but max 10MB per file)',
      ],
    },
    max_photos: 1,
    gradient: 'from-amber-600 to-orange-600',
  },
  {
    id: 'minimalist-line-art',
    name: 'Minimalist Line Art',
    description: 'Convert photos into clean minimalist line art illustrations',
    example_image: null,
    reference_image: null, // Set via admin panel
    remove_background: false, // Keep the illustration style
    prompt: `Transform the second image to look similar to the first image based on the following criteria:
Convert the provided image into a minimalist line art illustration while preserving the original composition, poses, and colors:

PRESERVE FROM ORIGINAL:
- Exact poses and positioning of all subjects
- Background color (convert to flat version of the original color)
- Clothing colors (convert to flat versions of the original colors)
- Overall composition and framing
- Any patterns on clothing (simplified into clean geometric versions)

LINE ART STYLE:
- Clean, smooth black outlines around all shapes
- Consistent line weight throughout (medium thickness)
- Continuous, confident lines - not sketchy
- Minimal interior detail lines - focus on major forms and silhouettes
- Vector-quality, smooth lines

FIGURE TREATMENT:
- Make all faces completely blank - no facial features at all
- Heads become simple solid color shapes with hair silhouettes
- Simplify body forms while maintaining recognizable poses
- Remove fine details, keep essential shapes only

COLOR TREATMENT:
- Convert all colors to flat, solid fills - absolutely no gradients
- No shading, highlights, or shadows anywhere
- Take the dominant colors from the original and make them completely flat
- Slightly desaturate colors for a muted, contemporary feel
- Each area is a single solid color

SIMPLIFICATION:
- Remove photographic details (skin texture, fabric texture, etc.)
- Simplify complex patterns into clean geometric versions
- Reduce detail while keeping the image recognizable
- Clean, editorial illustration aesthetic

OUTPUT:
- Modern minimalist line art illustration
- Clean and sophisticated
- Maintains the essence and composition of the original photo`,
    panel_schema: {
      showStyleTweaks: false,
      fields: [],
    },
    upload_tips: {
      title: 'Best Photos for Line Art Style',
      tips: [
        'Use photos with <strong>clear subjects</strong> and good contrast',
        'Choose images with <strong>simple backgrounds</strong> for best results',
        'Well-lit photos with distinct shapes work best',
        'Photos with clear poses and composition produce better line art',
        'Higher resolution photos (but max 10MB per file)',
      ],
    },
    max_photos: 1,
    gradient: 'from-slate-600 to-gray-600',
  },
  {
    id: 'romantic-save-the-date',
    name: 'Romantic Save The Date',
    description: 'Elegant heart-framed couple portrait with decorative bow and custom date',
    example_image: null,
    reference_image: null, // Set via admin panel - upload reference image there
    remove_background: 'remove-simple', // Enable background removal for the solid background
    prompt: `You are creating a romantic save-the-date design following this EXACT specification:

REFERENCE IMAGE ANALYSIS (STYLE ONLY):
- The first image provided shows the TARGET DESIGN STYLE AND LAYOUT ONLY
- Study ONLY these elements: heart frame shape, bow placement, line art style, text positioning, and overall composition
- DO NOT copy, recreate, or reference the people/subjects shown in the first image
- The first image is purely a visual template for the design aesthetic

INPUT IMAGE PROCESSING (CONTENT SOURCE):
- The second image contains the ACTUAL subjects to be used in the final design
- This is the ONLY source for people/subjects in your output
- Extract ALL subjects (people) visible in the second image
- CRITICAL: Do not add, remove, or substitute any people - use EXACTLY who appears in the second image
- DO NOT invent, generate, or hallucinate additional people
- DO NOT use people from the reference image

SUBJECT TREATMENT:
- Take the subjects from the second image AS-IS
- Apply ONLY a cinematic black and white filter to these subjects
- Maintain their original pose, positioning, facial features, and characteristics
- DO NOT alter their appearance beyond the black and white conversion
- Cinematic black and white style: deep blacks, bright highlights, film-like grain, high contrast
- Preserve all facial details and emotional expressions from the original photo
- Keep the subjects' relative positioning to each other as shown in the second image

CONSISTENCY RULE:
- If the second image shows 1 person, output 1 person
- If the second image shows 2 people, output 2 people  
- If the second image shows 3+ people, output all of them
- NEVER add people not present in the second image
- NEVER substitute people from the reference image

LAYOUT & COMPOSITION:
- Create a heart-shaped frame with a decorative ribbon bow at the top-left (STYLE from reference)
- The heart should be drawn with clean, elegant linework matching the reference style
- The bow should have flowing ribbon tails extending downward on the left side
- Position the subjects from the SECOND IMAGE inside the heart frame
- Crop/frame the subjects appropriately to fit the heart (typically chest/shoulders up)
- The subjects should fill approximately 70% of the heart's interior

COLOR SCHEME - CRITICAL:
- Primary color: [PRIMARY_COLOR]
- MANDATORY: Use [PRIMARY_COLOR] for ALL of the following:
  * Heart frame outline
  * Bow outline
  * All ribbon lines
  * Date text
- Background color: [INVERSE_COLOR]
- MANDATORY: Use [INVERSE_COLOR] for ALL of the following:
  * Entire background outside the subjects
  * Background fill inside the heart frame (around subjects)
  * All negative space
- The background inside the heart (around the subjects) must be filled with [INVERSE_COLOR]
- This creates clean separation: subjects + line art vs. solid background for easy removal
- DO NOT use any colors other than [PRIMARY_COLOR], [INVERSE_COLOR], and black/white/grayscale for subjects

DATE FORMATTING - CRITICAL - DO NOT MODIFY THE USER'S DATE:
- The user has provided this exact date value: [DATE_VALUE]
- This date is already pre-formatted in the correct format specified by [DATE_FORMAT]
- Position date text centered below the heart
- Use elegant, bold sans-serif or serif font
- Display the date EXACTLY as provided in [DATE_VALUE]
- CRITICAL: Date text color MUST be [PRIMARY_COLOR] (the primary color)
- DO NOT change, modify, reformat, or reinterpret [DATE_VALUE]
- DO NOT use any date other than [DATE_VALUE]
- Text should be large, bold, and clearly legible
- Add generous spacing between date and heart (similar to reference)

USER-PROVIDED VALUES:
- Date to display: [DATE_VALUE]
- Date format: [DATE_FORMAT]
- Primary color: [PRIMARY_COLOR]
- Background color: [INVERSE_COLOR]
- RENDER THESE EXACT VALUES - DO NOT SUBSTITUTE OR MODIFY

TECHNICAL REQUIREMENTS:
- Output resolution: minimum 2000x2000 pixels
- Maintain crisp, clean lines on all drawn elements
- Ensure perfect color separation between [PRIMARY_COLOR] and [INVERSE_COLOR]
- No gradients, shadows, or anti-aliasing artifacts that would interfere with background removal
- The entire background field must be solid [INVERSE_COLOR] with no variation

STYLE MATCHING (from reference image):
- Match the whimsical, hand-drawn quality of the reference heart and bow design
- Keep line weights consistent (medium thickness, not too thin or heavy)
- Bow should look dimensional with overlapping ribbon loops
- Heart should have slight asymmetry for organic, romantic feel
- Overall aesthetic: elegant, romantic, save-the-date card design

CRITICAL REMINDERS:
1. The first image = design template for STYLE ONLY (frame, bow, layout, text placement)
2. The second image = the ONLY SOURCE for people/subjects to include
3. DO NOT mix people from both images
4. DO NOT generate new people not shown in the second image
5. ONLY apply black and white filter to second image subjects - do not alter their identity, count, or appearance
6. PRIMARY COLOR [PRIMARY_COLOR] MUST be used for: heart frame, bow, ribbons, AND date text - NO EXCEPTIONS
7. BACKGROUND COLOR [INVERSE_COLOR] MUST be used for: all background areas including inside the heart around subjects
8. USE THE EXACT DATE VALUE [DATE_VALUE] AS-IS - DO NOT MODIFY, REFORMAT, OR SUBSTITUTE
9. The output must have only two colors - [PRIMARY_COLOR] for all line art and text, and [INVERSE_COLOR] for the entire background
10. Subjects remain in black and white grayscale on top of the [INVERSE_COLOR] background`,
    panel_schema: {
      showStyleTweaks: false,
      fields: [
        {
          type: 'date',
          id: 'eventDate',
          label: 'Event Date',
          required: true,
        },
        {
          type: 'select',
          id: 'dateFormat',
          label: 'Date Format',
          defaultValue: 'roman',
          options: [
            { value: 'roman', label: 'Roman Numerals (I.XII.MMXXV)' },
            { value: 'standard', label: 'Standard (2025.12.01)' },
          ],
        },
        {
          type: 'colorPicker',
          id: 'primaryColor',
          label: 'Primary Color',
          hint: '(Heart, bow & date)',
          defaultValue: '#c41e3a', // Deep romantic red
        },
      ],
    },
    upload_tips: {
      title: 'Best Photos for Save The Date',
      tips: [
        'Use a <strong>couple portrait photo</strong> showing both people clearly',
        'Choose photos with <strong>good lighting on faces</strong> for best B&W conversion',
        'Photos with <strong>simple backgrounds</strong> work best for subject extraction',
        'Intimate poses (close together, embracing) work great for the heart frame',
        'Higher resolution photos (but max 10MB per file)',
      ],
    },
    max_photos: 1,
    gradient: 'from-rose-600 to-red-700',
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
