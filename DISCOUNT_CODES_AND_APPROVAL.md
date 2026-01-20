# Discount Codes & Order Approval Workflow

## 🎯 How Discount Codes Work with Manual Approval

Both discount codes now work with the **manual approval workflow**. All orders require admin approval before being sent to Printify.

---

## 💳 Discount Code Options

### 1. **TEST99** - Stripe Checkout ($0.50)
**Flow:**
- Customer adds items to cart
- Uses discount code `TEST99` at checkout
- Total becomes $0.50 (Stripe minimum)
- Redirects to Stripe checkout page
- Customer enters payment info (test card: 4242 4242 4242 4242)
- Stripe processes payment
- Stripe webhook creates order with status: `pending_approval`

### 2. **FREE** - Bypass Stripe ($0.00)
**Flow:**
- Customer adds items to cart
- Uses discount code `FREE` at checkout
- Total becomes $0.00
- Bypasses Stripe (no payment page)
- Order created directly with status: `pending_approval`

---

## ✅ Both Codes Use Same Approval Process

### After Order Creation (Both Codes)

1. **Order created** → Status: `pending_approval`
2. **Email sent** → Customer receives confirmation
3. **Admin reviews** → Go to `/adminOrders`
4. **Admin clicks** → "Approve & Ship" button
5. **Order sent to Printify** → Status: `processing`
6. **Printify review** → Admin approves in Printify dashboard
7. **Printify fulfills** → Product printed and shipped

---

## 🔄 Complete Workflow Comparison

### TEST99 ($0.50 via Stripe)
```
Customer → Cart → Checkout → Discount: TEST99
    ↓
Stripe Checkout Page ($0.50)
    ↓
Payment Processed ✅
    ↓
Webhook: checkout.session.completed
    ↓
Order Created (status: pending_approval) ⚠️
    ↓
Email Sent ✅
    ↓
Admin: /adminOrders → "Approve & Ship" ✅
    ↓
Sent to Printify (status: processing) ⚠️
    ↓
Admin: Printify Dashboard → "Submit order" ✅
    ↓
Printed & Shipped 📦
```

### FREE ($0.00 bypass Stripe)
```
Customer → Cart → Checkout → Discount: FREE
    ↓
NO Stripe (bypassed)
    ↓
Order Created Directly (status: pending_approval) ⚠️
    ↓
Email Sent ✅
    ↓
Admin: /adminOrders → "Approve & Ship" ✅
    ↓
Sent to Printify (status: processing) ⚠️
    ↓
Admin: Printify Dashboard → "Submit order" ✅
    ↓
Printed & Shipped 📦
```

---

## 📊 Order Status Flow

Both discount codes follow the same status progression:

```
pending_approval (waiting for admin)
    ↓
processing (sent to Printify)
    ↓
(Printify statuses: on hold → in production → shipped)
```

---

## 🧪 Testing Both Workflows

### Test with TEST99 ($0.50)
1. Create a design
2. Add to cart
3. Go to checkout
4. Enter shipping info
5. Apply discount code: `TEST99`
6. Total should show $0.50
7. Click "Place Order"
8. Use Stripe test card: `4242 4242 4242 4242`
9. Complete payment
10. Check `/adminOrders` for pending order
11. Click "Approve & Ship"
12. Check Printify dashboard

### Test with FREE ($0.00)
1. Create a design
2. Add to cart
3. Go to checkout
4. Enter shipping info
5. Apply discount code: `FREE`
6. Total should show $0.00
7. Click "Place Order" (no Stripe page)
8. Immediately redirected to success page
9. Check `/adminOrders` for pending order
10. Click "Approve & Ship"
11. Check Printify dashboard

---

## ⚠️ Important Notes

### Payment vs Fulfillment
- **TEST99**: Customer is charged $0.50 when they checkout
- **FREE**: Customer is not charged (no Stripe involvement)
- **Both**: Neither creates Printify order until admin approves

### Email Confirmations
- Both send order confirmation emails immediately after order creation
- Customer receives confirmation before admin approval
- Email states order is being processed (not that it's already shipped)

### Multiple Items
- If cart has multiple items, each gets its own order record
- All orders from same checkout have status: `pending_approval`
- Admin must approve each order individually (or could batch approve in future)

---

## 🔧 Technical Details

### FREE Orders Creation
**Endpoint:** `POST /api/orders/free`

**Creates orders with:**
- `status`: `'pending_approval'`
- `total_amount`: `0.00`
- `stripe_session_id`: `'free-order'`
- All other fields same as Stripe orders

### Stripe Orders Creation
**Webhook:** `checkout.session.completed`

**Creates orders with:**
- `status`: `'pending_approval'`
- `total_amount`: Actual amount paid (from Stripe)
- `stripe_session_id`: Stripe session ID
- `stripe_payment_id`: Stripe payment intent ID

---

## ✅ Summary

**Both TEST99 and FREE:**
- ✅ Create orders with `pending_approval` status
- ✅ Require admin approval before Printify fulfillment
- ✅ Send confirmation emails
- ✅ Show in "⚠️ Needs Approval" tab
- ✅ Display "Approve & Ship" button
- ✅ Follow same approval workflow

**The only difference:**
- TEST99 goes through Stripe checkout ($0.50)
- FREE bypasses Stripe (no payment page, $0.00)

Both are ready for testing!
