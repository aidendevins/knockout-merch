const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const s3 = require('../services/s3');

/**
 * Get all templates
 * GET /api/templates
 */
router.get('/', async (req, res) => {
  try {
    const templates = await db.all('SELECT * FROM templates ORDER BY created_at ASC');
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * Get a single template by ID
 * GET /api/templates/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await db.get('SELECT * FROM templates WHERE id = $1', [id]);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

/**
 * Create a new template
 * POST /api/templates
 */
router.post('/', async (req, res) => {
  try {
    const {
      id,
      name,
      description,
      example_image,
      reference_image,
      prompt,
      panel_schema,
      upload_tips,
      max_photos,
      gradient,
    } = req.body;

    if (!id || !name) {
      return res.status(400).json({ error: 'ID and name are required' });
    }

    const result = await db.query(
      `INSERT INTO templates 
       (id, name, description, example_image, reference_image, prompt, panel_schema, upload_tips, max_photos, gradient) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id,
        name,
        description || null,
        example_image || null,
        reference_image || null,
        prompt || null,
        JSON.stringify(panel_schema || {}),
        JSON.stringify(upload_tips || {}),
        max_photos || 6,
        gradient || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating template:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'Template with this ID already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create template' });
    }
  }
});

/**
 * Update a template
 * PUT /api/templates/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      example_image,
      reference_image,
      prompt,
      panel_schema,
      upload_tips,
      max_photos,
      gradient,
    } = req.body;

    // Check if template exists
    const existing = await db.get('SELECT * FROM templates WHERE id = $1', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (example_image !== undefined) {
      updates.push(`example_image = $${paramCount++}`);
      values.push(example_image);
    }
    if (reference_image !== undefined) {
      updates.push(`reference_image = $${paramCount++}`);
      values.push(reference_image);
    }
    if (prompt !== undefined) {
      updates.push(`prompt = $${paramCount++}`);
      values.push(prompt);
    }
    if (panel_schema !== undefined) {
      updates.push(`panel_schema = $${paramCount++}`);
      values.push(JSON.stringify(panel_schema));
    }
    if (upload_tips !== undefined) {
      updates.push(`upload_tips = $${paramCount++}`);
      values.push(JSON.stringify(upload_tips));
    }
    if (max_photos !== undefined) {
      updates.push(`max_photos = $${paramCount++}`);
      values.push(max_photos);
    }
    if (gradient !== undefined) {
      updates.push(`gradient = $${paramCount++}`);
      values.push(gradient);
    }

    // Always update updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await db.query(
      `UPDATE templates SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

/**
 * Delete a template
 * DELETE /api/templates/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if template exists
    const existing = await db.get('SELECT * FROM templates WHERE id = $1', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check if any designs use this template
    const designCount = await db.get(
      'SELECT COUNT(*) as count FROM designs WHERE template_id = $1',
      [id]
    );

    if (designCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete template with existing designs',
        designCount: parseInt(designCount.count)
      });
    }

    await db.query('DELETE FROM templates WHERE id = $1', [id]);
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

/**
 * Upload reference image for a template
 * POST /api/templates/:id/reference-image
 */
router.post('/:id/reference-image', async (req, res) => {
  try {
    const { id } = req.params;
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    // Check if template exists
    const existing = await db.get('SELECT * FROM templates WHERE id = $1', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Convert base64 to buffer
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 image format' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload to S3
    const filename = `template-${id}-reference-${Date.now()}.png`;
    const uploaded = await s3.uploadBuffer(buffer, filename, 'templates', mimeType);

    // Update template with new reference image URL
    const result = await db.query(
      'UPDATE templates SET reference_image = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [uploaded.url, id]
    );

    res.json({
      message: 'Reference image uploaded successfully',
      reference_image: uploaded.url,
      template: result.rows[0],
    });
  } catch (error) {
    console.error('Error uploading reference image:', error);
    res.status(500).json({ error: 'Failed to upload reference image' });
  }
});

module.exports = router;
