const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const email = require('../services/email');
const printify = require('../services/printify');

// Get all orders
router.get('/', async (req, res) => {
  try {
    const sortBy = req.query.sort || '-created_at';
    const orderBy = sortBy.startsWith('-') 
      ? `${sortBy.slice(1).replace('created_date', 'created_at')} DESC` 
      : `${sortBy.replace('created_date', 'created_at')} ASC`;
    
    const rows = await db.all(`SELECT * FROM orders ORDER BY ${orderBy}`);
    
    // Transform for frontend compatibility
    const orders = rows.map(row => ({
      ...row,
      shipping_address: row.shipping_address || {},
      created_date: row.created_at,
      payment_status: row.status, // Map status to payment_status for frontend
      total_price: row.total_amount, // Map total_amount to total_price for frontend
    }));
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Diagnostic endpoint to check email configuration (must be before /:id route)
router.get('/email-status', (req, res) => {
  res.json({
    resend_configured: email.isConfigured(),
    resend_api_key_present: !!process.env.RESEND_API_KEY,
    resend_api_key_length: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.length : 0,
    test_domain_restriction: 'onboarding@resend.dev can only send to p.a.devins@gmail.com',
    recommendation: 'For testing, use p.a.devins@gmail.com as the email address, or verify a custom domain in Resend',
  });
});

// Get single order
router.get('/:id', async (req, res) => {
  try {
    const row = await db.get('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (!row) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({
      ...row,
      shipping_address: row.shipping_address || {},
      created_date: row.created_at,
      payment_status: row.status, // Map status to payment_status for frontend
      total_price: row.total_amount, // Map total_amount to total_price for frontend
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// 🔍 DIAGNOSTIC: Get raw order data for debugging
router.get('/:id/debug', async (req, res) => {
  try {
    const order = await db.get('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get design info too
    const design = await db.get('SELECT id, title, printify_product_id, product_type, color FROM designs WHERE id = $1', [order.design_id]);
    
    // Try to get variant ID
    let variantInfo = null;
    try {
      const variantId = require('../services/printify').getVariantId(
        order.product_type || 'tshirt',
        order.size || 'M',
        order.color || 'black'
      );
      variantInfo = {
        variantId,
        lookupParams: {
          product_type: order.product_type || 'tshirt',
          size: order.size || 'M',
          color: order.color || 'black',
        }
      };
    } catch (e) {
      variantInfo = { error: e.message };
    }
    
    res.json({
      order_raw: order,
      design_info: design,
      variant_lookup: variantInfo,
      field_types: {
        design_id: typeof order.design_id,
        product_type: typeof order.product_type,
        size: typeof order.size,
        color: typeof order.color,
        status: typeof order.status,
        quantity: typeof order.quantity,
      },
      warnings: {
        missing_color: !order.color ? 'WARNING: color field is null/undefined' : null,
        missing_product_type: !order.product_type ? 'WARNING: product_type is null/undefined' : null,
        missing_size: !order.size ? 'WARNING: size is null/undefined' : null,
      }
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch debug data', message: error.message });
  }
});

// Create order
router.post('/', async (req, res) => {
  try {
    const {
      design_id,
      printify_order_id,
      stripe_payment_id,
      stripe_session_id,
      customer_email,
      customer_name,
      shipping_address = {},
      product_type = 'tshirt',
      size,
      quantity = 1,
      total_amount,
      status = 'pending',
    } = req.body;
    
    if (!design_id || !customer_email) {
      return res.status(400).json({ error: 'design_id and customer_email are required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer_email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    const result = await db.get(
      `INSERT INTO orders (
        design_id, printify_order_id, stripe_payment_id, stripe_session_id,
        customer_email, customer_name, shipping_address,
        product_type, size, quantity, total_amount, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        design_id, printify_order_id || null, stripe_payment_id || null, stripe_session_id || null,
        customer_email, customer_name || null, JSON.stringify(shipping_address),
        product_type, size || null, quantity, total_amount || null, status
      ]
    );
    
    res.status(201).json({
      ...result,
      shipping_address: result.shipping_address || {},
      created_date: result.created_at,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order
router.put('/:id', async (req, res) => {
  try {
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    const fields = {
      design_id: (v) => v,
      printify_order_id: (v) => v,
      stripe_payment_id: (v) => v,
      stripe_session_id: (v) => v,
      customer_email: (v) => v,
      customer_name: (v) => v,
      shipping_address: (v) => JSON.stringify(v),
      product_type: (v) => v,
      size: (v) => v,
      quantity: (v) => v,
      total_amount: (v) => v,
      status: (v) => v,
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
      `UPDATE orders SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    if (!result) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({
      ...result,
      shipping_address: result.shipping_address || {},
      created_date: result.created_at,
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Create free order (bypasses Stripe payment)
router.post('/free', async (req, res) => {
  try {
    const { cartItems, shippingInfo } = req.body;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    if (!shippingInfo || !shippingInfo.email) {
      return res.status(400).json({ error: 'Shipping information is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shippingInfo.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const orders = [];

    // Create an order for each cart item
    for (const item of cartItems) {
      // Extract design info - handle different cart item structures
      const designId = item.design?.id || item.design_id;
      
      // design_id is REQUIRED - if missing, skip this item
      if (!designId) {
        console.warn('Skipping cart item without design_id:', item);
        continue;
      }
      
      const productType = item.productType || item.product_type || item.design?.product_type || 'tshirt';
      const size = item.size || 'M';
      const quantity = item.quantity || 1;

      // Get design to check if it has printify_product_id
      const design = await db.get('SELECT id, printify_product_id FROM designs WHERE id = $1', [designId]);
      
      // Determine order status based on whether it can be fulfilled
      let orderStatus = 'pending_approval'; // Default to pending approval
      if (!design || !design.printify_product_id) {
        orderStatus = 'needs_fulfillment'; // Missing Printify product
      }

      const result = await db.get(
        `INSERT INTO orders (
          design_id, customer_email, customer_name, shipping_address,
          quantity, total_amount, status, stripe_session_id,
          product_type, size, color
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          designId, // REQUIRED - cannot be null
          shippingInfo.email,
          shippingInfo.name || null,
          JSON.stringify({
            line1: shippingInfo.line1,
            line2: shippingInfo.line2,
            city: shippingInfo.city,
            state: shippingInfo.state,
            postal_code: shippingInfo.postal_code,
            country: shippingInfo.country || 'US',
          }),
          quantity,
          0.00, // Free order (use number, not string)
          orderStatus, // Use pending_approval for manual approval workflow
          'free-order',
          productType,
          size,
          item.color || item.design?.color || 'black', // Add color from cart item
        ]
      );

      // Map for frontend compatibility
      orders.push({
        ...result,
        payment_status: result.status,
        total_price: result.total_amount,
      });

      // Update sales count if design_id exists
      if (designId) {
        await db.query(
          `UPDATE designs SET sales_count = sales_count + $1 WHERE id = $2`,
          [quantity, designId]
        );
      }
    }

    console.log('✅ Successfully created', orders.length, 'free order(s)');
    
    // Send order confirmation email
    if (orders.length > 0 && email.isConfigured()) {
      // Prepare order items for email
      const emailItems = cartItems.map(item => ({
        title: item.design?.title || 'Product',
        productType: item.productType || item.product_type || item.design?.product_type || 'tshirt',
        color: item.color || item.design?.selectedColor || 'black',
        size: item.size || 'M',
        quantity: item.quantity || 1,
        price: '0.00',
      }));

      // Send email (async, don't block response)
      email.sendOrderConfirmation({
        customerEmail: shippingInfo.email,
        customerName: shippingInfo.name || 'Customer',
        orderId: orders[0].id,
        orderItems: emailItems,
        shippingAddress: {
          line1: shippingInfo.line1,
          line2: shippingInfo.line2 || '',
          city: shippingInfo.city,
          state: shippingInfo.state,
          postal_code: shippingInfo.postal_code,
          country: shippingInfo.country || 'US',
        },
        totalAmount: '0.00',
        discountCode: 'FREE',
      }).catch(err => {
        console.error('⚠️ Failed to send free order confirmation email (non-blocking):', err.message);
      });
    }
    
    res.json({ 
      success: true, 
      orders,
      message: `Successfully created ${orders.length} free order(s)`
    });
  } catch (error) {
    console.error('❌ Error creating free order:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to create free order', details: error.message });
  }
});

// Approve order and send to Printify for fulfillment
router.post('/:id/approve-and-ship', async (req, res) => {
  try {
    const orderId = req.params.id;
    
    console.log(`\n========================================`);
    console.log(`🔍 MANUAL ORDER APPROVAL REQUEST`);
    console.log(`   Order ID: ${orderId}`);
    console.log(`========================================\n`);
    
    // Get order from database
    const order = await db.get('SELECT * FROM orders WHERE id = $1', [orderId]);
    
    if (!order) {
      console.error(`❌ Order not found: ${orderId}`);
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // 🔍 LOG ALL ORDER DATA
    console.log(`📋 FULL ORDER DATA:`);
    console.log(JSON.stringify(order, null, 2));
    console.log(`\n🎯 KEY FIELDS:`);
    console.log(`   design_id: "${order.design_id}" (type: ${typeof order.design_id})`);
    console.log(`   product_type: "${order.product_type}" (type: ${typeof order.product_type})`);
    console.log(`   size: "${order.size}" (type: ${typeof order.size})`);
    console.log(`   color: "${order.color}" (type: ${typeof order.color})`);
    console.log(`   status: "${order.status}" (type: ${typeof order.status})`);
    console.log(`   quantity: "${order.quantity}" (type: ${typeof order.quantity})`);
    
    // Check if order is in correct status
    if (order.status !== 'pending_approval' && order.status !== 'paid' && order.status !== 'payment_received' && order.status !== 'printify_error') {
      console.log(`⚠️ Order ${orderId} status is "${order.status}" - not pending approval`);
      return res.status(400).json({ 
        error: 'Order not pending approval', 
        currentStatus: order.status,
        message: 'Only orders with status "pending_approval", "paid", "payment_received", or "printify_error" can be approved'
      });
    }
    
    // Get design to retrieve printify_product_id
    const design = await db.get('SELECT id, title, printify_product_id FROM designs WHERE id = $1', [order.design_id]);
    
    if (!design) {
      return res.status(404).json({ error: 'Design not found for this order' });
    }
    
    if (!design.printify_product_id) {
      console.error(`❌ Design "${design.title}" (${design.id}) has no printify_product_id`);
      return res.status(400).json({ 
        error: 'Cannot send to Printify', 
        message: 'Design does not have a Printify product ID'
      });
    }
    
    // Parse shipping address
    const shippingAddress = typeof order.shipping_address === 'string' 
      ? JSON.parse(order.shipping_address) 
      : order.shipping_address;
    
    if (!shippingAddress?.line1) {
      return res.status(400).json({ 
        error: 'Cannot send to Printify', 
        message: 'Order is missing shipping address'
      });
    }
    
    console.log(`📦 Sending order to Printify...`);
    console.log(`   Design: ${design.title} (${design.id})`);
    console.log(`   Printify Product ID: ${design.printify_product_id}`);
    console.log(`   Product Type: ${order.product_type || 'tshirt'}`);
    console.log(`   Color: ${order.color || 'black'}`);
    console.log(`   Size: ${order.size || 'M'}`);
    console.log(`   Quantity: ${order.quantity || 1}`);
    console.log(`   Customer: ${order.customer_name} (${order.customer_email})`);
    
    // Get the correct variant ID from the actual Printify product (not hardcoded)
    let variantId;
    try {
      variantId = await printify.getProductVariantId(
        design.printify_product_id,
        order.size || 'M',
        order.color || 'black'
      );
      console.log(`✅ Retrieved variant ID from Printify product: ${variantId}`);
    } catch (variantError) {
      console.error(`❌ Failed to get variant ID from Printify product:`, variantError.message);
      return res.status(400).json({
        error: 'Cannot determine product variant',
        message: `Unable to find a matching variant for size ${order.size} and color ${order.color}. ${variantError.message}`
      });
    }
    
    // Send order to Printify
    try {
      const printifyOrder = await printify.createOrder({
        productId: design.printify_product_id,
        variantId: variantId,
        quantity: order.quantity || 1,
        shippingAddress: {
          name: order.customer_name || 'Customer',
          email: order.customer_email,
          phone: shippingAddress.phone || '',
          line1: shippingAddress.line1,
          line2: shippingAddress.line2 || '',
          city: shippingAddress.city,
          state: shippingAddress.state,
          postal_code: shippingAddress.postal_code,
          country: shippingAddress.country || 'US',
        },
        externalId: orderId,
      });
      
      // Update order with Printify order ID and status
      await db.query(
        `UPDATE orders SET 
          printify_order_id = $1,
          status = 'processing'
         WHERE id = $2`,
        [printifyOrder.id, orderId]
      );
      
      console.log(`\n✅ ORDER APPROVED AND SENT TO PRINTIFY`);
      console.log(`   Order ID: ${orderId}`);
      console.log(`   Printify Order ID: ${printifyOrder.id}`);
      console.log(`   Status updated to: processing`);
      console.log(`========================================\n`);
      
      res.json({ 
        success: true, 
        printify_order_id: printifyOrder.id,
        status: 'processing',
        message: 'Order approved and sent to Printify for fulfillment'
      });
    } catch (printifyError) {
      console.error(`\n❌ ERROR SENDING ORDER TO PRINTIFY`);
      console.error('   Error:', printifyError.message);
      console.error('   Stack:', printifyError.stack);
      console.error(`========================================\n`);
      
      // Update order status to indicate error
      await db.query(
        `UPDATE orders SET status = 'printify_error' WHERE id = $1`,
        [orderId]
      );
      
      res.status(500).json({ 
        error: 'Failed to send order to Printify', 
        message: printifyError.message,
        details: 'Order status updated to "printify_error". Please check Printify configuration and try again.'
      });
    }
  } catch (error) {
    console.error('Error approving order:', error);
    res.status(500).json({ error: 'Failed to approve order', message: error.message });
  }
});

// Delete order
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

module.exports = router;
