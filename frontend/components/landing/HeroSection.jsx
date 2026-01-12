import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HeroSection() {
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
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter mb-6">
            Influencer Boxing is Cooked
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-10 font-light">
            Design your own knockout merch. 
            <span className="text-white"> Celebrate the moment.</span>
          </p>
          
          {/* CTA Button */}
          <div className="flex justify-center">
            <Link to={createPageUrl('DesignStudio')}>
              <Button 
                size="lg" 
                className="bg-red-600 hover:bg-red-700 text-white text-lg px-8 py-6 rounded-full font-bold tracking-wide group shadow-2xl shadow-red-600/20 hover:shadow-red-600/40 transition-all"
              >
                Start Designing
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </motion.div>
        

      </div>
    </section>
  );
}