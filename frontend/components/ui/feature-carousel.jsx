import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Product Card Carousel Component
export const ProductCarousel = React.forwardRef(
  ({ products, className, onProductClick, ...props }, ref) => {
    const [currentIndex, setCurrentIndex] = React.useState(Math.floor(products.length / 2));
    const [isPaused, setIsPaused] = React.useState(false);

    const handleNext = React.useCallback(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % products.length);
    }, [products.length]);

    const handlePrev = () => {
      setCurrentIndex((prevIndex) => (prevIndex - 1 + products.length) % products.length);
    };
    
    React.useEffect(() => {
      if (isPaused || products.length <= 1) return;
      
      const timer = setInterval(() => {
        handleNext();
      }, 3500);
      return () => clearInterval(timer);
    }, [handleNext, isPaused, products.length]);

    if (!products?.length) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'relative w-full h-full flex items-center justify-center',
          className
        )}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        {...props}
      >
        {/* Carousel Wrapper */}
        <div className="relative w-full h-[500px] md:h-[600px] flex items-center justify-center [perspective:1200px]">
          {products.map((product, index) => {
            const offset = index - currentIndex;
            const total = products.length;
            let pos = (offset + total) % total;
            if (pos > Math.floor(total / 2)) {
              pos = pos - total;
            }

            const isCenter = pos === 0;
            const isAdjacent = Math.abs(pos) === 1;

            return (
              <div
                key={product.id || index}
                className={cn(
                  'absolute w-64 md:w-72 transition-all duration-500 ease-out',
                  'flex items-center justify-center cursor-pointer',
                  isCenter && 'z-20',
                  isAdjacent && 'z-10',
                  !isCenter && !isAdjacent && 'z-0'
                )}
                style={{
                  transform: `
                    translateX(${(pos) * 55}%) 
                    scale(${isCenter ? 1 : isAdjacent ? 0.8 : 0.65})
                    rotateY(${(pos) * -15}deg)
                  `,
                  opacity: isCenter ? 1 : isAdjacent ? 0.5 : 0,
                  filter: isCenter ? 'blur(0px)' : 'blur(3px)',
                  visibility: Math.abs(pos) > 1 ? 'hidden' : 'visible',
                  pointerEvents: isCenter ? 'auto' : 'none',
                }}
                onClick={() => isCenter && onProductClick?.(product)}
              >
                {/* Product Card */}
                <div className="group w-full bg-gradient-to-b from-gray-800/90 via-gray-900/95 to-black rounded-2xl overflow-hidden border border-pink-900/40 hover:border-pink-500/60 transition-all duration-300 shadow-2xl hover:shadow-pink-600/30">
                  {/* Product Image */}
                  <div className="aspect-[3/4] bg-gradient-to-br from-gray-800 via-red-950/20 to-black p-6 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    
                    {product.mockup_urls?.[0] ? (
                      <img 
                        src={product.mockup_urls[0]} 
                        alt={product.title}
                        className="relative z-10 w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        draggable="false"
                      />
                    ) : product.design_image_url ? (
                      <div className="relative z-10 w-36 h-44 bg-white/5 backdrop-blur-sm rounded-lg shadow-xl flex items-center justify-center overflow-hidden">
                        <img 
                          src={product.design_image_url} 
                          alt={product.title}
                          className="w-24 h-24 object-contain"
                          draggable="false"
                        />
                      </div>
                    ) : (
                      <div className="relative z-10 w-36 h-44 bg-white/5 backdrop-blur-sm rounded-lg shadow-xl flex items-center justify-center">
                        <span className="text-gray-500 text-sm">No preview</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="p-5 bg-gradient-to-b from-black/50 to-black/80 border-t border-pink-900/30">
                    <h3 className="text-white font-bold text-base mb-2 truncate group-hover:text-pink-300 transition-colors">
                      {product.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-white">
                        ${typeof product.price === 'number' 
                          ? product.price.toFixed(2) 
                          : parseFloat(product.price || 29.99).toFixed(2)}
                      </span>
                      {product.sales_count > 0 && (
                        <span className="text-pink-300/60 text-xs">
                          {product.sales_count} sold
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Navigation Buttons */}
        {products.length > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="absolute left-0 md:left-4 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 z-30 bg-black/60 hover:bg-black/80 border-pink-900/50 hover:border-pink-500/70 text-white backdrop-blur-sm"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-0 md:right-4 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 z-30 bg-black/60 hover:bg-black/80 border-pink-900/50 hover:border-pink-500/70 text-white backdrop-blur-sm"
              onClick={handleNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
        
        {/* Dots indicator */}
        {products.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-30">
            {products.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-300',
                  index === currentIndex 
                    ? 'bg-pink-500 w-6' 
                    : 'bg-white/30 hover:bg-white/50'
                )}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

ProductCarousel.displayName = 'ProductCarousel';
