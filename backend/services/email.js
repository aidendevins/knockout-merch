const { Resend } = require('resend');

// Initialize Resend only if API key is available
let resend = null;
function getResendClient() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

/**
 * Send order confirmation email to customer
 */
async function sendOrderConfirmation({ 
  customerEmail, 
  customerName, 
  orderId, 
  orderItems,
  shippingAddress,
  totalAmount,
  discountCode 
}) {
  try {
    // Check if Resend is configured
    const client = getResendClient();
    if (!client) {
      console.log('ℹ️ Resend not configured - skipping email');
      return null;
    }
    
    console.log(`📧 Sending order confirmation email to ${customerEmail}...`);
    
    // Build order items HTML
    const itemsHtml = orderItems.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>${item.title}</strong><br/>
          <span style="color: #6b7280; font-size: 14px;">
            ${item.productType} • ${item.color} • Size ${item.size} • Qty: ${item.quantity}
          </span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          $${item.price}
        </td>
      </tr>
    `).join('');

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">🥊 KNOCKOUT CLUB</h1>
              <p style="margin: 10px 0 0 0; color: #fecaca; font-size: 16px;">Order Confirmation</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 30px 20px 30px;">
              <h2 style="margin: 0 0 15px 0; color: #111827; font-size: 24px;">Thanks for your order, ${customerName}! 🎉</h2>
              <p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
                We've received your order and payment. Your knockout merch is on its way!
              </p>
            </td>
          </tr>

          <!-- Order Details -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 6px; padding: 15px;">
                <tr>
                  <td>
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Order Number</p>
                    <p style="margin: 5px 0 0 0; color: #111827; font-size: 16px; font-weight: 600;">#${orderId.slice(-8)}</p>
                  </td>
                  <td align="right">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Order Date</p>
                    <p style="margin: 5px 0 0 0; color: #111827; font-size: 16px; font-weight: 600;">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Order Items -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px;">Order Items</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                ${itemsHtml}
                <tr>
                  <td style="padding: 15px; background-color: #f9fafb; text-align: right; font-weight: 600; color: #111827;" colspan="2">
                    ${discountCode && discountCode !== 'none' ? `
                      <div style="margin-bottom: 8px; color: #059669;">
                        Discount (${discountCode}): Applied ✓
                      </div>
                    ` : ''}
                    <div style="font-size: 20px; color: #dc2626;">
                      Total Paid: $${totalAmount}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping Address -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px;">Shipping Address</h3>
              <div style="background-color: #f9fafb; border-radius: 6px; padding: 15px; color: #374151; line-height: 1.6;">
                <strong>${customerName}</strong><br/>
                ${shippingAddress.line1}${shippingAddress.line2 ? `<br/>${shippingAddress.line2}` : ''}<br/>
                ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postal_code}<br/>
                ${shippingAddress.country || 'US'}
              </div>
            </td>
          </tr>

          <!-- Delivery Info -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  <strong>📦 Expected Delivery:</strong> 5-7 business days<br/>
                  You'll receive a tracking number once your order ships.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                Questions about your order? Reply to this email or contact us.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © 2026 Knockout Club. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const { data, error } = await client.emails.send({
      from: 'Knockout Club <onboarding@resend.dev>', // Change this once domain is verified
      to: [customerEmail],
      subject: `Order Confirmation #${orderId.slice(-8)} - Knockout Club`,
      html: emailHtml,
    });

    if (error) {
      console.error('❌ Failed to send order confirmation email:', error);
      throw error;
    }

    console.log('✅ Order confirmation email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Error sending order confirmation email:', error);
    // Don't throw - we don't want email failures to break order creation
    return null;
  }
}

/**
 * Check if Resend is configured
 */
function isConfigured() {
  return !!process.env.RESEND_API_KEY;
}

module.exports = {
  sendOrderConfirmation,
  isConfigured,
};

