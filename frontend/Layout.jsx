import React, { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import Navbar from '@/components/common/Navbar';
import CartDrawer from '@/components/cart/CartDrawer';
import { base44 } from '@/api/base44Client';

export default function Layout({ children }) {
  const [user, setUser] = useState(null);

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
    <div className="min-h-screen bg-black">
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
      <main>
        {children}
      </main>
    </div>
  );
}

