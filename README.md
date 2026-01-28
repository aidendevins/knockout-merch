# DesignForWear - AI-Powered Custom Merchandise Platform

A full-stack e-commerce platform that enables users to create custom-designed t-shirts and hoodies using AI image generation. Users upload photos, customize designs with templates, and purchase physical products that are automatically fulfilled through Printify's print-on-demand network.

**Live Site:** [designforwear.com](https://designforwear.com)

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Purpose & Mission](#purpose--mission)
- [Architecture](#architecture)
- [Core Features](#core-features)
- [Technical Implementation](#technical-implementation)
- [Complex Code Sections](#complex-code-sections)
- [File Structure](#file-structure)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Setup & Deployment](#setup--deployment)
- [Environment Variables](#environment-variables)

---

## 🎯 Project Overview

DesignForWear is a modern e-commerce platform that combines:
- **AI Image Generation** (Google Gemini 2.0 Flash)
- **Template-Based Design System** (6 pre-built templates)
- **Print-on-Demand Fulfillment** (Printify integration)
- **Payment Processing** (Stripe)
- **User Authentication** (JWT-based with optional accounts)
- **Cloud Storage** (AWS S3)

The platform allows users to create personalized Valentine's shirts, anniversary gifts, and custom merchandise in under 60 seconds, with designs automatically printed and shipped.

---

## 🎨 Purpose & Mission

**Mission:** Make gifting personal again - without the wait. Turn favorite photos, names, and inside jokes into custom shirts that feel thoughtful, custom, and uniquely yours.

**Target Use Cases:**
- Valentine's Day gifts
- Anniversary presents
- Birthday gifts
- Custom couple portraits
- Personalized photo collages

**Key Value Propositions:**
- ⚡ **Fast**: Design in 60 seconds
- 🎨 **AI-Powered**: Professional designs from photos
- 🚚 **Fast Shipping**: Printed in USA, ships quickly
- 💰 **Affordable**: Starting at $19.99
- 🔒 **Secure**: Stripe payment processing

---

## 🏗️ Architecture

### Frontend (Vercel)
- **Framework**: React 18 + Vite
- **Routing**: React Router v6
- **State Management**: 
  - TanStack Query (React Query) for server state
  - React Context for global state (Cart, Auth)
  - Local state with useState/useReducer
- **Styling**: Tailwind CSS with custom gradients
- **UI Components**: Radix UI primitives + Shadcn/ui
- **Animations**: Framer Motion
- **Notifications**: Sonner toast library
- **Build Tool**: Vite

### Backend (Railway)
- **Runtime**: Node.js 18+ with Express
- **Database**: PostgreSQL (Railway managed)
- **Storage**: AWS S3 for images
- **Image Processing**: Sharp for manipulation
- **File Upload**: Multer + Multer-S3
- **Authentication**: JWT with HTTP-only cookies

### Integrations

#### 🤖 AI & Image Processing
- **Google Gemini 2.0 Flash**: AI image generation from prompts + reference images
- **Replicate API**: Background removal (recraft-ai/recraft-remove-background)
- **Sharp**: Image processing (format conversion, resizing, optimization)

#### 💳 Payments & Fulfillment
- **Stripe**: Checkout Sessions, webhooks, coupon codes
- **Printify**: Product creation, mockup generation, order fulfillment

#### 📧 Communication
- **Resend**: Transactional emails for order confirmations

#### ☁️ Infrastructure
- **AWS S3**: Image storage with presigned URLs
- **Railway**: Backend hosting + PostgreSQL database
- **Vercel**: Frontend hosting with edge functions

---

## ✨ Core Features

### 1. Design Studio
**Location**: `frontend/pages/designStudio.jsx`

**Features:**
- **Template Selection**: 6 pre-built templates (Polaroid, Retro Name Portrait, Photo Collage, Romantic Save-the-Date, Minimalist Line Art, Couple Portrait)
- **AI Image Generation**: Google Gemini generates designs based on:
  - User-uploaded photos (up to 6 per template)
  - Template-specific prompts
  - User-provided text (max 20 characters)
- **Background Removal**: Automatic removal using Replicate API (simple/complex modes)
- **Canvas Editor**: 
  - High-DPI rendering (2x pixel ratio for crisp quality)
  - Fixed positioning for templates (locked designs)
  - Preview modal for high-quality design viewing
  - Zoom, pan, grid overlay
- **Product Customization**: Switch between T-Shirt/Hoodie and colors (Black/White/Light Pink)
- **Past Generations**: Session-based history of generated designs

**Key Components:**
- `TemplatePickerModal.jsx`: Template selection with 3-column grid
- `AIPanel.jsx`: Photo upload, text input, generation controls
- `ProductCanvas.jsx`: Interactive canvas with positioning
- `BackgroundRemovalModal.jsx`: Background removal choice UI

### 2. User Authentication
**Location**: `frontend/context/AuthContext.jsx`, `backend/routes/auth.js`

**Features:**
- **Optional Accounts**: Users can create free accounts or use as guests
- **JWT Authentication**: Secure token-based auth with HTTP-only cookies
- **Guest Design Limit**: 10 free designs for guests, unlimited for logged-in users
- **Design Ownership**: Designs linked to user accounts for cross-device access

**Implementation:**
- Registration/Login with email + password
- Password hashing with bcrypt
- Session management with JWT (7-day expiry)
- Protected routes with middleware

### 3. Design Limit System
**Location**: `frontend/hooks/useDesignLimit.js`, `frontend/components/auth/DesignLimitModal.jsx`

**Features:**
- **10 Free Designs**: Guests limited to 10 image generations
- **Persistent Counter**: Count stored in localStorage, survives browser close
- **Warning System**: Alerts at 8/10 and 9/10 designs
- **Non-Dismissible Modal**: Must create account to continue after 10 designs
- **Counter Display**: Visual progress bar showing X/10 designs used

**Flow:**
1. Guest generates images → Count increments
2. At 8/10 → Warning toast + yellow alert box
3. At 9/10 → Warning toast + yellow alert box
4. At 10/10 → Generation blocked, signup modal appears
5. After signup → Count cleared, unlimited designs

### 4. E-Commerce
**Location**: `frontend/pages/checkout.jsx`, `backend/routes/stripe.js`

**Features:**
- **Shopping Cart**: Persistent cart with localStorage
- **Stripe Checkout**: Secure payment processing
- **Discount Codes**: Coupon system (e.g., "FREE" for testing)
- **Order Management**: Full lifecycle tracking
- **Manual Approval**: Admin can approve orders before fulfillment

**Order Flow:**
1. User adds to cart → Cart stored in localStorage
2. Checkout → Stripe Checkout Session created
3. Payment → Webhook updates order status
4. Admin Approval → Manual review for certain orders
5. Fulfillment → Order sent to Printify
6. Shipping → Printify handles printing and shipping

### 5. Product Creation & Printify Integration
**Location**: `backend/services/printify.js`, `frontend/pages/product.jsx`

**Features:**
- **Dynamic Product Creation**: Creates Printify products with correct positioning
- **Template Positioning**: Each template has fixed canvas_config (size, position, rotation)
- **Mockup Generation**: Real-time product mockups for all variants
- **Variant Support**: T-Shirt and Hoodie variants with multiple colors
- **Coordinate Mapping**: Converts canvas coordinates to Printify's center-based system

**Complex Logic:**
- Printify uses center-based coordinates (x, y, scale)
- Our canvas uses top-left offset + width/height scales
- Conversion formula maps between systems accurately

### 6. Community Gallery
**Location**: `frontend/pages/community.jsx`

**Features:**
- **Browse Designs**: All published designs sorted by sales
- **Featured Designs**: Highlighted on homepage
- **Design Cards**: Rich cards with mockups, pricing, sales count
- **Product Pages**: Detailed views with size selection

### 7. Template System
**Location**: `backend/db/postgres.js` (templates table), `frontend/config/templates.js`

**Features:**
- **6 Pre-Built Templates**: Each with unique styling and positioning
- **Canvas Configuration**: Fixed positioning for accurate Printify placement
- **Reference Images**: AI uses template-specific reference images
- **Cover Photos**: Display images for template picker (separate from reference)

**Templates:**
1. **Polaroid Ransom Note**: Large centered design (12.16" × 13.93")
2. **Retro Name Portrait**: Full-width design (12.93" × 14.72")
3. **Photo Collage**: Full-width design, closer to top (12.93" × 14.72")
4. **Romantic Save-the-Date**: Small top-right design (4.19" × 4.77")
5. **Minimalist Line Art**: Small top-right design (4.19" × 4.77")
6. **Couple Portrait**: Large centered design (12.1" × 13.92")

---

## 🔧 Technical Implementation

### Frontend Architecture

#### State Management
- **React Query**: Server state (designs, templates, orders)
- **Context API**: 
  - `CartContext`: Shopping cart state
  - `AuthContext`: User authentication state
- **Local State**: Component-level state with useState

#### Routing
```javascript
/ → Home page
/design → Design Studio
/community → Community gallery
/product/:designId → Product page
/checkout → Checkout page
/about → About page
```

#### Key Hooks
- `useDesignLimit`: Tracks guest design count
- `useAuth`: Authentication state and methods
- `useCart`: Shopping cart operations

### Backend Architecture

#### Database (PostgreSQL)
- **Connection Pooling**: pg library with connection pool
- **Auto-Migration**: Tables created/updated on server start
- **UUID Primary Keys**: For users and designs
- **JSONB Columns**: For flexible data (canvas_config, mockup_urls)

#### API Structure
```
/api/auth/* → Authentication routes
/api/designs/* → Design CRUD operations
/api/templates/* → Template management
/api/orders/* → Order management
/api/printify/* → Printify integration
/api/stripe/* → Stripe integration
/api/upload/* → File upload & image processing
```

#### Middleware
- **CORS**: Configured for production domains
- **Cookie Parser**: For JWT authentication
- **Auth Middleware**: `requireAuth` and `optionalAuth` for route protection
- **Error Handling**: Centralized error middleware

---

## 🧩 Complex Code Sections

### 1. Canvas Coordinate System Mapping
**Location**: `backend/services/printify.js` (createProduct function)

**Challenge**: Printify uses center-based coordinates (x, y, scale), but our canvas uses top-left offset + width/height scales.

**Solution**:
```javascript
// Convert from our system to Printify's system
const printAreaWidth = 13.17; // inches
const printAreaHeight = 16; // inches

// Our canvas_config stores:
// - width_scale: design_width / print_area_width
// - height_scale: design_height / print_area_height  
// - x_offset: % from left edge
// - y_offset: % from top edge

// Convert to Printify's center-based system:
const designWidth = width_scale * printAreaWidth;
const designHeight = height_scale * printAreaHeight;

// Center position calculation
const centerX = (x_offset * printAreaWidth) + (designWidth / 2);
const centerY = (y_offset * printAreaHeight) + (designHeight / 2);

// Normalize to Printify's coordinate system (-1 to 1)
const printifyX = (centerX / printAreaWidth) * 2 - 1;
const printifyY = (centerY / printAreaHeight) * 2 - 1;

// Scale calculation (Printify uses single scale value)
const printifyScale = Math.max(width_scale, height_scale);
```

**Why Complex**: Requires precise mathematical conversion between two different coordinate systems while maintaining aspect ratios.

### 2. High-DPI Canvas Rendering
**Location**: `frontend/components/design/ProductCanvas.jsx`

**Challenge**: Canvas appears pixelated on high-resolution displays (Retina, 4K).

**Solution**:
```javascript
const PIXEL_RATIO = 2; // 2x resolution for crisp quality
const CANVAS_WIDTH = 660;
const CANVAS_HEIGHT = 660;

// Set internal canvas dimensions (higher resolution)
canvas.width = CANVAS_WIDTH * PIXEL_RATIO;
canvas.height = CANVAS_HEIGHT * PIXEL_RATIO;

// Scale context to match internal dimensions
context.scale(PIXEL_RATIO, PIXEL_RATIO);

// Enable high-quality image smoothing
context.imageSmoothingEnabled = true;
context.imageSmoothingQuality = 'high';

// CSS size remains at original (for display)
<canvas style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }} />
```

**Why Complex**: Requires understanding of device pixel ratio and canvas rendering pipeline.

### 3. Template Positioning System
**Location**: `frontend/components/design/ProductCanvas.jsx` (drawCanvas function)

**Challenge**: Each template needs exact positioning and sizing based on Printify measurements, with designs locked in place.

**Solution**:
```javascript
// Get template-specific config
const canvasConfig = selectedTemplate?.canvas_config;
const isLocked = canvasConfig && (canvasConfig.width_scale || canvasConfig.scale);

if (isLocked) {
  // Calculate exact dimensions from print area
  const printArea = PRODUCT_TYPES[productType].printArea;
  const printWidth = w * printArea.width;
  const printHeight = h * printArea.height;
  
  // Apply template-specific scales
  const designWidth = printWidth * canvasConfig.width_scale;
  const designHeight = printHeight * canvasConfig.height_scale;
  
  // Calculate position from offsets
  const printX = w * printArea.x;
  const printY = h * printArea.y;
  const designX = printX + (printWidth * canvasConfig.x_offset);
  const designY = printY + (printHeight * canvasConfig.y_offset);
  
  // Draw at exact position and size
  ctx.drawImage(designImage, designX, designY, designWidth, designHeight);
}
```

**Why Complex**: Requires precise coordinate calculations and understanding of Printify's print area dimensions.

### 4. Background Removal Flow
**Location**: `frontend/pages/designStudio.jsx` (handleImageGenerated)

**Challenge**: Background removal happens after generation, but user needs to choose between original and transparent versions before product creation.

**Solution**:
1. Generate image → Store in `cachedGeminiImage`
2. If template requires background removal → Call Replicate API
3. Store processed image in `processedImage` state
4. Show `BackgroundRemovalModal` when creating product
5. User chooses → Use appropriate image for Printify

**Why Complex**: Multiple async operations, state management, and user choice workflow.

### 5. Stripe Webhook Handling
**Location**: `backend/routes/stripe-webhook.js`

**Challenge**: Webhook must be registered BEFORE express.json() middleware to preserve raw body for signature verification.

**Solution**:
```javascript
// Register webhook route BEFORE express.json()
app.post('/api/stripe/webhook', 
  express.raw({ type: 'application/json' }), 
  handleStripeWebhook
);

// Then register other middleware
app.use(express.json());
```

**Why Complex**: Stripe requires raw request body for signature verification, which conflicts with JSON parsing middleware.

### 6. Design Limit Tracking
**Location**: `frontend/hooks/useDesignLimit.js`

**Challenge**: Count must persist across sessions, count existing designs on first load, and reset after signup.

**Solution**:
```javascript
// Count existing designs in localStorage on first load
useEffect(() => {
  if (!user) {
    const existingDesigns = JSON.parse(localStorage.getItem('userDesigns') || '[]');
    const existingCount = existingDesigns.length;
    
    // Initialize count if not set
    if (!localStorage.getItem('guest_design_count') && existingCount > 0) {
      const newCount = Math.min(existingCount, MAX_FREE_DESIGNS);
      localStorage.setItem('guest_design_count', newCount.toString());
      setCount(newCount);
    }
  }
}, [user]);
```

**Why Complex**: Requires handling edge cases (existing designs, signup flow, persistence).

---

## 📁 File Structure

```
knockout-merch/
├── backend/
│   ├── db/
│   │   ├── postgres.js          # Database connection & schema
│   │   └── database.js           # Legacy SQLite (unused)
│   ├── middleware/
│   │   └── auth.js               # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js               # Authentication routes (register/login/logout)
│   │   ├── designs.js            # Design CRUD operations
│   │   ├── orders.js             # Order management
│   │   ├── printify.js           # Printify API wrapper
│   │   ├── stripe.js             # Stripe Checkout
│   │   ├── stripe-webhook.js     # Stripe webhook handler
│   │   ├── templates.js          # Template management
│   │   ├── upload.js             # File upload & image processing
│   │   └── stills.js              # Fight stills (legacy)
│   ├── services/
│   │   ├── gemini.js             # Google Gemini AI integration
│   │   ├── printify.js           # Printify service (product creation, orders)
│   │   ├── s3.js                 # AWS S3 upload/download
│   │   ├── replicate.js          # Replicate API (background removal)
│   │   └── imageProcessor.js     # Sharp image processing
│   └── server.js                  # Express server setup
│
├── frontend/
│   ├── api/
│   │   ├── apiClient.js          # Axios-based API client
│   │   └── base44Client.js       # Entity-based API client
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthModal.jsx     # Login/Register modal
│   │   │   └── DesignLimitModal.jsx  # 10-design limit blocker
│   │   ├── design/
│   │   │   ├── AIPanel.jsx       # AI generation controls
│   │   │   ├── ProductCanvas.jsx # Interactive canvas
│   │   │   ├── TemplatePickerModal.jsx  # Template selection
│   │   │   └── BackgroundRemovalModal.jsx  # BG removal choice
│   │   ├── common/
│   │   │   └── Navbar.jsx        # Navigation with auth
│   │   └── ui/                   # Shadcn/ui components
│   ├── context/
│   │   ├── AuthContext.jsx       # Authentication state
│   │   └── CartContext.jsx       # Shopping cart state
│   ├── hooks/
│   │   └── useDesignLimit.js     # Design limit tracking
│   ├── pages/
│   │   ├── home.jsx              # Landing page
│   │   ├── designStudio.jsx      # Main design interface
│   │   ├── product.jsx           # Product detail page
│   │   ├── checkout.jsx          # Stripe checkout
│   │   ├── community.jsx         # Community gallery
│   │   └── about.jsx             # About page
│   ├── config/
│   │   └── templates.js          # Template configuration
│   └── main.jsx                  # React app entry point
│
└── README.md                     # This file
```

---

## 🗄️ Database Schema

### Tables

#### `users`
```sql
id              UUID PRIMARY KEY (gen_random_uuid())
email           VARCHAR(255) UNIQUE NOT NULL
password_hash   VARCHAR(255) NOT NULL
name            VARCHAR(255)
created_at      TIMESTAMP WITH TIME ZONE
updated_at      TIMESTAMP WITH TIME ZONE
```

#### `designs`
```sql
id                    UUID PRIMARY KEY (gen_random_uuid())
title                 VARCHAR(255) NOT NULL
design_image_url      TEXT NOT NULL
mockup_urls           JSONB DEFAULT '[]'
printify_product_id   VARCHAR(255)
printify_tshirt_id    VARCHAR(255)
printify_hoodie_id    VARCHAR(255)
tshirt_mockups        JSONB DEFAULT '[]'
hoodie_mockups        JSONB DEFAULT '[]'
template_id           VARCHAR(50) REFERENCES templates(id)
prompt_used           TEXT
stills_used           JSONB DEFAULT '[]'
canvas_data           JSONB DEFAULT '{}'
is_published          BOOLEAN DEFAULT FALSE
is_featured           BOOLEAN DEFAULT FALSE
price                 DECIMAL(10,2) DEFAULT 19.99
sales_count           INTEGER DEFAULT 0
product_type          VARCHAR(50) DEFAULT 'tshirt'
color                 VARCHAR(20) DEFAULT 'black'
creator_name          VARCHAR(255)
creator_id            UUID
user_id               UUID REFERENCES users(id) ON DELETE SET NULL
created_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
```

#### `templates`
```sql
id              VARCHAR(50) PRIMARY KEY
name            VARCHAR(255) NOT NULL
description     TEXT
prompt_template TEXT
panel_schema    JSONB
reference_image TEXT
example_image   TEXT
canvas_config   JSONB  -- {width_scale, height_scale, x_offset, y_offset, rotation}
remove_background VARCHAR(50)
created_at      TIMESTAMP WITH TIME ZONE
updated_at      TIMESTAMP WITH TIME ZONE
```

#### `orders`
```sql
id                  UUID PRIMARY KEY (gen_random_uuid())
design_id           UUID REFERENCES designs(id)
printify_order_id   VARCHAR(255)
stripe_payment_id   VARCHAR(255)
stripe_session_id   VARCHAR(255)
customer_email      VARCHAR(255) NOT NULL
customer_name       VARCHAR(255)
shipping_address    JSONB
product_type        VARCHAR(50)
color               VARCHAR(20) DEFAULT 'black'
size                VARCHAR(10)
quantity            INTEGER DEFAULT 1
total_amount        DECIMAL(10,2)
status              VARCHAR(50) DEFAULT 'pending'
created_at          TIMESTAMP WITH TIME ZONE
```

### Indexes
- `idx_users_email` on `users(email)`
- `idx_designs_user_id` on `designs(user_id)`
- `idx_designs_template_id` on `designs(template_id)`

---

## 📡 API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Designs
- `GET /api/designs` - Get all designs (query: `is_featured`, `is_published`)
- `GET /api/designs/:id` - Get specific design
- `POST /api/designs` - Create design
- `GET /api/designs/my-designs` - Get user's designs (requires auth)

### Templates
- `GET /api/templates` - Get all templates
- `GET /api/templates/:id` - Get specific template
- `GET /api/templates/with-products` - Get templates with product counts

### Upload & Image Processing
- `POST /api/upload` - Upload file (multipart/form-data)
- `POST /api/upload/base64` - Upload base64 image
- `POST /api/upload/generate-image` - Generate AI image (Gemini)
- `POST /api/upload/remove-background` - Remove background (Replicate)
- `GET /api/upload/proxy-image` - Proxy S3 images (CORS bypass)

### Printify
- `POST /api/printify/products` - Create Printify product
- `GET /api/printify/products/:id/mockups` - Get product mockups
- `POST /api/printify/orders` - Create fulfillment order
- `POST /api/printify/shipping` - Calculate shipping

### Stripe
- `POST /api/stripe/create-checkout-session` - Create checkout session
- `GET /api/stripe/session/:sessionId` - Get session details
- `POST /api/stripe/webhook` - Stripe webhook handler

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get specific order
- `POST /api/orders` - Create order
- `PUT /api/orders/:id/approve-and-ship` - Approve and fulfill order

---

## 🚀 Setup & Deployment

### Local Development

#### Backend
```bash
cd backend
npm install
cp .env.example .env  # Add your environment variables
npm start
```

#### Frontend
```bash
cd frontend
npm install
cp .env.example .env  # Add VITE_API_URL
npm run dev
```

### Production Deployment

#### Backend (Railway)
1. Connect GitHub repo to Railway
2. Set root directory to `/backend`
3. Add all environment variables
4. Railway auto-deploys on push to `main`

#### Frontend (Vercel)
1. Connect GitHub repo to Vercel
2. Set root directory to `/frontend`
3. Add environment variables:
   - `VITE_API_URL` = Railway backend URL
   - `VITE_STRIPE_PUBLISHABLE_KEY` = Stripe publishable key
4. Vercel auto-deploys on push to `main`

#### Database (Railway)
1. Create PostgreSQL database in Railway
2. Copy connection string to `DATABASE_URL`
3. Tables auto-created on first server start

---

## 🔐 Environment Variables

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://...

# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=...

# Google Gemini
GEMINI_API_KEY=...

# Replicate
REPLICATE_API_TOKEN=...

# Printify
PRINTIFY_API_TOKEN=...
PRINTIFY_SHOP_ID=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...

# JWT
JWT_SECRET=...

# Email (Resend)
RESEND_API_KEY=...

# CORS
FRONTEND_URL=https://designforwear.com

# Node
NODE_ENV=production
PORT=8000
```

### Frontend (.env)
```bash
VITE_API_URL=https://your-railway-url.railway.app/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_...
```

---

## 🎨 Template Positioning Reference

| Template | Design Size | Position | Width Scale | Height Scale | X Offset | Y Offset |
|----------|-------------|----------|-------------|--------------|----------|----------|
| Polaroid Ransom Note | 12.16" × 13.93" | Left: 3.84%, Top: 6.48% | 0.9233 | 0.8706 | 0.0384 | 0.0648 |
| Retro Name Portrait | 12.93" × 14.72" | Left: 0.91%, Top: 2% | 0.9818 | 0.9200 | 0.0091 | 0.02 |
| Photo Collage | 12.93" × 14.72" | Left: 0.91%, Top: 0.5% | 0.9818 | 0.9200 | 0.0091 | 0.005 |
| Romantic Save-the-Date | 4.19" × 4.77" | Left: 66.94%, Top: 3.02% | 0.3181 | 0.2981 | 0.6694 | 0.0302 |
| Minimalist Line Art | 4.19" × 4.77" | Left: 66.94%, Top: 3.02% | 0.3181 | 0.2981 | 0.6694 | 0.0302 |
| Couple Portrait | 12.1" × 13.92" | Left: 4%, Top: 2% | 0.92 | 0.87 | 0.04 | 0.02 |

**Print Area**: 13.17" wide × 16" tall (all templates)

---

## 📝 Key Decisions & Rationale

### Why UUID for User IDs?
- Railway PostgreSQL defaults to UUID
- Better for distributed systems
- Avoids integer overflow issues

### Why localStorage for Guest Cart?
- No backend dependency for guests
- Faster UX (no API calls)
- Persists across sessions

### Why Fixed Template Positioning?
- Ensures designs match Printify placement exactly
- Prevents user error (wrong positioning)
- Consistent product quality

### Why High-DPI Canvas?
- Retina displays require 2x resolution
- Prevents pixelation on modern screens
- Better user experience

### Why JWT with HTTP-Only Cookies?
- More secure than localStorage tokens
- Prevents XSS attacks
- Automatic cookie handling

---

## 🐛 Known Issues & Limitations

1. **CORS Issues**: S3 images require proxy endpoint
2. **Background Removal**: Can fail on complex images
3. **Printify Rate Limits**: May need rate limiting for high traffic
4. **Guest Design Count**: Resets if localStorage is cleared

---

## 🔮 Future Enhancements

- [ ] Email notifications for order updates
- [ ] Design editing after creation
- [ ] More product types (mugs, posters)
- [ ] Social sharing of designs
- [ ] Design templates marketplace
- [ ] Mobile app (React Native)

---

## 📄 License

Private project - All rights reserved

---

## 👥 Contributors

Built by Aiden Devins

---

**Last Updated**: January 2026
