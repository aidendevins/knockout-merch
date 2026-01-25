import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Heart, Palette, ShieldCheck, Info, ShoppingCart, FolderHeart, Trash2, LogIn, LogOut, User, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import AuthModal from '@/components/auth/AuthModal';
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

export default function Navbar({ user: legacyUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { cartCount, setIsCartOpen } = useCart();
  const { user, logout } = useAuth();
  const [userDesignIds, setUserDesignIds] = useState([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Load user's design IDs from localStorage
  useEffect(() => {
    const designIds = JSON.parse(localStorage.getItem('userDesigns') || '[]');
    setUserDesignIds(designIds);
  }, [location.pathname]); // Refresh when page changes

  // Delete a design from user's list
  const handleDeleteDesign = (e, designId) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    
    // Remove from localStorage
    const updatedIds = userDesignIds.filter(id => id !== designId);
    localStorage.setItem('userDesigns', JSON.stringify(updatedIds));
    setUserDesignIds(updatedIds);
  };

  // Fetch user's designs (from API if logged in, localStorage if guest)
  const { data: userDesigns = [], isLoading: designsLoading } = useQuery({
    queryKey: ['user-designs', user?.id, userDesignIds],
    queryFn: async () => {
      // If logged in: fetch from API
      if (user) {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const apiBase = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
        
        const response = await fetch(`${apiBase}/designs/my-designs`, {
          credentials: 'include', // Send auth cookie
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch user designs');
        }
        
        return await response.json();
      }
      
      // If guest: use localStorage (current behavior)
      if (userDesignIds.length === 0) return [];
      
      const designs = await Promise.all(
        userDesignIds.map(id => 
          base44.entities.Design.get(id).catch(() => null)
        )
      );
      
      return designs.filter(d => d !== null).reverse();
    },
    enabled: !!user || userDesignIds.length > 0,
  });

  const navLinks = [
    { name: 'Home', page: 'Home', icon: Heart },
    { name: 'Design', page: 'DesignStudio', icon: Palette },
    { name: 'About', page: 'About', icon: Info },
  ];

  const isAdmin = user?.role === 'admin';

  return (
    <>
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-900/30 via-red-900/30 to-pink-900/30 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <div className="relative flex items-center h-14 sm:h-16">
          {/* Mobile: Hamburger menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg mr-2"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Left side: Nav links (hidden on mobile) */}
          <div className="hidden md:flex items-center gap-1 flex-1">
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

          {/* Center: Logo (adjusted for mobile) */}
          <Link to={createPageUrl('Home')} className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-pink-500 to-red-500 rounded-lg flex items-center justify-center shadow-lg">
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-white" />
            </div>
            <span className="font-bold text-white text-base sm:text-lg tracking-tight hidden xs:block">
              DesignForWear
            </span>
          </Link>

          {/* Right side: My Designs + Cart + CTA */}
          <div className="flex items-center justify-end gap-1 sm:gap-2 flex-1 ml-auto">
            {/* My Designs Dropdown - Hidden on mobile, shown in drawer */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative text-white/70 hover:text-white hover:bg-white/10 rounded-full gap-1 sm:gap-2 font-normal hidden sm:flex"
                >
                  <FolderHeart className="w-4 h-4" />
                  <span className="hidden lg:inline">My Designs</span>
                  {userDesignIds.length > 0 && (
                    <span className="w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-br from-purple-500 to-pink-600 text-white text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
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
                        className="cursor-pointer hover:bg-pink-900/20 focus:bg-pink-900/20 p-3 flex gap-3 items-center group"
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
                        <button
                          onClick={(e) => handleDeleteDesign(e, design.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300"
                          title="Delete design"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Cart Icon with Badge */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative text-white/70 hover:text-white transition-colors p-1.5 sm:p-2"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-br from-pink-500 to-red-600 text-white text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            {/* Login/User dropdown - Hidden on small mobile, shown in drawer */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-full gap-1 sm:gap-2 font-normal hidden xs:flex"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden lg:inline">{user.name || user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-gradient-to-b from-gray-900 to-black border border-pink-900/30 text-white">
                  <DropdownMenuLabel className="text-pink-300">
                    {user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-pink-900/30" />
                  <DropdownMenuItem 
                    onClick={logout}
                    className="cursor-pointer hover:bg-pink-900/20 focus:bg-pink-900/20 text-red-400"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAuthModalOpen(true)}
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full gap-1 sm:gap-2 font-normal hidden xs:flex"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden lg:inline">Login</span>
              </Button>
            )}

            {/* Create button - responsive sizing */}
            <Link to={createPageUrl('DesignStudio')}>
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white rounded-full font-semibold px-3 sm:px-6 shadow-lg shadow-pink-600/30 text-xs sm:text-sm"
              >
                <Heart className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1.5 fill-white" />
                <span className="hidden sm:inline">Create</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>

    {/* Mobile Menu Drawer */}
    {isMobileMenuOpen && (
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
        
        {/* Drawer */}
        <div className="fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-gray-900 to-black border-r border-pink-900/30 z-50 md:hidden overflow-y-auto">
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-4 border-b border-pink-900/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-red-500 rounded-lg flex items-center justify-center shadow-lg">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="font-bold text-white text-lg">DesignForWear</span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="p-4 space-y-2">
            {navLinks.map(({ name, page, icon: Icon }) => {
              const url = createPageUrl(page);
              const isActive = currentPath === url || currentPath === `/${page}`;
              
              return (
                <Link 
                  key={page} 
                  to={url}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors",
                    isActive && "text-white bg-pink-600/20"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{name}</span>
                </Link>
              );
            })}
            
            {isAdmin && (
              <Link 
                to={createPageUrl('Admin')}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-pink-400 hover:text-pink-300 hover:bg-pink-500/10"
              >
                <ShieldCheck className="w-5 h-5" />
                <span className="font-medium">Admin</span>
              </Link>
            )}
          </div>

          {/* Divider */}
          <div className="mx-4 h-px bg-pink-900/30" />

          {/* My Designs Section */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3 text-white/60">
              <FolderHeart className="w-4 h-4" />
              <span className="text-sm font-medium">My Designs</span>
              {userDesigns.length > 0 && (
                <span className="w-5 h-5 bg-gradient-to-br from-purple-500 to-pink-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {userDesigns.length > 9 ? '9+' : userDesigns.length}
                </span>
              )}
            </div>
            
            {designsLoading ? (
              <p className="text-white/40 text-sm px-2">Loading...</p>
            ) : userDesigns.length === 0 ? (
              <p className="text-white/40 text-sm px-2">No designs yet</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {userDesigns.slice(0, 5).map((design) => (
                  <div
                    key={design.id}
                    onClick={() => {
                      navigate(`/product/${design.id}`);
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-pink-900/20 cursor-pointer"
                  >
                    <img
                      src={getImageUrl(design.design_image_url)}
                      alt={design.title}
                      className="w-10 h-10 object-cover rounded border border-pink-900/30"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{design.title}</p>
                      <p className="text-white/40 text-xs">
                        {new Date(design.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mx-4 h-px bg-pink-900/30" />

          {/* User Section */}
          <div className="p-4 space-y-2">
            {user ? (
              <>
                <div className="px-4 py-2">
                  <p className="text-white text-sm font-medium">{user.name || 'User'}</p>
                  <p className="text-white/40 text-xs truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setIsAuthModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <LogIn className="w-5 h-5" />
                <span className="font-medium">Login / Sign Up</span>
              </button>
            )}
          </div>

          {/* Create Button */}
          <div className="p-4">
            <Link 
              to={createPageUrl('DesignStudio')}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Button className="w-full bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white rounded-xl font-semibold py-6 shadow-lg shadow-pink-600/30">
                <Heart className="w-5 h-5 mr-2 fill-white" />
                Create Design
              </Button>
            </Link>
          </div>
        </div>
      </>
    )}

    {/* Auth Modal */}
    <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}