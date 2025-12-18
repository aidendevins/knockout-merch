const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const s3 = require('../services/s3');
const multer = require('multer');

// Configure multer for memory storage (for S3 upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Get all fight stills
router.get('/', async (req, res) => {
  try {
    const sortBy = req.query.sort || '-created_at';
    const orderBy = sortBy.startsWith('-') 
      ? `${sortBy.slice(1)} DESC` 
      : `${sortBy} ASC`;
    
    const validColumns = ['created_at', 'usage_count', 'title'];
    const column = sortBy.replace('-', '');
    const finalOrder = validColumns.includes(column) ? orderBy : 'created_at DESC';
    
    const rows = await db.all(`SELECT * FROM fight_stills ORDER BY ${finalOrder}`);
    
    // Convert any s3:// URIs to HTTP URLs, and optionally use presigned URLs
    // Use presigned URLs if usePresigned=true in query params (for private buckets)
    const usePresigned = req.query.usePresigned === 'true';
    
    const convertedRows = await Promise.all(rows.map(async (row) => {
      const originalUrl = row.image_url;
      let imageUrl;
      
      if (usePresigned && s3.isConfigured()) {
        // Use presigned URLs (works for private buckets)
        try {
          imageUrl = await s3.getPresignedUrlFromUrl(originalUrl, 3600);
        } catch (err) {
          console.error(`Failed to get presigned URL for ${originalUrl}:`, err.message);
          // Fallback to public URL
          imageUrl = s3.convertS3UriToHttpUrl(originalUrl);
        }
      } else {
        // Use public HTTP URLs (requires bucket to have public read access)
        imageUrl = s3.convertS3UriToHttpUrl(originalUrl);
      }
      
      return {
        ...row,
        image_url: imageUrl
      };
    }));
    
    res.json(convertedRows);
  } catch (error) {
    console.error('Error fetching stills:', error);
    res.status(500).json({ error: 'Failed to fetch fight stills' });
  }
});

// Sync fight stills from S3 bucket
// This fetches all images from the 'stills' folder in S3 and adds them to the database
router.post('/sync-s3', async (req, res) => {
  try {
    if (!s3.isConfigured()) {
      return res.status(400).json({ error: 'S3 is not configured' });
    }

    // List all images in the 'stills' folder (or root if no folder specified)
    const prefix = req.body.prefix || 'stills';
    const s3Objects = await s3.listObjects(prefix);
    
    // Also list root-level images if no prefix was specified
    let allObjects = [...s3Objects];
    if (!req.body.prefix) {
      const rootObjects = await s3.listObjects('');
      // Filter to only include root-level files (no / in the key after removing prefix)
      const rootImages = rootObjects.filter(obj => !obj.key.includes('/'));
      allObjects = [...allObjects, ...rootImages];
    }

    // Get existing stills to avoid duplicates
    const existingStills = await db.all('SELECT image_url FROM fight_stills');
    const existingUrls = new Set(existingStills.map(s => s.image_url));

    // Add new stills
    let addedCount = 0;
    for (const obj of allObjects) {
      if (!existingUrls.has(obj.url)) {
        // Generate title from filename
        const title = obj.filename
          .replace(/\.[^.]+$/, '') // Remove extension
          .replace(/[-_]/g, ' ')   // Replace dashes/underscores with spaces
          .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize words

        // Ensure URL is HTTP format, not s3://
        const httpUrl = s3.convertS3UriToHttpUrl(obj.url);
        
        await db.query(
          `INSERT INTO fight_stills (title, image_url, is_featured) VALUES ($1, $2, $3)`,
          [title, httpUrl, false]
        );
        addedCount++;
      }
    }

    res.json({
      success: true,
      message: `Synced ${addedCount} new images from S3`,
      total_in_s3: allObjects.length,
      added: addedCount,
      already_existed: allObjects.length - addedCount,
    });
  } catch (error) {
    console.error('Error syncing S3:', error);
    res.status(500).json({ error: 'Failed to sync from S3', message: error.message });
  }
});

// List images directly from S3 bucket (without adding to database)
router.get('/s3-images', async (req, res) => {
  try {
    if (!s3.isConfigured()) {
      return res.status(400).json({ error: 'S3 is not configured' });
    }

    const prefix = req.query.prefix || '';
    const images = await s3.listObjects(prefix);
    
    res.json(images);
  } catch (error) {
    console.error('Error listing S3 images:', error);
    res.status(500).json({ error: 'Failed to list S3 images', message: error.message });
  }
});

// Fix existing records that have s3:// URIs - convert them to HTTP URLs
router.post('/fix-s3-uris', async (req, res) => {
  try {
    // Get all stills
    const stills = await db.all('SELECT id, image_url FROM fight_stills');
    
    let fixedCount = 0;
    for (const still of stills) {
      // Check if URL is s3:// format
      if (still.image_url && still.image_url.startsWith('s3://')) {
        const httpUrl = s3.convertS3UriToHttpUrl(still.image_url);
        
        // Update the record
        await db.query(
          'UPDATE fight_stills SET image_url = $1 WHERE id = $2',
          [httpUrl, still.id]
        );
        fixedCount++;
      }
    }
    
    res.json({
      success: true,
      message: `Fixed ${fixedCount} S3 URI(s)`,
      fixed: fixedCount,
      total: stills.length
    });
  } catch (error) {
    console.error('Error fixing S3 URIs:', error);
    res.status(500).json({ error: 'Failed to fix S3 URIs', message: error.message });
  }
});

// Get single fight still
router.get('/:id', async (req, res) => {
  try {
    const row = await db.get('SELECT * FROM fight_stills WHERE id = $1', [req.params.id]);
    if (!row) {
      return res.status(404).json({ error: 'Fight still not found' });
    }
    
    // Convert s3:// URI to HTTP URL, optionally use presigned URL
    const usePresigned = req.query.usePresigned === 'true';
    let imageUrl;
    
    if (usePresigned && s3.isConfigured()) {
      try {
        imageUrl = await s3.getPresignedUrlFromUrl(row.image_url, 3600);
      } catch (err) {
        imageUrl = s3.convertS3UriToHttpUrl(row.image_url);
      }
    } else {
      imageUrl = s3.convertS3UriToHttpUrl(row.image_url);
    }
    
    const convertedRow = {
      ...row,
      image_url: imageUrl
    };
    
    res.json(convertedRow);
  } catch (error) {
    console.error('Error fetching still:', error);
    res.status(500).json({ error: 'Failed to fetch fight still' });
  }
});

// Create fight still (with optional file upload)
router.post('/', upload.single('file'), async (req, res) => {
  try {
    let { title, image_url, round, is_featured = false } = req.body;
    
    // If file uploaded, upload to S3
    if (req.file) {
      const uploaded = await s3.uploadFile(req.file, 'stills');
      image_url = uploaded.url;
    }
    
    if (!title || !image_url) {
      return res.status(400).json({ error: 'Title and image are required' });
    }
    
    const result = await db.get(
      `INSERT INTO fight_stills (title, image_url, round, is_featured) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [title, image_url, round || null, is_featured === 'true' || is_featured === true]
    );
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating still:', error);
    res.status(500).json({ error: 'Failed to create fight still' });
  }
});

// Update fight still
router.put('/:id', async (req, res) => {
  try {
    const { title, image_url, round, is_featured, usage_count } = req.body;
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (image_url !== undefined) {
      updates.push(`image_url = $${paramCount++}`);
      values.push(image_url);
    }
    if (round !== undefined) {
      updates.push(`round = $${paramCount++}`);
      values.push(round || null);
    }
    if (is_featured !== undefined) {
      updates.push(`is_featured = $${paramCount++}`);
      values.push(is_featured);
    }
    if (usage_count !== undefined) {
      updates.push(`usage_count = $${paramCount++}`);
      values.push(usage_count);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(req.params.id);
    
    const result = await db.get(
      `UPDATE fight_stills SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    if (!result) {
      return res.status(404).json({ error: 'Fight still not found' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error updating still:', error);
    res.status(500).json({ error: 'Failed to update fight still' });
  }
});

// Delete fight still
router.delete('/:id', async (req, res) => {
  try {
    // Get the still first to delete from S3
    const still = await db.get('SELECT * FROM fight_stills WHERE id = $1', [req.params.id]);
    
    if (!still) {
      return res.status(404).json({ error: 'Fight still not found' });
    }
    
    // Delete from database
    await db.query('DELETE FROM fight_stills WHERE id = $1', [req.params.id]);
    
    // Try to delete from S3 if it's an S3 URL
    if (s3.isConfigured()) {
      const key = s3.getKeyFromUrl(still.image_url);
      if (key) {
        try {
          await s3.deleteFile(key);
        } catch (e) {
          console.warn('Failed to delete S3 file:', e.message);
        }
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting still:', error);
    res.status(500).json({ error: 'Failed to delete fight still' });
  }
});

module.exports = router;
