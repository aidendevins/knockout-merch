import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-black">
      {/* Animated background grain */}
      <div className="absolute inset-0 opacity-20" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Red glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/20 rounded-full blur-[120px]" />
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-red-600/10 border border-red-600/30 rounded-full px-4 py-2 mb-8">
            <Zap className="w-4 h-4 text-red-500" />
            <span className="text-red-400 text-sm font-medium tracking-wide uppercase">
              August 2025 • Riyadh
            </span>
          </div>
          
          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter mb-6">
            JAKE PAUL
            <span className="block text-red-500 mt-2">GETS KNOCKED OUT</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-10 font-light">
            Design your own knockout merch. 
            <span className="text-white"> Celebrate the moment.</span>
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={createPageUrl('DesignStudio')}>
              <Button 
                size="lg" 
                className="bg-red-600 hover:bg-red-700 text-white text-lg px-8 py-6 rounded-full font-bold tracking-wide group"
              >
                Start Designing
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to={createPageUrl('Community')}>
              <Button 
                size="lg" 
                variant="outline"
                className="border-gray-700 text-white hover:bg-white hover:text-black text-lg px-8 py-6 rounded-full font-bold tracking-wide hover:[&_svg]:text-black"
              >
                Browse Designs
              </Button>
            </Link>
          </div>
        </motion.div>
        

      </div>
    </section>
  );
}