import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Heart, Sparkles } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-red-950/20 to-black pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-6 shadow-lg shadow-pink-600/30">
            <Heart className="w-4 h-4" />
            About LoveForge
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4">
            Making Gifting Personal
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Turn your favorite photos into unique, meaningful gifts in under a minute
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-12">
          {/* Mission Section */}
          <section className="bg-gradient-to-br from-red-950/30 via-pink-950/20 to-red-950/30 rounded-2xl p-8 border border-pink-900/30 backdrop-blur-sm">
            <h2 className="text-3xl font-bold text-white mb-6">Our Mission</h2>
            <p className="text-white/80 leading-relaxed text-lg">
              LoveForge exists to make gifting personal again—without the wait. We help you turn your favorite photos, 
              names, and inside jokes into a shirt you're genuinely proud to give (or wear). In under a minute, you can 
              create something that feels thoughtful, custom, and uniquely yours—then we print it and ship it fast.
            </p>
          </section>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-pink-600/30 to-transparent" />

          {/* What We Do Section */}
          <section className="bg-gradient-to-br from-red-950/30 via-pink-950/20 to-red-950/30 rounded-2xl p-8 border border-pink-900/30 backdrop-blur-sm">
            <h2 className="text-3xl font-bold text-white mb-6">What We Do</h2>
            <p className="text-white/80 leading-relaxed text-lg mb-4">
              LoveForge combines an easy creator studio with AI-assisted design to produce gift-ready tees instantly. 
              Upload photos, type what you want ("I ❤️ my girlfriend," a name collage, a tour-tee vibe), and we generate 
              a clean layout with the right cutouts, effects, and typography—plus a true-to-life preview on a real shirt. 
              When you approve it, we handle the rest: high-quality printing, secure checkout, and dependable fulfillment.
            </p>
          </section>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-pink-600/30 to-transparent" />

          {/* Get Started Section */}
          <section className="bg-gradient-to-br from-red-950/30 via-pink-950/20 to-red-950/30 rounded-2xl p-8 border border-pink-900/30 backdrop-blur-sm">
            <h2 className="text-3xl font-bold text-white mb-6">Get Started</h2>
            <p className="text-white/80 leading-relaxed text-lg mb-8">
              Pick a style, upload a few photos, and type a prompt—LoveForge will generate options in seconds. Tweak 
              the text, choose your shirt color and size, preview it, and check out when it looks perfect. Whether you're 
              shopping for Valentine's, an anniversary, or a just-because gift, you can make something memorable in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to={createPageUrl('DesignStudio')}>
                <button className="group bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white px-8 py-4 rounded-full font-bold transition-all shadow-lg shadow-pink-600/50 hover:shadow-pink-600/70 hover:scale-105 flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Create Your Shirt
                </button>
              </Link>
              <Link to={createPageUrl('home')}>
                <button className="border-2 border-pink-600/50 hover:border-pink-600 hover:bg-pink-600/10 text-white px-8 py-4 rounded-full font-bold transition-all flex items-center justify-center gap-2">
                  Browse Templates
                </button>
              </Link>
            </div>
          </section>
        </div>

        {/* Footer Note */}
        <div className="mt-16 text-center">
          <p className="text-white/40 text-sm flex items-center justify-center gap-2">
            Made with <Heart className="w-4 h-4 text-pink-500" /> by LoveForge
          </p>
          <p className="text-white/40 text-sm mt-2">
            © 2025 LoveForge. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
