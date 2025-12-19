import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Sparkles, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { base44 } from '@/api/base44Client';

const PROMPT_SUGGESTIONS = [
  "Jake Paul knocked out cold on the canvas, dramatic lighting",
  "Victory celebration over a fallen Jake Paul",
  "The knockout punch moment, comic book style",
  "Jake Paul seeing stars, cartoon style",
  "Historic knockout moment, vintage boxing poster style",
  "Jake Paul down for the count, neon art style",
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
    <div className="h-full flex flex-col bg-gray-950 border-r border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-2">
          <Wand2 className="w-5 h-5 text-purple-500" />
          <h3 className="font-bold text-white">AI Generator</h3>
        </div>
        <p className="text-xs text-gray-500">
          Describe your knockout design
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        {/* Selected stills preview */}
        {selectedStillImages.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2">Using {selectedStillImages.length} reference image(s)</p>
            <div className="flex gap-2 flex-wrap">
              {selectedStillImages.map((still) => (
                <img 
                  key={still.id}
                  src={still.image_url}
                  alt={still.title}
                  className="w-12 h-12 object-cover rounded-lg border border-gray-700"
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
            placeholder="Describe your design... e.g., 'Jake Paul knocked out, comic book style with dramatic impact text'"
            className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 min-h-[100px] resize-none"
          />

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
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
          <p className="text-xs text-gray-400 mb-2">Quick prompts</p>
          <div className="flex flex-wrap gap-2">
            {PROMPT_SUGGESTIONS.map((suggestion, i) => (
              <Badge
                key={i}
                variant="outline"
                className="border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 cursor-pointer text-xs"
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
                <p className="text-xs text-gray-400">Generated Design</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="text-gray-400 hover:text-white h-6 text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Regenerate
                </Button>
              </div>
              <div className="relative rounded-lg overflow-hidden border border-gray-700">
                <img 
                  src={generatedImage} 
                  alt="Generated design"
                  className="w-full aspect-square object-contain bg-gray-900"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}