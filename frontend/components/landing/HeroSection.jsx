import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Heart, ChevronDown } from 'lucide-react';
import ProductDisplayCards from '@/components/ui/display-cards';

export default function HeroSection({ products = [], isLoading = false }) {
  const navigate = useNavigate();

  const handleCreate = () => {
    navigate(createPageUrl('DesignStudio'));
  };

  const handleProductClick = () => {
    // Scroll down to the templates section instead of navigating
    window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
  };

  const handleBrowseDesigns = () => {
    window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      
      {/* Content - Split Layout */}
      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 pt-24 pb-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-4 items-center min-h-[calc(100vh-12rem)]">
          
          {/* Left Side - Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6 lg:pr-8"
          >
            {/* Badge */}
            <motion.div 
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm"
            >
              <span className="text-[10px] font-light uppercase tracking-[0.08em] text-white/70">Valentine's 2026</span>
              <span className="h-1 w-1 rounded-full bg-pink-400/60" />
              <span className="text-xs font-light tracking-tight text-white/80">Custom Shirts</span>
            </motion.div>

            {/* Main headline - Lighter weight typography */}
            <h1 className="max-w-2xl text-left text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extralight leading-[1.05] tracking-tight text-white">
              Make a Valentine shirt
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-red-400">
                in 60 seconds
              </span>
            </h1>
            
            <p className="max-w-xl text-left text-base font-light leading-relaxed tracking-tight text-white/75 sm:text-lg">
              Upload photos, fill in the details, and see an instant preview
              on a real shirt. Approve it — we print & ship. It's that simple.
            </p>
            
            {/* CTA Buttons - Split Layout */}
            <div className="max-w-xl flex gap-3">
              <button
                onClick={handleCreate}
                className="flex-1 group relative bg-white/10 hover:bg-white/15 backdrop-blur-xl rounded-2xl px-6 py-5 border border-white/20 hover:border-white/30 shadow-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                <div className="flex items-center justify-center gap-2">
                  <Heart className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform duration-300" />
                  <span className="text-base font-light tracking-tight text-white">
                    Design the perfect gift
                  </span>
                </div>
              </button>
              <button
                onClick={handleBrowseDesigns}
                className="flex-1 group relative bg-white/5 hover:bg-white/10 backdrop-blur-xl rounded-2xl px-6 py-5 border border-white/10 hover:border-white/20 shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-base font-light tracking-tight text-white/80 group-hover:text-white">
                    Browse designs
                  </span>
                  <ChevronDown className="w-4 h-4 text-white/60 group-hover:text-white/80 group-hover:translate-y-0.5 transition-all duration-300" />
                </div>
              </button>
            </div>

            {/* Feature Highlights - Refined Style */}
            <div className="flex flex-wrap items-center gap-6 pt-4">
              <div className="flex items-center gap-2 text-white/60">
                <span className="h-1 w-1 rounded-full bg-white/40" />
                <span className="font-extralight text-xs tracking-tight">Proof in seconds</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <span className="h-1 w-1 rounded-full bg-white/40" />
                <span className="font-extralight text-xs tracking-tight">Ships fast</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <span className="h-1 w-1 rounded-full bg-white/40" />
                <span className="font-extralight text-xs tracking-tight">Printed in the USA</span>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Product Carousel */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative lg:pl-4 hidden md:block"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-[500px]">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-pink-900/30 to-red-900/30 rounded-full mx-auto mb-4 flex items-center justify-center border border-pink-600/30">
                    <Loader2 className="w-8 h-8 text-pink-400 animate-spin" />
                  </div>
                  <p className="text-white/60 text-sm">Loading designs...</p>
                </div>
              </div>
            ) : products.length > 0 ? (
              <div className="relative flex items-center justify-center min-h-[500px]">
                {/* Glow effect behind cards */}
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600/20 via-red-600/10 to-transparent blur-3xl" />
                
                <ProductDisplayCards 
                  products={products}
                  onProductClick={handleProductClick}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-[500px]">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-pink-900/30 to-red-900/30 rounded-full mx-auto mb-4 flex items-center justify-center border border-pink-600/30">
                    <Sparkles className="w-8 h-8 text-pink-400" />
                  </div>
                  <p className="text-white/60 text-sm">Be the first to create a design!</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
