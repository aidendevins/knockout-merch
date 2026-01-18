import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, AlertCircle, RefreshCw, Heart, ImageIcon, Check, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { COLOR_PRESETS, getColorHex, getBuildPromptFunction } from '@/config/templates';
import { cn } from '@/lib/utils';

// Dynamic field renderer component
function DynamicField({ field, value, onChange }) {
  switch (field.type) {
    case 'text':
      return (
        <div className="space-y-1.5">
          <label className="text-xs text-white/60 flex items-center gap-1">
            {field.label}
            {field.required && <span className="text-pink-500">*</span>}
          </label>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => {
              // Enforce maxLength if specified
              if (field.maxLength && e.target.value.length > field.maxLength) {
                return;
              }
              onChange(e.target.value);
            }}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-pink-900/30 text-white placeholder:text-white/30 text-sm focus:border-pink-600 focus:outline-none"
          />
          {field.maxLength && (
            <div className="text-xs text-white/40 text-right">
              {(value || '').length} / {field.maxLength}
            </div>
          )}
        </div>
      );

    case 'textarea':
      return (
        <div className="space-y-1.5">
          <label className="text-xs text-white/60 flex items-center gap-1">
            {field.label}
            {field.required && <span className="text-pink-500">*</span>}
          </label>
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="bg-black/40 border-pink-900/30 text-white placeholder:text-white/40 min-h-[80px] resize-none focus:border-pink-600"
          />
        </div>
      );

    case 'colorPicker':
      return (
        <div className="space-y-1.5">
          <label className="text-xs text-white/60 flex items-center gap-1">
            {field.label}
            {field.hint && <span className="text-white/40">{field.hint}</span>}
          </label>
          <div className="flex items-center gap-2">
            {/* Current color preview */}
            <div 
              className="w-10 h-10 rounded-lg border-2 border-white/20 shadow-inner flex-shrink-0"
              style={{ backgroundColor: value || field.defaultValue }}
            />
            {/* Color presets grid */}
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  onClick={() => onChange(color)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                    (value || field.defaultValue) === color 
                      ? "border-white shadow-lg shadow-white/20" 
                      : "border-transparent hover:border-white/50"
                  )}
                  style={{ backgroundColor: color }}
                >
                  {(value || field.defaultValue) === color && (
                    <Check className={cn(
                      "w-3 h-3 mx-auto",
                      ['#ffffff', '#eab308', '#22c55e'].includes(color) ? 'text-black' : 'text-white'
                    )} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      );

    case 'select':
      return (
        <div className="space-y-1.5">
          <label className="text-xs text-white/60 flex items-center gap-1">
            {field.label}
            {field.required && <span className="text-pink-500">*</span>}
          </label>
          <select
            value={value || field.defaultValue || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-pink-900/30 text-white text-sm focus:border-pink-600 focus:outline-none"
          >
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );

    default:
      return null;
  }
}

export default function AIPanel({
  uploadedPhotos = [],
  selectedTemplate,
  onImageGenerated,
  generatedImage,
  isGenerating,
  setIsGenerating,
  isRemovingBackground = false,
  cachedGeminiImage = null,
  onRetryBackgroundRemoval = null,
  selectedColor = 'black', // The product color selected in the template picker
}) {
  const [fieldValues, setFieldValues] = useState({});
  const [styleTweaks, setStyleTweaks] = useState('');
  const [error, setError] = useState(null);

  // Initialize field values when template changes
  useEffect(() => {
    if (selectedTemplate?.panelSchema?.fields) {
      const initialValues = {};
      selectedTemplate.panelSchema.fields.forEach((field) => {
        if (field.defaultValue !== undefined) {
          initialValues[field.id] = field.defaultValue;
        }
      });
      setFieldValues(initialValues);
    }
    
    // Debug: Log template object when it changes
    if (selectedTemplate) {
      console.log('🔍 Template object updated:', {
        id: selectedTemplate.id,
        name: selectedTemplate.name,
        hasPrompt: !!selectedTemplate.prompt,
        promptType: typeof selectedTemplate.prompt,
        promptValue: selectedTemplate.prompt,
        hasBuildPrompt: !!selectedTemplate.buildPrompt,
        buildPromptType: typeof selectedTemplate.buildPrompt,
      });
    }
  }, [selectedTemplate?.id]);

  const updateFieldValue = (fieldId, value) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  // Build the full prompt - prioritizes database prompt over buildPrompt function
  const buildPrompt = () => {
    if (!selectedTemplate) {
      console.warn('⚠️ No template selected');
      return '';
    }

    // Get background color hex from the selected product color
    const backgroundColorHex = getColorHex(selectedColor);
    const photoCount = uploadedPhotos.length;

    // PRIORITY 1: Use database prompt if available (edited via admin panel)
    if (selectedTemplate.prompt && selectedTemplate.prompt.trim()) {
      let prompt = selectedTemplate.prompt;
      
      // Collect user text inputs and replace placeholders
      const textInputs = [];
      let hasReplacedPlaceholder = false;
      
      selectedTemplate.panelSchema?.fields?.forEach((field) => {
        if (field.type === 'text' || field.type === 'textarea') {
          const fieldValue = fieldValues[field.id];
          if (fieldValue !== undefined && fieldValue !== null && String(fieldValue).trim() !== '') {
            const textValue = String(fieldValue).trim();
            textInputs.push(textValue);
            
            // Replace [USER TEXT] placeholder with actual text value
            // This handles templates that use [USER TEXT] as a placeholder
            if (prompt.includes('[USER TEXT]')) {
              prompt = prompt.replace(/\[USER TEXT\]/g, textValue);
              hasReplacedPlaceholder = true;
            }
          }
        }
      });

      // If [USER TEXT] wasn't found in prompt, append text inputs at the end (backwards compatibility)
      if (textInputs.length > 0 && !hasReplacedPlaceholder) {
        prompt += `\n\nTEXT: ${textInputs.join(', ')}`;
      }

      // Add style tweaks if enabled and provided
      if (selectedTemplate.panelSchema?.showStyleTweaks && styleTweaks.trim()) {
        prompt += `\n\n**Additional Style Instructions:** ${styleTweaks}`;
      }

      console.log('📝 Using database prompt (from admin panel)');
      console.log('📋 Text inputs appended:', textInputs);
      return prompt;
    }

    // PRIORITY 2: Use buildPrompt function from templates.js config
    // Try to get buildPrompt from template object first, then fallback to importing it
    console.log('🔍 PRIORITY 2: Checking for buildPrompt function...');
    console.log('   Template ID:', selectedTemplate.id);
    console.log('   Template object keys:', Object.keys(selectedTemplate));
    console.log('   Template has buildPrompt property:', !!selectedTemplate.buildPrompt);
    console.log('   buildPrompt type:', typeof selectedTemplate.buildPrompt);
    console.log('   buildPrompt value:', selectedTemplate.buildPrompt);
    
    let buildPromptFn = selectedTemplate.buildPrompt;
    
    // If not found on template object, try to get it directly
    if (!buildPromptFn && selectedTemplate.id) {
      console.log('   ⚠️ Template object missing buildPrompt, trying getBuildPromptFunction...');
      try {
        buildPromptFn = getBuildPromptFunction(selectedTemplate.id);
        console.log('   getBuildPromptFunction returned type:', typeof buildPromptFn);
        console.log('   getBuildPromptFunction returned value:', buildPromptFn ? 'function exists' : 'null/undefined');
      } catch (err) {
        console.error('   ❌ Error calling getBuildPromptFunction:', err);
      }
    }
    
    // Last resort: hardcode for retro-name-portrait if ID matches
    // This is a direct fix to ensure retro-name-portrait always works
    if (!buildPromptFn && selectedTemplate.id === 'retro-name-portrait') {
      console.log('   ⚠️ Attempting direct import fallback for retro-name-portrait...');
      buildPromptFn = getBuildPromptFunction('retro-name-portrait');
      
      // If that still doesn't work, we'll inline the logic as a final fallback
      if (!buildPromptFn || typeof buildPromptFn !== 'function') {
        console.log('   ⚠️ getBuildPromptFunction failed, using inline fallback for retro-name-portrait...');
        // Inline fallback - directly build the prompt for retro-name-portrait
        const personName = fieldValues.customName || 'AMELIA';
        const textColor = fieldValues.textColor || '#3b82f6';
        const bgColor = backgroundColorHex || '#fef3c7';
        
        return `MASTER PROMPT — FACE + 5-LINE SINGLE-NAME REPEAT (EXACT SPELLING + MAX FONT MATCH + UNIFORM LETTER SPACING)

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
      }
    }
    
    if (buildPromptFn && typeof buildPromptFn === 'function') {
      console.log('✅ Found buildPrompt function! Using it now...');
      console.log('📋 Template ID:', selectedTemplate.id);
      console.log('📋 Field values:', fieldValues);
      console.log('📋 Background color:', backgroundColorHex);
      console.log('📋 Photo count:', photoCount);
      
      try {
        const prompt = buildPromptFn(fieldValues, backgroundColorHex, photoCount, styleTweaks);
        console.log('📝 Generated prompt length:', prompt?.length || 0);
        console.log('📝 Prompt preview (first 200 chars):', prompt?.substring(0, 200));
        
        if (!prompt || !prompt.trim()) {
          console.error('❌ buildPrompt function returned empty prompt');
          console.error('   Field values were:', fieldValues);
        } else {
          return prompt;
        }
      } catch (err) {
        console.error('❌ Error executing buildPrompt function:', err);
      }
    } else {
      console.error('❌ No buildPrompt function available');
      console.error('   Template ID:', selectedTemplate.id);
      console.error('   buildPromptFn:', buildPromptFn);
    }

    // PRIORITY 3: Fallback to old prompt building method (for backwards compatibility)
    console.log('📝 Using fallback prompt method - THIS SHOULD NOT HAPPEN FOR retro-name-portrait');
    console.log('   ⚠️ PRIORITY 2 failed - buildPrompt not available');
    let prompt = selectedTemplate.aiPrompt || '';
    
    // Add field-specific prompt parts
    selectedTemplate.panelSchema?.fields?.forEach((field) => {
      const value = fieldValues[field.id];
      if (value && field.promptTemplate) {
        prompt += ' ' + field.promptTemplate.replace('{value}', value);
      }
    });

    // Add style tweaks if enabled and provided
    if (selectedTemplate.panelSchema?.showStyleTweaks && styleTweaks.trim()) {
      prompt += ` Additional style: ${styleTweaks}`;
    }

    return prompt;
  };

  // Validate required fields
  const validateFields = () => {
    if (!selectedTemplate?.panelSchema?.fields) return { valid: true };

    for (const field of selectedTemplate.panelSchema.fields) {
      if (field.required && !fieldValues[field.id]?.trim()) {
        return { valid: false, message: `${field.label} is required` };
      }
    }
    return { valid: true };
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      setError('Please select a template first');
      return;
    }

    if (uploadedPhotos.length === 0) {
      setError('Please upload at least one photo');
      return;
    }

    const validation = validateFields();
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const fullPrompt = buildPrompt();
      
      // Validate prompt is not empty
      if (!fullPrompt || !fullPrompt.trim()) {
        setError('Prompt is required. Please check that all required fields are filled.');
        setIsGenerating(false);
        console.error('❌ Empty prompt generated. Template:', selectedTemplate?.id);
        console.error('   Template has buildPrompt:', !!selectedTemplate?.buildPrompt);
        console.error('   Template has prompt:', !!selectedTemplate?.prompt);
        console.error('   Field values:', fieldValues);
        return;
      }
      
      const photoUrls = uploadedPhotos.map(p => p.preview);

      console.log('Generating design with prompt length:', fullPrompt.length);
      console.log('Number of photos:', photoUrls.length);

      const result = await base44.integrations.Core.GenerateImage({
        prompt: fullPrompt,
        existing_image_urls: photoUrls,
        template_id: selectedTemplate?.id, // Pass template ID to fetch reference image
      });

      if (result?.url) {
        // onImageGenerated is async and handles setting isGenerating to false
        // Don't await it here - it will manage the loading state
        await onImageGenerated(result);
      }
    } catch (err) {
      console.error('Generation error:', err);

      const errorMessage = err.message?.toLowerCase() || '';
      const errorCode = err.code;
      const errorStatus = err.status;

      if (errorCode === 'S3_CONFIG_ERROR' || errorMessage.includes('does not allow acls') || errorMessage.includes('s3 bucket')) {
        setError('☁️ Storage configuration error. Please contact support.');
      } else if (errorCode === 'MODEL_NOT_SUPPORTED' || errorMessage.includes('does not support')) {
        setError('🚫 Image generation is not supported by the current AI model.');
      } else if (errorCode === 'MODEL_OVERLOADED' || errorStatus === 503 || errorMessage.includes('overloaded')) {
        setError('🔥 AI model is overloaded. Please wait 30 seconds and try again.');
      } else if (errorCode === 'RATE_LIMITED' || errorStatus === 429 || errorMessage.includes('rate limit')) {
        setError('⏳ Too many requests. Please wait a minute.');
      } else if (errorCode === 'NETWORK_ERROR' || errorMessage.includes('network')) {
        setError('📡 Network error. Please check your connection.');
      } else {
        setError(err.message || 'Failed to generate image. Please try again.');
      }
      // On error, stop loading immediately
      setIsGenerating(false);
    }
    // Note: On success, handleImageGenerated will manage setting isGenerating to false
    // This allows background removal to complete before stopping the loading state
  };

  const canGenerate = selectedTemplate && uploadedPhotos.length > 0;
  const schema = selectedTemplate?.panelSchema;

  // Get background color hex for display
  const backgroundColorHex = getColorHex(selectedColor);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-red-950/30 to-black border-r border-pink-900/30">
      {/* Header */}
      <div className="p-4 border-b border-pink-900/30">
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-5 h-5 text-pink-500" />
          <h3 className="font-bold text-white">AI Designer</h3>
        </div>
        <p className="text-xs text-white/60">
          {selectedTemplate ? selectedTemplate.name : 'Select a template to start'}
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        {/* Template info */}
        {selectedTemplate && (
          <div className="mb-4 p-3 rounded-lg bg-pink-600/10 border border-pink-900/30">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-pink-400" />
              <span className="text-white text-sm font-medium">{selectedTemplate.name}</span>
            </div>
            <p className="text-white/50 text-xs">{selectedTemplate.description}</p>
            {/* Show selected background color */}
            <div className="flex items-center gap-2 mt-2">
              <div 
                className="w-4 h-4 rounded border border-white/20"
                style={{ backgroundColor: backgroundColorHex }}
              />
              <span className="text-white/40 text-xs">Background: {selectedColor}</span>
            </div>
          </div>
        )}

        {/* Photos status */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/60">Photos for design</span>
            <Badge 
              variant="outline" 
              className={uploadedPhotos.length > 0 ? "border-pink-600/50 text-pink-400" : "border-pink-900/30 text-white/40"}
            >
              {uploadedPhotos.length} / {selectedTemplate?.maxPhotos || 9}
            </Badge>
          </div>
          
          {uploadedPhotos.length > 0 ? (
            <div className="flex gap-1 flex-wrap">
              {uploadedPhotos.slice(0, 4).map((photo) => (
                <img 
                  key={photo.id}
                  src={photo.preview}
                  alt=""
                  className="w-10 h-10 object-cover rounded border border-pink-900/30"
                />
              ))}
              {uploadedPhotos.length > 4 && (
                <div className="w-10 h-10 rounded border border-pink-900/30 bg-black/40 flex items-center justify-center text-white/60 text-xs">
                  +{uploadedPhotos.length - 4}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-white/40 text-xs p-3 rounded-lg border border-dashed border-pink-900/30">
              <ImageIcon className="w-4 h-4" />
              <span>Upload photos on the right panel →</span>
            </div>
          )}
        </div>

        {/* Dynamic fields from schema */}
        {schema?.fields && schema.fields.length > 0 && (
          <div className="space-y-4 mb-4">
            {schema.fields.map((field) => (
              <DynamicField
                key={field.id}
                field={field}
                value={fieldValues[field.id]}
                onChange={(value) => updateFieldValue(field.id, value)}
              />
            ))}
          </div>
        )}

        {/* Style tweaks - only if enabled in schema */}
        {schema?.showStyleTweaks && (
          <div className="mb-4">
            <label className="text-xs text-white/60 mb-1.5 block">Style tweaks (optional)</label>
            <Textarea
              value={styleTweaks}
              onChange={(e) => setStyleTweaks(e.target.value)}
              placeholder="Add any extra style instructions..."
              className="bg-black/40 border-pink-900/30 text-white placeholder:text-white/40 min-h-[80px] resize-none focus:border-pink-600"
            />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 text-pink-400 text-sm bg-pink-500/10 p-3 rounded-lg border border-pink-900/30 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !canGenerate}
          className="w-full bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white font-bold shadow-lg shadow-pink-600/30 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isRemovingBackground ? 'Removing Background...' : 'Creating Magic...'}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Design
            </>
          )}
        </Button>

        {!canGenerate && !isGenerating && (
          <p className="text-xs text-white/40 text-center mt-2">
            {!selectedTemplate ? 'Select a template first' : 'Upload at least one photo'}
          </p>
        )}

        {/* Generated preview */}
        <AnimatePresence>
          {generatedImage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleGenerate}
                  disabled={isGenerating || !canGenerate}
                  className="text-white/60 hover:text-white hover:bg-pink-600/10 h-6 text-xs whitespace-nowrap"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Regenerate
                </Button>
                {/* Retry background removal button - only show if template has background removal and cached image exists */}
                {cachedGeminiImage && 
                 onRetryBackgroundRemoval && 
                 (selectedTemplate?.remove_background === 'remove-simple' || 
                  selectedTemplate?.remove_background === 'remove-complex' ||
                  selectedTemplate?.removeBackground === true) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onRetryBackgroundRemoval}
                    disabled={isRemovingBackground}
                    className="text-white/60 hover:text-white hover:bg-pink-600/10 text-xs min-h-[24px] h-auto py-1"
                  >
                    <div className="flex items-center gap-1 text-right">
                      {isRemovingBackground ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                          <span className="whitespace-normal">Removing...</span>
                        </>
                      ) : (
                        <>
                          {/* <Scissors className="w-3 h-3 flex-shrink-0" /> */}
                          <div className="flex flex-col items-end leading-tight">
                            <span>Retry Background</span>
                            <span>Removal</span>
                          </div>
                        </>
                      )}
                    </div>
                  </Button>
                )}
              </div>
              <div className="relative rounded-lg overflow-hidden border border-pink-900/30">
                <img 
                  key={generatedImage}
                  src={generatedImage} 
                  alt="Generated design"
                  className="w-full aspect-square object-contain bg-black/40"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}
