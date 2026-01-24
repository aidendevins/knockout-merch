// Force redeploy - 2026-01-21
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const db = require('./db/postgres');
const designsRouter = require('./routes/designs');
const stillsRouter = require('./routes/stills');
const ordersRouter = require('./routes/orders');
const uploadRouter = require('./routes/upload');
const printifyRouter = require('./routes/printify');
const seedRouter = require('./routes/seed');
const stripeRouter = require('./routes/stripe');
const templatesRouter = require('./routes/templates');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 8000;

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://designforwear.com',
  'https://www.designforwear.com',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// CRITICAL: Stripe webhook MUST be registered BEFORE express.json() middleware
// because it needs the raw request body for signature verification
// The raw body parser is essential for Stripe signature verification
const handleStripeWebhook = require('./routes/stripe-webhook');

// Register webhook route BEFORE express.json() middleware with raw body parser
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Test endpoint to verify webhook route is accessible (for debugging)
app.get('/api/stripe/webhook-test', (req, res) => {
  res.json({ 
    message: 'Webhook route is accessible',
    timestamp: new Date().toISOString(),
    webhook_secret_configured: !!process.env.STRIPE_WEBHOOK_SECRET,
    webhook_secret_length: process.env.STRIPE_WEBHOOK_SECRET?.length || 0,
    note: 'This endpoint verifies the webhook route is registered. The actual webhook endpoint is POST /api/stripe/webhook'
  });
});

// Middleware (applied AFTER webhook route to preserve raw body for webhook)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser()); // Parse cookies for JWT authentication

// Serve uploaded files statically (fallback for local development)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/designs', designsRouter);
app.use('/api/stills', stillsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/printify', printifyRouter);
app.use('/api/seed', seedRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/templates', templatesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await db.close();
  process.exit(0);
});

// Initialize database and start server
db.init().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`📦 Database: ${process.env.DATABASE_URL ? 'PostgreSQL (Railway)' : 'Not configured'}`);
    console.log(`☁️  S3: ${process.env.AWS_S3_BUCKET ? 'Configured' : 'Local fallback'}`);
    console.log(`🤖 Gemini: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Not configured'}`);
    console.log(`🖨️  Printify: ${process.env.PRINTIFY_API_KEY ? 'Configured' : 'Not configured'}`);
  });
}).catch((error) => {
  console.error('Failed to initialize database:', error);
  console.error('\n💡 Troubleshooting tips:');
  console.error('   1. Check that DATABASE_URL is set in your .env file');
  console.error('   2. Verify the database URL is correct and accessible');
  console.error('   3. For cloud databases, ensure the connection string includes SSL parameters if required');
  console.error('   4. Check your network connection and firewall settings');
  console.error('   5. Verify the database server is running and accessible');
  console.error('   6. If using Railway, check the database service status in your Railway dashboard');
  process.exit(1);
});
