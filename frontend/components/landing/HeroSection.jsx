import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Sparkles, Zap, CheckCircle2, Truck, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCarousel } from '@/components/ui/feature-carousel';

export default function HeroSection({ products = [], isLoading = false }) {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');

  const handleCreate = () => {
    navigate(createPageUrl('DesignStudio'));
  };

  const handleProductClick = (product) => {
    navigate(`/product/${product.id}`);
  };

  const designCategories = [
    { label: 'AI Generated', icon: Sparkles },
    { label: 'Quick Start', icon: Zap },
    { label: 'Browse Designs', onClick: () => {
      window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    }},
  ];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-black">
      {/* Background image */}
      <div className="absolute inset-0 overflow-hidden">
        <img 
          src="/hero-bg.png" 
          alt="Boxing background"
          className="w-full h-full object-cover"
          onError={(e) => {
            console.error('Failed to load background image:', e.target.src);
          }}
        />
      </div>
      
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30" />
      
      {/* Extra gradient fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-[500px] bg-gradient-to-b from-transparent via-red-950/20 via-red-950/40 via-red-950/60 to-red-950/80" />
      
      {/* Content - Split Layout */}
      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 pt-24 pb-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-4 items-center min-h-[calc(100vh-12rem)]">
          
          {/* Left Side - Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8 lg:pr-8"
          >
            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight">
              Make a Valentine shirt
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-red-500">
                in 60 seconds
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/80 max-w-xl font-normal leading-relaxed">
              Upload photos, type a prompt, and see an instant preview
              on a real shirt. Approve it — we print & ship.
            </p>
            
            {/* Input Field with Create Button */}
            <div className="max-w-xl">
              <div className="relative bg-black/50 backdrop-blur-xl rounded-[28px] px-4 py-5 border border-white/20 shadow-2xl">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCreate}
                    className="flex items-center justify-center w-12 h-12 bg-white/10 hover:bg-white/20 rounded-[18px] transition-colors flex-shrink-0"
                  >
                    <Sparkles className="w-5 h-5 text-white" />
                  </button>
                  <input
                    type="text"
                    placeholder="Describe your design idea..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    className="flex-1 bg-transparent text-white text-base placeholder:text-white/60 outline-none font-normal min-w-0"
                  />
                  <Button
                    onClick={handleCreate}
                    className="bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white rounded-[18px] px-6 py-5 font-semibold text-sm shadow-lg hover:shadow-pink-600/50 transition-all flex-shrink-0"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create
                  </Button>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-2 mt-6">
                {designCategories.map((category, index) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={index}
                      onClick={category.onClick || handleCreate}
                      className="px-5 py-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white/80 hover:text-white border border-white/20 hover:border-white/40 transition-all font-normal text-sm"
                    >
                      {Icon && <Icon className="w-4 h-4 inline mr-2" />}
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="flex flex-wrap items-center gap-6 pt-4">
              <div className="flex items-center gap-2 text-white/80">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="font-normal text-sm">Proof in seconds</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <Truck className="w-5 h-5 text-blue-400" />
                <span className="font-normal text-sm">Ships fast</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <MapPin className="w-5 h-5 text-red-400" />
                <span className="font-normal text-sm">Printed in the USA</span>
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
              <div className="relative">
                {/* Glow effect behind carousel */}
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600/20 via-red-600/10 to-transparent blur-3xl" />
                
                <ProductCarousel 
                  products={products}
                  onProductClick={handleProductClick}
                />
                
                {/* Label */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-40">
                  <span className="px-4 py-2 bg-gradient-to-r from-pink-600/90 to-red-600/90 backdrop-blur-sm rounded-full text-white text-xs font-semibold shadow-lg shadow-pink-600/30">
                    ✨ Studio Collection
                  </span>
                </div>
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
