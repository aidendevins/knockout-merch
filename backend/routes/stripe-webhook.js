const Stripe = require('stripe');
const db = require('../db/postgres');
const printify = require('../services/printify');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Stripe Webhook Handler
 * This handler processes Stripe webhook events, specifically checkout.session.completed
 * It must receive the raw request body for signature verification
 */
async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  // Comprehensive logging for debugging
  const timestamp = new Date().toISOString();
  console.log('\n========================================');
  console.log('🔔 WEBHOOK RECEIVED');
  console.log('   Timestamp:', timestamp);
  console.log('   Headers:', {
    'stripe-signature': sig ? `present (${sig.substring(0, 20)}...)` : 'missing',
    'content-type': req.headers['content-type'],
    'content-length': req.headers['content-length'],
    'user-agent': req.headers['user-agent'],
  });
  console.log('   Webhook Secret configured:', webhookSecret ? `YES (${webhookSecret.substring(0, 10)}...)` : 'NO');
  console.log('   Body type:', typeof req.body);
  console.log('   Body is Buffer:', Buffer.isBuffer(req.body));
  console.log('   Body length:', req.body?.length || 0);
  console.log('========================================\n');

  // Check if webhook secret is configured
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET is not configured!');
    console.error('   Please set STRIPE_WEBHOOK_SECRET in your environment variables');
    return res.status(500).json({ 
      error: 'Webhook secret not configured',
      message: 'STRIPE_WEBHOOK_SECRET environment variable is missing',
      timestamp
    });
  }

  // Check if signature is present
  if (!sig) {
    console.error('❌ Stripe signature header is missing!');
    return res.status(400).json({ 
      error: 'Missing stripe-signature header',
      message: 'Webhook signature verification failed: no signature header',
      timestamp
    });
  }

  let event;

  try {
    // CRITICAL: Body MUST be a Buffer for signature verification
    // express.raw() middleware should have already converted it to a Buffer
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
    
    console.log('🔐 Attempting signature verification...');
    console.log('   Body type:', typeof body);
    console.log('   Body is Buffer:', Buffer.isBuffer(body));
    console.log('   Body length:', body.length);
    
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    
    console.log('\n========================================');
    console.log('✅ WEBHOOK SIGNATURE VERIFIED SUCCESSFULLY');
    console.log('   Event type:', event.type);
    console.log('   Event ID:', event.id);
    console.log('========================================\n');
  } catch (err) {
    console.error('\n========================================');
    console.error('❌ WEBHOOK SIGNATURE VERIFICATION FAILED');
    console.error('   Error message:', err.message);
    console.error('   Error type:', err.type);
    console.error('   Signature provided:', sig ? 'YES' : 'NO');
    console.error('   Webhook secret length:', webhookSecret?.length || 0);
    console.error('   Body type received:', typeof req.body);
    console.error('   Body is Buffer:', Buffer.isBuffer(req.body));
    
    // Log more details for debugging
    if (err.type === 'StripeSignatureVerificationError') {
      console.error('\n   This usually means:');
      console.error('     1. STRIPE_WEBHOOK_SECRET is incorrect');
      console.error('     2. The request body was modified before reaching webhook');
      console.error('     3. The webhook secret doesn\'t match the one in Stripe dashboard');
      console.error('     4. express.json() middleware was applied before webhook route');
      console.error('     5. Body was parsed as JSON instead of kept as raw Buffer');
    }
    console.error('========================================\n');
    
    return res.status(400).json({ 
      error: 'Webhook signature verification failed',
      message: err.message,
      type: err.type,
      timestamp
    });
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      console.log('\n========================================');
      console.log('🔔 PROCESSING checkout.session.completed');
      console.log('   Session ID:', session.id);
      console.log('   Customer:', session.customer_details?.name || session.customer_details?.email || 'N/A');
      console.log('   Amount Total:', session.amount_total ? `$${(session.amount_total / 100).toFixed(2)}` : 'N/A');
      console.log('   Payment Status:', session.payment_status || 'N/A');
      console.log('   Metadata:', JSON.stringify(session.metadata || {}, null, 2));
      console.log('========================================\n');
      
      // IMPORTANT: Verify payment status before proceeding
      if (session.payment_status !== 'paid') {
        console.warn(`⚠️ Payment status is "${session.payment_status}", not "paid". Skipping order creation.`);
        return res.json({ received: true, message: 'Payment not completed', event: event.type });
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
          return res.json({ received: true, message: 'Payment intent not succeeded', event: event.type });
        }
        
        console.log(`✅ Payment Intent verified as succeeded: ${paymentIntent.id}`);
      }

      const lineItems = fullSession.line_items.data;
      const shippingDetails = fullSession.shipping_details || fullSession.customer_details;
      
      console.log('📦 Line items:', lineItems.length);
      console.log('🔑 Metadata:', JSON.stringify(session.metadata || {}, null, 2));
      
      // Get design IDs and product info from metadata
      const designIds = session.metadata?.design_ids ? session.metadata.design_ids.split(',').filter(Boolean) : [];
      const productTypes = session.metadata?.product_types ? session.metadata.product_types.split(',').filter(Boolean) : [];
      const sizes = session.metadata?.sizes ? session.metadata.sizes.split(',').filter(Boolean) : [];
      const colors = session.metadata?.colors ? session.metadata.colors.split(',').filter(Boolean) : [];
      
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
      const orderIds = [];
      
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
          console.warn('\n⚠️ SKIPPING ORDER CREATION - NO DESIGN_ID');
          console.warn('   Item description:', item.description);
          console.warn('   Available design IDs:', designIds);
          console.warn('   Item index:', i);
          console.warn('   Total items:', productItems.length);
          continue;
        }

        console.log(`\n📝 Creating order ${i + 1}/${productItems.length}`);
        console.log(`   Design ID: ${designId}`);
        console.log(`   Quantity: ${item.quantity}`);
        console.log(`   Product Type: ${productType}`);
        console.log(`   Size: ${size}`);
        console.log(`   Amount: $${pricePerItem} (from total $${totalPaid} after ${discountCode} discount)`);

        // Get the payment intent ID if available (handle both string ID and expanded object)
        const paymentIntentId = typeof fullSession.payment_intent === 'string' 
          ? fullSession.payment_intent 
          : fullSession.payment_intent?.id || null;
        
        // Get design info to retrieve printify_product_id
        const design = await db.get('SELECT id, title, printify_product_id FROM designs WHERE id = $1', [designId]);
        
        if (!design) {
          console.error(`\n❌ DESIGN NOT FOUND: ${designId}`);
          console.error('   Skipping order creation for this item');
          continue;
        }
        
        console.log(`   Design found: "${design.title}"`);
        console.log(`   Printify Product ID: ${design.printify_product_id || 'N/A'}`);
        
        // Get customer info
        // Prioritize metadata (form data) over customer_details (saved payment method data)
        const customerEmail = session.metadata?.shipping_email || session.customer_details?.email;
        const customerName = session.metadata?.shipping_name || session.customer_details?.name || 'Test Devins';
        
        // Build shipping address from metadata (preferred) or Stripe's shipping_details (fallback)
        const shippingAddress = session.metadata?.shipping_line1 ? {
          line1: session.metadata.shipping_line1,
          line2: session.metadata.shipping_line2 || '',
          city: session.metadata.shipping_city,
          state: session.metadata.shipping_state,
          postal_code: session.metadata.shipping_postal_code,
          country: session.metadata.shipping_country || 'US',
        } : (shippingDetails?.address || {});
        
        console.log(`   Customer: ${customerName} (${customerEmail})`);
        console.log(`   Shipping: ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postal_code}`);
        
        // Create order in database with status 'paid' - payment has been verified above
        try {
          const orderResult = await db.get(
            `INSERT INTO orders 
             (design_id, customer_email, customer_name, shipping_address, 
              quantity, total_amount, status, stripe_session_id, stripe_payment_id,
              product_type, size)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id`,
            [
              designId,
              customerEmail,
              customerName,
              JSON.stringify(shippingAddress),
              item.quantity,
              parseFloat(pricePerItem),
              'paid', // Status is 'paid' because payment was verified above
              session.id,
              paymentIntentId,
              productType,
              size,
            ]
          );
          
          const orderId = orderResult.id;
          orderIds.push(orderId);
          ordersCreated++;
          
          console.log(`\n✅ ORDER CREATED SUCCESSFULLY`);
          console.log(`   Order ID: ${orderId}`);
          console.log(`   Status: paid`);
          console.log(`   Total Amount: $${pricePerItem}`);
          console.log(`   Customer: ${customerName}`);
          
          // Update sales count
          try {
            await db.query(
              `UPDATE designs SET sales_count = sales_count + $1 WHERE id = $2`,
              [item.quantity, designId]
            );
            console.log(`   ✅ Sales count updated for design ${designId}`);
          } catch (updateError) {
            console.warn(`   ⚠️ Failed to update sales count:`, updateError.message);
            // Don't fail the whole order if sales count update fails
          }
          
        } catch (dbError) {
          console.error(`\n❌ DATABASE ERROR CREATING ORDER`);
          console.error('   Error:', dbError.message);
          console.error('   Stack:', dbError.stack);
          console.error('   Design ID:', designId);
          continue;
        }
        
        // Get the orderId for this iteration (last one created)
        const currentOrderId = orderIds[orderIds.length - 1];
        
        // Send order to Printify for fulfillment
        if (!design.printify_product_id) {
          console.warn(`\n⚠️ ORDER ${orderId} CANNOT BE SENT TO PRINTIFY`);
          console.warn(`   Design "${design.title}" (${designId}) has no printify_product_id`);
          console.warn(`   Order was created in database but needs manual fulfillment`);
          await db.query(
            `UPDATE orders SET status = 'needs_fulfillment' WHERE id = $1`,
            [orderId]
          );
        } else if (!shippingAddress?.line1) {
          console.warn(`\n⚠️ ORDER ${orderId} CANNOT BE SENT TO PRINTIFY`);
          console.warn(`   Missing shipping address`);
          await db.query(
            `UPDATE orders SET status = 'needs_fulfillment' WHERE id = $1`,
            [orderId]
          );
        } else {
          try {
            console.log(`\n📦 SENDING ORDER ${orderId} TO PRINTIFY...`);
            console.log(`   Design: ${design.title} (${designId})`);
            console.log(`   Printify Product ID: ${design.printify_product_id}`);
            
            const printifyOrder = await printify.createOrder({
              productId: design.printify_product_id,
              variantId: printify.getVariantId(productType, size),
              quantity: item.quantity,
              shippingAddress: {
                name: customerName,
                email: customerEmail,
                phone: session.customer_details?.phone || '',
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
            
            console.log(`\n✅ ORDER ${orderId} SENT TO PRINTIFY SUCCESSFULLY`);
            console.log(`   Printify Order ID: ${printifyOrder.id}`);
            console.log(`   Status updated to: processing`);
          } catch (printifyError) {
            console.error(`\n❌ ERROR SENDING ORDER ${orderId} TO PRINTIFY`);
            console.error('   Error:', printifyError.message);
            console.error('   Stack:', printifyError.stack);
            // Don't fail the whole webhook if Printify fails - order is still created in DB
            await db.query(
              `UPDATE orders SET status = 'payment_received' WHERE id = $1`,
              [orderId]
            );
            console.log(`   Order status updated to: payment_received (awaiting Printify retry)`);
          }
        }
      }

      console.log('\n========================================');
      console.log(`✅ WEBHOOK PROCESSING COMPLETE`);
      console.log(`   Created ${ordersCreated} order(s) for session: ${session.id}`);
      console.log(`   Order IDs: ${orderIds.join(', ') || 'None'}`);
      console.log('========================================\n');

      return res.json({ 
        received: true, 
        event: event.type,
        ordersCreated,
        orderIds
      });
    } catch (error) {
      console.error('\n========================================');
      console.error('❌ ERROR PROCESSING WEBHOOK');
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
      console.error('   Session ID:', session.id);
      console.error('========================================\n');
      
      return res.status(500).json({ 
        error: 'Error processing webhook',
        message: error.message,
        event: event.type,
        timestamp
      });
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

  // For any other event types, just acknowledge receipt
  console.log(`ℹ️ Received event type: ${event.type} - acknowledging receipt`);
  return res.json({ received: true, event: event.type });
}

module.exports = handleStripeWebhook;

