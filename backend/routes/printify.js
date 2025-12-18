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
      return res.json([{ id: 'mock-shop', name: 'KO Merch (Development)' }]);
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
      product_type = 'tshirt',
      canvas_data = {},
      design_id 
    } = req.body;

    if (!design_image_url) {
      return res.status(400).json({ error: 'Design image URL is required' });
    }

    if (!printify.isConfigured()) {
      // Return mock response for development
      const mockProduct = {
        id: `mock-${Date.now()}`,
        printify_product_id: `mock-${Date.now()}`,
        title: title || 'KO Merch Design',
        mockup_urls: [
          'https://via.placeholder.com/800x800/1a1a1a/DC2626?text=T-Shirt+Front',
          'https://via.placeholder.com/800x800/1a1a1a/DC2626?text=T-Shirt+Back',
        ],
        product_type,
        is_mock: true,
      };

      // Update design with mockup URLs if design_id provided
      if (design_id) {
        await db.run(
          `UPDATE designs SET 
            mockup_urls = ?, 
            printify_product_id = ?,
            updated_date = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [JSON.stringify(mockProduct.mockup_urls), mockProduct.printify_product_id, design_id]
        );
      }

      return res.json(mockProduct);
    }

    // Create product on Printify
    const product = await printify.createProduct({
      title: title || 'KO Merch Design',
      description,
      imageUrl: design_image_url,
      productType: product_type,
      canvasData: canvas_data,
    });

    // Get mockups
    const mockupUrls = await printify.getProductMockups(product.id);

    // Update design with Printify product ID and mockups
    if (design_id) {
      await db.run(
        `UPDATE designs SET 
          mockup_urls = ?, 
          printify_product_id = ?,
          updated_date = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [JSON.stringify(mockupUrls), product.id, design_id]
      );
    }

    res.json({
      ...product,
      mockup_urls: mockupUrls,
      is_mock: false,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product', message: error.message });
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
      product_type = 'tshirt'
    } = req.body;

    if (!product_id || !size || !shipping_address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get variant ID for the size
    const variantId = printify.getVariantId(product_type, size);
    if (!variantId && printify.isConfigured()) {
      return res.status(400).json({ error: `Invalid size: ${size}` });
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
        await db.run(
          `UPDATE orders SET 
            printify_order_id = ?,
            status = 'processing',
            updated_date = CURRENT_TIMESTAMP
          WHERE id = ?`,
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
      await db.run(
        `UPDATE orders SET 
          printify_order_id = ?,
          status = 'processing',
          updated_date = CURRENT_TIMESTAMP
        WHERE id = ?`,
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

module.exports = router;

