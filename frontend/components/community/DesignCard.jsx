import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ShoppingBag, TrendingUp, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';

export default function DesignCard({ design, index = 0 }) {
  const { addToCart } = useCart();
  const [isHovered, setIsHovered] = useState(false);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Add to cart with default size M
    addToCart(design, 'M', 1);
    
    // Show success toast
    toast.success('Added to cart!', {
      description: `${design.title} (Size: M)`,
      duration: 2000,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={`/product/${design.id}`}>
        <div className="relative bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-red-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-red-500/10">
          {/* Product preview */}
          <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-900 p-6 flex items-center justify-center">
            {design.mockup_urls?.[0] ? (
              <img 
                src={design.mockup_urls[0]} 
                alt={design.title}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
              />
            ) : design.design_image_url ? (
              <div className="relative w-40 h-52 bg-gray-800 rounded-lg shadow-xl flex items-center justify-center overflow-hidden">
                <img 
                  src={design.design_image_url} 
                  alt={design.title}
                  className="w-28 h-28 object-contain"
                />
              </div>
            ) : (
              <div className="w-40 h-52 bg-gray-800 rounded-lg flex items-center justify-center">
                <span className="text-gray-600">No preview</span>
              </div>
            )}
          </div>
          
          {/* Sales badge */}
          {design.sales_count > 0 && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-black/80 text-white border-0 backdrop-blur-sm">
                <TrendingUp className="w-3 h-3 mr-1 text-green-400" />
                {design.sales_count} sold
              </Badge>
            </div>
          )}

          {/* Product type badge */}
          <div className="absolute top-3 right-3">
            <Badge variant="outline" className="border-gray-600 text-gray-300 capitalize bg-black/50 backdrop-blur-sm">
              {design.product_type || 'T-Shirt'}
            </Badge>
          </div>
          
          {/* Info */}
          <div className="p-4">
            <h3 className="text-white font-semibold text-sm mb-1 truncate group-hover:text-red-400 transition-colors">
              {design.title}
            </h3>
            
            {design.creator_name && (
              <div className="flex items-center gap-1 text-gray-500 text-xs mb-3">
                <User className="w-3 h-3" />
                <span>{design.creator_name}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-xl font-black text-white">
                ${typeof design.price === 'number' 
                  ? design.price.toFixed(2) 
                  : parseFloat(design.price || 19.99).toFixed(2)}
              </span>
              <Button 
                size="sm" 
                onClick={handleAddToCart}
                className="bg-white text-black hover:bg-gray-100 rounded-full h-8 text-xs font-semibold [&_svg]:text-black"
              >
                <ShoppingBag className="w-3 h-3 mr-1" />
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}