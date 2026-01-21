"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// Helper to get image URL (use proxy if needed for CORS)
const getImageUrl = (url) => {
  if (!url) return null;
  
  // Always use proxy for S3 URLs to avoid CORS issues
  if (url.includes('s3.amazonaws.com') || url.includes('s3://') || url.includes('.s3.')) {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const apiBase = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
    
    // Try to extract S3 key from URL for more reliable proxying
    let proxyUrl;
    try {
      // Extract key from URL like: https://bucket.s3.region.amazonaws.com/key
      const urlMatch = url.match(/\.s3\.[^/]+\/(.+)$/);
      if (urlMatch && urlMatch[1]) {
        const key = decodeURIComponent(urlMatch[1]);
        proxyUrl = `${apiBase}/upload/proxy-image?key=${encodeURIComponent(key)}`;
      } else {
        // Fallback to URL parameter
        proxyUrl = `${apiBase}/upload/proxy-image?url=${encodeURIComponent(url)}`;
      }
    } catch (e) {
      // Fallback to URL parameter if key extraction fails
      proxyUrl = `${apiBase}/upload/proxy-image?url=${encodeURIComponent(url)}`;
    }
    
    return proxyUrl;
  }
  return url;
};

function ProductDisplayCard({
  className,
  product,
  onClick,
  position = "front", // "front" | "middle" | "back"
  total = 3,
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  const isFront = position === "front";
  const isMiddle = position === "middle";
  const isBack = position === "back";
  
  // Hover raise amounts - high enough to see the full card above others
  const getHoverRaise = () => {
    if (!isHovered) return 0;
    if (isFront) return -40;   // Front card raises 40px (subtle lift)
    return -250;               // Back card raises 220px to clear both cards in front
  };
  
  // Position transform for the wrapper (doesn't change on hover)
  const getWrapperTransform = () => {
    if (total === 1) return "translateX(0px) translateY(0px)";
    if (total === 2) {
      if (isFront) return "translateX(70px) translateY(60px)";
      return "translateX(0px) translateY(0px)";
    }
    // 3 cards - more spaced out
    if (isFront) return "translateX(140px) translateY(120px)";
    if (isMiddle) return "translateX(70px) translateY(60px)";
    return "translateX(0px) translateY(0px)";
  };
  
  // Card transform for the inner card (hover raise + skew)
  const getCardTransform = () => {
    const skew = "skewY(-8deg)";
    const hoverY = getHoverRaise();
    return `translateY(${hoverY}px) ${skew}`;
  };
  
  // Z-index stays consistent based on position - no change on hover
  const getZIndex = () => {
    if (isFront) return 30;
    if (isMiddle) return 20;
    return 10;
  };
  
  return (
    // Outer wrapper handles hover detection and position - doesn't move on hover
    <div
      className="[grid-area:stack] cursor-pointer"
      style={{
        transform: getWrapperTransform(),
        zIndex: getZIndex(),
        transition: "transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), z-index 0s",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Inner card moves on hover */}
      <div
        className={cn(
          "relative flex h-[420px] w-[280px] md:h-[480px] md:w-[320px] select-none flex-col rounded-2xl border border-pink-900/40 bg-gradient-to-b from-gray-800/90 via-gray-900/95 to-black backdrop-blur-sm overflow-hidden",
          "after:absolute after:-right-1 after:top-[-5%] after:h-[110%] after:w-[280px] md:after:w-[320px] after:bg-gradient-to-l after:from-black after:to-transparent after:content-[''] after:pointer-events-none",
          // Grayscale overlay for non-front cards
          !isFront && !isHovered && "before:absolute before:w-full before:h-full before:rounded-2xl before:content-[''] before:bg-background/40 before:left-0 before:top-0 before:z-20",
          !isFront && !isHovered && "grayscale",
          // Hover effects - border and shadow
          isHovered && "border-pink-500/60 shadow-2xl shadow-pink-600/40",
          className
        )}
        style={{
          transform: getCardTransform(),
          transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
      {/* Product Image - Show reference image first, fallback to mockup */}
      <div className="aspect-[3/4] flex-1 bg-gradient-to-br from-gray-800 via-red-950/20 to-black p-4 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        
        {product?.reference_image ? (
          <img 
            src={getImageUrl(product.reference_image)} 
            alt={product.title}
            className="relative z-10 w-full h-full object-contain transition-transform duration-500"
            draggable="false"
          />
        ) : product?.mockup_urls?.[0] ? (
          <img 
            src={getImageUrl(product.mockup_urls[0])} 
            alt={product.title}
            className="relative z-10 w-full h-full object-contain transition-transform duration-500"
            draggable="false"
          />
        ) : product?.design_image_url ? (
          <div className="relative z-10 w-32 h-40 bg-white/5 backdrop-blur-sm rounded-lg shadow-xl flex items-center justify-center overflow-hidden">
            <img 
              src={product.design_image_url} 
              alt={product.title}
              className="w-20 h-20 object-contain"
              draggable="false"
            />
          </div>
        ) : (
          <div className="relative z-10 w-32 h-40 bg-white/5 backdrop-blur-sm rounded-lg shadow-xl flex items-center justify-center">
            <span className="text-gray-500 text-sm">No preview</span>
          </div>
        )}
      </div>
      
      {/* Product Info */}
      <div className="relative z-10 p-4 bg-gradient-to-b from-black/50 to-black/80 border-t border-pink-900/30">
        <h3 className="text-white font-bold text-sm md:text-base mb-2 truncate">
          {product?.title || "Product"}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-xl md:text-2xl font-black text-white">
            ${typeof product?.price === 'number' 
              ? product.price.toFixed(2) 
              : parseFloat(product?.price || 29.99).toFixed(2)}
          </span>
          {product?.sales_count > 0 && (
            <span className="text-pink-300/60 text-xs">
              {product.sales_count} sold
            </span>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

export default function ProductDisplayCards({ 
  products = [], 
  onProductClick,
  autoRotate = true,
  rotationInterval = 3000, // 3 seconds between rotations
}) {
  // Take up to 3 products for the stacked display
  const displayProducts = products.slice(0, 3);
  const total = displayProducts.length;
  
  // Track which card is currently in the front position (by index in displayProducts)
  const [frontIndex, setFrontIndex] = useState(total - 1); // Start with last card in front
  const [isPaused, setIsPaused] = useState(false);
  
  // Reset frontIndex when products change
  useEffect(() => {
    setFrontIndex(total - 1);
  }, [total]);
  
  // Auto-rotate through cards - cycle which card is in front
  const rotateCards = useCallback(() => {
    setFrontIndex((prev) => {
      const next = prev - 1;
      return next < 0 ? total - 1 : next;
    });
  }, [total]);
  
  useEffect(() => {
    if (!autoRotate || isPaused || total <= 1) return;
    
    const timer = setInterval(() => {
      rotateCards();
    }, rotationInterval);
    
    return () => clearInterval(timer);
  }, [autoRotate, isPaused, rotationInterval, rotateCards, total]);
  
  // Determine position for each card based on frontIndex
  const getPosition = (cardIndex) => {
    if (total === 1) return "front";
    
    // Calculate how far this card is from the front
    const distance = (cardIndex - frontIndex + total) % total;
    
    if (distance === 0) return "front";
    if (distance === 1) return "middle";
    return "back";
  };

  if (!displayProducts.length) {
    return null;
  }

  return (
    <div 
      className="grid [grid-template-areas:'stack'] place-items-center opacity-100 animate-in fade-in-0 duration-700"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {displayProducts.map((product, index) => (
        <ProductDisplayCard
          key={product.id || index}
          product={product}
          position={getPosition(index)}
          total={total}
          onClick={() => onProductClick?.(product)}
        />
      ))}
    </div>
  );
}

export { ProductDisplayCard };
