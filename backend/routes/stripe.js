const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const db = require('../db/postgres');
const printify = require('../services/printify');

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
    const lineItems = cartItems.map((item) => {
      // Extract product type and color from cart item structure
      const productType = item.productType || item.design?.product_type || 'tshirt';
      const color = item.color || item.design?.selectedColor || 'black';
      
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.design.title,
            description: `${productType} - ${color} - ${item.size}`,
            images: [item.design.mockup_urls?.[0] || item.design.design_image_url],
          },
          unit_amount: Math.round(parseFloat(item.design.price) * 100), // Convert to cents
        },
        quantity: item.quantity,
      };
    });

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
        shipping_line1: shippingInfo.line1,
        shipping_line2: shippingInfo.line2 || '',
        shipping_city: shippingInfo.city,
        shipping_state: shippingInfo.state,
        shipping_postal_code: shippingInfo.postal_code,
        shipping_country: shippingInfo.country || 'US',
        order_count: cartItems.length.toString(),
        discount_code: discountCode || 'none',
        design_ids: cartItems.map(item => item.design?.id || '').filter(Boolean).join(','), // Comma-separated design IDs
        product_types: cartItems.map(item => item.productType || item.design?.product_type || 'tshirt').join(','), // Comma-separated product types
        sizes: cartItems.map(item => item.size || 'M').join(','), // Comma-separated sizes
        colors: cartItems.map(item => item.color || item.design?.selectedColor || 'black').join(','), // Comma-separated colors
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

// NOTE: The webhook handler has been moved to a separate file (stripe-webhook.js)
// and is registered directly in server.js BEFORE express.json() middleware
// This ensures the raw request body is preserved for Stripe signature verification
// 
// The webhook route is: POST /api/stripe/webhook
// See: backend/routes/stripe-webhook.js for the handler implementation

// OLD WEBHOOK HANDLER - DEPRECATED (kept for reference)
// The webhook is now handled by stripe-webhook.js and registered in server.js
/*
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  // Comprehensive logging for debugging
  console.log('🔔 WEBHOOK RECEIVED');
  console.log('   Headers:', {
    'stripe-signature': sig ? 'present' : 'missing',
    'content-type': req.headers['content-type'],
    'content-length': req.headers['content-length'],
  });
  console.log('   Webhook Secret configured:', webhookSecret ? 'YES' : 'NO');
  console.log('   Body type:', typeof req.body);
  console.log('   Body length:', req.body?.length || 0);

  // Check if webhook secret is configured
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET is not configured!');
    console.error('   Please set STRIPE_WEBHOOK_SECRET in your environment variables');
    return res.status(500).json({ 
      error: 'Webhook secret not configured',
      message: 'STRIPE_WEBHOOK_SECRET environment variable is missing'
    });
  }

  // Check if signature is present
  if (!sig) {
    console.error('❌ Stripe signature header is missing!');
    return res.status(400).json({ 
      error: 'Missing stripe-signature header',
      message: 'Webhook signature verification failed: no signature header'
    });
  }

  let event;

  try {
    // Ensure body is a Buffer for signature verification
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
    
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    console.log('✅ Webhook signature verified successfully');
    console.log('   Event type:', event.type);
    console.log('   Event ID:', event.id);
  } catch (err) {
    console.error('❌ WEBHOOK SIGNATURE VERIFICATION FAILED');
    console.error('   Error message:', err.message);
    console.error('   Error type:', err.type);
    console.error('   Signature provided:', sig ? 'YES' : 'NO');
    console.error('   Webhook secret length:', webhookSecret?.length || 0);
    
    // Log more details for debugging
    if (err.type === 'StripeSignatureVerificationError') {
      console.error('   This usually means:');
      console.error('     1. STRIPE_WEBHOOK_SECRET is incorrect');
      console.error('     2. The request body was modified before reaching webhook');
      console.error('     3. The webhook secret doesn\'t match the one in Stripe dashboard');
    }
    
    return res.status(400).json({ 
      error: 'Webhook signature verification failed',
      message: err.message,
      type: err.type
    });
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      console.log('🔔 Webhook received: checkout.session.completed for session:', session.id);
      
      // IMPORTANT: Verify payment status before proceeding
      // checkout.session.completed only fires on successful payment, but let's verify explicitly
      if (session.payment_status !== 'paid') {
        console.warn(`⚠️ Payment status is "${session.payment_status}", not "paid". Skipping order creation.`);
        return res.json({ received: true, message: 'Payment not completed' });
      }
      
      console.log(`✅ Payment verified as paid. Amount: $${(session.amount_total / 100).toFixed(2)}`);
      
      // Retrieve the full session with line items
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items', 'line_items.data.price.product', 'customer', 'payment_intent'],
      });
      
      // Double-check payment intent status if available
      if (fullSession.payment_intent) {
        const paymentIntent = typeof fullSession.payment_intent === 'string' 
          ? await stripe.paymentIntents.retrieve(fullSession.payment_intent)
          : fullSession.payment_intent;
          
        if (paymentIntent.status !== 'succeeded') {
          console.warn(`⚠️ Payment Intent status is "${paymentIntent.status}", not "succeeded". Skipping order creation.`);
          return res.json({ received: true, message: 'Payment intent not succeeded' });
        }
        
        console.log(`✅ Payment Intent verified as succeeded: ${paymentIntent.id}`);
      }

      const lineItems = fullSession.line_items.data;
      const shippingDetails = fullSession.shipping_details || fullSession.customer_details;
      
      // Optionally create or retrieve Stripe Customer for better tracking
      let stripeCustomerId = fullSession.customer;
      if (!stripeCustomerId && fullSession.customer_details?.email) {
        try {
          // Try to find existing customer
          const existingCustomers = await stripe.customers.list({
            email: fullSession.customer_details.email,
            limit: 1,
          });
          
          if (existingCustomers.data.length > 0) {
            stripeCustomerId = existingCustomers.data[0].id;
          } else {
            // Create new customer
            const customer = await stripe.customers.create({
              email: fullSession.customer_details.email,
              name: fullSession.customer_details.name,
              metadata: {
                source: 'knockout_merch_webhook',
              },
            });
            stripeCustomerId = customer.id;
            console.log(`👤 Created Stripe Customer: ${stripeCustomerId}`);
          }
        } catch (customerError) {
          console.warn('⚠️ Could not create/retrieve Stripe customer:', customerError.message);
          // Continue even if customer creation fails
        }
      }
      
      console.log('📦 Line items:', lineItems.length);
      console.log('🔑 Metadata:', session.metadata);
      
      // Get design IDs and product info from metadata
      const designIds = session.metadata?.design_ids ? session.metadata.design_ids.split(',') : [];
      const productTypes = session.metadata?.product_types ? session.metadata.product_types.split(',') : [];
      const sizes = session.metadata?.sizes ? session.metadata.sizes.split(',') : [];
      const colors = session.metadata?.colors ? session.metadata.colors.split(',') : [];
      
      console.log('🎨 Design IDs from metadata:', designIds);
      console.log('📦 Product types from metadata:', productTypes);
      console.log('📏 Sizes from metadata:', sizes);
      
      // Get the total amount paid (after discounts)
      const totalPaid = (fullSession.amount_total / 100).toFixed(2);
      const discountCode = session.metadata?.discount_code || 'none';
      
      console.log(`💰 Total paid (after discount): $${totalPaid}`);
      console.log(`🎫 Discount code used: ${discountCode}`);
      
      // Count non-shipping items to divide total
      const productItems = lineItems.filter(item => 
        !(item.description && item.description.includes('Shipping'))
      );
      console.log('🛍️ Product items:', productItems.length);
      
      const itemCount = productItems.reduce((sum, item) => sum + item.quantity, 0);
      // Calculate price per item (splits total across items if multiple items with discount)
      const pricePerItem = itemCount > 0 ? (parseFloat(totalPaid) / itemCount).toFixed(2) : totalPaid;
      
      if (itemCount > 1) {
        console.log(`📊 Splitting $${totalPaid} across ${itemCount} item(s): $${pricePerItem} per item`);
      }

      // Create orders in database for each item (excluding shipping)
      let ordersCreated = 0;
      for (let i = 0; i < productItems.length; i++) {
        const item = productItems[i];
        
        // Get product info from metadata (preferred) or parse from description (fallback)
        let productType = productTypes[i] || 'tshirt';
        let size = sizes[i] || 'M';
        
        // Fallback: Parse product info from description if metadata not available
        if (!productTypes[i] || !sizes[i]) {
          const description = item.description || '';
          const matches = description.match(/(.+) - (.+) - (.+)/);
          
          if (matches) {
            productType = matches[1].toLowerCase();
            size = matches[3];
          }
        }

        // Get design_id from metadata array (in same order as line items)
        const designId = designIds[i] || null;

        // If we can't find design_id, skip this order
        if (!designId) {
          console.warn('⚠️ Skipping order creation - no design_id for item:', item.description);
          console.warn('   Available design IDs:', designIds);
          console.warn('   Item index:', i);
          continue;
        }

        console.log(`📝 Creating order ${i + 1}/${productItems.length}: design_id=${designId}, quantity=${item.quantity}`);
        console.log(`   Amount to store: $${pricePerItem} (from total $${totalPaid} after ${discountCode} discount)`);

        // Get the payment intent ID if available
        const paymentIntentId = fullSession.payment_intent || null;
        
        // Get design info to retrieve printify_product_id
        const design = await db.get('SELECT id, title, printify_product_id FROM designs WHERE id = $1', [designId]);
        
        if (!design) {
          console.error(`❌ Design not found: ${designId}`);
          continue;
        }
        
        // Create order in database with status 'paid' - payment has been verified above
        const orderResult = await db.get(
          `INSERT INTO orders 
           (design_id, customer_email, customer_name, shipping_address, 
            quantity, total_amount, status, stripe_session_id, stripe_payment_id,
            product_type, size)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id`,
          [
            designId,
            session.customer_details?.email || shippingDetails?.email,
            session.customer_details?.name || shippingDetails?.name,
            JSON.stringify(shippingDetails?.address || {}),
            item.quantity,
            parseFloat(pricePerItem),
            'paid', // Status is 'paid' because payment was verified above
            session.id,
            paymentIntentId,
            productType,
            size,
          ]
        );
        
        console.log(`✅ Order created in database with status 'paid': ${orderResult.id}`);
        
        const orderId = orderResult.id;
        ordersCreated++;
        
        // Update sales count
        await db.query(
          `UPDATE designs SET sales_count = sales_count + $1 WHERE id = $2`,
          [item.quantity, designId]
        );
        
        // Send order to Printify for fulfillment
        if (!design.printify_product_id) {
          console.warn(`⚠️ Order ${orderId} cannot be sent to Printify - design "${design.title}" (${designId}) has no printify_product_id`);
          console.warn(`   The order was created in the database but needs to be sent to Printify manually`);
          // Order is created but needs manual intervention to add printify_product_id
          await db.query(
            `UPDATE orders SET status = 'needs_fulfillment' WHERE id = $1`,
            [orderId]
          );
        } else if (!shippingDetails?.address) {
          console.warn(`⚠️ Order ${orderId} cannot be sent to Printify - missing shipping address`);
          await db.query(
            `UPDATE orders SET status = 'needs_fulfillment' WHERE id = $1`,
            [orderId]
          );
        } else {
          try {
            console.log(`📦 Sending order ${orderId} to Printify for fulfillment...`);
            console.log(`   Design: ${design.title} (${designId})`);
            console.log(`   Printify Product ID: ${design.printify_product_id}`);
            
            const customerName = session.customer_details?.name || shippingDetails?.name || '';
            const customerEmail = session.customer_details?.email || shippingDetails?.email || '';
            
            const printifyOrder = await printify.createOrder({
              productId: design.printify_product_id,
              variantId: printify.getVariantId(productType, size),
              quantity: item.quantity,
              shippingAddress: {
                name: customerName,
                email: customerEmail,
                phone: session.customer_details?.phone || '',
                line1: shippingDetails.address?.line1 || shippingDetails.address?.street,
                line2: shippingDetails.address?.line2 || '',
                city: shippingDetails.address?.city || '',
                state: shippingDetails.address?.state || '',
                postal_code: shippingDetails.address?.postal_code || shippingDetails.address?.zip || '',
                country: shippingDetails.address?.country || 'US',
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
            
            console.log(`✅ Order ${orderId} sent to Printify: ${printifyOrder.id}`);
          } catch (printifyError) {
            console.error(`❌ Error sending order ${orderId} to Printify:`, printifyError);
            console.error(`   Error details:`, printifyError.message);
            // Don't fail the whole webhook if Printify fails - order is still created in DB
            // You can retry manually or set up a retry queue
            await db.query(
              `UPDATE orders SET status = 'payment_received' WHERE id = $1`,
              [orderId]
            );
          }
        }
      }

      console.log(`✅ Created ${ordersCreated} order(s) for session: ${session.id}`);
    } catch (error) {
      console.error('❌ Error creating order:', error);
      console.error('Error stack:', error.stack);
    }
  }

  // Also handle payment_intent.succeeded as a backup verification
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    console.log(`💰 Payment Intent succeeded: ${paymentIntent.id}`);
    
    // Find orders with this payment_intent_id and ensure they're marked as paid
    try {
      const result = await db.query(
        `UPDATE orders 
         SET status = 'paid'
         WHERE stripe_payment_id = $1 AND status != 'paid'`,
        [paymentIntent.id]
      );
      
      if (result.rowCount > 0) {
        console.log(`✅ Updated ${result.rowCount} order(s) to 'paid' status for payment intent: ${paymentIntent.id}`);
      }
    } catch (error) {
      console.error('Error updating order status from payment_intent.succeeded:', error);
    }
  }

  res.json({ received: true });
});
*/

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

// Webhook configuration diagnostic endpoint
router.get('/webhook-config', async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  res.json({
    configured: {
      stripe_secret_key: !!process.env.STRIPE_SECRET_KEY,
      stripe_webhook_secret: !!webhookSecret,
    },
    webhook_secret_length: webhookSecret?.length || 0,
    webhook_secret_preview: webhookSecret ? `${webhookSecret.substring(0, 10)}...` : 'Not configured',
    expected_webhook_url: `${process.env.FRONTEND_URL || 'http://localhost:8000'}/api/stripe/webhook`,
    instructions: [
      '1. In Stripe Dashboard, go to Developers > Webhooks',
      '2. Click "Add endpoint"',
      `3. Enter your webhook URL: ${process.env.FRONTEND_URL || 'YOUR_BACKEND_URL'}/api/stripe/webhook`,
      '4. Select events: checkout.session.completed, payment_intent.succeeded',
      '5. Copy the "Signing secret" (starts with whsec_)',
      '6. Set it as STRIPE_WEBHOOK_SECRET in your environment variables',
      '7. Restart your server',
    ],
    notes: [
      'The webhook endpoint MUST be registered BEFORE express.json() middleware',
      'This is done in server.js to preserve the raw request body',
      'The raw body is required for Stripe signature verification',
    ],
  });
});

module.exports = router;

