import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function BackgroundRemovalModal({
  isOpen,
  onClose,
  originalImage,
  processedImage,
  isProcessing,
  onChoose,
}) {
  const [selectedOption, setSelectedOption] = useState(null);

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedOption(null);
    }
  }, [isOpen]);

  const handleChoose = (option) => {
    setSelectedOption(option);
    onChoose(option);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl lg:max-w-4xl max-h-[95vh] bg-gradient-to-br from-gray-900 via-purple-950/30 to-gray-900 border-pink-900/30 overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-pink-500" />
            Background Removal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Loading State */}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-8 sm:py-12"
            >
              <div className="relative">
                <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 animate-spin text-pink-500" />
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-white font-medium mt-4 sm:mt-6 text-sm sm:text-base">Removing background...</p>
              <p className="text-gray-400 text-xs sm:text-sm mt-1 sm:mt-2">This may take a few moments</p>
            </motion.div>
          )}

          {/* Result State */}
          {!isProcessing && processedImage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 sm:space-y-4"
            >
              <p className="text-center text-white font-medium text-sm sm:text-base px-2">
                Choose which version to use for your product
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Transparent Background Option */}
                <motion.button
                  onClick={() => handleChoose('transparent')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={selectedOption !== null}
                  className={cn(
                    "relative p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all overflow-hidden group",
                    selectedOption === 'transparent'
                      ? "border-pink-500 bg-pink-500/10"
                      : selectedOption === null
                        ? "border-pink-900/30 bg-black/40 hover:border-pink-700/50 cursor-pointer"
                        : "border-gray-700 bg-gray-800/20 opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="mb-2">
                    <h3 className="text-white font-bold text-base sm:text-lg">Transparent Background</h3>
                    <p className="text-gray-400 text-xs sm:text-sm">Clean, modern look</p>
                  </div>
                  
                  {/* Checkered background pattern to show transparency */}
                  <div className="relative aspect-square rounded-md sm:rounded-lg overflow-hidden bg-gray-800" style={{
                    backgroundImage: 'linear-gradient(45deg, #4a5568 25%, transparent 25%), linear-gradient(-45deg, #4a5568 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #4a5568 75%), linear-gradient(-45deg, transparent 75%, #4a5568 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                  }}>
                    <img 
                      src={processedImage}
                      alt="Transparent background"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {selectedOption === 'transparent' && (
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-pink-600 to-red-600 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                  )}
                </motion.button>

                {/* Solid Background Option */}
                <motion.button
                  onClick={() => handleChoose('solid')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={selectedOption !== null}
                  className={cn(
                    "relative p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all overflow-hidden group",
                    selectedOption === 'solid'
                      ? "border-pink-500 bg-pink-500/10"
                      : selectedOption === null
                        ? "border-pink-900/30 bg-black/40 hover:border-pink-700/50 cursor-pointer"
                        : "border-gray-700 bg-gray-800/20 opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="mb-2">
                    <h3 className="text-white font-bold text-base sm:text-lg">Solid Background</h3>
                    <p className="text-gray-400 text-xs sm:text-sm">Original design</p>
                  </div>
                  
                  <div className="relative aspect-square rounded-md sm:rounded-lg overflow-hidden bg-black">
                    <img 
                      src={originalImage}
                      alt="Solid background"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {selectedOption === 'solid' && (
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-pink-600 to-red-600 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                  )}
                </motion.button>
              </div>

              {/* Help text */}
              <div className="text-center text-gray-400 text-xs sm:text-sm px-2">
                <p>Transparent background works best on colored shirts</p>
                <p className="text-[10px] sm:text-xs mt-0.5 sm:mt-1">You can't change this later, so choose carefully</p>
              </div>
            </motion.div>
          )}

          {/* Error State */}
          {!isProcessing && !processedImage && (
            <div className="text-center py-8 sm:py-12 text-red-400">
              <X className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-50" />
              <p className="text-sm sm:text-base">Failed to remove background</p>
              <Button
                onClick={onClose}
                variant="outline"
                className="mt-3 sm:mt-4 border-gray-700 text-gray-300 hover:bg-gray-800 text-sm"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
