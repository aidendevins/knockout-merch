const express = require('express');
const router = express.Router();
const db = require('../db/postgres');

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

      const result = await db.get(
        `INSERT INTO orders (
          design_id, customer_email, customer_name, shipping_address,
          quantity, total_amount, status, stripe_session_id,
          product_type, size
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
          'paid', // Mark as paid since it's free
          'free-order',
          productType,
          size,
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
