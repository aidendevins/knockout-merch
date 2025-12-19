const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./db/postgres');
const designsRouter = require('./routes/designs');
const stillsRouter = require('./routes/stills');
const ordersRouter = require('./routes/orders');
const uploadRouter = require('./routes/upload');
const printifyRouter = require('./routes/printify');
const seedRouter = require('./routes/seed');

const app = express();
const PORT = process.env.PORT || 8000;

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
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

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically (fallback for local development)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/designs', designsRouter);
app.use('/api/stills', stillsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/printify', printifyRouter);
app.use('/api/seed', seedRouter);

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
    console.log(`📦 Database: ${process.env.DATABASE_URL ? 'Neon PostgreSQL' : 'Not configured'}`);
    console.log(`☁️  S3: ${process.env.AWS_S3_BUCKET ? 'Configured' : 'Local fallback'}`);
    console.log(`🤖 Gemini: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Not configured'}`);
    console.log(`🖨️  Printify: ${process.env.PRINTIFY_API_KEY ? 'Configured' : 'Not configured'}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
