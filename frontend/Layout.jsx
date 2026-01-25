import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import Navbar from '@/components/common/Navbar';
import CartDrawer from '@/components/cart/CartDrawer';
import { base44 } from '@/api/base44Client';
import analytics from '@/services/analytics';

export default function Layout({ children }) {
  const [user, setUser] = useState(null);
  const location = useLocation();

  // Track page views on route change
  useEffect(() => {
    analytics.pageView(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        // Not logged in
      }
    };
    loadUser();
  }, []);

  return (
    <div className="min-h-screen w-full bg-black">
      <Toaster 
        position="top-center" 
        richColors 
        theme="dark"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            border: '1px solid #333',
          },
        }}
      />
      <Navbar user={user} />
      <CartDrawer />
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}

