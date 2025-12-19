const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const db = require('../db/postgres');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Helper function to get or create a coupon
async function getOrCreateCoupon(code, config) {
  try {
    // Try to retrieve existing coupon
    const coupon = await stripe.coupons.retrieve(code);
    return coupon.id;
  } catch (error) {
    // Coupon doesn't exist, create it
    try {
      const newCoupon = await stripe.coupons.create({
        id: code,
        name: code,
        ...config,
      });
      return newCoupon.id;
    } catch (createError) {
      console.error('Error creating coupon:', createError);
      throw createError;
    }
  }
}

// Create Checkout Session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { cartItems, shippingInfo, discountCode } = req.body;

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

    // Handle discount codes
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout`,
      customer_email: shippingInfo.email,
      metadata: {
        shipping_name: shippingInfo.name,
        shipping_email: shippingInfo.email,
        order_count: cartItems.length.toString(),
        discount_code: discountCode || 'none',
      },
    };

    // Apply discount if provided
    if (discountCode) {
      const code = discountCode.toUpperCase();
      
      if (code === 'KNOCKOUT10') {
        // Create or retrieve coupon for 10% off
        sessionConfig.discounts = [{
          coupon: await getOrCreateCoupon('KNOCKOUT10', { percent_off: 10 }),
        }];
      } else if (code === 'TEST99') {
        // For TEST99, create a coupon that makes total $0.50
        // Calculate total before discount
        const subtotal = cartItems.reduce((sum, item) => 
          sum + (parseFloat(item.design.price) * item.quantity), 0
        );
        const total = subtotal + shippingCost;
        const discountAmount = Math.max(0, total - 0.50); // Discount to make it $0.50
        
        // Use a unique coupon ID to avoid conflicts with old coupons
        const couponId = 'TEST99_V2_50';
        sessionConfig.discounts = [{
          coupon: await getOrCreateCoupon(couponId, { 
            amount_off: Math.round(discountAmount * 100), // In cents
            currency: 'usd'
          }),
        }];
      } else if (code === 'FREE') {
        // For FREE, create a coupon that makes total $0.50 (Stripe minimum)
        // Calculate total before discount
        const subtotal = cartItems.reduce((sum, item) => 
          sum + (parseFloat(item.design.price) * item.quantity), 0
        );
        const total = subtotal + shippingCost;
        const discountAmount = Math.max(0, total - 0.50); // Discount to make it $0.50
        
        // Use a unique coupon ID
        const couponId = 'FREE_V1_50';
        sessionConfig.discounts = [{
          coupon: await getOrCreateCoupon(couponId, { 
            amount_off: Math.round(discountAmount * 100), // In cents
            currency: 'usd'
          }),
        }];
      }
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);

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
      // Retrieve the full session with line items
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items', 'line_items.data.price.product'],
      });

      const lineItems = fullSession.line_items.data;
      const shippingDetails = fullSession.shipping_details || fullSession.customer_details;
      
      // Get the total amount paid (after discounts)
      const totalPaid = (fullSession.amount_total / 100).toFixed(2);
      
      // Count non-shipping items to divide total
      const productItems = lineItems.filter(item => 
        !(item.description && item.description.includes('Shipping'))
      );
      const itemCount = productItems.reduce((sum, item) => sum + item.quantity, 0);
      const pricePerItem = itemCount > 0 ? (parseFloat(totalPaid) / itemCount).toFixed(2) : totalPaid;

      // Create orders in database for each item (excluding shipping)
      for (const item of productItems) {
        // Parse product info from description
        const description = item.description || '';
        const matches = description.match(/(.+) - (.+) - (.+)/);
        
        let productType = 'tshirt';
        let color = 'Black';
        let size = 'M';
        
        if (matches) {
          productType = matches[1].toLowerCase();
          color = matches[2];
          size = matches[3];
        }

        await db.query(
          `INSERT INTO orders 
           (customer_email, customer_name, shipping_address, 
            quantity, total_price, payment_status, stripe_session_id, 
            product_type, size, color)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            session.customer_details?.email || shippingDetails?.email,
            session.customer_details?.name || shippingDetails?.name,
            JSON.stringify(shippingDetails?.address || {}),
            item.quantity,
            pricePerItem, // Use calculated price per item
            'paid',
            session.id,
            productType,
            size,
            color,
          ]
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

