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
    const { prompt, reference_image_urls = [] } = req.body;
    
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
    
    // Generate image using Gemini
    const result = await gemini.generateImage(prompt, reference_image_urls);
    
    res.json({
      url: result.url,
      key: result.key,
      prompt: prompt,
      model: result.model,
      is_placeholder: false
    });
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ 
      error: 'Failed to generate image',
      message: error.message 
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

module.exports = router;
