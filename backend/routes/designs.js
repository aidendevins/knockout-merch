const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const s3 = require('../services/s3');

// Get all designs with optional filtering
router.get('/', async (req, res) => {
  try {
    const { is_featured, is_published, id, sort = '-created_at', limit } = req.query;
    
    let query = 'SELECT * FROM designs WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (id) {
      query += ` AND id = $${paramCount++}`;
      params.push(id);
    }
    if (is_featured !== undefined) {
      query += ` AND is_featured = $${paramCount++}`;
      params.push(is_featured === 'true');
    }
    if (is_published !== undefined) {
      query += ` AND is_published = $${paramCount++}`;
      params.push(is_published === 'true');
    }
    
    // Sorting
    const validSorts = {
      '-created_at': 'created_at DESC',
      'created_at': 'created_at ASC',
      '-sales_count': 'sales_count DESC',
      'sales_count': 'sales_count ASC',
      'title': 'title ASC',
      // Legacy support
      '-created_date': 'created_at DESC',
      'created_date': 'created_at ASC',
    };
    const orderBy = validSorts[sort] || validSorts['-created_at'];
    query += ` ORDER BY ${orderBy}`;
    
    if (limit) {
      query += ` LIMIT $${paramCount++}`;
      params.push(parseInt(limit));
    }
    
    const rows = await db.all(query, params);
    
    // Transform for frontend compatibility
    const designs = rows.map(row => ({
      ...row,
      mockup_urls: row.mockup_urls || [],
      stills_used: row.stills_used || [],
      canvas_data: row.canvas_data || {},
      created_date: row.created_at, // Legacy compatibility
    }));
    
    res.json(designs);
  } catch (error) {
    console.error('Error fetching designs:', error);
    res.status(500).json({ error: 'Failed to fetch designs' });
  }
});

// Get single design
router.get('/:id', async (req, res) => {
  try {
    const row = await db.get('SELECT * FROM designs WHERE id = $1', [req.params.id]);
    if (!row) {
      return res.status(404).json({ error: 'Design not found' });
    }
    
    res.json({
      ...row,
      mockup_urls: row.mockup_urls || [],
      stills_used: row.stills_used || [],
      canvas_data: row.canvas_data || {},
      created_date: row.created_at,
    });
  } catch (error) {
    console.error('Error fetching design:', error);
    res.status(500).json({ error: 'Failed to fetch design' });
  }
});

// Create design
router.post('/', async (req, res) => {
  try {
    const {
      title,
      design_image_url,
      mockup_urls = [],
      printify_product_id,
      printify_blueprint_id,
      prompt_used,
      stills_used = [],
      canvas_data = {},
      is_published = false,
      is_featured = false,
      price = 29.99,
      product_type = 'tshirt',
      color = 'black',
      creator_name,
      creator_id,
    } = req.body;
    
    if (!title || !design_image_url) {
      return res.status(400).json({ error: 'Title and design_image_url are required' });
    }
    
    const result = await db.get(
      `INSERT INTO designs (
        title, design_image_url, mockup_urls, printify_product_id, printify_blueprint_id,
        prompt_used, stills_used, canvas_data, is_published, is_featured, 
        price, product_type, color, creator_name, creator_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        title, design_image_url, JSON.stringify(mockup_urls),
        printify_product_id || null, printify_blueprint_id || null,
        prompt_used || null, JSON.stringify(stills_used), JSON.stringify(canvas_data),
        is_published, is_featured, price, product_type, color,
        creator_name || null, creator_id || null
      ]
    );
    
    res.status(201).json({
      ...result,
      mockup_urls: result.mockup_urls || [],
      stills_used: result.stills_used || [],
      canvas_data: result.canvas_data || {},
      created_date: result.created_at,
    });
  } catch (error) {
    console.error('Error creating design:', error);
    res.status(500).json({ error: 'Failed to create design' });
  }
});

// Update design
router.put('/:id', async (req, res) => {
  try {
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    const fields = {
      title: (v) => v,
      design_image_url: (v) => v,
      mockup_urls: (v) => JSON.stringify(v),
      printify_product_id: (v) => v,
      printify_blueprint_id: (v) => v,
      prompt_used: (v) => v,
      stills_used: (v) => JSON.stringify(v),
      canvas_data: (v) => JSON.stringify(v),
      is_published: (v) => v,
      is_featured: (v) => v,
      price: (v) => v,
      sales_count: (v) => v,
      product_type: (v) => v,
      color: (v) => v,
      creator_name: (v) => v,
      creator_id: (v) => v,
    };
    
    Object.keys(fields).forEach(key => {
      if (req.body[key] !== undefined) {
        updates.push(`${key} = $${paramCount++}`);
        values.push(fields[key](req.body[key]));
      }
    });
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(req.params.id);
    
    const result = await db.get(
      `UPDATE designs SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    if (!result) {
      return res.status(404).json({ error: 'Design not found' });
    }
    
    res.json({
      ...result,
      mockup_urls: result.mockup_urls || [],
      stills_used: result.stills_used || [],
      canvas_data: result.canvas_data || {},
      created_date: result.created_at,
    });
  } catch (error) {
    console.error('Error updating design:', error);
    res.status(500).json({ error: 'Failed to update design' });
  }
});

// Delete design
router.delete('/:id', async (req, res) => {
  try {
    // Get the design first
    const design = await db.get('SELECT * FROM designs WHERE id = $1', [req.params.id]);
    
    if (!design) {
      return res.status(404).json({ error: 'Design not found' });
    }
    
    // Delete from database
    await db.query('DELETE FROM designs WHERE id = $1', [req.params.id]);
    
    // Try to delete image from S3
    if (s3.isConfigured() && design.design_image_url) {
      const key = s3.getKeyFromUrl(design.design_image_url);
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
    console.error('Error deleting design:', error);
    res.status(500).json({ error: 'Failed to delete design' });
  }
});

module.exports = router;
