import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Feature Carousel Component - displays images in a 3D carousel effect
export const FeatureCarousel = React.forwardRef(
  ({ images, className, ...props }, ref) => {
    const [currentIndex, setCurrentIndex] = React.useState(Math.floor(images.length / 2));

    const handleNext = React.useCallback(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, [images.length]);

    const handlePrev = () => {
      setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
    };
    
    React.useEffect(() => {
      const timer = setInterval(() => {
        handleNext();
      }, 4000);
      return () => clearInterval(timer);
    }, [handleNext]);

    return (
      <div
        ref={ref}
        className={cn(
          'relative w-full h-full flex items-center justify-center',
          className
        )}
        {...props}
      >
        {/* Carousel Wrapper */}
        <div className="relative w-full h-full flex items-center justify-center [perspective:1000px]">
          {images.map((image, index) => {
            const offset = index - currentIndex;
            const total = images.length;
            let pos = (offset + total) % total;
            if (pos > Math.floor(total / 2)) {
              pos = pos - total;
            }

            const isCenter = pos === 0;
            const isAdjacent = Math.abs(pos) === 1;

            return (
              <div
                key={index}
                className={cn(
                  'absolute w-40 h-64 sm:w-48 sm:h-80 md:w-56 md:h-96 lg:w-64 lg:h-[420px] transition-all duration-500 ease-in-out',
                  'flex items-center justify-center'
                )}
                style={{
                  transform: `
                    translateX(${(pos) * 55}%) 
                    scale(${isCenter ? 1 : isAdjacent ? 0.8 : 0.65})
                    rotateY(${(pos) * -15}deg)
                  `,
                  zIndex: isCenter ? 10 : isAdjacent ? 5 : 1,
                  opacity: isCenter ? 1 : isAdjacent ? 0.5 : 0,
                  filter: isCenter ? 'blur(0px)' : 'blur(3px)',
                  visibility: Math.abs(pos) > 1 ? 'hidden' : 'visible',
                }}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="object-cover w-full h-full rounded-2xl border border-white/10 shadow-2xl"
                />
              </div>
            );
          })}
        </div>
        
        {/* Navigation Buttons */}
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 sm:left-4 top-1/2 -translate-y-1/2 rounded-full h-9 w-9 z-20 bg-black/50 border-white/20 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm"
          onClick={handlePrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 sm:right-4 top-1/2 -translate-y-1/2 rounded-full h-9 w-9 z-20 bg-black/50 border-white/20 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm"
          onClick={handleNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Dot Indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300',
                index === currentIndex 
                  ? 'bg-red-500 w-6' 
                  : 'bg-white/30 hover:bg-white/50'
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    );
  }
);

FeatureCarousel.displayName = 'FeatureCarousel';

export default FeatureCarousel;
