import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function About() {
  return (
    <div className="min-h-screen bg-black pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            About Knockout Club
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Celebrating the art of boxing through custom merchandise design
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-12">
          {/* Mission Section */}
          <section className="bg-gray-900/50 rounded-xl p-8 border border-gray-800">
            <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
            <p className="text-gray-300 leading-relaxed">
              Knockout Club is a platform dedicated to celebrating the art of boxing through custom merchandise design. 
              We believe in empowering creators and fans to express their passion for the sport through unique, 
              personalized designs.
            </p>
          </section>

          {/* What We Do Section */}
          <section className="bg-gray-900/50 rounded-xl p-8 border border-gray-800">
            <h2 className="text-2xl font-bold text-white mb-4">What We Do</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Our platform combines cutting-edge AI design tools with print-on-demand technology, allowing users 
              to create, customize, and order high-quality boxing-themed merchandise. From T-shirts to hoodies, 
              every design is crafted with passion and printed with precision.
            </p>
          </section>

          {/* Get Started Section */}
          <section className="bg-gray-900/50 rounded-xl p-8 border border-gray-800">
            <h2 className="text-2xl font-bold text-white mb-4">Get Started</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              Ready to create your own knockout merch? Head over to our Design Studio and let your creativity flow. 
              Browse our community gallery to see what others are creating, or start from scratch with our AI-powered 
              design tools.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to={createPageUrl('DesignStudio')}>
                <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-bold transition-colors">
                  Start Designing
                </button>
              </Link>
              <a href="#community" onClick={(e) => {
                e.preventDefault();
                window.location.href = '/';
                setTimeout(() => {
                  const element = document.getElementById('community');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 100);
              }}>
                <button className="border border-gray-700 hover:border-gray-600 text-white px-6 py-3 rounded-full font-bold transition-colors">
                  Browse Designs
                </button>
              </a>
            </div>
          </section>
        </div>

        {/* Footer Note */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm">
            © 2025 Knockout Club. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

