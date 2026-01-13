import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Sparkles, Loader2, AlertCircle, RefreshCw, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { base44 } from '@/api/base44Client';

const PROMPT_SUGGESTIONS = [
  "I love my girlfriend with hearts and photos collage",
  "Valentine's Day couple photo grid with romantic text",
  "Name collage with hearts and romantic vibe",
  "Tour tee style with photos and loving message",
  "Vintage love poster with retro typography",
  "Neon heart design with couple photos",
];

export default function AIPanel({ 
  selectedStills, 
  stills, 
  onImageGenerated, 
  generatedImage,
  isGenerating,
  setIsGenerating 
}) {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState(null);

  const selectedStillImages = stills?.filter(s => selectedStills.includes(s.id)) || [];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const fullPrompt = `Create a knockout boxing merch design: ${prompt}. 
        Style: Bold, dramatic, suitable for t-shirt printing. 
        The design should be striking and celebrate a knockout victory.
        Make it high contrast and visually impactful.`;

      const result = await base44.integrations.Core.GenerateImage({
        prompt: fullPrompt,
        existing_image_urls: selectedStillImages.map(s => s.image_url),
      });

      if (result?.url) {
        onImageGenerated(result.url);
      }
    } catch (err) {
      console.error('Generation error:', err);
      
      // Check for specific error codes/messages/status
      const errorMessage = err.message?.toLowerCase() || '';
      const errorCode = err.code;
      const errorStatus = err.status;
      
      if (errorCode === 'S3_CONFIG_ERROR' || errorMessage.includes('does not allow ACLs') || errorMessage.includes('S3 bucket')) {
        setError('☁️ Storage configuration error. Please contact support to fix the S3 bucket settings.');
      } else if (errorCode === 'MODEL_NOT_SUPPORTED' || errorMessage.includes('does not support')) {
        setError('🚫 Image generation is not supported by the current AI model. Please contact support to enable image generation capabilities.');
      } else if (errorCode === 'INVALID_REQUEST' || errorCode === 'BAD_REQUEST' || errorStatus === 400) {
        setError('⚠️ Invalid request. The AI model may not support this type of image generation. Please try a different prompt or contact support.');
      } else if (errorCode === 'MODEL_OVERLOADED' || errorStatus === 503 || errorMessage.includes('overloaded')) {
        setError('🔥 AI model is overloaded due to high demand. Please wait 30 seconds and try again.');
      } else if (errorCode === 'RATE_LIMITED' || errorStatus === 429 || errorMessage.includes('rate limit')) {
        setError('⏳ Too many requests. Please wait a minute before generating another image.');
      } else if (errorCode === 'PERMISSION_DENIED' || errorStatus === 403) {
        setError('🔒 Image generation is not available. Please check your API configuration.');
      } else if (errorCode === 'NETWORK_ERROR' || errorMessage.includes('network') || errorMessage.includes('connect')) {
        setError('📡 Network error. Please check your connection and try again.');
      } else {
        setError('Failed to generate image. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-red-950/30 to-black border-r border-pink-900/30">
      {/* Header */}
      <div className="p-4 border-b border-pink-900/30">
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-5 h-5 text-pink-500" />
          <h3 className="font-bold text-white">AI Generator</h3>
        </div>
        <p className="text-xs text-white/60">
          Describe your design idea
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        {/* Selected stills preview */}
        {selectedStillImages.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-white/60 mb-2">Using {selectedStillImages.length} reference image(s)</p>
            <div className="flex gap-2 flex-wrap">
              {selectedStillImages.map((still) => (
                <img 
                  key={still.id}
                  src={still.image_url}
                  alt={still.title}
                  className="w-12 h-12 object-cover rounded-lg border border-pink-900/30"
                />
              ))}
            </div>
          </div>
        )}

        {/* Prompt input */}
        <div className="space-y-3">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your design... e.g., 'I ❤️ my girlfriend with photos in a heart collage, romantic vibe'"
            className="bg-black/40 border-pink-900/30 text-white placeholder:text-white/40 min-h-[100px] resize-none focus:border-pink-600"
          />

          {error && (
            <div className="flex items-center gap-2 text-pink-400 text-sm bg-pink-500/10 p-3 rounded-lg border border-pink-900/30">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white font-bold shadow-lg shadow-pink-600/30"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Design
              </>
            )}
          </Button>
        </div>

        {/* Suggestions */}
        <div className="mt-6">
          <p className="text-xs text-white/60 mb-2">Quick prompts</p>
          <div className="flex flex-wrap gap-2">
            {PROMPT_SUGGESTIONS.map((suggestion, i) => (
              <Badge
                key={i}
                variant="outline"
                className="border-pink-900/30 text-white/70 hover:text-white hover:border-pink-600 hover:bg-pink-600/10 cursor-pointer text-xs transition-all"
                onClick={() => setPrompt(suggestion)}
              >
                {suggestion.slice(0, 30)}...
              </Badge>
            ))}
          </div>
        </div>

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
                  disabled={isGenerating}
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