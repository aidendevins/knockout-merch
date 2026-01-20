# Manual Order Approval Workflow

## 🎯 What Changed

The order pipeline now includes a **manual approval step** before orders are sent to Printify for fulfillment.

---

## 📍 New Workflow

### Stage 1-3: Same as Before
1. User creates design
2. User adds to cart
3. User completes checkout with Stripe
4. Payment is processed

### Stage 4: Manual Approval (NEW!)

**After payment is successful:**

1. **Webhook receives `checkout.session.completed` event**
   - Verifies payment status is "paid"
   - Creates order(s) in database
   - **Sets order status to `pending_approval`** (instead of auto-sending to Printify)
   - Sends order confirmation email

2. **Admin reviews order in Admin Dashboard**
   - Go to `/adminOrders` page
   - Filter by "⚠️ Needs Approval" tab
   - View order details:
     - Customer name/email
     - Shipping address
     - Design, product type, size, quantity
     - Total amount paid
   
3. **Admin clicks "Approve & Ship" button**
   - Confirmation dialog appears: "Are you sure you want to approve this order and send it to Printify for fulfillment?"
   - Admin clicks "OK" to confirm

4. **Order sent to Printify**
   - Backend calls Printify API to create order
   - Order status updated to `processing`
   - Printify order ID saved to database
   - Admin sees success toast notification

### Stage 5: Printify Fulfillment
5. Printify prints and ships the product (as before)

---

## 🛡️ Safety Features

### Order Statuses

- **`pending_approval`** - Payment received, waiting for admin approval
- **`processing`** - Approved and sent to Printify
- **`needs_fulfillment`** - Missing product ID or shipping address
- **`printify_error`** - Failed to send to Printify (can retry)
- **`paid`** - Payment received (legacy status)

### Cart Management

✅ **If user removes item from cart:** Item is not ordered (works automatically - Stripe only charges for items in cart at checkout)

✅ **Multiple items in cart:** All items are ordered together in one transaction, but each gets its own order record with `pending_approval` status

### Approval Protection

- Only orders with status `pending_approval`, `paid`, or `payment_received` can be approved
- Confirmation dialog prevents accidental approvals
- Orders can only be approved once
- If Printify API fails, order status is set to `printify_error` and can be retried

---

## 🖥️ Admin Dashboard Features

### Stats Cards
- **Total Orders** - All orders
- **⚠️ Needs Approval** - Orders pending approval (highlighted in orange)
- **Processing** - Orders sent to Printify
- **Paid** - Legacy paid orders
- **Revenue** - Total revenue from paid orders

### Filters
- **All** - Show all orders
- **⚠️ Needs Approval** - Show only orders pending approval
- **Processing** - Show orders being fulfilled by Printify
- **Paid** - Show paid orders
- **Pending** - Show pending payment orders
- **Failed** - Show failed orders

### Order Cards
Each order shows:
- Status badge (color-coded)
- Order ID
- Date and time
- Customer name and email
- Shipping address
- Product details (type, color, size, quantity)
- Total amount paid
- Stripe payment ID
- **"Approve & Ship" button** (for pending approval orders)
- "View in Stripe" button

---

## 🔄 API Endpoints

### `POST /api/orders/:id/approve-and-ship`
Approve an order and send it to Printify.

**Request:**
```
POST /api/orders/abc123/approve-and-ship
```

**Response (Success):**
```json
{
  "success": true,
  "printify_order_id": "xyz789",
  "status": "processing",
  "message": "Order approved and sent to Printify for fulfillment"
}
```

**Response (Error):**
```json
{
  "error": "Cannot send to Printify",
  "message": "Design does not have a Printify product ID"
}
```

---

## 🚀 Testing the Workflow

### Test Order Flow:
1. Create a design on `/design`
2. Go to product page
3. Select size and add to cart
4. Go to checkout
5. Use discount code `TEST99` (makes order $0.50)
6. Enter shipping info
7. Complete Stripe checkout (use test card: 4242 4242 4242 4242)
8. Go to `/adminOrders`
9. Click "⚠️ Needs Approval" tab
10. Click "Approve & Ship" button
11. Confirm approval
12. Order status changes to "Processing"
13. Check Printify dashboard for order

---

## 📝 Important Notes

1. **Orders are NOT automatically sent to Printify anymore** - Admin must manually approve
2. **Multiple items are ordered together** - Each item gets its own order record
3. **Cart deletions are respected** - Only items in cart at checkout are ordered
4. **Email confirmation sent immediately** after payment (before admin approval)
5. **Printify order created only after approval** - Gives time to validate order details

---

## 🔧 Configuration

### Webhook Configuration (unchanged)
- Webhook endpoint: `https://your-backend.railway.app/api/stripe/webhook`
- Events: `checkout.session.completed`, `payment_intent.succeeded`

### Status Flow
```
Payment Received
    ↓
pending_approval (NEW - manual hold)
    ↓
Admin Approves
    ↓
processing (sent to Printify)
    ↓
(Printify fulfills)
```

---

## ✅ Summary

The manual approval workflow gives you control over which orders are sent to Printify. You can:
- Review order details before fulfillment
- Validate customer information
- Check for suspicious orders
- Prevent accidental fulfillment
- Manually hold orders if needed

The "Approve & Ship" button makes it easy to approve orders with one click after review.
