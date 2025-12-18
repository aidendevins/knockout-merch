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
