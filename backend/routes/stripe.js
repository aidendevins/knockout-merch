const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const db = require('../db/postgres');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create Checkout Session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { cartItems, shippingInfo } = req.body;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Calculate shipping
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const shippingCost = 4.75 + (totalQuantity - 1) * 2.50;

    // Create line items for Stripe
    const lineItems = cartItems.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.design.title,
          description: `${item.productType} - ${item.color} - ${item.size}`,
          images: [item.design.mockup_urls?.[0] || item.design.design_image_url],
        },
        unit_amount: Math.round(parseFloat(item.design.price) * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Add shipping as a line item
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Shipping',
          description: `US Shipping (${totalQuantity} item${totalQuantity > 1 ? 's' : ''})`,
        },
        unit_amount: Math.round(shippingCost * 100), // Convert to cents
      },
      quantity: 1,
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout`,
      metadata: {
        cartItems: JSON.stringify(cartItems),
        shippingInfo: JSON.stringify(shippingInfo),
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook to handle successful payments
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      const cartItems = JSON.parse(session.metadata.cartItems);
      const shippingInfo = JSON.parse(session.metadata.shippingInfo);

      // Create orders in database
      for (const item of cartItems) {
        await db.query(
          `INSERT INTO orders 
           (design_id, customer_email, customer_name, shipping_address, 
            quantity, total_price, payment_status, stripe_session_id, 
            product_type, size, color)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            item.design.id,
            session.customer_details.email,
            session.customer_details.name,
            JSON.stringify(shippingInfo),
            item.quantity,
            parseFloat(item.design.price) * item.quantity,
            'paid',
            session.id,
            item.productType,
            item.size,
            item.color,
          ]
        );

        // Update sales count
        await db.query(
          `UPDATE designs SET sales_count = sales_count + $1 WHERE id = $2`,
          [item.quantity, item.design.id]
        );
      }

      console.log('✅ Order created for session:', session.id);
    } catch (error) {
      console.error('Error creating order:', error);
    }
  }

  res.json({ received: true });
});

// Get session details
router.get('/session/:sessionId', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    res.json(session);
  } catch (error) {
    console.error('Error retrieving session:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

