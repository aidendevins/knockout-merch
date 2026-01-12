import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Flame, Palette, ShieldCheck, Info, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';

export default function Navbar({ user }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { cartCount, setIsCartOpen } = useCart();

  const navLinks = [
    { name: 'Home', page: 'Home', icon: Flame },
    { name: 'Design', page: 'DesignStudio', icon: Palette },
    { name: 'About', page: 'About', icon: Info },
  ];

  const isAdmin = user?.role === 'admin';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-black/70 backdrop-blur-xl border-b border-white/5">
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
                      "text-white/60 hover:text-white hover:bg-white/5 rounded-full gap-2 font-normal",
                      isActive && "text-white bg-white/10"
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
                  className="text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-full gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              </Link>
            )}
          </div>

          {/* Center: Logo */}
          <Link to={createPageUrl('Home')} className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-white text-lg tracking-tight hidden sm:block">
              KNOCKOUT CLUB
            </span>
          </Link>

          {/* Right side: Cart + CTA */}
          <div className="flex items-center justify-end gap-2 flex-1">
            {/* Cart Icon with Badge */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative text-gray-400 hover:text-white transition-colors p-2"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            <Link to={createPageUrl('DesignStudio')}>
              <Button 
                size="sm" 
                className="bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold hidden sm:flex px-6 shadow-lg shadow-red-600/20"
              >
                Create Design
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}