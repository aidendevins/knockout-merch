import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Heart, Palette, ShieldCheck, Info, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';

export default function Navbar({ user }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { cartCount, setIsCartOpen } = useCart();

  const navLinks = [
    { name: 'Home', page: 'Home', icon: Heart },
    { name: 'Design', page: 'DesignStudio', icon: Palette },
    { name: 'About', page: 'About', icon: Info },
  ];

  const isAdmin = user?.role === 'admin';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-900/30 via-red-900/30 to-pink-900/30 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="relative flex items-center h-16">
          {/* Left side: Nav links */}
          <div className="flex items-center gap-1 flex-1">
            {navLinks.map(({ name, page, icon: Icon }) => {
              const url = createPageUrl(page);
              const isActive = currentPath === url || currentPath === `/${page}`;
              
              return (
                <Link key={page} to={url}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "text-white/70 hover:text-white hover:bg-white/10 rounded-full gap-2 font-normal",
                      isActive && "text-white bg-pink-600/20"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{name}</span>
                  </Button>
                </Link>
              );
            })}
            
            {isAdmin && (
              <Link to={createPageUrl('Admin')}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-pink-400 hover:text-pink-300 hover:bg-pink-500/10 rounded-full gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              </Link>
            )}
          </div>

          {/* Center: Logo */}
          <Link to={createPageUrl('Home')} className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-red-500 rounded-lg flex items-center justify-center shadow-lg">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight hidden sm:block">
              LoveForge
            </span>
          </Link>

          {/* Right side: Cart + CTA */}
          <div className="flex items-center justify-end gap-2 flex-1">
            {/* Cart Icon with Badge */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative text-white/70 hover:text-white transition-colors p-2"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-pink-500 to-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            <Link to={createPageUrl('DesignStudio')}>
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white rounded-full font-semibold hidden sm:flex px-6 shadow-lg shadow-pink-600/30"
              >
                <Heart className="w-4 h-4 mr-1.5 fill-white" />
                Create
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}