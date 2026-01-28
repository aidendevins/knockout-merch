import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, ArrowRight, Check, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function MockupPreview({
  isOpen,
  onClose,
  mockupUrls = [],
  designTitle,
  productType,
  price,
  onConfirm,
  isLoading,
}) {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const nextMockup = () => {
    setCurrentIndex((prev) => (prev + 1) % mockupUrls.length);
  };

  const prevMockup = () => {
    setCurrentIndex((prev) => (prev - 1 + mockupUrls.length) % mockupUrls.length);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25 }}
          className="relative w-full max-w-4xl bg-gradient-to-br from-red-950/30 to-black rounded-2xl border border-pink-900/30 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-pink-900/30 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Product Preview</h2>
              <p className="text-white/70 text-sm mt-1">
                Review your {productType === 'tshirt' ? 'T-Shirt' : 'Hoodie'} design before checkout
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white/60 hover:text-white hover:bg-pink-600/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Mockup Gallery */}
          <div className="relative aspect-square max-h-[500px] bg-black/40 flex items-center justify-center">
            {mockupUrls.length > 0 ? (
              <>
                <motion.img
                  key={currentIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={mockupUrls[currentIndex]}
                  alt={`Mockup ${currentIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
                
                {mockupUrls.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={prevMockup}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-pink-600/50 text-white border border-pink-900/30"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={nextMockup}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-pink-600/50 text-white border border-pink-900/30"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                    
                    {/* Dots */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {mockupUrls.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentIndex(i)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            i === currentIndex ? 'bg-pink-500' : 'bg-white/30'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center text-white/70">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-pink-500" />
                <p>Loading mockups...</p>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="p-6 border-t border-pink-900/30">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">{designTitle}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-gradient-to-r from-pink-600 to-red-600 text-white">
                    {productType === 'tshirt' ? 'T-Shirt' : 'Hoodie'}
                  </Badge>
                  <span className="text-white/70 text-sm">Limited Edition DesignForWear</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-pink-500">${price?.toFixed(2) || '19.99'}</p>
                <p className="text-white/60 text-sm">+ shipping</p>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                'Premium Quality',
                'Soft Cotton',
                'True to Size',
                'Fast Shipping',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm text-white/70">
                  <Check className="w-4 h-4 text-pink-500" />
                  {feature}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 border-pink-900/30 text-white/70 hover:text-white hover:border-pink-600 hover:bg-pink-600/10"
              >
                Edit Design
              </Button>
              <Button
                onClick={onConfirm}
                disabled={isLoading || mockupUrls.length === 0}
                className="flex-1 bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white font-bold shadow-lg shadow-pink-600/30"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Proceed to Checkout
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

