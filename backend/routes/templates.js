const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const s3 = require('../services/s3');
const replicate = require('../services/replicate');

/**
 * Get all templates
 * GET /api/templates
 */
router.get('/', async (req, res) => {
  try {
    const templates = await db.all('SELECT * FROM templates ORDER BY created_at ASC');
    
    // Debug log to verify canvas_config is being fetched
    const polaroid = templates.find(t => t.id === 'polaroid-ransom-note');
    if (polaroid) {
      console.log('🎯 Polaroid template data:', {
        id: polaroid.id,
        has_canvas_config: !!polaroid.canvas_config,
        canvas_config: polaroid.canvas_config,
        example_image: polaroid.example_image
      });
    }
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * Get all visible templates for landing page
 * GET /api/templates/with-products
 * 
 * Returns all non-hidden templates, enriching those with Printify products
 * with mockup URLs and pricing from Printify API
 */
router.get('/with-products', async (req, res) => {
  try {
    const printify = require('../services/printify');
    
    // Get ALL non-hidden templates
    const templates = await db.all(`
      SELECT * FROM templates 
      WHERE is_hidden = false
      ORDER BY created_at ASC
    `);
    
    // Enrich templates with Printify data where available
    const templatesWithProducts = await Promise.all(
      templates.map(async (template) => {
        try {
          // If template has a Printify product, fetch its details
          if (printify.isConfigured() && template.printify_product_id) {
            const productDetails = await printify.getProductDetails(template.printify_product_id);
            const mockupUrls = (productDetails.images || []).map(img => img.src);
            
            // Extract price from variants (first variant's price)
            let price = 29.99;
            const variants = productDetails.variants || [];
            if (variants.length > 0 && variants[0].price) {
              price = variants[0].price / 100; // Price is in cents
            }
            
            return {
              ...template,
              // Include product data for display
              mockup_urls: mockupUrls,
              price: price,
              printify_title: productDetails.title,
              // Use template name as title, fallback to Printify title
              display_title: template.name || productDetails.title,
            };
          }
          
          // Return template without Printify data (use reference image instead)
          return {
            ...template,
            mockup_urls: [], // No mockups for templates without Printify product
            price: 29.99, // Default price
            display_title: template.name,
          };
        } catch (err) {
          console.error(`Error fetching Printify product for template ${template.id}:`, err.message);
          // Return template with defaults on error
          return {
            ...template,
            mockup_urls: [],
            price: 29.99,
            display_title: template.name,
          };
        }
      })
    );
    
    res.json(templatesWithProducts);
  } catch (error) {
    console.error('Error fetching templates with products:', error);
    res.status(500).json({ error: 'Failed to fetch templates with products' });
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
      is_hidden,
      text_behavior,
    } = req.body;

    if (!id || !name) {
      return res.status(400).json({ error: 'ID and name are required' });
    }

    const result = await db.query(
      `INSERT INTO templates 
       (id, name, description, example_image, reference_image, prompt, panel_schema, upload_tips, max_photos, gradient, is_hidden, text_behavior) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        is_hidden || false,
        text_behavior || 'none',
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
      is_hidden,
      remove_background,
      printify_product_id,
      text_behavior,
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
    if (is_hidden !== undefined) {
      updates.push(`is_hidden = $${paramCount++}`);
      values.push(is_hidden);
    }
    if (remove_background !== undefined) {
      updates.push(`remove_background = $${paramCount++}`);
      values.push(remove_background);
    }
    if (printify_product_id !== undefined) {
      updates.push(`printify_product_id = $${paramCount++}`);
      values.push(printify_product_id);
    }
    if (text_behavior !== undefined) {
      updates.push(`text_behavior = $${paramCount++}`);
      values.push(text_behavior);
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
 * Upload cover/example image for a template (shown in template picker)
 * POST /api/templates/:id/cover-image
 */
router.post('/:id/cover-image', async (req, res) => {
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

    // Upload to S3 examples folder
    const filename = `template-${id}-cover-${Date.now()}.webp`;
    const uploaded = await s3.uploadBuffer(buffer, filename, 'examples', mimeType);

    // Update template with new COVER image (example_image), keep reference_image unchanged
    const result = await db.query(
      'UPDATE templates SET example_image = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [uploaded.url, id]
    );

    res.json({
      message: 'Cover image uploaded successfully (reference image unchanged)',
      example_image: uploaded.url,
      reference_image: result.rows[0].reference_image, // Show that this didn't change
      template: result.rows[0],
    });
  } catch (error) {
    console.error('Error uploading cover image:', error);
    res.status(500).json({ error: 'Failed to upload cover image' });
  }
});

/**
 * POST /api/templates/:id/example-image
 * Upload example/cover image for a template (stored in S3 examples folder)
 */
router.post('/:id/example-image', async (req, res) => {
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

    // Upload to S3 examples folder
    const filename = `template-${id}-example-${Date.now()}.webp`;
    const uploaded = await s3.uploadBuffer(buffer, filename, 'examples', mimeType);

    // Update template with new example_image
    const result = await db.query(
      'UPDATE templates SET example_image = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [uploaded.url, id]
    );

    res.json({
      message: 'Example image uploaded successfully',
      example_image: uploaded.url,
      template: result.rows[0],
    });
  } catch (error) {
    console.error('Error uploading example image:', error);
    res.status(500).json({ error: 'Failed to upload example image' });
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

/**
 * Remove background from an image
 * POST /api/templates/remove-background
 * Body: { imageUrl: string (URL or base64 data URL) }
 */
router.post('/remove-background', async (req, res) => {
  const endpointStartTime = Date.now();
  
  try {
    const { imageUrl } = req.body;

    console.log('\n' + '='.repeat(80));
    console.log('📡 BACKGROUND REMOVAL API - Request received');
    console.log('='.repeat(80));
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('📋 Request body has imageUrl:', !!imageUrl);
    console.log('📋 ImageUrl type:', imageUrl ? (imageUrl.startsWith('data:') ? 'Base64' : 'URL') : 'undefined');

    if (!imageUrl) {
      console.error('❌ Request validation failed: imageUrl is required');
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    if (!replicate.isConfigured()) {
      console.error('❌ Service not configured: REPLICATE_API_TOKEN is not set');
      return res.status(503).json({ 
        error: 'Background removal not configured',
        message: 'REPLICATE_API_TOKEN is not set. Please configure it to enable recraft-ai/recraft-remove-background model.',
        code: 'SERVICE_NOT_CONFIGURED'
      });
    }

    console.log('✅ Request validated - proceeding with background removal...');
    console.log('-'.repeat(80));
    
    const serviceStartTime = Date.now();
    const processedImageBase64 = await replicate.removeBackground(imageUrl);
    const serviceDuration = Date.now() - serviceStartTime;
    const totalDuration = Date.now() - endpointStartTime;

    console.log('-'.repeat(80));
    console.log('✅ BACKGROUND REMOVAL API - SUCCESS');
    console.log('📊 Response stats:');
    console.log('   - Service duration:', serviceDuration, 'ms');
    console.log('   - Total endpoint duration:', totalDuration, 'ms');
    console.log('   - Response type: Base64 data URL');
    console.log('   - Response length:', processedImageBase64?.length || 0, 'characters');
    console.log('='.repeat(80) + '\n');

    res.json({
      processedImage: processedImageBase64,
      message: 'Background removed successfully',
    });
  } catch (error) {
    const totalDuration = Date.now() - endpointStartTime;
    
    console.error('\n' + '='.repeat(80));
    console.error('❌ BACKGROUND REMOVAL API - ERROR');
    console.error('='.repeat(80));
    console.error('⏱️  Duration before error:', totalDuration, 'ms');
    console.error('📋 Error code:', error.code || 'N/A');
    console.error('📋 Error status:', error.status || 'N/A');
    console.error('📋 Error message:', error.message || 'Unknown error');
    console.error('='.repeat(80) + '\n');

    const errorCode = error.code || 'BACKGROUND_REMOVAL_ERROR';
    const errorMessage = error.message || 'Failed to remove background';

    if (error.code === 'INVALID_API_KEY') {
      return res.status(401).json({
        error: 'Invalid API key',
        message: errorMessage,
        code: errorCode,
      });
    } else if (error.code === 'RATE_LIMIT') {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: errorMessage,
        code: errorCode,
      });
    } else if (error.code === 'INVALID_REQUEST') {
      return res.status(400).json({
        error: 'Invalid request',
        message: errorMessage,
        code: errorCode,
      });
    }

    res.status(error.status || 500).json({
      error: 'Background removal failed',
      message: errorMessage,
      code: errorCode,
    });
  }
});

/**
 * Sync templates from local source (e.g., templates.js file)
 * POST /api/templates/sync
 * Body: { templates: Array<Template> }
 */
router.post('/sync', async (req, res) => {
  try {
    const { templates } = req.body;

    if (!Array.isArray(templates)) {
      return res.status(400).json({ error: 'templates must be an array' });
    }

    const results = {
      created: [],
      updated: [],
      skipped: [],
      errors: [],
    };

    for (const template of templates) {
      try {
        if (!template.id || !template.name) {
          results.errors.push({
            template: template.id || 'unknown',
            error: 'Missing required fields: id and name',
          });
          continue;
        }

        // Check if template exists
        const existing = await db.get('SELECT * FROM templates WHERE id = $1', [template.id]);

        const templateData = {
          id: template.id,
          name: template.name,
          description: template.description || null,
          example_image: template.example_image || null,
          // Don't overwrite reference_image if it exists in DB
          reference_image: existing?.reference_image || template.reference_image || null,
          prompt: template.prompt || null,
          panel_schema: JSON.stringify(template.panel_schema || {}),
          upload_tips: JSON.stringify(template.upload_tips || {}),
          max_photos: template.max_photos || 6,
          gradient: template.gradient || null,
          remove_background: template.remove_background || false,
          text_behavior: template.text_behavior || 'none',
        };

        if (existing) {
          // Skip existing templates - only sync new ones
          // Admin panel is the source of truth for existing templates
          results.skipped.push(template.id);
        } else {
          // Create new template
          await db.query(
            `INSERT INTO templates 
             (id, name, description, example_image, reference_image, prompt, panel_schema, upload_tips, max_photos, gradient, remove_background, text_behavior) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              templateData.id,
              templateData.name,
              templateData.description,
              templateData.example_image,
              templateData.reference_image,
              templateData.prompt,
              templateData.panel_schema,
              templateData.upload_tips,
              templateData.max_photos,
              templateData.gradient,
              templateData.remove_background,
              templateData.text_behavior,
            ]
          );
          results.created.push(template.id);
        }
      } catch (error) {
        console.error(`Error syncing template ${template.id}:`, error);
        results.errors.push({
          template: template.id,
          error: error.message,
        });
      }
    }

    res.json({
      message: `Sync completed: ${results.created.length} created, ${results.skipped.length} skipped (existing), ${results.errors.length} errors`,
      results,
    });
  } catch (error) {
    console.error('Error syncing templates:', error);
    res.status(500).json({ error: 'Failed to sync templates' });
  }
});

module.exports = router;
