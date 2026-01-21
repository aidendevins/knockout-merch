const express = require('express');
const router = express.Router();
const printify = require('../services/printify');
const db = require('../db/postgres');

/**
 * Printify API Routes
 * Handles product creation, mockups, and order fulfillment
 */

// Check Printify configuration status
router.get('/status', (req, res) => {
  res.json({
    configured: printify.isConfigured(),
    message: printify.isConfigured() 
      ? 'Printify is configured and ready'
      : 'Missing PRINTIFY_API_KEY or PRINTIFY_SHOP_ID'
  });
});

// Get available product types (blueprints)
router.get('/blueprints', async (req, res) => {
  try {
    if (!printify.isConfigured()) {
      // Return mock blueprints for development
      return res.json([
        { id: 'tshirt', name: 'T-Shirt', base_price: 29.99 },
        { id: 'hoodie', name: 'Hoodie', base_price: 49.99 },
      ]);
    }
    
    const blueprints = await printify.getBlueprints();
    res.json(blueprints);
  } catch (error) {
    console.error('Error fetching blueprints:', error);
    res.status(500).json({ error: 'Failed to fetch blueprints' });
  }
});

// Get shops
router.get('/shops', async (req, res) => {
  try {
    if (!printify.isConfigured()) {
      return res.json([{ id: 'mock-shop', name: 'Knockout Club (Development)' }]);
    }
    
    const shops = await printify.getShops();
    res.json(shops);
  } catch (error) {
    console.error('Error fetching shops:', error);
    res.status(500).json({ error: 'Failed to fetch shops' });
  }
});

// Create a product from design
router.post('/products', async (req, res) => {
  try {
    const { 
      title, 
      description, 
      design_image_url, 
      design_image_base64, // Accept base64 data directly
      product_type = 'tshirt',
      color = 'black',
      canvas_data = {},
      design_id 
    } = req.body;

    // Either URL or base64 is required
    if (!design_image_url && !design_image_base64) {
      return res.status(400).json({ error: 'Design image URL or base64 data is required' });
    }

    // Validate color
    const validColors = ['black', 'white', 'light-pink', 'lightPink', 'light_pink'];
    if (!validColors.includes(color.toLowerCase())) {
      return res.status(400).json({ error: `Invalid color: ${color}. Must be 'black', 'white', or 'light-pink'.` });
    }

    if (!printify.isConfigured()) {
      // Return mock response for development
      const bgColor = color === 'black' ? '1a1a1a' : 'f5f5f5';
      const textColor = color === 'black' ? 'FFFFFF' : '1a1a1a';
      const mockProduct = {
        id: `mock-${Date.now()}`,
        printify_product_id: `mock-${Date.now()}`,
        title: title || 'Knockout Club Design',
        mockup_urls: [
          `https://via.placeholder.com/800x800/${bgColor}/${textColor}?text=${product_type === 'hoodie' ? 'Hoodie' : 'T-Shirt'}+Front`,
          `https://via.placeholder.com/800x800/${bgColor}/${textColor}?text=${product_type === 'hoodie' ? 'Hoodie' : 'T-Shirt'}+Back`,
        ],
        product_type,
        color,
        is_mock: true,
      };

      // Update design with mockup URLs if design_id provided
      if (design_id) {
        await db.query(
          `UPDATE designs SET 
            mockup_urls = $1, 
            printify_product_id = $2,
            color = $3
          WHERE id = $4`,
          [JSON.stringify(mockProduct.mockup_urls), mockProduct.printify_product_id, color, design_id]
        );
      }

      return res.json(mockProduct);
    }

    // Create BOTH T-shirt AND Hoodie products on Printify
    // Prefer base64 if provided, otherwise use URL
    const imageData = design_image_base64 || design_image_url;
    
    console.log('🎨 Creating T-shirt product...');
    const tshirtProduct = await printify.createProduct({
      title: `${title || 'KO Merch Design'} - T-Shirt`,
      description: description || 'Custom design T-shirt',
      imageUrl: imageData,
      productType: 'tshirt',
      color: color,
      canvasData: canvas_data,
    });

    console.log('🎨 Creating Hoodie product...');
    const hoodieProduct = await printify.createProduct({
      title: `${title || 'KO Merch Design'} - Hoodie`,
      description: description || 'Custom design hoodie',
      imageUrl: imageData,
      productType: 'hoodie',
      color: color,
      canvasData: canvas_data,
    });

    // Get mockups for both
    console.log('📸 Fetching T-shirt mockups...');
    const tshirtMockups = await printify.getProductMockups(tshirtProduct.id);
    console.log('📸 Fetching Hoodie mockups...');
    const hoodieMockups = await printify.getProductMockups(hoodieProduct.id);

    // Update design with BOTH product IDs and mockups
    if (design_id) {
      await db.query(
        `UPDATE designs SET 
          printify_tshirt_id = $1,
          printify_hoodie_id = $2,
          tshirt_mockups = $3,
          hoodie_mockups = $4,
          printify_product_id = $5,
          mockup_urls = $6,
          color = $7
        WHERE id = $8`,
        [
          tshirtProduct.id,
          hoodieProduct.id,
          JSON.stringify(tshirtMockups),
          JSON.stringify(hoodieMockups),
          product_type === 'tshirt' ? tshirtProduct.id : hoodieProduct.id, // Set primary based on user choice
          JSON.stringify(product_type === 'tshirt' ? tshirtMockups : hoodieMockups), // Set primary mockups
          color,
          design_id
        ]
      );
    }

    res.json({
      tshirt: {
        ...tshirtProduct,
        mockup_urls: tshirtMockups,
      },
      hoodie: {
        ...hoodieProduct,
        mockup_urls: hoodieMockups,
      },
      printify_tshirt_id: tshirtProduct.id,
      printify_hoodie_id: hoodieProduct.id,
      selected_product_type: product_type,
      color,
      is_mock: false,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product', message: error.message });
  }
});

// Get product details by Printify product ID
// This returns data in a format compatible with the design object
router.get('/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    if (!printify.isConfigured() || productId.startsWith('mock-')) {
      return res.json({
        id: productId,
        printify_product_id: productId,
        title: 'Sample Product',
        mockup_urls: [
          'https://via.placeholder.com/800x800/1a1a1a/DC2626?text=T-Shirt+Front',
          'https://via.placeholder.com/800x800/1a1a1a/DC2626?text=T-Shirt+Back',
        ],
        price: 29.99,
        product_type: 'tshirt',
        color: 'black',
        is_mock: true,
      });
    }

    const productDetails = await printify.getProductDetails(productId);
    const mockupUrls = (productDetails.images || []).map(img => img.src);
    
    // Extract price from variants
    let price = 29.99;
    const variants = productDetails.variants || [];
    if (variants.length > 0 && variants[0].price) {
      price = variants[0].price / 100;
    }
    
    // Determine product type from blueprint_id
    let productType = 'tshirt';
    if (productDetails.blueprint_id === 77) {
      productType = 'hoodie';
    }
    
    // Try to get color from first variant
    let color = 'black';
    if (variants.length > 0 && variants[0].options?.color) {
      color = variants[0].options.color.toLowerCase();
    }

    res.json({
      id: productId,
      printify_product_id: productId,
      title: productDetails.title,
      mockup_urls: mockupUrls,
      price: price,
      product_type: productType,
      color: color,
      blueprint_id: productDetails.blueprint_id,
      variants: variants,
      is_printify_product: true,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

// Get mockups for a product
router.get('/products/:productId/mockups', async (req, res) => {
  try {
    const { productId } = req.params;

    if (!printify.isConfigured() || productId.startsWith('mock-')) {
      // Return mock mockups for development
      return res.json([
        'https://via.placeholder.com/800x800/1a1a1a/DC2626?text=T-Shirt+Front',
        'https://via.placeholder.com/800x800/1a1a1a/DC2626?text=T-Shirt+Back',
      ]);
    }

    const mockups = await printify.getProductMockups(productId);
    res.json(mockups);
  } catch (error) {
    console.error('Error fetching mockups:', error);
    res.status(500).json({ error: 'Failed to fetch mockups' });
  }
});

// Publish a product
router.post('/products/:productId/publish', async (req, res) => {
  try {
    const { productId } = req.params;

    if (!printify.isConfigured() || productId.startsWith('mock-')) {
      return res.json({ success: true, is_mock: true });
    }

    await printify.publishProduct(productId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error publishing product:', error);
    res.status(500).json({ error: 'Failed to publish product' });
  }
});

// Calculate shipping
router.post('/shipping', async (req, res) => {
  try {
    const { product_id, variant_id, address } = req.body;

    if (!printify.isConfigured() || product_id?.startsWith('mock-')) {
      // Return mock shipping for development
      return res.json({
        standard: { cost: 499, name: 'Standard Shipping', days: '5-7' },
        express: { cost: 999, name: 'Express Shipping', days: '2-3' },
      });
    }

    const shipping = await printify.calculateShipping(product_id, variant_id, address);
    res.json(shipping);
  } catch (error) {
    console.error('Error calculating shipping:', error);
    res.status(500).json({ error: 'Failed to calculate shipping' });
  }
});

// Create an order
router.post('/orders', async (req, res) => {
  try {
    const { 
      product_id, 
      size, 
      quantity, 
      shipping_address,
      order_id,
      product_type = 'tshirt',
      color = 'black'
    } = req.body;

    if (!product_id || !size || !shipping_address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get variant ID for the size and color
    const variantId = printify.getVariantId(product_type, size, color);
    if (!variantId && printify.isConfigured()) {
      return res.status(400).json({ error: `Invalid size or color: ${size}/${color}` });
    }

    if (!printify.isConfigured() || product_id.startsWith('mock-')) {
      // Return mock order for development
      const mockOrder = {
        id: `mock-order-${Date.now()}`,
        printify_order_id: `mock-order-${Date.now()}`,
        status: 'pending',
        is_mock: true,
      };

      // Update local order with Printify order ID
      if (order_id) {
        await db.query(
          `UPDATE orders SET 
            printify_order_id = $1,
            status = 'processing'
          WHERE id = $2`,
          [mockOrder.printify_order_id, order_id]
        );
      }

      return res.json(mockOrder);
    }

    // Create order on Printify
    const printifyOrder = await printify.createOrder({
      productId: product_id,
      variantId,
      quantity: quantity || 1,
      shippingAddress: shipping_address,
      externalId: order_id,
    });

    // Update local order with Printify order ID
    if (order_id) {
      await db.query(
        `UPDATE orders SET 
          printify_order_id = $1,
          status = 'processing'
        WHERE id = $2`,
        [printifyOrder.id, order_id]
      );
    }

    res.json({
      id: printifyOrder.id,
      printify_order_id: printifyOrder.id,
      status: printifyOrder.status,
      is_mock: false,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order', message: error.message });
  }
});

// Get order status
router.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!printify.isConfigured() || orderId.startsWith('mock-')) {
      return res.json({
        id: orderId,
        status: 'in_production',
        is_mock: true,
      });
    }

    const order = await printify.getOrder(orderId);
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order status' });
  }
});

// Get available sizes for a product type
router.get('/sizes/:productType', (req, res) => {
  const { productType } = req.params;
  const blueprint = printify.BLUEPRINTS[productType];
  
  if (!blueprint) {
    return res.status(404).json({ error: 'Unknown product type' });
  }
  
  const sizes = Object.keys(blueprint.variants);
  res.json(sizes);
});

// Sync all products from Printify to local database
router.post('/sync-products', async (req, res) => {
  try {
    if (!printify.isConfigured()) {
      return res.status(400).json({ error: 'Printify is not configured' });
    }

    // Get all products from Printify shop
    const products = await printify.getAllShopProducts();
    
    let insertedCount = 0;
    let skippedCount = 0;

    // Process each product
    for (const product of products) {
      try {
        // Check if product already exists by printify_product_id
        const existing = await db.get(
          'SELECT id FROM designs WHERE printify_product_id = $1',
          [product.id.toString()]
        );

        if (existing) {
          skippedCount++;
          continue;
        }

        // Get product details for mockups and other information
        const productDetails = await printify.getProductDetails(product.id);
        const mockupUrls = (productDetails.images || []).map(img => img.src);

        // Determine product type from blueprint_id
        const blueprintId = productDetails.blueprint_id || product.blueprint_id;
        let productType = 'tshirt';
        if (blueprintId === 77) {
          productType = 'hoodie';
        } else if (blueprintId === 12) {
          productType = 'tshirt';
        }

        // Extract color from variants (first variant's color)
        const variants = productDetails.variants || product.variants || [];
        let color = 'black';
        if (variants.length > 0) {
          const firstVariant = variants[0];
          // Try to determine color from variant options
          if (firstVariant.options?.color) {
            color = firstVariant.options.color.toLowerCase();
          }
        }

        // Get design image URL from print areas
        // Printify products have print_areas with images
        let designImageUrl = '';
        if (productDetails.print_areas && productDetails.print_areas.length > 0) {
          const printArea = productDetails.print_areas[0];
          if (printArea.placeholders && printArea.placeholders.length > 0) {
            const placeholder = printArea.placeholders[0];
            if (placeholder.images && placeholder.images.length > 0) {
              // We need to fetch the uploaded image URL
              // For now, we'll use the first mockup as a fallback
              designImageUrl = mockupUrls[0] || '';
            }
          }
        }

        // If we don't have a design image URL, use the first mockup
        if (!designImageUrl && mockupUrls.length > 0) {
          designImageUrl = mockupUrls[0];
        }

        // If still no image, skip this product
        if (!designImageUrl) {
          skippedCount++;
          continue;
        }

        // Extract price from variants (use the first variant's price)
        let price = 29.99;
        if (variants.length > 0) {
          const firstVariant = variants[0];
          if (firstVariant.price) {
            // Price is in cents, convert to dollars
            price = firstVariant.price / 100;
          }
        }

        // Insert into designs table
        await db.query(
          `INSERT INTO designs (
            title, design_image_url, mockup_urls, printify_product_id, printify_blueprint_id,
            product_type, color, price, is_published, is_featured
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            productDetails.title || product.title || 'Imported from Printify',
            designImageUrl,
            JSON.stringify(mockupUrls),
            product.id.toString(),
            blueprintId,
            productType,
            color,
            price,
            false, // is_published - set to false by default
            false  // is_featured - set to false by default
          ]
        );

        insertedCount++;
      } catch (error) {
        console.error(`Error processing product ${product.id}:`, error);
        skippedCount++;
        // Continue with next product
      }
    }

    res.json({
      success: true,
      inserted: insertedCount,
      skipped: skippedCount,
      total: products.length
    });
  } catch (error) {
    console.error('Error syncing products:', error);
    res.status(500).json({ error: 'Failed to sync products', message: error.message });
  }
});

module.exports = router;

