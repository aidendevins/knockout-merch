const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const s3 = require('../services/s3');
const gemini = require('../services/gemini');

// Configure multer for memory storage (for S3) or disk (fallback)
const storage = s3.isConfigured() 
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload file endpoint
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    let fileUrl;
    let key;
    
    if (s3.isConfigured()) {
      // Upload to S3 from memory buffer
      const folder = req.body.folder || 'uploads';
      const result = await s3.uploadBuffer(
        req.file.buffer,
        req.file.originalname,
        folder,
        req.file.mimetype
      );
      fileUrl = result.url;
      key = result.key;
    } else {
      // Local fallback
      fileUrl = `${process.env.BACKEND_URL || 'http://localhost:8000'}/uploads/${req.file.filename}`;
    }
    
    res.json({ 
      file_url: fileUrl,
      key: key,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Upload base64 image (for canvas exports)
router.post('/base64', async (req, res) => {
  try {
    const { image, folder = 'exports' } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }
    
    // Parse base64 data
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Determine content type
    const matches = image.match(/^data:image\/(\w+);base64,/);
    const contentType = matches ? `image/${matches[1]}` : 'image/png';
    
    if (s3.isConfigured()) {
      const result = await s3.uploadBuffer(buffer, 'export.png', folder, contentType);
      res.json({ 
        file_url: result.url,
        key: result.key
      });
    } else {
      // Local fallback for base64
      const filename = `export-${Date.now()}.png`;
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, buffer);
      
      const fileUrl = `${process.env.BACKEND_URL || 'http://localhost:8000'}/uploads/${filename}`;
      res.json({ file_url: fileUrl });
    }
  } catch (error) {
    console.error('Error uploading base64 image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Generate image endpoint using Gemini AI
router.post('/generate-image', async (req, res) => {
  try {
    const { prompt, reference_image_urls = [], template_id = null } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // Check if Gemini is configured
    if (!gemini.isConfigured()) {
      // Return placeholder if not configured
      console.warn('Gemini not configured, returning placeholder');
      return res.json({
        url: 'https://via.placeholder.com/512x512/DC2626/FFFFFF?text=AI+Design',
        prompt: prompt,
        message: 'AI generation not configured. Set GEMINI_API_KEY to enable.',
        is_placeholder: true
      });
    }
    
    // Fetch template's reference image if template_id is provided
    let allReferenceImages = [...reference_image_urls];
    if (template_id) {
      try {
        const db = require('../db/postgres');
        const template = await db.get('SELECT reference_image FROM templates WHERE id = $1', [template_id]);
        if (template && template.reference_image) {
          // Add template's reference image as the FIRST image (image_0.png)
          allReferenceImages.unshift(template.reference_image);
          console.log(`✨ Added template reference image for '${template_id}'`);
        }
      } catch (dbError) {
        console.warn('Failed to fetch template reference image:', dbError.message);
        // Continue without template reference image
      }
    }
    
    console.log(`🎨 Generating image with ${allReferenceImages.length} reference image(s)`);
    
    // Generate image using Gemini
    const result = await gemini.generateImage(prompt, allReferenceImages);
    
    // Return the key so frontend can construct the proxy URL
    // This avoids CORS issues by having the image served through our backend
    res.json({
      key: result.key,
      prompt: prompt,
      model: result.model,
      is_placeholder: false,
      useProxy: true // Signal to frontend to use proxy endpoint
    });
  } catch (error) {
    console.error('Error generating image:', error);
    
    // Check for model not supported error
    if (error.code === 'MODEL_NOT_SUPPORTED' || error.message?.includes('does not support')) {
      return res.status(400).json({ 
        error: 'Image generation not supported',
        message: error.message || 'The selected AI model does not support image generation. Please use a model that supports image generation (e.g., gemini-2.0-flash-exp with image generation enabled).',
        code: 'MODEL_NOT_SUPPORTED'
      });
    }
    
    // Check for invalid request error (400)
    if (error.status === 400 || error.code === 'INVALID_REQUEST' || error.code === 'BAD_REQUEST') {
      return res.status(400).json({ 
        error: 'Invalid request to AI model',
        message: error.message || 'The AI model may not support image generation or the request format is incorrect. Please try a different prompt or check the model configuration.',
        code: error.code || 'INVALID_REQUEST'
      });
    }
    
    // Check for model overloaded error (503)
    if (error.status === 503 || error.code === 'MODEL_OVERLOADED' || error.message?.includes('overloaded') || error.message?.includes('503')) {
      return res.status(503).json({ 
        error: 'AI model is currently overloaded',
        message: 'The AI service is experiencing high demand. Please wait a moment and try again.',
        code: 'MODEL_OVERLOADED',
        retryAfter: 30 // Suggest retry after 30 seconds
      });
    }
    
    // Check for rate limiting (429)
    if (error.status === 429 || error.message?.includes('rate limit') || error.message?.includes('429')) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please wait a moment before generating another image.',
        code: 'RATE_LIMITED',
        retryAfter: 60
      });
    }
    
    // Check for permission denied (403)
    if (error.status === 403 || error.code === 'PERMISSION_DENIED') {
      return res.status(403).json({ 
        error: 'Permission denied',
        message: error.message || 'Image generation is not available. Please check your API configuration.',
        code: 'PERMISSION_DENIED'
      });
    }
    
    // Check for S3 configuration errors
    if (error.code === 'S3_CONFIG_ERROR' || error.code === 'AccessControlListNotSupported') {
      return res.status(500).json({ 
        error: 'Storage configuration error',
        message: error.message || 'S3 bucket configuration issue. Please check your AWS S3 settings.',
        code: 'S3_CONFIG_ERROR'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate image',
      message: error.message || 'An unexpected error occurred',
      code: error.code || 'GENERATION_ERROR'
    });
  }
});

// Health check for AI services
router.get('/ai-status', (req, res) => {
  res.json({
    gemini: gemini.isConfigured(),
    s3: s3.isConfigured(),
  });
});

// Proxy S3 images to avoid CORS issues
router.get('/proxy-image', async (req, res) => {
  try {
    const { url, key } = req.query;
    
    if (!url && !key) {
      return res.status(400).json({ error: 'URL or key parameter is required' });
    }
    
    let imageUrl;
    
    if (key) {
      // Generate presigned URL from key (more secure)
      try {
        imageUrl = await s3.getPresignedUrl(key, 3600); // 1 hour expiry for proxy
      } catch (presignError) {
        console.error('Error generating presigned URL:', presignError);
        // Fall back to public URL construction
        const bucketName = process.env.AWS_S3_BUCKET;
        const region = process.env.AWS_REGION || 'us-east-1';
        imageUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
      }
    } else {
      // Validate that it's an S3 URL from our bucket
      const bucketName = process.env.AWS_S3_BUCKET;
      if (!url.includes(bucketName) && !url.startsWith('http')) {
        return res.status(400).json({ error: 'Invalid image URL' });
      }
      imageUrl = url;
    }
    
    // Fetch the image from S3 using presigned URL (bypasses CORS on server side)
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      console.error('Failed to fetch image from S3:', response.status, response.statusText);
      return res.status(response.status).json({ error: 'Failed to fetch image from storage' });
    }
    
    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    
    // Send the image
    res.send(Buffer.from(imageBuffer));
  } catch (error) {
    console.error('Error proxying image:', error);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
});

module.exports = router;
