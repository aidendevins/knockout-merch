import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, AlertCircle, RefreshCw, Heart, ImageIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { COLOR_PRESETS, getColorHex } from '@/config/templates';
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
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-pink-900/30 text-white placeholder:text-white/30 text-sm focus:border-pink-600 focus:outline-none"
          />
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
  }, [selectedTemplate?.id]);

  const updateFieldValue = (fieldId, value) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  // Build the full prompt using the template's buildPrompt function
  const buildPrompt = () => {
    if (!selectedTemplate) return '';

    // Get background color hex from the selected product color
    const backgroundColorHex = getColorHex(selectedColor);
    const photoCount = uploadedPhotos.length;

    // Use the template's buildPrompt function if available
    if (selectedTemplate.buildPrompt) {
      return selectedTemplate.buildPrompt(fieldValues, backgroundColorHex, photoCount, styleTweaks);
    }

    // Fallback to old prompt building method (for backwards compatibility)
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
      const photoUrls = uploadedPhotos.map(p => p.preview);

      console.log('Generating design with prompt length:', fullPrompt.length);
      console.log('Number of photos:', photoUrls.length);

      const result = await base44.integrations.Core.GenerateImage({
        prompt: fullPrompt,
        existing_image_urls: photoUrls,
        template_id: selectedTemplate?.id, // Pass template ID to fetch reference image
      });

      if (result?.url) {
        onImageGenerated(result);
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
    } finally {
      setIsGenerating(false);
    }
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
              Creating Magic...
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
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/60">Generated Design</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleGenerate}
                  disabled={isGenerating || !canGenerate}
                  className="text-white/60 hover:text-white hover:bg-pink-600/10 h-6 text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Regenerate
                </Button>
              </div>
              <div className="relative rounded-lg overflow-hidden border border-pink-900/30">
                <img 
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
