# Knockout Merch

A web application for creating custom merchandise based on the Jake Paul vs Anthony Joshua fight, where users can design and purchase knockout-themed merchandise.

## Project Structure

```
knockout-merch/
├── frontend/          # React/Vite frontend application
├── backend/           # Node.js/Express backend API
└── README.md
```

## Features

- **Landing Page**: Hero section with call-to-action to start designing
- **Design Studio**: AI-powered design creation tool with fight stills and canvas editor
- **Community Page**: Browse and purchase designs created by other users
- **Admin Panel**: Upload fight stills and manage designs
- **Checkout Flow**: Complete purchase flow with Stripe payment processing

## Tech Stack

### Frontend (Vercel)
- React + Vite
- React Router
- TanStack Query (React Query)
- Tailwind CSS
- Framer Motion
- Stripe Elements

### Backend (Railway)
- Node.js + Express
- PostgreSQL (Neon)
- AWS S3 (Image Storage)
- Printify API (Fulfillment)
- Stripe (Payments)
- Google Gemini (AI Image Generation)

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Neon PostgreSQL account (https://neon.tech)
- AWS S3 bucket (for image storage)

### Environment Variables

#### Backend (.env)
```bash
# Required
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
PORT=8000
FRONTEND_URL=http://localhost:3000

# AWS S3 (Required for production)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=knockout-merch-images

# AI Image Generation (Gemini)
GEMINI_API_KEY=your-gemini-api-key

# Printify (Product Fulfillment)
PRINTIFY_API_KEY=your-printify-api-key
PRINTIFY_SHOP_ID=your-printify-shop-id

# Stripe (Payments) - Phase 3
STRIPE_SECRET_KEY=sk_...
```

#### Frontend (.env)
```bash
VITE_API_URL=http://localhost:8000/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_...
```

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your database and AWS credentials

4. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
echo "VITE_API_URL=http://localhost:8000/api" > .env
```

4. Start the frontend development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Deployment

### Backend (Railway)
1. Connect your GitHub repo to Railway
2. Set the root directory to `/backend`
3. Add all environment variables from `.env.example`
4. Railway will auto-deploy on push

### Frontend (Vercel)
1. Connect your GitHub repo to Vercel
2. Set the root directory to `/frontend`
3. Add environment variables:
   - `VITE_API_URL` = Your Railway backend URL
   - `VITE_STRIPE_PUBLISHABLE_KEY` = Your Stripe publishable key
4. Vercel will auto-deploy on push

### Database (Neon)
1. Create a new project at https://neon.tech
2. Copy the connection string to `DATABASE_URL`
3. Tables are auto-created on first server start

## API Endpoints

### Designs
- `GET /api/designs` - Get all designs
- `GET /api/designs/:id` - Get a specific design
- `POST /api/designs` - Create a new design
- `PUT /api/designs/:id` - Update a design
- `DELETE /api/designs/:id` - Delete a design
- `GET /api/designs?is_featured=true&is_published=true` - Filter designs

### Fight Stills
- `GET /api/stills` - Get all fight stills
- `GET /api/stills/:id` - Get a specific still
- `POST /api/stills` - Upload a new fight still
- `PUT /api/stills/:id` - Update a still
- `DELETE /api/stills/:id` - Delete a still

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get a specific order
- `POST /api/orders` - Create a new order
- `PUT /api/orders/:id` - Update an order
- `DELETE /api/orders/:id` - Delete an order

### Upload
- `POST /api/upload` - Upload a file (multipart/form-data)
- `POST /api/upload/base64` - Upload base64 image (for canvas exports)
- `POST /api/upload/generate-image` - Generate AI image using Gemini
- `GET /api/upload/ai-status` - Check AI service configuration status

### Printify
- `GET /api/printify/status` - Check Printify configuration
- `GET /api/printify/blueprints` - Get available product types
- `GET /api/printify/sizes/:productType` - Get available sizes
- `POST /api/printify/products` - Create a product on Printify
- `GET /api/printify/products/:id/mockups` - Get product mockups
- `POST /api/printify/products/:id/publish` - Publish a product
- `POST /api/printify/shipping` - Calculate shipping costs
- `POST /api/printify/orders` - Create a fulfillment order
- `GET /api/printify/orders/:id` - Get order status

## Database Schema

The PostgreSQL database includes the following tables:

### fight_stills
- `id` (UUID) - Primary key
- `title` (VARCHAR) - Still name/description
- `image_url` (TEXT) - S3 URL
- `round` (VARCHAR) - Fight round
- `is_featured` (BOOLEAN)
- `usage_count` (INTEGER)
- `created_at` (TIMESTAMP)

### designs
- `id` (UUID) - Primary key
- `title` (VARCHAR) - Design name
- `design_image_url` (TEXT) - AI-generated design S3 URL
- `mockup_urls` (JSONB) - Printify mockup URLs
- `printify_product_id` (VARCHAR)
- `prompt_used` (TEXT) - AI prompt
- `stills_used` (JSONB) - Reference still IDs
- `canvas_data` (JSONB) - Position/scale data
- `is_published` (BOOLEAN)
- `is_featured` (BOOLEAN)
- `price` (DECIMAL)
- `sales_count` (INTEGER)
- `product_type` (VARCHAR) - tshirt/hoodie
- `creator_name` (VARCHAR)
- `created_at` (TIMESTAMP)

### orders
- `id` (UUID) - Primary key
- `design_id` (UUID) - Foreign key to designs
- `printify_order_id` (VARCHAR)
- `stripe_payment_id` (VARCHAR)
- `customer_email` (VARCHAR)
- `customer_name` (VARCHAR)
- `shipping_address` (JSONB)
- `product_type` (VARCHAR)
- `size` (VARCHAR)
- `quantity` (INTEGER)
- `total_amount` (DECIMAL)
- `status` (VARCHAR) - pending/paid/processing/shipped/delivered
- `created_at` (TIMESTAMP)

## Implementation Phases

### Phase 1 ✅ Infrastructure
- Neon PostgreSQL database
- AWS S3 image storage
- Updated API routes
- Environment configuration

### Phase 2 ✅ Core Features
- Gemini AI image generation (`@google/generative-ai`)
- Canvas export to PNG for print-ready files
- Printify product creation and mockup generation
- Design studio flow with mockup preview
- API client with Printify integration

### Phase 3 🔜 Payments
- Stripe Checkout integration
- Order fulfillment flow
- Firebase authentication (optional)

## Key Features

### AI Image Generation
Uses Google Gemini 2.0 Flash to generate knockout-themed designs based on user prompts and reference fight stills.

### Canvas Editor
- Drag-and-drop design positioning
- Scale and rotation controls
- Export to high-resolution PNG (4000x4500px for t-shirts)
- Product type switching (T-Shirt/Hoodie)

### Printify Integration
- Automatic product creation on design save
- Mockup generation and preview
- Order fulfillment through Printify's network
- Shipping calculation

