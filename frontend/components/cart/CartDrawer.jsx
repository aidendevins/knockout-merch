import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { X, Plus, Minus, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartDrawer() {
  const { 
    cartItems, 
    cartTotal, 
    cartCount, 
    isCartOpen, 
    setIsCartOpen, 
    removeFromCart, 
    updateQuantity 
  } = useCart();

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-gray-900 border-l border-gray-800 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-6 h-6 text-red-500" />
                <h2 className="text-2xl font-black text-white">
                  Cart ({cartCount})
                </h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {cartItems.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Your cart is empty</h3>
                  <p className="text-gray-500 mb-6">
                    Add some designs to get started!
                  </p>
                  <Button
                    onClick={() => setIsCartOpen(false)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Continue Shopping
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item, index) => {
                    const price = typeof item.design.price === 'number' 
                      ? item.design.price 
                      : parseFloat(item.design.price || 0);
                    
                    return (
                      <motion.div
                        key={`${item.design.id}-${item.size}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                      >
                        <div className="flex gap-4">
                          {/* Product Image */}
                          <div className="w-20 h-20 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                            {item.design.mockup_urls?.[0] ? (
                              <img
                                src={item.design.mockup_urls[0]}
                                alt={item.design.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingBag className="w-8 h-8 text-gray-600" />
                              </div>
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-semibold truncate mb-1">
                              {item.design.title}
                            </h3>
                            <p className="text-gray-400 text-sm capitalize mb-2">
                              {item.design.product_type} • Size: {item.size}
                            </p>
                            
                            {/* Quantity Controls */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-1">
                                <button
                                  onClick={() => updateQuantity(item.design.id, item.size, item.quantity - 1)}
                                  className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="w-8 text-center text-white font-semibold">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.design.id, item.size, item.quantity + 1)}
                                  className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>

                              <button
                                onClick={() => removeFromCart(item.design.id, item.size)}
                                className="text-red-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Price */}
                          <div className="text-right">
                            <p className="text-white font-bold">
                              ${(price * item.quantity).toFixed(2)}
                            </p>
                            {item.quantity > 1 && (
                              <p className="text-gray-500 text-xs">
                                ${price.toFixed(2)} each
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {cartItems.length > 0 && (
              <div className="p-6 border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400 text-lg">Total</span>
                  <span className="text-3xl font-black text-white">
                    ${cartTotal.toFixed(2)}
                  </span>
                </div>
                
                <Link to={createPageUrl('Checkout')} onClick={() => setIsCartOpen(false)}>
                  <Button 
                    className="w-full bg-red-600 hover:bg-red-700 text-white text-lg font-bold py-6 rounded-xl"
                  >
                    Proceed to Checkout
                  </Button>
                </Link>
                
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-full mt-3 text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

