import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Sparkles, Zap, CheckCircle2, Truck, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function HeroSection() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');

  const handleCreate = () => {
    navigate(createPageUrl('DesignStudio'));
  };

  const designCategories = [
    { label: 'AI Generated', icon: Sparkles },
    { label: 'Quick Start', icon: Zap },
    { label: 'Browse Designs', onClick: () => {
      window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    }},
  ];

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-black">
      {/* Background image - full color, no filters */}
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
      
      {/* Subtle dark overlay only for text readability */}
      <div className="absolute inset-0 bg-black/20" />
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto pt-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-tight tracking-tight mb-4">
            Design Your Knockout Merch
            <br />
            <span className="text-red-500">In Seconds</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-10 font-medium">
            Upload fight stills, generate AI designs, and see instant previews.
            <br />
            <span className="text-white/70">Approve it — we print & ship.</span>
          </p>
          
          {/* Input Field with Create Button */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="relative bg-black/40 backdrop-blur-md rounded-3xl p-4 border border-white/10 shadow-2xl">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCreate}
                  className="flex items-center justify-center w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors"
                >
                  <Sparkles className="w-5 h-5 text-white" />
                </button>
                <input
                  type="text"
                  placeholder="Describe your knockout design idea..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  className="flex-1 bg-transparent text-white text-lg placeholder:text-white/50 outline-none"
                />
                <Button
                  onClick={handleCreate}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-2xl px-8 py-6 font-bold text-base shadow-lg hover:shadow-red-600/50 transition-all"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create
                </Button>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              {designCategories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <button
                    key={index}
                    onClick={category.onClick || handleCreate}
                    className="px-6 py-3 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full text-white/90 hover:text-white border border-white/10 hover:border-white/30 transition-all font-medium"
                  >
                    {Icon && <Icon className="w-4 h-4 inline mr-2" />}
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-8 pt-8">
            <div className="flex items-center gap-2 text-white/90">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="font-medium">AI-Powered Design</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <Truck className="w-5 h-5 text-blue-400" />
              <span className="font-medium">Ships Fast</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <MapPin className="w-5 h-5 text-red-400" />
              <span className="font-medium">Printed via Printify</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}