# Knockout Merch

A full-stack e-commerce platform for creating and selling custom merchandise. Users can design AI-generated products using templates, upload photos, and purchase physical items that are automatically fulfilled through Printify's print-on-demand network.

## Project Structure

```
knockout-merch/
├── frontend/          # React/Vite frontend application (Vercel)
├── backend/           # Node.js/Express backend API (Railway)
├── scripts/           # Utility scripts
└── README.md
```

## Core Features

### 🎨 Design Studio
- **Template System**: Pre-built design templates with customizable prompts and panel schemas
- **AI Image Generation**: Google Gemini 2.0 Flash generates designs based on user prompts and uploaded photos
- **Photo Upload**: Multi-photo upload support (up to 6 photos per template) with drag-and-drop interface
- **Background Removal**: Automatic background removal using Replicate (recraft-ai/recraft-remove-background) with simple/complex modes
- **Canvas Editor**: Interactive design positioning with:
  - Drag-and-drop placement
  - Scale and rotation controls
  - Zoom and pan functionality
  - Grid overlay for precise alignment
  - High-resolution export (4000x4500px for print-ready files)
- **Product Customization**: Switch between product types (T-Shirt/Hoodie) and colors (Black/White)
- **Mockup Preview**: Real-time product mockups generated via Printify API

### 🛒 E-Commerce
- **Shopping Cart**: Persistent cart with localStorage, supports multiple items and quantities
- **Stripe Checkout**: Complete payment processing with Stripe Checkout Sessions
- **Order Management**: Full order lifecycle tracking (pending → paid → processing → shipped → delivered)
- **Discount Codes**: Coupon system with Stripe integration
- **Shipping Calculation**: Dynamic shipping costs based on quantity

### 👥 Community & Discovery
- **Community Gallery**: Browse all published designs sorted by sales count
- **Featured Designs**: Highlight top-performing designs on the homepage
- **Design Cards**: Rich product cards with mockups, pricing, and sales information
- **Product Pages**: Detailed product views with size selection and add-to-cart

### 🔧 Admin Features
- **Admin Panel**: Upload and manage fight stills
- **Order Management**: View and manage all orders with status tracking
- **Template Management**: Create and manage design templates
- **Design Moderation**: Feature/unfeature designs, publish/unpublish

### 📧 Notifications
- **Order Confirmation Emails**: Automated email notifications via Resend API
- **Order Tracking**: Email includes order details, shipping address, and delivery estimates

## Architecture

### Frontend (Vercel)
- **Framework**: React 18 + Vite
- **Routing**: React Router v6
- **State Management**: TanStack Query (React Query) for server state
- **Styling**: Tailwind CSS with custom animations
- **UI Components**: Radix UI primitives + custom components
- **Animations**: Framer Motion
- **Payments**: Stripe Elements
- **Notifications**: Sonner toast notifications

### Backend (Railway)
- **Runtime**: Node.js + Express
- **Database**: PostgreSQL (Railway) with connection pooling
- **Storage**: AWS S3 for image storage
- **Image Processing**: Sharp for image manipulation
- **File Upload**: Multer + Multer-S3 for multipart uploads

### Integrations

#### 🤖 AI & Image Processing
- **Google Gemini 2.0 Flash**: AI image generation from prompts and reference images
- **Replicate API**: Background removal using recraft-ai/recraft-remove-background model
- **Sharp**: Image processing (format conversion, resizing, background manipulation)

#### 💳 Payments & Fulfillment
- **Stripe**: Payment processing, checkout sessions, webhooks, coupon management
- **Printify**: Product creation, mockup generation, order fulfillment, shipping calculation

#### 📧 Communication
- **Resend**: Transactional email delivery for order confirmations

#### ☁️ Infrastructure
- **AWS S3**: Scalable image storage with presigned URLs
- **Railway**: Backend hosting with PostgreSQL database
- **Vercel**: Frontend hosting with edge functions

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database (Railway or other provider)
- AWS S3 bucket (for image storage)
- Accounts for: Stripe, Printify, Google Gemini, Replicate, Resend

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

# Background Removal (Replicate)
REPLICATE_API_TOKEN=your-replicate-api-token

# Printify (Product Fulfillment)
PRINTIFY_API_KEY=your-printify-api-key
PRINTIFY_SHOP_ID=your-printify-shop-id

# Stripe (Payments)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Resend)
RESEND_API_KEY=re_...
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

3. Create a `.env` file with all required environment variables

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
3. Add all environment variables from `.env`
4. Railway will auto-deploy on push
5. Configure Stripe webhook endpoint: `https://your-railway-url.railway.app/api/stripe/webhook`

### Frontend (Vercel)
1. Connect your GitHub repo to Vercel
2. Set the root directory to `/frontend`
3. Add environment variables:
   - `VITE_API_URL` = Your Railway backend URL
   - `VITE_STRIPE_PUBLISHABLE_KEY` = Your Stripe publishable key
4. Vercel will auto-deploy on push

### Database (Railway)
1. Create a PostgreSQL database in your Railway project
2. Copy the connection string to `DATABASE_URL`
3. Tables are auto-created on first server start

### Stripe Webhook Setup
1. In Stripe Dashboard, create a webhook endpoint
2. Set URL to: `https://your-railway-url.railway.app/api/stripe/webhook`
3. Select events: `checkout.session.completed`, `payment_intent.succeeded`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

## API Endpoints

### Designs
- `GET /api/designs` - Get all designs (supports query params: `is_featured`, `is_published`)
- `GET /api/designs/:id` - Get a specific design
- `POST /api/designs` - Create a new design
- `PUT /api/designs/:id` - Update a design
- `DELETE /api/designs/:id` - Delete a design

### Templates
- `GET /api/templates` - Get all templates
- `GET /api/templates/:id` - Get a specific template
- `POST /api/templates` - Create a new template
- `PUT /api/templates/:id` - Update a template
- `DELETE /api/templates/:id` - Delete a template

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
- `POST /api/upload/remove-background` - Remove background from image using Replicate
- `GET /api/upload/ai-status` - Check AI service configuration status
- `GET /api/upload/proxy-image` - Proxy S3 images to avoid CORS issues

### Printify
- `GET /api/printify/status` - Check Printify configuration
- `GET /api/printify/blueprints` - Get available product types
- `GET /api/printify/sizes/:productType` - Get available sizes for a product type
- `POST /api/printify/products` - Create a product on Printify
- `GET /api/printify/products/:id/mockups` - Get product mockups
- `POST /api/printify/products/:id/publish` - Publish a product
- `POST /api/printify/shipping` - Calculate shipping costs
- `POST /api/printify/orders` - Create a fulfillment order
- `GET /api/printify/orders/:id` - Get order status

### Stripe
- `POST /api/stripe/create-checkout-session` - Create Stripe Checkout Session
- `GET /api/stripe/session/:sessionId` - Get checkout session details
- `POST /api/stripe/webhook` - Stripe webhook handler (for payment events)
- `GET /api/stripe/webhook-test` - Test webhook endpoint accessibility

### Health & Status
- `GET /api/health` - Health check endpoint

## Database Schema

The PostgreSQL database includes the following tables:

### fight_stills
- `id` (UUID) - Primary key
- `title` (VARCHAR) - Still name/description
- `image_url` (TEXT) - S3 URL
- `round` (VARCHAR) - Fight round
- `is_featured` (BOOLEAN)
- `usage_count` (INTEGER)
- `created_at` (TIMESTAMP WITH TIME ZONE)

### templates
- `id` (VARCHAR) - Primary key
- `name` (VARCHAR) - Template name
- `description` (TEXT) - Template description
- `example_image` (TEXT) - Example design image URL
- `reference_image` (TEXT) - Reference image URL
- `prompt` (TEXT) - AI generation prompt template
- `panel_schema` (JSONB) - Panel configuration schema
- `upload_tips` (JSONB) - Upload tips for users
- `max_photos` (INTEGER) - Maximum photos allowed
- `gradient` (VARCHAR) - Gradient color scheme
- `remove_background` (VARCHAR) - Background removal mode (remove-simple, remove-complex, or NULL)
- `is_hidden` (BOOLEAN) - Hide template from users
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

### designs
- `id` (UUID) - Primary key
- `title` (VARCHAR) - Design name
- `design_image_url` (TEXT) - AI-generated design S3 URL
- `mockup_urls` (JSONB) - Printify mockup URLs array
- `printify_product_id` (VARCHAR) - Printify product ID
- `printify_blueprint_id` (INTEGER) - Printify blueprint ID
- `template_id` (VARCHAR) - Foreign key to templates
- `prompt_used` (TEXT) - AI prompt used for generation
- `stills_used` (JSONB) - Reference still IDs array
- `canvas_data` (JSONB) - Canvas position/scale/rotation data
- `is_published` (BOOLEAN) - Published to community
- `is_featured` (BOOLEAN) - Featured on homepage
- `price` (DECIMAL) - Product price
- `sales_count` (INTEGER) - Number of sales
- `product_type` (VARCHAR) - tshirt/hoodie
- `color` (VARCHAR) - Product color (black/white)
- `creator_name` (VARCHAR) - Creator name
- `creator_id` (UUID) - Creator user ID (optional)
- `created_at` (TIMESTAMP WITH TIME ZONE)

### orders
- `id` (UUID) - Primary key
- `design_id` (UUID) - Foreign key to designs
- `printify_order_id` (VARCHAR) - Printify order ID
- `stripe_payment_id` (VARCHAR) - Stripe payment intent ID
- `stripe_session_id` (VARCHAR) - Stripe checkout session ID
- `customer_email` (VARCHAR) - Customer email
- `customer_name` (VARCHAR) - Customer name
- `shipping_address` (JSONB) - Shipping address object
- `product_type` (VARCHAR) - Product type
- `color` (VARCHAR) - Product color
- `size` (VARCHAR) - Product size
- `quantity` (INTEGER) - Order quantity
- `total_amount` (DECIMAL) - Total order amount
- `status` (VARCHAR) - Order status (pending/paid/processing/shipped/delivered)
- `created_at` (TIMESTAMP WITH TIME ZONE)

### users (Optional - for future auth)
- `id` (UUID) - Primary key
- `firebase_uid` (VARCHAR) - Firebase user ID (unique)
- `email` (VARCHAR) - User email
- `name` (VARCHAR) - User name
- `role` (VARCHAR) - User role (user/admin)
- `created_at` (TIMESTAMP WITH TIME ZONE)

## Implementation Phases

### Phase 1 ✅ Infrastructure
- PostgreSQL database (Railway)
- AWS S3 image storage
- Database schema and migrations
- API routes and middleware
- Environment configuration
- CORS and security setup

### Phase 2 ✅ Core Features
- Google Gemini 2.0 Flash AI image generation
- Template system with panel schemas
- Photo upload with multi-photo support
- Background removal via Replicate API
- Canvas editor with drag-and-drop positioning
- High-resolution PNG export (4000x4500px)
- Printify product creation and mockup generation
- Design studio flow with preview
- Community gallery with sales sorting

### Phase 3 ✅ Payments & Fulfillment
- Stripe Checkout integration
- Shopping cart with localStorage persistence
- Order management system
- Printify order fulfillment
- Stripe webhook handling
- Order confirmation emails via Resend
- Discount code system
- Shipping calculation

### Phase 4 🔜 Future Enhancements
- User authentication (Firebase or alternative)
- User profiles and design collections
- Social sharing features
- Advanced analytics dashboard
- Bulk order processing
- International shipping support

## Key Features Deep Dive

### AI Image Generation
- Uses Google Gemini 2.0 Flash for high-quality image generation
- Supports multiple reference images (fight stills or user photos)
- Customizable prompts per template
- Automatic image optimization and S3 upload

### Background Removal
- Two modes: simple and complex removal
- Powered by Replicate's recraft-ai/recraft-remove-background model
- Automatic processing after AI generation (if enabled in template)
- Retry functionality for failed removals
- Fallback to original image on failure

### Canvas Editor
- Interactive design positioning with mouse/touch support
- Real-time preview on product mockup
- Zoom (mouse wheel) and pan (space + drag) controls
- Grid overlay for alignment
- Undo/redo functionality (planned)
- Export to print-ready PNG format

### Printify Integration
- Automatic product creation when design is saved
- Mockup generation for all available product variants
- Order fulfillment through Printify's global network
- Real-time shipping cost calculation
- Product publishing and management

### Stripe Integration
- Secure checkout sessions
- Support for multiple items and quantities
- Discount code application
- Webhook handling for payment events
- Order status synchronization

### Email Notifications
- Beautiful HTML email templates
- Order confirmation with full details
- Shipping address and delivery estimates
- Responsive design for mobile viewing

## Development

### Running Locally
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Backend runs on `http://localhost:8000`
4. Frontend runs on `http://localhost:3000`

### Database Migrations
Tables are automatically created on first server start. For manual migrations, see `backend/db/postgres.js`.

### Testing
- Health check: `GET http://localhost:8000/api/health`
- AI status: `GET http://localhost:8000/api/upload/ai-status`
- Printify status: `GET http://localhost:8000/api/printify/status`

## License

ISC
