import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-black">
      {/* Background image - visible with subtle effects */}
      <div className="absolute inset-0 overflow-hidden">
        <img 
          src="/boxing-ring-bg.jpg" 
          alt="Boxing ring background"
          className="w-full h-full object-cover"
          style={{
            filter: 'contrast(0.95) brightness(0.9) saturate(0.4)',
          }}
          onError={(e) => {
            console.error('Failed to load background image:', e.target.src);
          }}
        />
      </div>
      
      {/* Tone down hotspots - subtle reduction of highlights */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          background: 'radial-gradient(circle at 30% 40%, rgba(0, 0, 0, 0.3) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(0, 0, 0, 0.2) 0%, transparent 50%)',
        }}
      />
      
      {/* Color-grade: warm/red spotlight near center (keep blue base) */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(circle at center, rgba(220, 38, 38, 0.2) 0%, rgba(139, 69, 19, 0.1) 30%, transparent 60%)',
        }}
      />
      
      {/* Dark overlay for overall tone - lighter */}
      <div className="absolute inset-0 bg-black/40" />
      
      {/* Negative space behind headline - subtle glass panel */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at center, transparent 0%, rgba(0, 0, 0, 0.2) 40%, rgba(0, 0, 0, 0.5) 100%)',
        }}
      />
      
      {/* Natural light grain overlay */}
      <div 
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />
      
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