import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ShoppingBag, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function FeaturedDesigns({ designs, onViewAll }) {
  if (!designs?.length) return null;

  return (
    <section className="py-24 bg-gradient-to-b from-black via-gray-950 to-black">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 mb-4">
            <TrendingUp className="w-3 h-3 mr-1" />
            Fan Favorites
          </Badge>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Featured Designs
          </h2>
          <p className="text-gray-500 mt-4 text-lg">
            Ready to ship. No design skills needed.
          </p>
        </div>

        {/* Designs grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {designs.map((design, index) => (
            <motion.div
              key={design.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group"
            >
              <Link to={createPageUrl(`Checkout?designId=${design.id}`)}>
                <div className="relative bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-red-600/50 transition-all duration-300">
                  {/* Product mockup */}
                  <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-900 p-8 flex items-center justify-center">
                    {design.mockup_urls?.[0] ? (
                      <img 
                        src={design.mockup_urls[0]} 
                        alt={design.title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : design.design_image_url ? (
                      <div className="relative w-48 h-60 bg-white rounded-lg shadow-2xl flex items-center justify-center overflow-hidden">
                        <img 
                          src={design.design_image_url} 
                          alt={design.title}
                          className="w-32 h-32 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-48 h-60 bg-white rounded-lg shadow-2xl flex items-center justify-center">
                        <span className="text-gray-400">No preview</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Featured badge */}
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-red-600 text-white border-0">
                      Featured
                    </Badge>
                  </div>
                  
                  {/* Info */}
                  <div className="p-6">
                    <h3 className="text-white font-bold text-lg mb-2 group-hover:text-red-400 transition-colors">
                      {design.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-white">
                        ${design.price?.toFixed(2) || '19.99'}
                      </span>
                      <Button size="sm" className="bg-white text-black hover:bg-gray-100 rounded-full [&_svg]:text-black">
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Buy Now
                      </Button>
                    </div>
                    {design.sales_count > 0 && (
                      <p className="text-gray-500 text-sm mt-3">
                        {design.sales_count} sold
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* View all link */}
        {onViewAll && (
          <div className="text-center mt-12">
            <Button 
              variant="ghost" 
              onClick={onViewAll}
              className="text-gray-400 hover:text-white hover:bg-white/5 text-lg"
            >
              View All Community Designs →
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}