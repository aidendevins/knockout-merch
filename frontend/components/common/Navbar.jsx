import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Heart, Palette, ShieldCheck, Info, ShoppingCart, FolderHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

// Helper to proxy S3 URLs to avoid CORS issues
const getImageUrl = (url) => {
  if (!url) return null;
  
  // Always use proxy for S3 URLs to avoid CORS issues
  if (url.includes('s3.amazonaws.com') || url.includes('s3://') || url.includes('.s3.')) {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const apiBase = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
    
    // Try to extract S3 key from URL for more reliable proxying
    let proxyUrl;
    try {
      const urlObj = new URL(url);
      const s3Key = urlObj.pathname.substring(1); // Remove leading slash
      if (s3Key) {
        proxyUrl = `${apiBase}/upload/proxy-s3/${encodeURIComponent(s3Key)}`;
      } else {
        proxyUrl = `${apiBase}/upload/proxy-image?url=${encodeURIComponent(url)}`;
      }
    } catch {
      proxyUrl = `${apiBase}/upload/proxy-image?url=${encodeURIComponent(url)}`;
    }
    
    return proxyUrl;
  }
  
  return url;
};

export default function Navbar({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { cartCount, setIsCartOpen } = useCart();
  const [userDesignIds, setUserDesignIds] = useState([]);

  // Load user's design IDs from localStorage
  useEffect(() => {
    const designIds = JSON.parse(localStorage.getItem('userDesigns') || '[]');
    setUserDesignIds(designIds);
  }, [location.pathname]); // Refresh when page changes

  // Fetch user's designs
  const { data: userDesigns = [], isLoading: designsLoading } = useQuery({
    queryKey: ['user-designs', userDesignIds],
    queryFn: async () => {
      if (userDesignIds.length === 0) return [];
      
      // Fetch designs by ID
      const designs = await Promise.all(
        userDesignIds.map(id => 
          base44.entities.Design.get(id).catch(() => null)
        )
      );
      
      // Filter out null values (deleted designs) and return in reverse order (newest first)
      return designs.filter(d => d !== null).reverse();
    },
    enabled: userDesignIds.length > 0,
  });

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

          {/* Right side: My Designs + Cart + CTA */}
          <div className="flex items-center justify-end gap-2 flex-1">
            {/* My Designs Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative text-white/70 hover:text-white hover:bg-white/10 rounded-full gap-2 font-normal"
                >
                  <FolderHeart className="w-4 h-4" />
                  <span className="hidden sm:inline">My Designs</span>
                  {userDesignIds.length > 0 && (
                    <span className="w-5 h-5 bg-gradient-to-br from-purple-500 to-pink-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                      {userDesignIds.length > 9 ? '9+' : userDesignIds.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-80 bg-gradient-to-b from-gray-900 to-black border border-pink-900/30 text-white"
              >
                <DropdownMenuLabel className="text-pink-300 font-semibold">
                  My Designs
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-pink-900/30" />
                
                {designsLoading ? (
                  <div className="py-8 text-center text-white/50 text-sm">
                    Loading your designs...
                  </div>
                ) : userDesigns.length === 0 ? (
                  <div className="py-8 text-center">
                    <Heart className="w-8 h-8 mx-auto mb-2 text-pink-500/30" />
                    <p className="text-white/50 text-sm">No designs yet</p>
                    <p className="text-white/30 text-xs mt-1">Create your first design!</p>
                  </div>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto">
                    {userDesigns.map((design) => (
                      <DropdownMenuItem
                        key={design.id}
                        onClick={() => navigate(`/product/${design.id}`)}
                        className="cursor-pointer hover:bg-pink-900/20 focus:bg-pink-900/20 p-3 flex gap-3 items-center"
                      >
                        <img
                          src={getImageUrl(design.design_image_url)}
                          alt={design.title}
                          className="w-12 h-12 object-cover rounded border border-pink-900/30"
                          onError={(e) => {
                            // Fallback to a heart icon if image fails
                            e.target.style.display = 'none';
                            e.target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="w-12 h-12 rounded border border-pink-900/30 bg-gradient-to-br from-pink-900/30 to-red-900/30 flex items-center justify-center hidden">
                          <Heart className="w-6 h-6 text-pink-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {design.title}
                          </p>
                          <p className="text-white/40 text-xs">
                            {new Date(design.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

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