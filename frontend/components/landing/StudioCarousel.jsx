import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function StudioCarousel({ designs }) {
  const scrollContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  
  const CARD_WIDTH = 400; // Width of each card
  const GAP = 24; // Gap between cards
  const CARD_WITH_GAP = CARD_WIDTH + GAP;
  const SCROLL_THRESHOLD = 50; // Minimum scroll to trigger 3-card jump

  if (!designs?.length) return null;

  // Create infinite loop by tripling the designs array
  const infiniteDesigns = [...designs, ...designs, ...designs];

  // Initialize scroll position to middle set on mount, centered
  useEffect(() => {
    if (scrollContainerRef.current && designs.length > 0) {
      const container = scrollContainerRef.current;
      const middleStart = designs.length * CARD_WITH_GAP;
      // Center the first card by offsetting by half the container width minus half a card
      const containerWidth = container.offsetWidth;
      const centerOffset = (containerWidth / 2) - (CARD_WIDTH / 2);
      container.scrollLeft = middleStart - centerOffset;
    }
  }, [designs.length]);

  // Handle infinite scroll loop
  const handleScroll = () => {
    if (!scrollContainerRef.current || isDragging || isSnapping) return;
    
    const container = scrollContainerRef.current;
    const totalWidth = designs.length * CARD_WITH_GAP;
    const scrollPos = container.scrollLeft;

    // If scrolled past the end of middle set, jump back to start of middle set
    if (scrollPos >= totalWidth * 2) {
      container.scrollLeft = scrollPos - totalWidth;
    }
    // If scrolled before the start of middle set, jump to end of middle set
    else if (scrollPos <= totalWidth) {
      container.scrollLeft = scrollPos + totalWidth;
    }
  };

  // Handle mouse down
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setHasMoved(false);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    scrollContainerRef.current.style.cursor = 'grabbing';
    scrollContainerRef.current.style.userSelect = 'none';
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setIsDragging(false);
    setHasMoved(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
    }
  };

  // Handle mouse up - snap to nearest 3-card interval
  const handleMouseUp = () => {
    setIsDragging(false);
    
    if (hasMoved && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollDistance = container.scrollLeft - scrollLeft;
      
      // Determine direction and snap to 3 cards in that direction
      if (Math.abs(scrollDistance) > SCROLL_THRESHOLD) {
        const direction = scrollDistance > 0 ? 1 : -1;
        const targetScroll = scrollLeft + (direction * CARD_WITH_GAP * 3);
        
        setIsSnapping(true);
        
        // Use requestAnimationFrame for smoother animation
        requestAnimationFrame(() => {
          container.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
          });
        });
        
        setTimeout(() => setIsSnapping(false), 600);
      } else {
        // Snap back to original position if didn't move enough
        requestAnimationFrame(() => {
          container.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
          });
        });
      }
    }
    
    // Reset hasMoved after a brief delay to allow click detection
    setTimeout(() => setHasMoved(false), 50);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
    }
  };

  // Handle mouse move
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 0.5; // Further reduced scroll speed (50% of previous)
    
    // Track if mouse has moved more than 5px (to distinguish click from drag)
    if (Math.abs(walk) > 5) {
      setHasMoved(true);
    }
    
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  // Handle wheel scroll (trackpad horizontal scroll) - jump by 3 cards
  const handleWheel = (e) => {
    if (isSnapping) return; // Prevent scrolling during snap animation
    
    const container = scrollContainerRef.current;
    const isHorizontalScroll = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    const scrollAmount = isHorizontalScroll ? e.deltaX : e.deltaY;
    
    // Only trigger on significant scroll
    if (Math.abs(scrollAmount) > 30) {
      // Don't preventDefault - let natural scroll happen but snap afterward
      const direction = scrollAmount > 0 ? 1 : -1;
      const currentScroll = container.scrollLeft;
      const targetScroll = currentScroll + (direction * CARD_WITH_GAP * 3);
      
      setIsSnapping(true);
      
      // Use requestAnimationFrame for smoother animation
      requestAnimationFrame(() => {
        container.scrollTo({
          left: targetScroll,
          behavior: 'smooth'
        });
      });
      
      setTimeout(() => setIsSnapping(false), 600);
    }
  };

  return (
    <section className="py-24 bg-black overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 mb-12">
        {/* Section header */}
        <div className="text-center">
          <Badge className="bg-red-600/10 text-red-400 border-red-600/30 mb-4 text-sm px-3 py-1">
            Studio Collection
          </Badge>
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4">
            Available Now
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Scroll to explore our studio designs. Click to purchase.
          </p>
        </div>
      </div>

      {/* Horizontal scroll container */}
      <div 
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        onScroll={handleScroll}
        className="flex gap-6 overflow-x-auto px-4 md:px-12 scrollbar-hide cursor-grab active:cursor-grabbing"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {infiniteDesigns.map((design, index) => (
          <motion.div
            key={`${design.id}-${index}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: (index % designs.length) * 0.05, duration: 0.4 }}
            className="flex-shrink-0 w-[350px] md:w-[400px]"
          >
            <Link 
              to={createPageUrl(`Checkout?designId=${design.id}`)}
              className="block"
              onClick={(e) => {
                // Prevent navigation if user was dragging
                if (hasMoved) {
                  e.preventDefault();
                }
              }}
              onDragStart={(e) => e.preventDefault()}
            >
              <div className="group relative bg-gradient-to-b from-gray-900 to-black rounded-2xl overflow-hidden border border-gray-800 hover:border-red-600/50 transition-all duration-500 shadow-2xl hover:shadow-red-600/20">
                {/* Product mockup */}
                <div className="aspect-[3/4] bg-gradient-to-br from-gray-800 via-gray-900 to-black p-8 flex items-center justify-center relative overflow-hidden">
                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {design.mockup_urls?.[0] ? (
                    <img 
                      src={design.mockup_urls[0]} 
                      alt={design.title}
                      className="relative z-10 w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
                      draggable="false"
                    />
                  ) : design.design_image_url ? (
                    <div className="relative z-10 w-48 h-60 bg-white/5 backdrop-blur-sm rounded-lg shadow-2xl flex items-center justify-center overflow-hidden">
                      <img 
                        src={design.design_image_url} 
                        alt={design.title}
                        className="w-32 h-32 object-contain"
                        draggable="false"
                      />
                    </div>
                  ) : (
                    <div className="relative z-10 w-48 h-60 bg-white/5 backdrop-blur-sm rounded-lg shadow-2xl flex items-center justify-center">
                      <span className="text-gray-500">No preview</span>
                    </div>
                  )}
                </div>
                
                {/* Info panel */}
                <div className="relative p-6 bg-black/40 backdrop-blur-sm border-t border-gray-800/50">
                  <h3 className="text-white font-bold text-xl mb-3 group-hover:text-red-400 transition-colors line-clamp-1">
                    {design.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-3xl font-black text-white">
                        ${typeof design.price === 'number' ? design.price.toFixed(2) : (parseFloat(design.price) || 29.99).toFixed(2)}
                      </span>
                      {design.sales_count > 0 && (
                        <p className="text-gray-500 text-sm mt-1">
                          {design.sales_count} sold
                        </p>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold shadow-lg hover:shadow-red-600/50 transition-all"
                    >
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Buy Now
                    </Button>
                  </div>
                </div>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-red-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Scroll hint */}
      <div className="text-center mt-8">
        <p className="text-gray-600 text-sm">
          ← Infinite scroll · Drag or scroll to explore →
        </p>
      </div>
    </section>
  );
}

