import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Flame, Users, Palette, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Navbar({ user }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const navLinks = [
    { name: 'Home', page: 'Home', icon: Flame },
    { name: 'Design', page: 'DesignStudio', icon: Palette },
    { name: 'Community', page: 'Community', icon: Users },
  ];

  const isAdmin = user?.role === 'admin';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-gray-800/50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={createPageUrl('Home')} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-white text-lg tracking-tight hidden sm:block">
              KO MERCH
            </span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navLinks.map(({ name, page, icon: Icon }) => {
              const url = createPageUrl(page);
              const isActive = currentPath === url || currentPath === `/${page}`;
              
              return (
                <Link key={page} to={url}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "text-gray-400 hover:text-white hover:bg-white/10 rounded-full gap-2",
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

          {/* CTA */}
          <Link to={createPageUrl('DesignStudio')}>
            <Button 
              size="sm" 
              className="bg-red-600 hover:bg-red-700 text-white rounded-full font-bold hidden sm:flex"
            >
              Create Design
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}