// Force redeploy - 2026-01-21
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CartProvider } from './context/CartContext';
import Layout from './Layout';
import Home from './pages/home';
import DesignStudio from './pages/designStudio';
import Community from './pages/community';
import Product from './pages/product';
import ProductPreview from './pages/productPreview';
import Checkout from './pages/checkout';
import CheckoutSuccess from './pages/checkoutSuccess';
import Admin from './pages/admin';
import AdminOrders from './pages/adminOrders';
import About from './pages/about';
import './index.css';
import { createPageUrl } from './utils';

// Make createPageUrl available globally for compatibility
window.createPageUrl = createPageUrl;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/design" element={<DesignStudio />} />
              <Route path="/community" element={<Community />} />
              <Route path="/product/:designId" element={<Product />} />
              <Route path="/product-preview" element={<ProductPreview />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </CartProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
