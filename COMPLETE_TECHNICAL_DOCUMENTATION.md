# DesignForWear - Complete Technical Documentation
**AI-Powered Custom Merchandise Platform**

> **Purpose**: This document provides a complete technical blueprint of the DesignForWear platform, detailing every aspect of its architecture, implementation, and workflows. Use this as a reference for building similar AI-powered e-commerce platforms.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Backend Architecture](#4-backend-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Database Schema](#6-database-schema)
7. [Payment Processing (Stripe)](#7-payment-processing-stripe)
8. [AI Image Generation (Gemini)](#8-ai-image-generation-gemini)
9. [Print-on-Demand (Printify)](#9-print-on-demand-printify)
10. [Cloud Storage (AWS S3)](#10-cloud-storage-aws-s3)
11. [Authentication System](#11-authentication-system)
12. [Hosting & Deployment](#12-hosting--deployment)
13. [Page-by-Page Breakdown](#13-page-by-page-breakdown)
14. [Complete User Journeys](#14-complete-user-journeys)
15. [Environment Variables](#15-environment-variables)
16. [API Documentation](#16-api-documentation)
17. [Security & Best Practices](#17-security--best-practices)
18. [Development Workflow](#18-development-workflow)

---

## 1. Project Overview

### What is DesignForWear?

DesignForWear is an AI-powered custom merchandise platform that allows users to:
- Upload photos and create custom designs using AI (Google Gemini 2.0 Flash)
- Choose from pre-built design templates
- Preview designs on t-shirts and hoodies
- Purchase custom merchandise without creating an account
- Receive physical products via print-on-demand fulfillment (Printify)

### Core Value Proposition

1. **No Design Skills Required**: AI generates professional designs from photos
2. **Instant Preview**: Real-time mockups on actual products
3. **No Account Required**: Guest checkout for friction-free purchases
4. **Physical Products**: Real merchandise shipped to your door

### Business Model

- **Revenue**: Markup on base product cost + design fee
- **Cost Structure**:
  - Base product cost (Printify wholesale)
  - Shipping (passed to customer)
  - AI API costs (Google Gemini - very low)
  - S3 storage (minimal)
  - Stripe fees (2.9% + $0.30)

---

## 2. Technology Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime environment |
| Express.js | 4.18+ | Web framework |
| PostgreSQL | 14+ | Relational database |
| JWT | 9.0+ | Authentication tokens |
| bcryptjs | 2.4+ | Password hashing |
| node-postgres (pg) | 8.11+ | PostgreSQL client |
| CORS | 2.8+ | Cross-origin resource sharing |
| dotenv | 16.3+ | Environment variables |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2+ | UI framework |
| Vite | 4.4+ | Build tool & dev server |
| React Router | 6.15+ | Client-side routing |
| TanStack Query | 4.35+ | Server state management |
| Tailwind CSS | 3.3+ | Utility-first CSS |
| Framer Motion | 10.16+ | Animations |
| Fabric.js | 5.3+ | Canvas manipulation |
| Lucide React | - | Icon library |
| Sonner | - | Toast notifications |

### Third-Party Services
| Service | Purpose | Pricing Model |
|---------|---------|---------------|
| **Google Gemini AI** | Image generation | Pay-per-request (very low cost) |
| **Printify** | Print-on-demand fulfillment | Wholesale pricing + shipping |
| **Stripe** | Payment processing | 2.9% + $0.30 per transaction |
| **AWS S3** | Image storage | Pay-per-GB (very low cost) |
| **Railway** | Backend hosting + PostgreSQL | Usage-based |
| **Vercel** | Frontend hosting | Free for hobby projects |

---

## 3. Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USER BROWSER                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │   React App (Vercel CDN) - designforwear.com          │ │
│  │   - Static SPA served globally                         │ │
│  │   - Client-side routing                                │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS API Calls
                         ▼
┌─────────────────────────────────────────────────────────────┐
│        Backend API (Railway) - api.designforwear.com        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Express.js Server                                     │ │
│  │  - RESTful API endpoints                               │ │
│  │  - JWT authentication                                  │ │
│  │  - Business logic                                      │ │
│  └────────────────────────────────────────────────────────┘ │
└────┬─────────┬──────────┬─────────┬────────────┬───────────┘
     │         │          │         │            │
     ▼         ▼          ▼         ▼            ▼
┌─────────┐ ┌──────┐ ┌────────┐ ┌──────┐ ┌────────────┐
│PostgreSQL│ │Gemini│ │Printify│ │Stripe│ │   AWS S3   │
│(Railway) │ │  AI  │ │  API   │ │ API  │ │  (Images)  │
│          │ │      │ │        │ │      │ │            │
│- Users   │ │Image │ │Product │ │Pay-  │ │- Designs   │
│- Designs │ │Gene- │ │Fulfill-│ │ments │ │- Mockups   │
│- Orders  │ │ration│ │ment    │ │Webhks│ │- Templates │
│- Templates│ │      │ │        │ │      │ │            │
└─────────┘ └──────┘ └────────┘ └──────┘ └────────────┘
```

### Request Flow Example: User Creates a Design

```
1. User uploads photo → Frontend validates → Sends to Backend
2. Backend receives photo → Uploads to S3 → Gets URL
3. Backend calls Gemini AI → Generates design → Returns image
4. Backend uploads design to S3 → Stores metadata in PostgreSQL
5. Backend calls Printify → Creates product → Gets mockup URLs
6. Backend stores mockup URLs → Returns design to Frontend
7. Frontend displays design → User can checkout
```

---

## 4. Backend Architecture

### Directory Structure

```
backend/
├── server.js                 # Express server entry point
├── package.json              # Dependencies & scripts
├── db/
│   ├── postgres.js          # PostgreSQL connection & migrations
│   └── database.js          # Database helper functions
├── routes/
│   ├── auth.js              # Authentication endpoints
│   ├── designs.js           # Design CRUD operations
│   ├── orders.js            # Order management
│   ├── printify.js          # Printify integration
│   ├── stripe.js            # Stripe checkout
│   ├── stripe-webhook.js    # Stripe webhook handler
│   ├── templates.js         # Template management
│   ├── stills.js            # Fight still images
│   ├── upload.js            # File upload & AI generation
│   └── seed.js              # Database seeding
├── services/
│   ├── gemini.js            # Google Gemini AI service
│   ├── printify.js          # Printify API service
│   ├── s3.js                # AWS S3 service
│   ├── imageProcessor.js    # Image manipulation
│   ├── replicate.js         # Replicate AI (backup)
│   └── email.js             # Email service
├── middleware/
│   └── auth.js              # JWT authentication middleware
└── scripts/
    ├── seed-templates.js    # Sync templates to DB
    └── seed-studio-designs.js # Create sample designs
```

### Express Server Setup (`server.js`)

```javascript
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 8000;

// CRITICAL ORDER: Stripe webhook MUST come BEFORE express.json()
// because Stripe needs the raw request body for signature verification
app.post('/api/stripe/webhook', 
  express.raw({ type: 'application/json' }), 
  require('./routes/stripe-webhook')
);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' })); // Large limit for base64 images
app.use(cookieParser());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/designs', require('./routes/designs'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/printify', require('./routes/printify'));
app.use('/api/stripe', require('./routes/stripe'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/stills', require('./routes/stills'));
app.use('/api/upload', require('./routes/upload'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Initialize database and start server
const db = require('./db/postgres');
db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
```

**Key Points:**
- **Stripe webhook MUST be registered before `express.json()`** - Stripe needs raw body for signature verification
- **CORS** configured with credentials for cookie-based auth
- **50MB JSON limit** to handle base64-encoded images
- **Database initialization** before server starts
- **Centralized error handling** for consistent error responses

### Database Connection (`db/postgres.js`)

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

// Helper functions
async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

async function get(text, params) {
  const result = await pool.query(text, params);
  return result.rows[0];
}

async function all(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}

// Database initialization with migrations
async function init() {
  try {
    // Create tables
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS templates (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        example_image TEXT,
        reference_image TEXT,
        prompt TEXT,
        panel_schema JSONB DEFAULT '{}'::jsonb,
        upload_tips JSONB DEFAULT '{}'::jsonb,
        max_photos INTEGER DEFAULT 6,
        gradient VARCHAR(100),
        remove_background VARCHAR(50) DEFAULT NULL,
        is_hidden BOOLEAN DEFAULT FALSE,
        printify_product_id VARCHAR(255) DEFAULT NULL,
        canvas_config JSONB DEFAULT NULL,
        text_behavior VARCHAR(50) DEFAULT 'none',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS designs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        design_image_url TEXT NOT NULL,
        mockup_urls JSONB DEFAULT '[]'::jsonb,
        printify_product_id VARCHAR(255),
        printify_blueprint_id INTEGER,
        prompt_used TEXT,
        stills_used JSONB DEFAULT '[]'::jsonb,
        canvas_data JSONB DEFAULT '{}'::jsonb,
        is_published BOOLEAN DEFAULT FALSE,
        is_featured BOOLEAN DEFAULT FALSE,
        price DECIMAL(10,2) DEFAULT 29.99,
        sales_count INTEGER DEFAULT 0,
        product_type VARCHAR(50) DEFAULT 'tshirt',
        color VARCHAR(20) DEFAULT 'black',
        creator_name VARCHAR(255),
        creator_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        design_id UUID REFERENCES designs(id),
        stripe_session_id VARCHAR(255),
        stripe_payment_intent_id VARCHAR(255),
        printify_order_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        customer_email VARCHAR(255) NOT NULL,
        customer_name VARCHAR(255),
        shipping_address JSONB NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        product_type VARCHAR(50) DEFAULT 'tshirt',
        color VARCHAR(20) DEFAULT 'black',
        size VARCHAR(10) DEFAULT 'M',
        quantity INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_designs_creator ON designs(creator_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_designs_published ON designs(is_published)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_orders_design ON orders(design_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_orders_stripe ON orders(stripe_session_id)`);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

module.exports = { query, get, all, init, pool };
```

**Database Design Principles:**
- **UUID primary keys** for security (non-sequential)
- **JSONB columns** for flexible schema (mockup_urls, canvas_data, etc.)
- **Timestamps** on all tables for auditing
- **Foreign keys** for referential integrity
- **Indexes** on frequently queried columns
- **Migrations** run automatically on startup

---

## 5. Frontend Architecture

### Directory Structure

```
frontend/
├── src/
│   ├── main.jsx                 # App entry point
│   ├── Layout.jsx               # App layout wrapper
│   ├── index.css                # Global styles
│   ├── api/
│   │   ├── apiClient.js        # API client with entities
│   │   └── base44Client.js     # Base64 utilities
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthModal.jsx
│   │   │   └── DesignLimitModal.jsx
│   │   ├── cart/
│   │   │   └── CartDrawer.jsx
│   │   ├── common/
│   │   │   └── Navbar.jsx
│   │   ├── community/
│   │   │   └── DesignCard.jsx
│   │   ├── design/
│   │   │   ├── AIPanel.jsx
│   │   │   ├── BackgroundRemovalModal.jsx
│   │   │   ├── MockupPreview.jsx
│   │   │   ├── MockupPreviewModal.jsx
│   │   │   ├── PhotoUploadPanel.jsx
│   │   │   ├── ProductCanvas.jsx
│   │   │   ├── StillsPanel.jsx
│   │   │   └── TemplatePickerModal.jsx
│   │   ├── landing/
│   │   │   ├── FeaturedDesigns.jsx
│   │   │   ├── HeroSection.jsx
│   │   │   └── StudioCarousel.jsx
│   │   └── ui/                  # Shadcn/ui components
│   │       ├── button.jsx
│   │       ├── card.jsx
│   │       ├── dialog.jsx
│   │       ├── input.jsx
│   │       └── ... (other UI components)
│   ├── context/
│   │   ├── AuthContext.jsx     # Authentication state
│   │   └── CartContext.jsx     # Shopping cart state
│   ├── hooks/
│   │   └── useDesignLimit.js   # Custom hook for design limits
│   ├── pages/
│   │   ├── home.jsx            # Landing page
│   │   ├── designStudio.jsx    # Design creation page
│   │   ├── community.jsx       # Browse designs
│   │   ├── product.jsx         # Single product view
│   │   ├── checkout.jsx        # Checkout flow
│   │   ├── checkoutSuccess.jsx # Order confirmation
│   │   ├── admin.jsx           # Admin dashboard
│   │   └── adminOrders.jsx     # Order management
│   ├── config/
│   │   └── templates.js        # Template definitions
│   └── lib/
│       └── utils.js            # Utility functions
├── public/
│   ├── tshirt-black.png
│   ├── tshirt-white.png
│   ├── tshirt-pink.png
│   └── logo.ico
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

### React Router Setup (`main.jsx`)

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Toaster } from 'sonner';
import Layout from './Layout';

// Pages
import Home from './pages/home';
import DesignStudio from './pages/designStudio';
import Community from './pages/community';
import Product from './pages/product';
import Checkout from './pages/checkout';
import CheckoutSuccess from './pages/checkoutSuccess';
import Admin from './pages/admin';
import AdminOrders from './pages/adminOrders';

import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="studio" element={<DesignStudio />} />
                <Route path="community" element={<Community />} />
                <Route path="product/:id" element={<Product />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="checkout/success" element={<CheckoutSuccess />} />
                <Route path="admin" element={<Admin />} />
                <Route path="admin/orders" element={<AdminOrders />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
            <Toaster position="top-center" richColors />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

**Architecture Decisions:**
- **TanStack Query** for server state (automatic caching, refetching, mutations)
- **React Context** for client state (auth, cart)
- **Sonner** for toast notifications (better UX than alerts)
- **Single Layout** component wraps all pages (navbar, footer, etc.)

### API Client (`api/apiClient.js`)

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('token');

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      error: 'Request failed' 
    }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Entity-based API client
const apiClient = {
  entities: {
    Design: {
      list: () => apiCall('/designs'),
      get: (id) => apiCall(`/designs/${id}`),
      create: (data) => apiCall('/designs', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      }),
      update: (id, data) => apiCall(`/designs/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
      }),
      delete: (id) => apiCall(`/designs/${id}`, { 
        method: 'DELETE' 
      }),
    },
    Template: {
      list: () => apiCall('/templates'),
      listWithProducts: () => apiCall('/templates/with-products'),
      get: (id) => apiCall(`/templates/${id}`),
      create: (data) => apiCall('/templates', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      }),
      update: (id, data) => apiCall(`/templates/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
      }),
    },
    Order: {
      list: () => apiCall('/orders'),
      get: (id) => apiCall(`/orders/${id}`),
      create: (data) => apiCall('/orders', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      }),
      approveAndShip: (id) => apiCall(`/orders/${id}/approve-and-ship`, { 
        method: 'POST' 
      }),
    },
    // ... other entities
  },
  
  // Direct methods for complex operations
  uploadPhoto: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return apiCall('/upload/photo', {
      method: 'POST',
      headers: {}, // Don't set Content-Type, let browser set it
      body: formData,
    });
  },
  
  generateDesign: (data) => apiCall('/upload/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

export default apiClient;
```

**API Client Benefits:**
- **Centralized** API calls with consistent error handling
- **Entity-based** organization matches backend routes
- **Automatic authentication** via JWT token in headers
- **Type-safe** entity methods (can add TypeScript later)

### State Management

#### 1. Authentication Context (`context/AuthContext.jsx`)

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '@/api/apiClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and get user data
      apiClient.entities.Auth.me()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { token, user } = await apiClient.entities.Auth.login({ 
      email, 
      password 
    });
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  };

  const register = async (email, password, name) => {
    const { token, user } = await apiClient.entities.Auth.register({ 
      email, 
      password, 
      name 
    });
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

#### 2. Shopping Cart Context (`context/CartContext.jsx`)

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    // Load cart from localStorage on mount
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  // Save to localStorage whenever cart changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (design, options = {}) => {
    const item = {
      design,
      productType: options.productType || 'tshirt',
      color: options.color || 'black',
      size: options.size || 'M',
      quantity: options.quantity || 1,
      id: `${design.id}-${options.productType}-${options.color}-${options.size}`,
    };

    setCartItems(prev => {
      // Check if item already exists
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        // Update quantity
        return prev.map(i => 
          i.id === item.id 
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      // Add new item
      return [...prev, item];
    });

    toast.success('Added to cart!');
  };

  const removeFromCart = (itemId) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
    toast.info('Removed from cart');
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity < 1) {
      removeFromCart(itemId);
      return;
    }
    setCartItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartTotal = cartItems.reduce((total, item) => {
    return total + (item.design.price * item.quantity);
  }, 0);

  const cartCount = cartItems.reduce((count, item) => {
    return count + item.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      cartTotal,
      cartCount,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
```

**State Management Strategy:**
- **Server State**: TanStack Query (automatic caching, background updates)
- **Client State**: React Context (auth, cart)
- **Local Storage**: Persist cart and auth token across sessions
- **No Redux**: Not needed for this app's complexity

---

## 6. Database Schema

### Complete Schema with Relationships

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Templates table (design templates)
CREATE TABLE templates (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  example_image TEXT,              -- Cover image (S3 URL)
  reference_image TEXT,            -- Style reference for AI (S3 URL)
  prompt TEXT,                     -- AI prompt template
  panel_schema JSONB DEFAULT '{}', -- UI fields configuration
  upload_tips JSONB DEFAULT '{}',  -- Help text for users
  max_photos INTEGER DEFAULT 6,
  gradient VARCHAR(100),           -- Tailwind gradient classes
  remove_background VARCHAR(50),   -- 'remove-simple' | false
  is_hidden BOOLEAN DEFAULT FALSE,
  printify_product_id VARCHAR(255),
  canvas_config JSONB DEFAULT NULL, -- Positioning rules
  text_behavior VARCHAR(50) DEFAULT 'none', -- Text/fabric compatibility
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Designs table (user-created designs)
CREATE TABLE designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  design_image_url TEXT NOT NULL,  -- Final design (S3 URL)
  mockup_urls JSONB DEFAULT '[]',  -- Array of mockup URLs from Printify
  printify_product_id VARCHAR(255), -- Printify product ID
  printify_blueprint_id INTEGER,   -- Blueprint (12=tshirt, 77=hoodie)
  prompt_used TEXT,                -- AI prompt that generated this
  stills_used JSONB DEFAULT '[]',  -- Fight stills used (if any)
  canvas_data JSONB DEFAULT '{}',  -- Fabric.js canvas state
  is_published BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  price DECIMAL(10,2) DEFAULT 29.99,
  sales_count INTEGER DEFAULT 0,
  product_type VARCHAR(50) DEFAULT 'tshirt',
  color VARCHAR(20) DEFAULT 'black',
  creator_name VARCHAR(255),       -- Guest name (if no account)
  creator_id UUID REFERENCES users(id), -- User ID (if has account)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID REFERENCES designs(id),
  stripe_session_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  printify_order_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- pending, paid, pending_approval, processing, shipped, cancelled
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  shipping_address JSONB NOT NULL, -- { line1, line2, city, state, postal_code, country }
  total_amount DECIMAL(10,2) NOT NULL,
  product_type VARCHAR(50) DEFAULT 'tshirt',
  color VARCHAR(20) DEFAULT 'black',
  size VARCHAR(10) DEFAULT 'M',
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fight stills table (for UFC-themed designs - specific to this project)
CREATE TABLE fight_stills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  round VARCHAR(50),
  is_featured BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_designs_creator ON designs(creator_id);
CREATE INDEX idx_designs_published ON designs(is_published);
CREATE INDEX idx_designs_featured ON designs(is_featured);
CREATE INDEX idx_orders_design ON orders(design_id);
CREATE INDEX idx_orders_stripe ON orders(stripe_session_id);
CREATE INDEX idx_orders_status ON orders(status);
```

### Entity Relationships

```
users (1) ──────── (*) designs
  │
  │
  └──────── (*) orders (through purchases)

templates (1) ───── (*) designs (via template_id)

designs (1) ───────── (*) orders

fight_stills (*) ───── (*) designs (via stills_used JSONB)
```

### JSONB Column Structures

#### `templates.panel_schema`
Defines the UI fields shown in the AI Panel:
```json
{
  "showStyleTweaks": true,
  "fields": [
    {
      "type": "text",
      "id": "customName",
      "label": "Name",
      "placeholder": "Enter name",
      "required": true,
      "maxLength": 20
    },
    {
      "type": "colorPicker",
      "id": "primaryColor",
      "label": "Primary Color",
      "defaultValue": "#ec4899"
    },
    {
      "type": "select",
      "id": "dateFormat",
      "label": "Date Format",
      "options": [
        { "value": "roman", "label": "Roman Numerals" },
        { "value": "standard", "label": "Standard" }
      ]
    }
  ]
}
```

#### `designs.canvas_data`
Fabric.js canvas state (for designs created on canvas):
```json
{
  "version": "5.3.0",
  "objects": [
    {
      "type": "image",
      "src": "https://...",
      "left": 100,
      "top": 50,
      "scaleX": 0.5,
      "scaleY": 0.5
    }
  ]
}
```

#### `orders.shipping_address`
```json
{
  "line1": "123 Main St",
  "line2": "Apt 4B",
  "city": "New York",
  "state": "NY",
  "postal_code": "10001",
  "country": "US"
}
```

---

## 7. Payment Processing (Stripe)

### Stripe Architecture

DesignForWear uses **Stripe Checkout Sessions** (hosted checkout page) rather than in-app payment forms. This is simpler, more secure, and PCI-compliant by default.

### Checkout Flow

```
1. User clicks "Checkout" → Frontend collects shipping info
2. Frontend sends cart + shipping to backend
3. Backend creates Stripe Checkout Session
4. Backend returns session URL
5. Frontend redirects user to Stripe's hosted page
6. User enters payment info on Stripe's page
7. Stripe processes payment
8. Stripe redirects back to success page
9. Stripe sends webhook to backend
10. Backend creates order in database
```

### Backend: Create Checkout Session (`routes/stripe.js`)

```javascript
const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

router.post('/create-checkout-session', async (req, res) => {
  try {
    const { cartItems, shippingInfo, discountCode } = req.body;

    // Validate input
    if (!cartItems || !cartItems.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Calculate shipping: $4.75 first item, $2.50 each additional
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const shippingCost = 4.75 + (totalItems - 1) * 2.50;

    // Create line items for Stripe
    const lineItems = [
      // Products
      ...cartItems.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.design.title,
            description: `${item.productType} - ${item.color} - ${item.size}`,
            images: item.design.mockup_urls || [],
          },
          unit_amount: Math.round(item.design.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      })),
      // Shipping
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Shipping',
            description: 'USPS Priority Mail (2-5 business days)',
          },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      },
    ];

    // Create session
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout`,
      customer_email: shippingInfo.email,
      metadata: {
        cartItems: JSON.stringify(cartItems),
        shippingInfo: JSON.stringify(shippingInfo),
      },
    };

    // Apply discount codes
    if (discountCode) {
      const code = discountCode.toUpperCase();
      
      if (code === 'KNOCKOUT10') {
        // 10% off
        const coupon = await getOrCreateCoupon('KNOCKOUT10', {
          percent_off: 10,
        });
        sessionConfig.discounts = [{ coupon: coupon.id }];
      } 
      else if (code === 'TEST99') {
        // Test: Make total $0.50
        const subtotal = cartItems.reduce((sum, item) => 
          sum + (item.design.price * item.quantity), 0
        );
        const total = subtotal + shippingCost;
        const discountAmount = Math.max(0, total - 0.50);
        
        const coupon = await getOrCreateCoupon('TEST99_V2_50', {
          amount_off: Math.round(discountAmount * 100),
          currency: 'usd',
        });
        sessionConfig.discounts = [{ coupon: coupon.id }];
      }
      else if (code === 'FREE') {
        // This bypasses Stripe entirely - handled in orders route
        return res.json({ 
          bypass: true, 
          message: 'FREE order - no payment required' 
        });
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.json({ 
      sessionId: session.id, 
      url: session.url 
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper: Get or create Stripe coupon
async function getOrCreateCoupon(id, config) {
  try {
    return await stripe.coupons.retrieve(id);
  } catch (error) {
    if (error.code === 'resource_missing') {
      return await stripe.coupons.create({ id, ...config });
    }
    throw error;
  }
}

module.exports = router;
```

### Stripe Webhook Handler (`routes/stripe-webhook.js`)

**CRITICAL: This is the heart of the order creation pipeline.**

```javascript
const express = require('express');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const db = require('../db/postgres');
const emailService = require('../services/email');

async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('⚠️  Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    console.log('💰 Payment successful:', session.id);

    try {
      // Retrieve full session with line items
      const fullSession = await stripe.checkout.sessions.retrieve(
        session.id,
        { expand: ['line_items'] }
      );

      // Parse metadata
      const cartItems = JSON.parse(session.metadata.cartItems);
      const shippingInfo = JSON.parse(session.metadata.shippingInfo);

      // Create order for each cart item
      for (const item of cartItems) {
        const order = await db.query(
          `INSERT INTO orders 
           (design_id, stripe_session_id, stripe_payment_intent_id, 
            status, customer_email, customer_name, shipping_address, 
            total_amount, product_type, color, size, quantity)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING *`,
          [
            item.design.id,
            session.id,
            session.payment_intent,
            'pending_approval', // Manual approval before sending to Printify
            shippingInfo.email,
            shippingInfo.name,
            JSON.stringify(shippingInfo),
            session.amount_total / 100, // Convert from cents
            item.productType,
            item.color,
            item.size,
            item.quantity,
          ]
        );

        console.log('✅ Order created:', order.rows[0].id);

        // Increment sales count on design
        await db.query(
          'UPDATE designs SET sales_count = sales_count + $1 WHERE id = $2',
          [item.quantity, item.design.id]
        );
      }

      // Send confirmation email
      await emailService.sendOrderConfirmation({
        email: shippingInfo.email,
        name: shippingInfo.name,
        orderId: session.id,
        items: cartItems,
        total: session.amount_total / 100,
      });

      console.log('📧 Confirmation email sent');

    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      // Don't return error to Stripe - we'll handle this manually
    }
  }

  // Return 200 to acknowledge receipt
  res.json({ received: true });
}

module.exports = handleStripeWebhook;
```

**Webhook Security:**
- **Signature verification** ensures webhook is from Stripe
- **Raw body** required for signature verification (hence registered before `express.json()`)
- **Idempotency** - if webhook is received multiple times, check if order already exists
- **Error handling** - return 200 even if processing fails (handle manually)

### Discount Codes

| Code | Type | Effect | Use Case |
|------|------|--------|----------|
| **KNOCKOUT10** | Percentage | 10% off entire order | Marketing campaigns |
| **TEST99** | Fixed | Order total reduced to $0.50 | Testing with real Stripe payment |
| **FREE** | Bypass | $0.00 - bypasses Stripe entirely | Admin testing, giveaways |

**FREE Code Implementation:**
- Frontend detects "FREE" code
- Backend `/orders/free` endpoint creates order directly without Stripe
- Order status: `paid` (skips payment)
- Still goes through manual approval before Printify

### Manual Order Approval Workflow

**Why?** Quality control before spending money on fulfillment.

```
1. Stripe webhook creates order → status: 'pending_approval'
2. Admin views order in dashboard
3. Admin reviews design quality
4. Admin clicks "Approve & Ship"
5. Backend creates Printify order
6. Order status → 'processing'
7. Printify fulfills order
8. Order status → 'shipped'
```

**Approve & Ship Endpoint (`routes/orders.js`):**

```javascript
router.post('/:id/approve-and-ship', async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await db.get('SELECT * FROM orders WHERE id = $1', [orderId]);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check status
    if (order.status !== 'pending_approval' && order.status !== 'paid') {
      return res.status(400).json({ 
        error: `Order is ${order.status}, cannot approve` 
      });
    }

    // Get design
    const design = await db.get(
      'SELECT * FROM designs WHERE id = $1', 
      [order.design_id]
    );

    if (!design.printify_product_id) {
      return res.status(400).json({ 
        error: 'Design has no Printify product' 
      });
    }

    // Get correct variant ID from Printify
    const printify = require('../services/printify');
    const variantId = await printify.getProductVariantId(
      design.printify_product_id,
      order.size,
      order.color
    );

    // Create Printify order
    const shippingAddress = JSON.parse(order.shipping_address);
    const printifyOrder = await printify.createOrder({
      productId: design.printify_product_id,
      variantId: variantId,
      quantity: order.quantity,
      shippingAddress: {
        first_name: shippingAddress.name.split(' ')[0],
        last_name: shippingAddress.name.split(' ').slice(1).join(' '),
        email: order.customer_email,
        address1: shippingAddress.line1,
        address2: shippingAddress.line2 || '',
        city: shippingAddress.city,
        state_code: shippingAddress.state,
        zip: shippingAddress.postal_code,
        country_code: shippingAddress.country,
      },
      externalId: orderId,
    });

    // Update order
    await db.query(
      `UPDATE orders SET 
        printify_order_id = $1,
        status = 'processing',
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [printifyOrder.id, orderId]
    );

    res.json({
      success: true,
      printify_order_id: printifyOrder.id,
      message: 'Order approved and sent to Printify',
    });

  } catch (error) {
    console.error('Error approving order:', error);
    
    // Update order status to show error
    await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2',
      ['printify_error', orderId]
    );

    res.status(500).json({ error: error.message });
  }
});
```

---

## 8. AI Image Generation (Gemini)

### Google Gemini 2.0 Flash Integration

**Why Gemini?**
- **Multimodal**: Can process images + text prompts
- **Fast**: 2-5 seconds per generation
- **Cheap**: ~$0.001 per image
- **High Quality**: Excellent for photo collages and designs
- **Dual API Keys**: Automatic failover between two keys

### Service Architecture (`services/gemini.js`)

```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

// Track which API key is active (1 or 2)
let activeKeyIndex = 1;

function getGenAI() {
  const apiKey = activeKeyIndex === 2
    ? process.env.GEMINI_API_KEY_2
    : process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(`GEMINI_API_KEY${activeKeyIndex === 2 ? '_2' : ''} not configured`);
  }

  return new GoogleGenerativeAI(apiKey);
}

async function generateImage(prompt, imageData) {
  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp' 
    });

    // Prepare image parts
    const imageParts = imageData.map(img => ({
      inlineData: {
        data: img.data, // base64 string
        mimeType: img.mimeType,
      },
    }));

    // Generate content
    const result = await model.generateContent([
      prompt,
      ...imageParts,
    ]);

    const response = await result.response;
    const text = response.text();

    // Gemini returns image as base64 data URL
    return text;

  } catch (error) {
    console.error('Gemini generation error:', error);

    // Try switching API key if rate limited
    if (error.message.includes('quota') || error.message.includes('limit')) {
      console.log('🔄 Switching API keys...');
      activeKeyIndex = activeKeyIndex === 1 ? 2 : 1;
      
      // Retry once with other key
      return generateImage(prompt, imageData);
    }

    throw error;
  }
}

// Get active key status
function getKeysInfo() {
  return {
    activeKey: activeKeyIndex,
    key1Configured: !!process.env.GEMINI_API_KEY,
    key2Configured: !!process.env.GEMINI_API_KEY_2,
  };
}

module.exports = {
  generateImage,
  getKeysInfo,
  setActiveKeyIndex: (index) => { activeKeyIndex = index; },
};
```

### Image Generation Workflow

```
1. User uploads photos → Frontend converts to base64
2. User fills template fields → Frontend builds prompt
3. Frontend sends { prompt, images } to backend
4. Backend calls Gemini API
5. Gemini processes prompt + images (2-5 seconds)
6. Gemini returns generated image as base64
7. Backend uploads to S3
8. Backend creates Printify product
9. Backend stores design in database
10. Frontend displays mockups
```

### Prompt Engineering

**Template: Bootleg Rap Tee**
```
**Role:** You are a professional T-shirt designer creating a high-energy 
90s bootleg "rap tee" collage. You must execute this design as distinct, 
non-overlapping visual layers.

**REFERENCE STYLE:** Use the composition, bold typography, and electrified 
background aesthetic of the first image (image_0.png) as your primary 
stylistic guide for overall impact and layout.

**INPUT DATA:**
* **Subject Name:** [NAME]
* **Primary Color (Text):** [PRIMARY_COLOR]
* **Secondary Color (Thunder):** [SECONDARY_COLOR]
* **Background Color (Base):** [BACKGROUND_COLOR]

**LAYERED EXECUTION INSTRUCTIONS:**

**Layer 1: The Base Background**
* Create a solid, flat, uniform background layer using exactly [BACKGROUND_COLOR].

**Layer 2: The FX & Typography Layer**
* **Thunder/Lightning:** Generate dynamic lightning bolts in [SECONDARY_COLOR]
* **Typography:** Position "[NAME]" prominently at the top in 3D metallic-chrome 
  font using [PRIMARY_COLOR]

**Layer 3: The Subject "Cut-out" Layer (CRITICAL - NO BORDERS)**
* **Placement:** Arrange the [PHOTO_COUNT] provided subject images into an 
  immersive, overlapping collage
* **No Borders/Outlines:** Do NOT add any white, black, or colored borders
* **Zero Manipulation Policy:** Preserve original photographic integrity:
    * NO color grading, tinting, or filters on skin tones
    * NO alterations to lighting, shadows, or contrast
    * NO changes to poses or facial features

**Final Output:**
Produce a single, high-resolution, sharp, print-ready graphic.
```

**Key Prompt Elements:**
- **Explicit role definition** ("You are a professional T-shirt designer...")
- **Reference image** (first image is style guide)
- **Placeholder substitution** ([NAME], [PRIMARY_COLOR], etc.)
- **Layered instructions** (background, effects, subjects)
- **Critical constraints** (NO borders, NO alterations)
- **Quality requirements** (high-resolution, print-ready)

### Background Removal

**Why?** Designs with transparent backgrounds print better on colored fabrics.

**Method:** Remove.bg API (third-party service)

```javascript
// services/imageProcessor.js
const FormData = require('form-data');
const fetch = require('node-fetch');

async function removeBackground(imageBuffer) {
  const formData = new FormData();
  formData.append('image_file', imageBuffer, 'image.png');
  formData.append('size', 'auto');

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': process.env.REMOVEBG_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Background removal failed');
  }

  return await response.buffer();
}

module.exports = { removeBackground };
```

**Template Configuration:**
```javascript
{
  id: 'bootleg-rap',
  remove_background: 'remove-simple', // Enable removal
  // ...
}

{
  id: 'polaroid-ransom-note',
  remove_background: false, // Keep background (polaroid frame)
  // ...
}
```

---

## 9. Print-on-Demand (Printify)

### Printify Integration Architecture

**Printify** is the fulfillment partner that:
1. Manufactures products on-demand
2. Generates product mockups
3. Ships directly to customers
4. Handles returns/replacements

### Product Structure

```
Blueprint (Product Type)
  └─ Print Provider (e.g., "Printify Choice")
      └─ Variants (Color + Size combinations)
          └─ Variant IDs (unique identifier for each)
```

**Example:**
```
Blueprint 12: Bella Canvas 3001 T-Shirt
  └─ Printify Choice (Provider ID: 99)
      ├─ Black/S (Variant ID: 11699)
      ├─ Black/M (Variant ID: 11700)
      ├─ White/S (Variant ID: 11542)
      └─ ...
```

### Printify Service (`services/printify.js`)

```javascript
const fetch = require('node-fetch');

const PRINTIFY_API_BASE = 'https://api.printify.com/v1';
const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID;

// Blueprint configuration
const BLUEPRINTS = {
  tshirt: {
    id: 12, // Bella Canvas 3001
    printProviderId: 99, // Printify Choice
    variants: {
      black: {
        'S': 11699, 'M': 11700, 'L': 11701, 
        'XL': 11702, '2XL': 11703,
      },
      white: {
        'S': 11542, 'M': 11543, 'L': 11544, 
        'XL': 11545, '2XL': 11546,
      },
    },
  },
  hoodie: {
    id: 1528, // Comfort Colors 1467
    printProviderId: 99,
    variants: {
      // Variant IDs fetched dynamically via API
    },
  },
};

// Make authenticated API request
async function printifyRequest(endpoint, options = {}) {
  const url = `${PRINTIFY_API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${process.env.PRINTIFY_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Printify API error: ${response.status}`);
  }

  return response.json();
}

// Upload image to Printify
async function uploadImage(imageData, fileName = 'design.png') {
  let base64String;
  
  if (Buffer.isBuffer(imageData)) {
    base64String = imageData.toString('base64');
  } else if (typeof imageData === 'string') {
    // Remove data URL prefix if present
    base64String = imageData.replace(/^data:image\/\w+;base64,/, '');
  }

  const response = await printifyRequest(`/shops/${PRINTIFY_SHOP_ID}/uploads.json`, {
    method: 'POST',
    body: JSON.stringify({
      file_name: fileName,
      contents: base64String,
    }),
  });

  return response;
}

// Create product
async function createProduct({ 
  blueprintId, 
  printProviderId, 
  title, 
  imageId, 
  variantIds 
}) {
  const product = await printifyRequest(`/shops/${PRINTIFY_SHOP_ID}/products.json`, {
    method: 'POST',
    body: JSON.stringify({
      title,
      description: `Custom design: ${title}`,
      blueprint_id: blueprintId,
      print_provider_id: printProviderId,
      variants: variantIds.map(id => ({ id, price: 2999 })), // $29.99
      print_areas: [
        {
          variant_ids: variantIds,
          placeholders: [
            {
              position: 'front',
              images: [
                {
                  id: imageId,
                  x: 0.5, // Center X (0-1)
                  y: 0.5, // Center Y (0-1)
                  scale: 1.0, // Scale (0-2)
                  angle: 0,
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  return product;
}

// Get product mockups
async function getProductMockups(productId) {
  const response = await printifyRequest(
    `/shops/${PRINTIFY_SHOP_ID}/products/${productId}.json`
  );

  return response.images || [];
}

// Create order
async function createOrder({ 
  productId, 
  variantId, 
  quantity, 
  shippingAddress, 
  externalId 
}) {
  const order = await printifyRequest(`/shops/${PRINTIFY_SHOP_ID}/orders.json`, {
    method: 'POST',
    body: JSON.stringify({
      external_id: externalId,
      line_items: [
        {
          product_id: productId,
          variant_id: variantId,
          quantity,
        },
      ],
      shipping_method: 1, // Standard shipping
      address_to: {
        first_name: shippingAddress.first_name,
        last_name: shippingAddress.last_name,
        email: shippingAddress.email,
        address1: shippingAddress.address1,
        address2: shippingAddress.address2,
        city: shippingAddress.city,
        state_code: shippingAddress.state_code,
        zip: shippingAddress.zip,
        country_code: shippingAddress.country_code,
      },
    }),
  });

  // Submit order for production
  await printifyRequest(
    `/shops/${PRINTIFY_SHOP_ID}/orders/${order.id}/send_to_production.json`,
    { method: 'POST' }
  );

  return order;
}

module.exports = {
  uploadImage,
  createProduct,
  getProductMockups,
  createOrder,
  BLUEPRINTS,
};
```

### Design Upload to Printify Flow

```
1. User creates design → Design stored in S3
2. Backend calls uploadImage() → Uploads to Printify CDN
3. Printify returns image ID
4. Backend calls createProduct() → Creates product with design
5. Printify generates mockups (30-60 seconds)
6. Backend polls getProductMockups() → Gets mockup URLs
7. Backend stores mockup URLs in database
8. Frontend displays mockups to user
```

### Template Positioning System

**Problem:** Different designs need different positioning on the shirt.

**Solution:** `canvas_config` in template defines position/scale.

```javascript
// Template with small design (top-right corner)
{
  id: 'romantic-save-the-date',
  canvas_config: {
    width_scale: 0.3181,   // 31.81% of print area width
    height_scale: 0.2981,  // 29.81% of print area height
    x_offset: 0.6694,      // 66.94% from left (right side)
    y_offset: 0.0302,      // 3.02% from top
    rotation: 0,
  },
}

// Template with full-bleed design (centered)
{
  id: 'retro-name-portrait',
  canvas_config: {
    width_scale: 0.9818,   // 98.18% of print area
    height_scale: 0.9200,  // 92% of print area
    x_offset: 0.0091,      // Nearly centered
    y_offset: 0.02,        // Slightly below top
    rotation: 0,
  },
}
```

**Printify Print Area:**
- Width: 13.17 inches
- Height: 16 inches

**Coordinate System:**
- `x_offset`: 0 = left edge, 1 = right edge
- `y_offset`: 0 = top edge, 1 = bottom edge
- `width_scale` / `height_scale`: Proportion of print area

---

## 10. Cloud Storage (AWS S3)

### S3 Bucket Structure

```
knockout-merch-bucket/
├── designs/              # User-generated designs
│   ├── abc123.png
│   ├── def456.png
│   └── ...
├── mockups/             # Printify mockup images (cached)
│   ├── product-123-mockup-1.jpg
│   └── ...
├── templates/           # Template reference images
│   ├── examples/       # Cover images shown on homepage
│   │   ├── bootleg-rap-example.jpg
│   │   └── ...
│   └── references/     # Style reference for AI
│       ├── bootleg-rap-ref.jpg
│       └── ...
└── uploads/            # Temporary uploads (cleaned periodically)
    └── ...
```

### S3 Service (`services/s3.js`)

```javascript
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;

// Upload buffer to S3
async function uploadBuffer(buffer, key, contentType = 'image/png') {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read', // Make publicly accessible
  });

  await s3Client.send(command);

  return `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
}

// Upload base64 string
async function uploadBase64(base64String, key, contentType = 'image/png') {
  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  
  return uploadBuffer(buffer, key, contentType);
}

// Delete file
async function deleteFile(key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

// Generate presigned URL (for temporary access)
async function getPresignedUrl(key, expiresIn = 3600) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

module.exports = {
  uploadBuffer,
  uploadBase64,
  deleteFile,
  getPresignedUrl,
};
```

### Upload Workflow

```javascript
// Example: Upload design after AI generation
const s3 = require('./services/s3');
const { v4: uuidv4 } = require('uuid');

async function saveDesign(imageBase64) {
  const designId = uuidv4();
  const key = `designs/${designId}.png`;
  
  const url = await s3.uploadBase64(imageBase64, key, 'image/png');
  
  return { id: designId, url };
}
```

**Cost Optimization:**
- **Public-read ACL** avoids presigned URL overhead
- **No versioning** (designs are immutable)
- **Lifecycle rules** to delete temporary uploads after 7 days
- **CloudFront CDN** (optional) for faster global delivery

---

## 11. Authentication System

### JWT-Based Authentication

**Why JWT?**
- **Stateless**: No session storage needed
- **Scalable**: Works across multiple servers
- **Mobile-friendly**: Easy to use in mobile apps
- **Optional**: Users can browse/purchase without account

### Authentication Flow

```
Registration:
1. User submits email/password
2. Backend hashes password (bcrypt)
3. Backend creates user in database
4. Backend generates JWT token
5. Frontend stores token in localStorage
6. Frontend includes token in API requests

Login:
1. User submits email/password
2. Backend verifies password hash
3. Backend generates JWT token
4. Frontend stores token
5. Token valid for 7 days

Protected Routes:
1. Frontend sends token in Authorization header
2. Backend middleware verifies token
3. If valid → allow request
4. If invalid/expired → return 401
```

### Auth Routes (`routes/auth.js`)

```javascript
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/postgres');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if user exists
    const existing = await db.get(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await db.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at`,
      [email.toLowerCase(), passwordHash, name]
    );

    // Generate token
    const token = jwt.sign(
      { userId: user.rows[0].id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: user.rows[0],
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user
    const user = await db.get(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password hash from response
    delete user.password_hash;

    res.json({
      token,
      user,
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user
    const user = await db.get(
      'SELECT id, email, name, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json(user);

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

module.exports = router;
```

### Auth Middleware (`middleware/auth.js`)

```javascript
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Optional auth (allows guest access)
function optionalAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId;
    }

    next();

  } catch (error) {
    // Ignore auth errors - continue as guest
    next();
  }
}

module.exports = { authMiddleware, optionalAuth };
```

### Protected Route Example

```javascript
const { authMiddleware } = require('../middleware/auth');

// Only authenticated users can access
router.get('/my-designs', authMiddleware, async (req, res) => {
  const designs = await db.all(
    'SELECT * FROM designs WHERE creator_id = $1',
    [req.userId] // Set by middleware
  );
  res.json(designs);
});

// Optional auth - shows user's designs if logged in
router.get('/designs', optionalAuth, async (req, res) => {
  let query = 'SELECT * FROM designs WHERE is_published = true';
  let params = [];

  if (req.userId) {
    query += ' OR creator_id = $1';
    params.push(req.userId);
  }

  const designs = await db.all(query, params);
  res.json(designs);
});
```

### Guest Design Limits

**Problem:** Prevent spam/abuse without forcing registration.

**Solution:** Rate limiting based on localStorage + optional account.

```javascript
// Frontend: hooks/useDesignLimit.js
export function useDesignLimit() {
  const { user } = useAuth();

  const getGuestDesigns = () => {
    const designs = localStorage.getItem('guestDesigns');
    return designs ? JSON.parse(designs) : [];
  };

  const addGuestDesign = (designId) => {
    const designs = getGuestDesigns();
    designs.push({
      id: designId,
      createdAt: Date.now(),
    });
    localStorage.setItem('guestDesigns', JSON.stringify(designs));
  };

  const canCreateDesign = () => {
    if (user) return true; // Unlimited for registered users

    const designs = getGuestDesigns();
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    // Remove old designs
    const recentDesigns = designs.filter(d => d.createdAt > oneDayAgo);
    localStorage.setItem('guestDesigns', JSON.stringify(recentDesigns));

    return recentDesigns.length < 3; // Max 3 per day for guests
  };

  return {
    canCreateDesign,
    addGuestDesign,
    remainingDesigns: user ? Infinity : Math.max(0, 3 - getGuestDesigns().length),
  };
}
```

---

## 12. Hosting & Deployment

### Infrastructure Overview

| Component | Service | URL | Purpose |
|-----------|---------|-----|---------|
| **Frontend** | Vercel | designforwear.com | React SPA (static) |
| **Backend** | Railway | api.designforwear.com | Express API |
| **Database** | Railway PostgreSQL | (internal) | Relational data |
| **Storage** | AWS S3 | (CDN URLs) | Images |
| **CDN** | Vercel/S3 | (auto) | Global content delivery |

### Deployment Architecture

```
User Request (designforwear.com)
   ↓
Vercel CDN (Global)
   ├─→ Serves static React app (HTML, CSS, JS)
   └─→ Client makes API calls to api.designforwear.com
           ↓
       Railway (Backend)
           ├─→ Express server processes request
           ├─→ Queries PostgreSQL
           ├─→ Calls external APIs (Stripe, Printify, Gemini)
           └─→ Returns JSON response
```

### Frontend Deployment (Vercel)

**Configuration:** `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

**Key Features:**
- **Automatic deployment** on git push
- **Preview deployments** for PRs
- **Global CDN** (300+ locations)
- **Zero-config** SSL/HTTPS
- **SPA routing** handled by rewrites
- **Asset optimization** (minification, compression)

**Build Process:**
```bash
1. Vercel detects push to main branch
2. Runs `npm install`
3. Runs `npm run build` (Vite build)
4. Uploads dist/ to CDN
5. Updates designforwear.com to point to new build
6. Old build kept for instant rollback
```

### Backend Deployment (Railway)

**Configuration:** `railway.toml`

```toml
[build]
builder = "nixpacks"
buildCommand = "npm install"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[[services]]
name = "backend"
```

**Database Configuration:**
- **Managed PostgreSQL** (Railway-provided)
- **Automatic backups** (daily)
- **Connection pooling** (built-in)
- **SSL required** (production)

**Environment Variables:** Set in Railway dashboard

```
DATABASE_URL=postgresql://...
JWT_SECRET=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
PRINTIFY_API_KEY=...
PRINTIFY_SHOP_ID=...
GEMINI_API_KEY=...
GEMINI_API_KEY_2=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
REMOVEBG_API_KEY=...
FRONTEND_URL=https://designforwear.com
NODE_ENV=production
```

**Deployment Process:**
```bash
1. Railway detects push to main branch
2. Runs `npm install`
3. Starts server with `npm start`
4. Health check at /health endpoint
5. If healthy, routes traffic to new instance
6. Old instance kept for 30 seconds for graceful shutdown
```

### Custom Domain Setup

**Frontend (Vercel):**
1. Add domain in Vercel dashboard
2. Add DNS records at registrar:
   ```
   A     @     76.76.21.21
   CNAME www   cname.vercel-dns.com
   ```
3. Vercel auto-provisions SSL certificate (Let's Encrypt)

**Backend (Railway):**
1. Generate domain in Railway dashboard
2. Add DNS record:
   ```
   CNAME api   backend-production-xxxx.up.railway.app
   ```
3. Railway auto-provisions SSL certificate

### Monitoring & Logging

**Vercel:**
- **Analytics**: Page views, performance, vitals
- **Logs**: Build logs, function logs (serverless)
- **Alerts**: Build failures, errors

**Railway:**
- **Metrics**: CPU, memory, network usage
- **Logs**: stdout/stderr from Express server
- **Alerts**: Crashes, health check failures

**Custom Logging:**
```javascript
// Structured logging with pino or winston
const logger = require('pino')();

logger.info({ 
  event: 'order_created', 
  orderId: '123', 
  amount: 29.99 
});

logger.error({ 
  event: 'stripe_webhook_failed', 
  error: err.message 
});
```

### Backup Strategy

**Database:**
- **Automated**: Railway daily backups (7-day retention)
- **Manual**: `pg_dump` before major changes
```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

**S3:**
- **Versioning**: Disabled (designs are immutable)
- **Replication**: Not needed (can be regenerated)
- **Lifecycle**: Auto-delete temporary uploads after 7 days

---

## 13. Page-by-Page Breakdown

### 1. Home Page (`pages/home.jsx`)

**Purpose:** Landing page showcasing templates and featured designs.

**Components:**
- `<HeroSection>`: Hero with animated background + CTA
- `<StudioCarousel>`: Horizontal scroll of template cards
- `<FeaturedDesigns>`: Top-selling designs

**Data Fetching:**
```jsx
const { data: templates } = useQuery({
  queryKey: ['templates'],
  queryFn: () => apiClient.entities.Template.listWithProducts(),
});
```

**User Journey:**
1. User lands on page
2. Sees hero: "Create Custom Designs with AI"
3. Scrolls through templates
4. Clicks template → Navigate to Design Studio
5. OR clicks "Browse Designs" → Navigate to Community

**SEO Considerations:**
- Server-side rendering not needed (SPA is fine)
- Meta tags in `index.html`
- Semantic HTML structure
- Fast loading (Lighthouse score: 90+)

---

### 2. Design Studio (`pages/designStudio.jsx`)

**Purpose:** Core creation page - users design products here.

**Layout:**
```
┌──────────────────────────────────────────────────┐
│  Navbar                                          │
├────────────────┬─────────────────────────────────┤
│                │                                 │
│  Left Sidebar  │     Center Canvas               │
│                │                                 │
│  - Template    │   ┌─────────────────────┐     │
│    Picker      │   │                     │     │
│  - Photo       │   │   T-Shirt Mockup    │     │
│    Upload      │   │   with Design       │     │
│  - AI Panel    │   │                     │     │
│  - Stills      │   └─────────────────────┘     │
│    (optional)  │                                 │
│                │   Product Options:              │
│                │   [Black] [White] [Pink]        │
│                │   [T-Shirt] [Hoodie]            │
│                │                                 │
│                │   [Add to Cart] [Save Design]   │
└────────────────┴─────────────────────────────────┘
```

**Core Components:**

#### `<TemplatePickerModal>`
```jsx
const [selectedTemplate, setSelectedTemplate] = useState(null);

<TemplatePickerModal
  templates={templates}
  onSelect={(template) => {
    setSelectedTemplate(template);
    setStep('upload'); // Move to photo upload
  }}
/>
```

#### `<PhotoUploadPanel>`
```jsx
const [uploadedPhotos, setUploadedPhotos] = useState([]);

<PhotoUploadPanel
  maxPhotos={selectedTemplate.max_photos}
  onPhotosChange={setUploadedPhotos}
  tips={selectedTemplate.upload_tips}
/>
```

#### `<AIPanel>`
```jsx
const [fieldValues, setFieldValues] = useState({});

<AIPanel
  template={selectedTemplate}
  photos={uploadedPhotos}
  onFieldChange={setFieldValues}
  onGenerate={handleGenerateDesign}
/>
```

#### `<ProductCanvas>`
```jsx
<ProductCanvas
  designUrl={generatedDesign.url}
  productType={productType}
  color={color}
  mockupUrls={generatedDesign.mockup_urls}
/>
```

**State Management:**
```jsx
const [step, setStep] = useState('template'); // template | upload | generate | preview
const [selectedTemplate, setSelectedTemplate] = useState(null);
const [uploadedPhotos, setUploadedPhotos] = useState([]);
const [fieldValues, setFieldValues] = useState({});
const [generatedDesign, setGeneratedDesign] = useState(null);
const [productType, setProductType] = useState('tshirt');
const [color, setColor] = useState('black');
const [isGenerating, setIsGenerating] = useState(false);
```

**Design Generation Flow:**
```jsx
async function handleGenerateDesign() {
  setIsGenerating(true);

  try {
    // 1. Upload photos to backend
    const photoUploads = await Promise.all(
      uploadedPhotos.map(photo => 
        apiClient.uploadPhoto(photo)
      )
    );

    // 2. Build prompt from template + field values
    const prompt = buildPrompt(selectedTemplate, fieldValues, color);

    // 3. Call AI generation endpoint
    const result = await apiClient.generateDesign({
      templateId: selectedTemplate.id,
      prompt: prompt,
      photos: photoUploads,
      productType: productType,
      color: color,
      fieldValues: fieldValues,
    });

    // 4. Design is created in DB with mockups
    setGeneratedDesign(result.design);
    setStep('preview');

  } catch (error) {
    toast.error('Design generation failed: ' + error.message);
  } finally {
    setIsGenerating(false);
  }
}
```

**Backend Generation Endpoint:**
```javascript
router.post('/generate', async (req, res) => {
  try {
    const { templateId, prompt, photos, productType, color, fieldValues } = req.body;

    // 1. Get template
    const template = await db.get('SELECT * FROM templates WHERE id = $1', [templateId]);

    // 2. Call Gemini AI
    const gemini = require('../services/gemini');
    const generatedImage = await gemini.generateImage(prompt, photos);

    // 3. Upload design to S3
    const s3 = require('../services/s3');
    const designUrl = await s3.uploadBase64(generatedImage, `designs/${uuidv4()}.png`);

    // 4. Background removal (if template requires)
    let finalUrl = designUrl;
    if (template.remove_background) {
      const imageProcessor = require('../services/imageProcessor');
      const removed = await imageProcessor.removeBackground(designUrl);
      finalUrl = await s3.uploadBuffer(removed, `designs/${uuidv4()}-removed.png`);
    }

    // 5. Upload to Printify
    const printify = require('../services/printify');
    const printifyImage = await printify.uploadImage(finalUrl);

    // 6. Create Printify product
    const product = await printify.createProduct({
      blueprintId: printify.BLUEPRINTS[productType].id,
      printProviderId: printify.BLUEPRINTS[productType].printProviderId,
      title: `Custom ${template.name}`,
      imageId: printifyImage.id,
      variantIds: [/* all color/size combos */],
    });

    // 7. Get mockups (poll until ready)
    let mockups = [];
    for (let i = 0; i < 10; i++) {
      await sleep(5000); // Wait 5 seconds
      mockups = await printify.getProductMockups(product.id);
      if (mockups.length > 0) break;
    }

    // 8. Save design to database
    const design = await db.query(
      `INSERT INTO designs 
       (title, design_image_url, mockup_urls, printify_product_id, 
        printify_blueprint_id, prompt_used, canvas_data, price, 
        product_type, color, creator_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        `Custom ${template.name}`,
        finalUrl,
        JSON.stringify(mockups),
        product.id,
        printify.BLUEPRINTS[productType].id,
        prompt,
        JSON.stringify(fieldValues),
        29.99,
        productType,
        color,
        req.userId || null,
      ]
    );

    res.json({ design: design.rows[0] });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

### 3. Community Page (`pages/community.jsx`)

**Purpose:** Browse all published designs (marketplace).

**Layout:**
```
┌────────────────────────────────────────────────┐
│  Navbar                                        │
├────────────────────────────────────────────────┤
│                                                │
│  Browse Designs                                │
│  [Search] [Filter: All | Tops | Hoodies]      │
│                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Design 1 │  │ Design 2 │  │ Design 3 │    │
│  │ $29.99   │  │ $29.99   │  │ $29.99   │    │
│  └──────────┘  └──────────┘  └──────────┘    │
│                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Design 4 │  │ Design 5 │  │ Design 6 │    │
│  └──────────┘  └──────────┘  └──────────┘    │
│                                                │
└────────────────────────────────────────────────┘
```

**Data Fetching:**
```jsx
const { data: designs, isLoading } = useQuery({
  queryKey: ['designs', filters],
  queryFn: () => apiClient.entities.Design.list(filters),
});
```

**Filtering:**
```jsx
const [filters, setFilters] = useState({
  productType: 'all', // all | tshirt | hoodie
  search: '',
  sortBy: 'recent', // recent | popular | price
});
```

**Design Card Component:**
```jsx
function DesignCard({ design }) {
  const { addToCart } = useCart();
  const navigate = useNavigate();

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="bg-gray-900 rounded-lg overflow-hidden"
    >
      <img
        src={design.mockup_urls[0]}
        alt={design.title}
        className="w-full aspect-square object-cover cursor-pointer"
        onClick={() => navigate(`/product/${design.id}`)}
      />
      <div className="p-4">
        <h3 className="text-white font-bold">{design.title}</h3>
        <p className="text-gray-400 text-sm">{design.product_type}</p>
        <div className="flex items-center justify-between mt-4">
          <span className="text-white font-bold">${design.price}</span>
          <Button onClick={() => addToCart(design)}>
            Add to Cart
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
```

---

### 4. Product Page (`pages/product.jsx`)

**Purpose:** Single product view with full details.

**Layout:**
```
┌────────────────────────────────────────────────┐
│  Navbar                                        │
├──────────────────┬─────────────────────────────┤
│                  │                             │
│  Mockup Images   │   Product Details           │
│                  │                             │
│  ┌────────────┐  │   Custom Bootleg Tee        │
│  │            │  │   $29.99                    │
│  │  Main      │  │                             │
│  │  Image     │  │   Description...            │
│  │            │  │                             │
│  └────────────┘  │   Select Color:             │
│                  │   ⚫ Black  ⚪ White          │
│  [Thumb] [Thumb] │                             │
│                  │   Select Size:              │
│                  │   S  M  L  XL  2XL          │
│                  │                             │
│                  │   Quantity: [1]             │
│                  │                             │
│                  │   [Add to Cart - $29.99]    │
│                  │                             │
└──────────────────┴─────────────────────────────┘
```

**Data Fetching:**
```jsx
const { id } = useParams();

const { data: design, isLoading } = useQuery({
  queryKey: ['design', id],
  queryFn: () => apiClient.entities.Design.get(id),
});
```

**Product Options State:**
```jsx
const [selectedColor, setSelectedColor] = useState('black');
const [selectedSize, setSelectedSize] = useState('M');
const [quantity, setQuantity] = useState(1);
```

**Add to Cart:**
```jsx
function handleAddToCart() {
  addToCart(design, {
    productType: design.product_type,
    color: selectedColor,
    size: selectedSize,
    quantity: quantity,
  });
  toast.success('Added to cart!');
}
```

---

### 5. Checkout Page (`pages/checkout.jsx`)

**Purpose:** Collect shipping info and process payment.

**Layout:**
```
┌────────────────────────────────────────────────┐
│  Navbar                                        │
├────────────────────────────────────────────────┤
│                                                │
│  Checkout                                      │
│                                                │
│  ┌────────────────────┐  ┌──────────────────┐ │
│  │ Shipping Info      │  │ Order Summary    │ │
│  │                    │  │                  │ │
│  │ Name: _________    │  │ Subtotal: $29.99 │ │
│  │ Email: ________    │  │ Shipping: $4.75  │ │
│  │ Address: ______    │  │ Discount: -$0.00 │ │
│  │ City: _________    │  │ ──────────────── │ │
│  │ State: ________    │  │ Total: $34.74    │ │
│  │ ZIP: __________    │  │                  │ │
│  │                    │  │ [Discount Code]  │ │
│  │ [Continue to       │  │                  │ │
│  │  Payment]          │  │                  │ │
│  └────────────────────┘  └──────────────────┘ │
│                                                │
└────────────────────────────────────────────────┘
```

**State Management:**
```jsx
const { cartItems, cartTotal, clearCart } = useCart();

const [customerInfo, setCustomerInfo] = useState({
  name: '',
  email: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'US',
});

const [discountCode, setDiscountCode] = useState('');
const [appliedDiscount, setAppliedDiscount] = useState(null);
const [isProcessing, setIsProcessing] = useState(false);
```

**Shipping Calculation:**
```jsx
const calculateShipping = () => {
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  if (totalItems === 0) return 0;
  return 4.75 + (totalItems - 1) * 2.50; // $4.75 + $2.50 per additional
};
```

**Checkout Flow:**
```jsx
async function handleCheckout() {
  // Validate
  if (!customerInfo.name || !customerInfo.email || !customerInfo.line1) {
    toast.error('Please fill in all required fields');
    return;
  }

  setIsProcessing(true);

  try {
    // Check for FREE discount (bypasses Stripe)
    if (appliedDiscount?.code === 'FREE') {
      const response = await fetch(`${API_URL}/orders/free`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems,
          shippingInfo: customerInfo,
        }),
      });

      const result = await response.json();
      clearCart();
      navigate('/checkout/success?session_id=free-order');
      return;
    }

    // Create Stripe Checkout Session
    const response = await fetch(`${API_URL}/stripe/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cartItems,
        shippingInfo: customerInfo,
        discountCode: appliedDiscount?.code,
      }),
    });

    const result = await response.json();

    // Redirect to Stripe hosted checkout
    window.location.href = result.url;

  } catch (error) {
    toast.error('Checkout failed');
    setIsProcessing(false);
  }
}
```

---

### 6. Checkout Success Page (`pages/checkoutSuccess.jsx`)

**Purpose:** Order confirmation after successful payment.

**Layout:**
```
┌────────────────────────────────────────────────┐
│  Navbar                                        │
├────────────────────────────────────────────────┤
│                                                │
│              ✅ Order Confirmed!               │
│                                                │
│    Thank you for your purchase!                │
│    Order #: abc123                             │
│                                                │
│    We've sent a confirmation email to:         │
│    customer@example.com                        │
│                                                │
│    Your order is being prepared for            │
│    fulfillment. You'll receive tracking        │
│    info within 2-5 business days.              │
│                                                │
│    [View Order Details]  [Shop More]           │
│                                                │
└────────────────────────────────────────────────┘
```

**Implementation:**
```jsx
export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const navigate = useNavigate();

  useEffect(() => {
    // Clear cart on mount
    clearCart();
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-gray-900 rounded-lg p-8 text-center"
      >
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">
          Order Confirmed!
        </h1>
        
        <p className="text-gray-400 mb-6">
          Thank you for your purchase. We've sent a confirmation email
          with your order details.
        </p>
        
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <p className="text-gray-400 text-sm">Order ID</p>
          <p className="text-white font-mono">{sessionId}</p>
        </div>
        
        <Button
          onClick={() => navigate('/')}
          className="w-full bg-red-600 hover:bg-red-700"
        >
          Continue Shopping
        </Button>
      </motion.div>
    </div>
  );
}
```

---

### 7. Admin Dashboard (`pages/admin.jsx`)

**Purpose:** Manage templates, sync local templates to DB, upload reference images.

**Features:**
- View all templates
- Upload cover images (example_image)
- Upload reference images (for AI style)
- Sync local templates to database
- Toggle template visibility (is_hidden)

**Key Functionality:**

#### Sync Local Templates to Database
```jsx
async function syncTemplates() {
  try {
    const response = await fetch(`${API_URL}/templates/sync-all`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();
    
    toast.success(`Synced ${result.created.length} templates`);
    refetch(); // Refresh template list
  } catch (error) {
    toast.error('Sync failed');
  }
}
```

#### Upload Cover Image
```jsx
async function uploadCoverImage(templateId, file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_URL}/templates/${templateId}/upload-cover`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const result = await response.json();
  toast.success('Cover image uploaded');
}
```

---

### 8. Admin Orders (`pages/adminOrders.jsx`)

**Purpose:** View all orders and approve for fulfillment.

**Layout:**
```
┌────────────────────────────────────────────────┐
│  Navbar                                        │
├────────────────────────────────────────────────┤
│                                                │
│  Orders Management                             │
│  [Filter: All | Pending | Processing | Shipped]│
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ Order #abc123                            │ │
│  │ Status: Pending Approval                 │ │
│  │ Customer: John Doe                       │ │
│  │ Total: $34.74                            │ │
│  │ Design: [Thumbnail]                      │ │
│  │ [Approve & Ship]  [View Details]         │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ Order #def456                            │ │
│  │ Status: Processing                       │ │
│  │ Printify Order: 12345678                 │ │
│  │ [Track Order]                            │ │
│  └──────────────────────────────────────────┘ │
│                                                │
└────────────────────────────────────────────────┘
```

**Approve & Ship:**
```jsx
async function approveOrder(orderId) {
  if (!confirm('Approve this order and send to Printify?')) return;

  try {
    const response = await apiClient.entities.Order.approveAndShip(orderId);
    
    toast.success(`Order approved! Printify Order: ${response.printify_order_id}`);
    refetch();
  } catch (error) {
    toast.error('Failed to approve: ' + error.message);
  }
}
```

---

## 14. Complete User Journeys

### Journey 1: Guest User Creates & Purchases Design

```
1. User visits designforwear.com
   ├─→ Sees hero section with CTA
   └─→ Browses template carousel

2. User clicks "Bootleg Rap Tee" template
   ├─→ Redirected to /studio?template=bootleg-rap
   └─→ Template picker pre-selects template

3. User uploads 3 photos
   ├─→ Photos validated (size, format)
   ├─→ Thumbnails displayed
   └─→ "Continue" button enabled

4. User fills AI panel fields
   ├─→ Name: "Sarah"
   ├─→ Primary Color: Pink (#ec4899)
   ├─→ Secondary Color: Purple (#8b5cf6)
   └─→ Selects product color: Black

5. User clicks "Generate Design"
   ├─→ Loading spinner (30-60 seconds)
   ├─→ Backend uploads photos to S3
   ├─→ Backend calls Gemini API
   ├─→ Backend removes background
   ├─→ Backend creates Printify product
   ├─→ Backend polls for mockups
   └─→ Design displayed in canvas

6. User reviews mockup
   ├─→ Switches product type: T-Shirt → Hoodie
   ├─→ Changes color: Black → White
   └─→ Sees updated mockup

7. User clicks "Add to Cart"
   ├─→ Cart drawer opens
   ├─→ Shows 1 item, $29.99
   └─→ User clicks "Checkout"

8. User fills shipping form
   ├─→ Name, email, address, etc.
   ├─→ Enters discount code: KNOCKOUT10
   ├─→ Total: $31.24 (10% off)
   └─→ Clicks "Continue to Payment"

9. User redirected to Stripe
   ├─→ Enters credit card info
   ├─→ Clicks "Pay $31.24"
   └─→ Payment processed

10. Stripe redirects to /checkout/success
    ├─→ Sees order confirmation
    ├─→ Receives confirmation email
    └─→ Order created in database (status: pending_approval)

11. Admin reviews order in dashboard
    ├─→ Sees design quality
    ├─→ Clicks "Approve & Ship"
    └─→ Order sent to Printify (status: processing)

12. Printify fulfills order
    ├─→ Manufactures product (2-5 days)
    ├─→ Ships to customer
    └─→ Customer receives tracking email

13. Customer receives product (5-10 days total)
```

### Journey 2: Registered User Saves Design for Later

```
1. User creates account
   ├─→ Clicks "Sign Up" in navbar
   ├─→ Enters email/password
   └─→ JWT token stored in localStorage

2. User creates design (same as above)

3. User clicks "Save Design" instead of "Add to Cart"
   ├─→ Design saved to user's account (creator_id set)
   ├─→ Toast: "Design saved!"
   └─→ User can access later from "My Designs"

4. User logs out and returns later
   ├─→ Clicks "Sign In"
   ├─→ Enters credentials
   └─→ JWT token refreshed

5. User navigates to "My Designs"
   ├─→ Sees all saved designs
   ├─→ Clicks on saved design
   └─→ Redirected to /product/:id

6. User adds to cart and purchases
   (Same as Journey 1, steps 7-13)
```

### Journey 3: Admin Adds New Template

```
1. Admin creates template definition in code
   ├─→ Edit frontend/config/templates.js
   ├─→ Add new template to LOCAL_TEMPLATES array
   └─→ Define: id, name, prompt, panel_schema, etc.

2. Admin pushes code to GitHub
   ├─→ Vercel auto-deploys frontend
   └─→ Railway auto-deploys backend

3. Admin logs into admin dashboard
   ├─→ Navigates to /admin
   └─→ Clicks "Sync All Local Templates"

4. Backend syncs templates
   ├─→ Reads LOCAL_TEMPLATES from frontend
   ├─→ Creates new template in database
   └─→ Returns success message

5. Admin uploads reference image
   ├─→ Selects template in dashboard
   ├─→ Uploads reference image (for AI style)
   └─→ Image uploaded to S3 (templates/references/)

6. Admin uploads cover image
   ├─→ Uploads example/cover image
   └─→ Image uploaded to S3 (templates/examples/)
   └─→ Displayed on homepage

7. Admin tests template
   ├─→ Creates test design
   ├─→ Reviews AI output quality
   └─→ Makes adjustments to prompt if needed

8. Admin publishes template
   ├─→ Sets is_hidden = false
   └─→ Template visible on homepage
```

---

## 15. Environment Variables

### Complete List

#### Backend (Railway)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# JWT Authentication
JWT_SECRET=your-super-secret-key-min-32-chars

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Printify
PRINTIFY_API_KEY=eyJ...
PRINTIFY_SHOP_ID=12345678

# Google Gemini AI
GEMINI_API_KEY=AIzaSy...
GEMINI_API_KEY_2=AIzaSy...  # Backup key

# AWS S3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=abc123...
AWS_S3_BUCKET=knockout-merch-bucket
AWS_REGION=us-east-1

# Remove.bg (Background Removal)
REMOVEBG_API_KEY=abc123...

# Email (optional)
SENDGRID_API_KEY=SG...
EMAIL_FROM=noreply@designforwear.com

# App Config
FRONTEND_URL=https://designforwear.com
NODE_ENV=production
PORT=8000
```

#### Frontend (Vercel)

```bash
# API Base URL
VITE_API_URL=https://api.designforwear.com/api

# Stripe (public key only)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Environment Setup Guide

#### Development (.env.local)

```bash
# Backend
DATABASE_URL=postgresql://localhost:5432/knockout_dev
JWT_SECRET=dev-secret-key
STRIPE_SECRET_KEY=sk_test_...
PRINTIFY_API_KEY=your-dev-key
GEMINI_API_KEY=your-dev-key
AWS_ACCESS_KEY_ID=your-dev-key
AWS_SECRET_ACCESS_KEY=your-dev-key
AWS_S3_BUCKET=knockout-merch-dev
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:8000/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### Production

**Railway:**
- Set via Railway dashboard
- Use Railway's built-in secrets management
- DATABASE_URL auto-generated by Railway

**Vercel:**
- Set via Vercel dashboard
- Separate values per environment (Production, Preview, Development)
- Auto-injected at build time

### Security Best Practices

1. **Never commit .env files** to Git
   ```bash
   # .gitignore
   .env
   .env.local
   .env.*.local
   ```

2. **Rotate secrets regularly**
   - Stripe: Rotate every 90 days
   - JWT_SECRET: Rotate on security incidents
   - API keys: Rotate quarterly

3. **Use different keys per environment**
   - Stripe: Test keys for dev, live keys for prod
   - Gemini: Separate keys per environment
   - AWS: Separate IAM users per environment

4. **Limit key permissions**
   - AWS IAM: Only S3 access, specific bucket
   - Stripe: Restricted API key scopes
   - Printify: Read/write only, no account management

---

## 16. API Documentation

### Base URL
```
Production: https://api.designforwear.com/api
Development: http://localhost:8000/api
```

### Authentication
```
Bearer Token (JWT)
Header: Authorization: Bearer <token>
```

---

### Authentication Endpoints

#### POST `/auth/register`
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure-password",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2026-01-26T12:00:00Z"
  }
}
```

#### POST `/auth/login`
Login existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure-password"
}
```

**Response:** Same as register

#### GET `/auth/me`
Get current user (requires auth).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2026-01-26T12:00:00Z"
}
```

---

### Template Endpoints

#### GET `/templates`
Get all visible templates.

**Response:**
```json
[
  {
    "id": "bootleg-rap",
    "name": "Bootleg Rap Tee",
    "description": "Classic bootleg concert tee style...",
    "example_image": "https://s3.amazonaws.com/...",
    "reference_image": "https://s3.amazonaws.com/...",
    "max_photos": 6,
    "gradient": "from-purple-600 to-pink-600",
    "remove_background": "remove-simple",
    "panel_schema": { /* ... */ },
    "upload_tips": { /* ... */ },
    "canvas_config": { /* ... */ },
    "text_behavior": "user-controlled"
  }
]
```

#### GET `/templates/:id`
Get single template by ID.

#### GET `/templates/with-products`
Get templates with enriched Printify data (mockups, pricing).

#### POST `/templates` (Admin only)
Create new template.

#### PUT `/templates/:id` (Admin only)
Update template.

#### POST `/templates/sync-all` (Admin only)
Sync LOCAL_TEMPLATES to database.

---

### Design Endpoints

#### GET `/designs`
Get all published designs (or user's designs if authenticated).

**Query Parameters:**
- `product_type`: Filter by tshirt/hoodie
- `search`: Search by title
- `limit`: Max results (default: 50)
- `offset`: Pagination offset

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Custom Bootleg Tee",
    "design_image_url": "https://s3.amazonaws.com/...",
    "mockup_urls": [
      "https://images-api.printify.com/mockup/..."
    ],
    "printify_product_id": "abc123",
    "price": 29.99,
    "sales_count": 5,
    "product_type": "tshirt",
    "color": "black",
    "is_published": true,
    "is_featured": false,
    "created_at": "2026-01-26T12:00:00Z"
  }
]
```

#### GET `/designs/:id`
Get single design by ID.

#### POST `/designs`
Create design manually (for canvas-based designs).

**Request:**
```json
{
  "title": "My Custom Design",
  "design_image_url": "https://...",
  "canvas_data": { /* Fabric.js JSON */ },
  "product_type": "tshirt",
  "color": "black",
  "price": 29.99
}
```

#### PUT `/designs/:id`
Update design (owner only).

#### DELETE `/designs/:id`
Delete design (owner only).

---

### AI Generation Endpoints

#### POST `/upload/generate`
Generate design using AI.

**Request:**
```json
{
  "templateId": "bootleg-rap",
  "prompt": "Create a bootleg rap tee with...",
  "photos": [
    {
      "data": "base64-encoded-image",
      "mimeType": "image/jpeg"
    }
  ],
  "productType": "tshirt",
  "color": "black",
  "fieldValues": {
    "customName": "Sarah",
    "primaryColor": "#ec4899",
    "secondaryColor": "#8b5cf6"
  }
}
```

**Response:**
```json
{
  "design": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Custom Bootleg Tee",
    "design_image_url": "https://...",
    "mockup_urls": ["https://..."],
    "printify_product_id": "abc123",
    /* ... other fields ... */
  }
}
```

**Process:**
1. Uploads photos to S3
2. Calls Gemini AI (30-60 seconds)
3. Removes background if needed
4. Uploads to Printify
5. Creates Printify product
6. Polls for mockups
7. Saves to database
8. Returns design

---

### Order Endpoints

#### GET `/orders`
Get all orders (admin) or user's orders (authenticated user).

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "design_id": "...",
    "stripe_session_id": "cs_test_...",
    "printify_order_id": "12345678",
    "status": "processing",
    "customer_email": "customer@example.com",
    "customer_name": "John Doe",
    "shipping_address": { /* ... */ },
    "total_amount": 34.74,
    "product_type": "tshirt",
    "color": "black",
    "size": "M",
    "quantity": 1,
    "created_at": "2026-01-26T12:00:00Z"
  }
]
```

#### GET `/orders/:id`
Get single order.

#### POST `/orders/free`
Create FREE order (bypasses Stripe).

**Request:**
```json
{
  "cartItems": [
    {
      "design": { /* design object */ },
      "productType": "tshirt",
      "color": "black",
      "size": "M",
      "quantity": 1
    }
  ],
  "shippingInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "line1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postal_code": "10001",
    "country": "US"
  }
}
```

#### POST `/orders/:id/approve-and-ship` (Admin only)
Approve order and send to Printify for fulfillment.

**Response:**
```json
{
  "success": true,
  "printify_order_id": "12345678",
  "message": "Order approved and sent to Printify"
}
```

---

### Stripe Endpoints

#### POST `/stripe/create-checkout-session`
Create Stripe Checkout Session.

**Request:**
```json
{
  "cartItems": [ /* ... */ ],
  "shippingInfo": { /* ... */ },
  "discountCode": "KNOCKOUT10"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

**Frontend redirects to `url`.**

#### POST `/stripe/webhook`
Stripe webhook handler (for `checkout.session.completed` events).

**Headers:**
```
stripe-signature: t=1234567890,v1=abc123...
```

**Request:** Raw Stripe event JSON

**Response:**
```json
{
  "received": true
}
```

---

### Printify Endpoints

#### GET `/printify/status`
Check Printify configuration status.

#### GET `/printify/blueprints`
Get available product types (blueprints).

**Query Parameters:**
- `search`: Filter by name

#### GET `/printify/blueprints/:blueprintId/providers/:providerId/variants`
Get variant IDs for blueprint + provider.

---

## 17. Security & Best Practices

### Security Checklist

✅ **Authentication:**
- JWT tokens with expiration (7 days)
- Bcrypt password hashing (10 rounds)
- HTTPS only in production
- No plaintext passwords stored

✅ **API Security:**
- CORS restricted to FRONTEND_URL only
- Rate limiting on expensive endpoints (AI generation)
- Input validation on all endpoints
- SQL injection prevention (parameterized queries)
- XSS prevention (React escapes by default)

✅ **Payment Security:**
- Stripe handles all card data (PCI-compliant)
- Webhook signature verification
- No card data touches our servers
- HTTPS required for webhooks

✅ **File Upload Security:**
- File size limits (10MB)
- File type validation (images only)
- Virus scanning (optional - ClamAV)
- S3 upload to separate bucket

✅ **Environment Security:**
- Secrets in environment variables
- Never committed to Git
- Rotated regularly
- Separate keys per environment

✅ **Database Security:**
- SSL required in production
- Parameterized queries only
- UUID primary keys (non-sequential)
- Soft deletes for orders/designs

---

### Performance Optimization

**Frontend:**
- Lazy loading routes (`React.lazy()`)
- Image optimization (WebP, responsive)
- Code splitting (Vite automatic)
- TanStack Query caching (5min stale time)
- Debounced search inputs
- Virtual scrolling for long lists

**Backend:**
- Database connection pooling
- Index on frequently queried columns
- N+1 query prevention
- Response compression (gzip)
- CDN for static assets (S3 → CloudFront)

**Infrastructure:**
- Vercel Edge Network (300+ locations)
- Railway auto-scaling
- PostgreSQL query optimization
- S3 lifecycle policies (auto-delete temp files)

---

### Monitoring & Observability

**Error Tracking:**
```javascript
// Sentry integration (optional)
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

app.use(Sentry.Handlers.errorHandler());
```

**Logging:**
```javascript
// Structured logging with Pino
const logger = require('pino')();

logger.info({ 
  event: 'design_created', 
  designId: design.id,
  userId: user.id,
  duration: 5000,
});
```

**Metrics:**
- Design generation success rate
- Average generation time
- Order conversion rate
- Payment failure rate
- Printify order status distribution

---

## 18. Development Workflow

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/yourusername/knockout-merch
cd knockout-merch

# 2. Install backend dependencies
cd backend
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# 4. Start PostgreSQL (Docker)
docker run -d \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=knockout_dev \
  postgres:14

# 5. Start backend server
npm run dev  # Runs on port 8000

# 6. In new terminal: Install frontend dependencies
cd ../frontend
npm install

# 7. Set up frontend env
cp .env.example .env.local
# Edit .env.local

# 8. Start frontend dev server
npm run dev  # Runs on port 5173

# 9. Open browser
# Frontend: http://localhost:5173
# Backend: http://localhost:8000
```

### Git Workflow

```bash
# Feature branch workflow
git checkout -b feature/new-template
# Make changes
git add .
git commit -m "Add new template: Vintage Poster"
git push origin feature/new-template

# Create pull request on GitHub
# After review, merge to main

# Deployment happens automatically:
# - Vercel deploys frontend from main branch
# - Railway deploys backend from main branch
```

### Database Migrations

```bash
# Add migration in db/postgres.js
await query(`
  ALTER TABLE designs 
  ADD COLUMN tags JSONB DEFAULT '[]'::jsonb
`);

# Restart backend - migration runs automatically

# For complex migrations, use separate script:
node backend/scripts/migrate-add-tags.js
```

### Testing Strategy

**Unit Tests:** (Optional - not currently implemented)
```bash
# Backend
npm test  # Jest

# Frontend
npm test  # Vitest
```

**Manual Testing Checklist:**
- [ ] Create design with each template
- [ ] Test discount codes (KNOCKOUT10, TEST99, FREE)
- [ ] Complete full checkout flow
- [ ] Approve order in admin dashboard
- [ ] Verify Printify order created
- [ ] Test guest design limits
- [ ] Test authentication flow

---

## Conclusion

This documentation provides a complete blueprint for building an AI-powered custom merchandise platform. Key takeaways:

1. **Simple Stack**: React + Express + PostgreSQL + third-party APIs
2. **Modular Architecture**: Each service (AI, payments, fulfillment) is isolated
3. **Guest-Friendly**: No account required to purchase
4. **Quality Control**: Manual approval before fulfillment
5. **Scalable**: Railway auto-scales, Vercel handles CDN
6. **Cost-Effective**: Pay-as-you-go for all services

**Next Steps for Your Project:**
1. Start with core functionality (design creation)
2. Add payment processing
3. Integrate print-on-demand
4. Polish UX and add features
5. Launch and iterate based on user feedback

**Resources:**
- Stripe Docs: https://stripe.com/docs
- Printify API: https://developers.printify.com
- Google Gemini: https://ai.google.dev/docs
- Railway: https://docs.railway.app
- Vercel: https://vercel.com/docs

---

*Last Updated: January 26, 2026*
*Project: DesignForWear (knockout-merch)*
*Author: Technical Documentation*
