import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, AlertCircle, RefreshCw, Heart, ImageIcon, Check, Scissors, History, Repeat2, Upload, X, Info, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { COLOR_PRESETS, getColorHex, getBuildPromptFunction } from '@/config/templates';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Helper function to compute inverse/contrasting hex color
function getInverseHexColor(hexColor) {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Invert the colors
  const invR = (255 - r).toString(16).padStart(2, '0');
  const invG = (255 - g).toString(16).padStart(2, '0');
  const invB = (255 - b).toString(16).padStart(2, '0');
  
  return `#${invR}${invG}${invB}`;
}

// Helper function to convert number to Roman numerals
function toRomanNumeral(num) {
  const romanNumerals = [
    { value: 1000, numeral: 'M' },
    { value: 900, numeral: 'CM' },
    { value: 500, numeral: 'D' },
    { value: 400, numeral: 'CD' },
    { value: 100, numeral: 'C' },
    { value: 90, numeral: 'XC' },
    { value: 50, numeral: 'L' },
    { value: 40, numeral: 'XL' },
    { value: 10, numeral: 'X' },
    { value: 9, numeral: 'IX' },
    { value: 5, numeral: 'V' },
    { value: 4, numeral: 'IV' },
    { value: 1, numeral: 'I' },
  ];

  let result = '';
  let remaining = num;

  for (const { value, numeral } of romanNumerals) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }

  return result;
}

// Helper function to format date based on format type
function formatDateValue(dateString, formatType) {
  if (!dateString) return '';
  
  // Parse date string manually to avoid timezone issues
  // Date input format is YYYY-MM-DD
  const parts = dateString.split('-');
  if (parts.length !== 3) {
    // Fallback to Date object if format is unexpected
    const date = new Date(dateString);
    const day = date.getUTCDate();
    const month = date.getUTCMonth() + 1;
    const year = date.getUTCFullYear();
    
    if (formatType === 'roman') {
      return `${toRomanNumeral(day)}.${toRomanNumeral(month)}.${toRomanNumeral(year)}`;
    } else {
      const paddedMonth = month.toString().padStart(2, '0');
      const paddedDay = day.toString().padStart(2, '0');
      return `${year}.${paddedMonth}.${paddedDay}`;
    }
  }
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  if (formatType === 'roman') {
    // Roman numeral format: D.M.YYYY (e.g., I.XII.MMXXV)
    return `${toRomanNumeral(day)}.${toRomanNumeral(month)}.${toRomanNumeral(year)}`;
  } else {
    // Standard format: YYYY.MM.DD
    const paddedMonth = month.toString().padStart(2, '0');
    const paddedDay = day.toString().padStart(2, '0');
    return `${year}.${paddedMonth}.${paddedDay}`;
  }
}

// Dynamic field renderer component
function DynamicField({ field, value, onChange, excludeShirtColorHex = null, shouldExcludeShirtColor = false }) {
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
      // Helper to check if a color is dark (needs white border for visibility)
      const isDarkColor = (hex) => {
        if (!hex) return false;
        const cleanHex = hex.replace('#', '');
        const r = parseInt(cleanHex.substr(0, 2), 16);
        const g = parseInt(cleanHex.substr(2, 2), 16);
        const b = parseInt(cleanHex.substr(4, 2), 16);
        // Calculate relative luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance < 0.3; // Dark if luminance is below 30%
      };

      // Helper to get luminance of a color
      const getLuminance = (hex) => {
        if (!hex) return 0.5;
        const cleanHex = hex.replace('#', '');
        const r = parseInt(cleanHex.substr(0, 2), 16);
        const g = parseInt(cleanHex.substr(2, 2), 16);
        const b = parseInt(cleanHex.substr(4, 2), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      };

      // Filter out colors that match the shirt color
      // Only apply this filter if shouldExcludeShirtColor is true (text_behavior is 'user-controlled')
      // If shirt is white, exclude white from presets
      // If shirt is black, exclude black from presets
      // Light pink: no exclusions (light pink isn't typically used as text color)
      const filteredPresets = COLOR_PRESETS.filter((color) => {
        if (!shouldExcludeShirtColor || !excludeShirtColorHex) return true;
        
        const shirtHex = excludeShirtColorHex.toLowerCase();
        const presetHex = color.toLowerCase();
        
        // Check for white shirt specifically (#f5f5f5) - exclude white preset (#ffffff)
        if ((shirtHex === '#f5f5f5' || shirtHex === '#ffffff') && presetHex === '#ffffff') {
          return false;
        }
        
        // Check for black shirt specifically (#1a1a1a) - exclude black preset (#000000)
        if ((shirtHex === '#1a1a1a' || shirtHex === '#000000' || shirtHex === '#111111') && presetHex === '#000000') {
          return false;
        }
        
        return true;
      });

      return (
        <div className="space-y-1.5">
          <label className="text-xs text-white/60 flex items-center gap-1">
            {field.label}
            {field.hint && <span className="text-white/40">{field.hint}</span>}
          </label>
          <div className="flex items-center gap-2">
            {/* Current color preview */}
            <div 
              className={cn(
                "w-10 h-10 rounded-lg shadow-inner flex-shrink-0",
                isDarkColor(value || field.defaultValue) 
                  ? "border-2 border-white/50" 
                  : "border-2 border-white/20"
              )}
              style={{ backgroundColor: value || field.defaultValue }}
            />
            {/* Color presets grid */}
            <div className="flex flex-wrap gap-1.5">
              {filteredPresets.map((color) => {
                const isSelected = (value || field.defaultValue) === color;
                const colorIsDark = isDarkColor(color);
                
                return (
                  <button
                    key={color}
                    onClick={() => onChange(color)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                      isSelected 
                        ? "border-white shadow-lg shadow-white/20" 
                        : colorIsDark 
                          ? "border-white/40 hover:border-white/70" 
                          : "border-transparent hover:border-white/50"
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {isSelected && (
                      <Check className={cn(
                        "w-3 h-3 mx-auto",
                        ['#ffffff', '#eab308', '#22c55e'].includes(color) ? 'text-black' : 'text-white'
                      )} />
                    )}
                  </button>
                );
              })}
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

    case 'date':
      return (
        <div className="space-y-1.5">
          <label className="text-xs text-white/60 flex items-center gap-1">
            {field.label}
            {field.required && <span className="text-pink-500">*</span>}
          </label>
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-pink-900/30 text-white text-sm focus:border-pink-600 focus:outline-none [color-scheme:dark]"
          />
          {field.hint && (
            <div className="text-xs text-white/40">{field.hint}</div>
          )}
        </div>
      );

    default:
      return null;
  }
}

export default function AIPanel({
  uploadedPhotos = [],
  onPhotosChange,
  maxPhotos = 9,
  selectedTemplate,
  onImageGenerated,
  generatedImage,
  isGenerating,
  setIsGenerating,
  isRemovingBackground = false,
  cachedGeminiImage = null,
  onRetryBackgroundRemoval = null,
  selectedColor = 'black', // The product color selected in the template picker
  onChangeTemplate = null, // Callback to open template picker
}) {
  const [fieldValues, setFieldValues] = useState({});
  const [styleTweaks, setStyleTweaks] = useState('');
  const [error, setError] = useState(null);
  const [previousDesigns, setPreviousDesigns] = useState([]);
  
  // Photo upload state (for mobile)
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // Photo upload handlers (for mobile)
  const processFiles = useCallback(async (files) => {
    setUploadError(null);
    
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    const validFiles = fileArray.filter(file => {
      if (!file.type.startsWith('image/')) {
        setUploadError('Please upload only image files');
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('Images must be under 10MB');
        return false;
      }
      return true;
    });

    const remainingSlots = maxPhotos - uploadedPhotos.length;
    if (validFiles.length > remainingSlots) {
      setUploadError(`You can only add ${remainingSlots} more photo${remainingSlots !== 1 ? 's' : ''}`);
      validFiles.splice(remainingSlots);
    }

    if (validFiles.length === 0) return;

    const newPhotos = [];
    for (const file of validFiles) {
      try {
        const photoData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target.result;
            const img = new Image();
            img.onload = () => {
              resolve({
                id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                file,
                preview: dataUrl,
                name: file.name,
              });
            };
            img.onerror = () => reject(new Error('Invalid image'));
            img.src = dataUrl;
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
        newPhotos.push(photoData);
      } catch (error) {
        console.error(`Failed to load image: ${file.name}`, error);
      }
    }
    
    if (newPhotos.length > 0 && onPhotosChange) {
      onPhotosChange([...uploadedPhotos, ...newPhotos]);
    }
  }, [uploadedPhotos, maxPhotos, onPhotosChange]);

  const handleFileInput = useCallback((e) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      e.target.value = '';
      return;
    }
    processFiles(files);
    e.target.value = '';
    setShowUploadModal(false);
  }, [processFiles]);

  const handleUploadClick = useCallback(() => {
    setShowUploadModal(true);
  }, []);

  const handleModalContinue = () => {
    setShowUploadModal(false);
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 50);
  };

  const handleRemovePhoto = useCallback((photoId) => {
    if (onPhotosChange) {
      onPhotosChange(uploadedPhotos.filter(p => p.id !== photoId));
    }
    setUploadError(null);
  }, [uploadedPhotos, onPhotosChange]);

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
    // Clear previous designs when template changes
    setPreviousDesigns([]);
  }, [selectedTemplate?.id]);

  const updateFieldValue = (fieldId, value) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  // Restore a previous design
  const restorePreviousDesign = (imageUrl, index) => {
    // Save current design to history before restoring
    if (generatedImage) {
      setPreviousDesigns(prev => {
        // Remove the selected design from history and add current to front
        const newHistory = prev.filter((_, i) => i !== index);
        return [generatedImage, ...newHistory];
      });
    }
    // Restore the selected design
    onImageGenerated({ url: imageUrl, skipBackgroundRemoval: true });
  };

  // Build the full prompt - prioritizes database prompt over buildPrompt function
  const buildPrompt = () => {
    if (!selectedTemplate) {
      return '';
    }

    // Get background color hex from the selected product color
    const backgroundColorHex = getColorHex(selectedColor);
    const photoCount = uploadedPhotos.length;

    // PRIORITY 1: Use database prompt if available (edited via admin panel)
    if (selectedTemplate.prompt && selectedTemplate.prompt.trim()) {
      let prompt = selectedTemplate.prompt;
      
      // Get dateFormat value (needed for date formatting)
      let dateFormatValue = 'standard';
      selectedTemplate.panelSchema?.fields?.forEach((field) => {
        if (field.type === 'select' && field.id === 'dateFormat') {
          const fieldValue = fieldValues[field.id];
          dateFormatValue = fieldValue || field.defaultValue || 'standard';
        }
      });

      // Collect all field values and append instructions at the end
      const instructions = [];
      
      selectedTemplate.panelSchema?.fields?.forEach((field) => {
        const fieldValue = fieldValues[field.id];
        const value = fieldValue !== undefined && fieldValue !== null && fieldValue !== '' 
          ? fieldValue 
          : field.defaultValue;
        
        if (value === undefined || value === null || value === '') {
          return; // Skip empty values
        }
        
        // Handle colorPicker fields
        if (field.type === 'colorPicker' && field.id === 'primaryColor') {
          const colorValue = value;
          const inverseColor = getInverseHexColor(colorValue);
          
          if (prompt.includes('[PRIMARY_COLOR]')) {
            instructions.push(`use [PRIMARY_COLOR] = ${colorValue}`);
          }
          if (prompt.includes('[INVERSE_COLOR]')) {
            instructions.push(`use [INVERSE_COLOR] = ${inverseColor}`);
          }
        }
        
        // Handle date fields
        if (field.type === 'date' && field.id === 'eventDate') {
          const formattedDate = formatDateValue(value, dateFormatValue);
          if (prompt.includes('[DATE_VALUE]')) {
            instructions.push(`use [DATE_VALUE] = ${formattedDate}`);
          }
        }
        
        // Handle select fields for date format
        if (field.type === 'select' && field.id === 'dateFormat') {
          if (prompt.includes('[DATE_FORMAT]')) {
            instructions.push(`use [DATE_FORMAT] = ${value}`);
          }
        }
        
        // Handle text/textarea fields
        if (field.type === 'text' || field.type === 'textarea') {
          const textValue = String(value).trim();
          if (textValue) {
            if (prompt.includes('[USER TEXT]')) {
              instructions.push(`use [USER TEXT] = ${textValue}`);
            } else {
              instructions.push(`TEXT: ${textValue}`);
            }
          }
        }
      });

      // Append all instructions at the end
      if (instructions.length > 0) {
        prompt += '\n\n' + instructions.join('\n');
      }

      // Add style tweaks if enabled and provided
      if (selectedTemplate.panelSchema?.showStyleTweaks && styleTweaks.trim()) {
        prompt += `\n\n**Additional Style Instructions:** ${styleTweaks}`;
      }

      return prompt;
    }

    // PRIORITY 2: Use buildPrompt function from templates.js config
    // Try to get buildPrompt from template object first, then fallback to importing it
    let buildPromptFn = selectedTemplate.buildPrompt;
    
    // If not found on template object, try to get it directly
    if (!buildPromptFn && selectedTemplate.id) {
      try {
        buildPromptFn = getBuildPromptFunction(selectedTemplate.id);
      } catch (err) {
        // Silently handle error
      }
    }
    
    // Last resort: hardcode for retro-name-portrait if ID matches
    // This is a direct fix to ensure retro-name-portrait always works
    if (!buildPromptFn && selectedTemplate.id === 'retro-name-portrait') {
      buildPromptFn = getBuildPromptFunction('retro-name-portrait');
      
      // If that still doesn't work, we'll inline the logic as a final fallback
      if (!buildPromptFn || typeof buildPromptFn !== 'function') {
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
      try {
        const prompt = buildPromptFn(fieldValues, backgroundColorHex, photoCount, styleTweaks);
        if (prompt && prompt.trim()) {
          return prompt;
        }
      } catch (err) {
        // Silently handle error, fall through to fallback
      }
    }

    // PRIORITY 3: Fallback to old prompt building method (for backwards compatibility)
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
      const value = fieldValues[field.id];
      
      // Check required fields
      if (field.required && !value?.trim()) {
        return { valid: false, message: `${field.label} is required` };
      }
      
      // Check validation rules (only if field has a value)
      if (field.validation && value?.trim()) {
        const validation = field.validation;
        
        switch (validation.type) {
          case 'contains':
            const searchValue = validation.caseSensitive ? value : value.toLowerCase();
            const searchTerm = validation.caseSensitive ? validation.value : validation.value.toLowerCase();
            
            if (!searchValue.includes(searchTerm)) {
              return { 
                valid: false, 
                message: validation.errorMessage || `${field.label} must contain "${validation.value}"` 
              };
            }
            break;
            
          case 'regex':
            const regex = new RegExp(validation.pattern, validation.flags || '');
            if (!regex.test(value)) {
              return { 
                valid: false, 
                message: validation.errorMessage || `${field.label} format is invalid` 
              };
            }
            break;
            
          case 'minLength':
            if (value.length < validation.value) {
              return { 
                valid: false, 
                message: validation.errorMessage || `${field.label} must be at least ${validation.value} characters` 
              };
            }
            break;
            
          case 'maxLength':
            if (value.length > validation.value) {
              return { 
                valid: false, 
                message: validation.errorMessage || `${field.label} must be no more than ${validation.value} characters` 
              };
            }
            break;
        }
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

    // Save current design to history if regenerating
    if (generatedImage) {
      setPreviousDesigns(prev => [generatedImage, ...prev]);
    }

    // Track Facebook Pixel ViewContent event
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'ViewContent', {
        value: 1.00,
      });
    }

    setIsGenerating(true);
    setError(null);

    try {
      const fullPrompt = buildPrompt();
      
      // Validate prompt is not empty
      if (!fullPrompt || !fullPrompt.trim()) {
        setError('Prompt is required. Please check that all required fields are filled.');
        setIsGenerating(false);
        return;
      }
      
      const photoUrls = uploadedPhotos.map(p => p.preview);

      const result = await base44.integrations.Core.GenerateImage({
        prompt: fullPrompt,
        existing_image_urls: photoUrls,
        template_id: selectedTemplate?.id, // Pass template ID to fetch reference image
      });

      // Show fallback notification if fallback model was used
      if (result?.fallbackUsed) {
        toast.warning('Nano Banana Pro is not working, trying Nano Banana', {
          duration: 5000,
        });
      }

      if (result?.url) {
        // onImageGenerated is async and handles setting isGenerating to false
        // Don't await it here - it will manage the loading state
        await onImageGenerated(result);
      }
    } catch (err) {
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
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span className="text-white text-sm font-medium">{selectedTemplate.name}</span>
              </div>
              {onChangeTemplate && (
                <button
                  onClick={onChangeTemplate}
                  className="flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 transition-colors"
                >
                  <Repeat2 className="w-3 h-3" />
                  Change
                </button>
              )}
            </div>
            <p className="text-white/50 text-xs">{selectedTemplate.description}</p>
            {/* Show selected background color */}
            <div className="flex items-center gap-2 mt-2">
              <div 
                className={cn(
                  "w-4 h-4 rounded",
                  // Add white border for dark colors to make them visible
                  ['#000000', '#1a1a1a', '#111111', '#0a0a0a'].some(dark => 
                    backgroundColorHex?.toLowerCase() === dark || 
                    backgroundColorHex?.toLowerCase().startsWith('#0') ||
                    backgroundColorHex?.toLowerCase().startsWith('#1')
                  ) ? "border-2 border-white/40" : "border border-white/20"
                )}
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
              {uploadedPhotos.length} / {maxPhotos}
            </Badge>
          </div>
          
          {uploadedPhotos.length > 0 ? (
            <div className="space-y-2">
              <div className="flex gap-1 flex-wrap">
                {uploadedPhotos.slice(0, 4).map((photo, index) => (
                  <div key={photo.id} className="relative group">
                    <img 
                      src={photo.preview}
                      alt=""
                      className="w-10 h-10 object-cover rounded border border-pink-900/30"
                    />
                    {/* Remove button on mobile only */}
                    <button
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="md:hidden absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-white opacity-100"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
                {uploadedPhotos.length > 4 && (
                  <div className="w-10 h-10 rounded border border-pink-900/30 bg-black/40 flex items-center justify-center text-white/60 text-xs">
                    +{uploadedPhotos.length - 4}
                  </div>
                )}
              </div>
              {/* Add more button - mobile only */}
              {uploadedPhotos.length < maxPhotos && (
                <Button
                  onClick={handleUploadClick}
                  variant="outline"
                  size="sm"
                  className="md:hidden w-full border-pink-900/30 hover:border-pink-600 hover:bg-pink-600/10 text-white/60 hover:text-white text-xs"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  Add More Photos
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile: Upload button */}
              <Button
                onClick={handleUploadClick}
                variant="outline"
                className="md:hidden w-full border-pink-900/30 hover:border-pink-600 hover:bg-pink-600/10 text-white/60 hover:text-white text-xs py-6"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Photos
              </Button>
              {/* Desktop: Info text */}
              <div className="hidden md:flex items-center gap-2 text-white/40 text-xs p-3 rounded-lg border border-dashed border-pink-900/30">
                <ImageIcon className="w-4 h-4" />
                <span>Upload photos on the right panel →</span>
              </div>
            </>
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
                excludeShirtColorHex={backgroundColorHex}
                shouldExcludeShirtColor={selectedTemplate?.text_behavior === 'user-controlled'}
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

              {/* Previous designs */}
              {previousDesigns.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <History className="w-3 h-3 text-white/40" />
                    <span className="text-xs text-white/40">Previous designs</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {previousDesigns.map((imageUrl, index) => (
                      <button
                        key={`${imageUrl}-${index}`}
                        onClick={() => restorePreviousDesign(imageUrl, index)}
                        className="relative w-16 h-16 rounded-lg overflow-hidden border border-pink-900/30 hover:border-pink-500 transition-all hover:scale-105 group"
                      >
                        <img 
                          src={imageUrl} 
                          alt={`Previous design ${index + 1}`}
                          className="w-full h-full object-contain bg-black/40"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-xs font-medium">Use</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>

      {/* Upload Modal - Mobile Only */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[95vh] overflow-y-auto bg-gradient-to-br from-gray-900 via-red-950/30 to-gray-900 border-pink-900/30 md:hidden">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-600 to-red-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <DialogTitle className="text-white text-lg">Photo Upload Tips</DialogTitle>
            </div>
            <DialogDescription className="text-white/60 text-sm">
              Get the best results from our AI designer
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-3">
            {/* Image Quality Tips */}
            <div className="bg-pink-600/10 border border-pink-900/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <h4 className="text-white font-medium text-xs">
                    {selectedTemplate?.uploadTips?.title || 'Best Image Quality'}
                  </h4>
                  <ul className="text-white/70 text-xs space-y-1 list-disc list-inside">
                    {(selectedTemplate?.uploadTips?.tips || [
                      'Use photos with a <strong>clear subject</strong> (person, pet, object)',
                      'Choose images with a <strong>simple or transparent background</strong>',
                      'Higher resolution photos work better (but max 10MB per file)',
                      'Well-lit photos produce the best designs',
                    ]).map((tip, index) => (
                      <li key={index} dangerouslySetInnerHTML={{ __html: tip }} />
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Privacy Disclaimer */}
            <div className="bg-black/40 border border-pink-900/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <h4 className="text-white font-medium text-xs">Privacy & Security</h4>
                  <p className="text-white/70 text-xs leading-relaxed">
                    <strong>We don't store your images.</strong> Your photos are processed locally in your browser 
                    and only sent to our AI service temporarily to generate your design.
                  </p>
                  <p className="text-white/70 text-xs leading-relaxed">
                    <strong>Content Policy:</strong> Please do not upload inappropriate images. 
                    Such content will be rejected and may result in restrictions.
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Tips */}
            <div className="text-white/60 text-[10px] space-y-1">
              <p className="flex items-center gap-2">
                <Heart className="w-3 h-3 text-pink-500 flex-shrink-0" />
                <span>You can upload up to {maxPhotos} photos per design</span>
              </p>
              <p className="flex items-center gap-2">
                <Heart className="w-3 h-3 text-pink-500 flex-shrink-0" />
                <span>Supported formats: PNG, JPG, JPEG</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
            <Button
              variant="ghost"
              onClick={() => setShowUploadModal(false)}
              className="text-white/60 hover:text-white hover:bg-pink-600/10 text-sm w-full order-2"
            >
              Go Back
            </Button>
            <Button
              onClick={handleModalContinue}
              className="bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white font-medium text-sm w-full order-1"
            >
              Continue Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
}
