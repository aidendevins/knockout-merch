# Order Pipeline Explanation

## 🎯 Overview: Complete Order Flow

Here's how the entire order pipeline works from design creation to fulfillment:

---

## 📍 Current State: What We Implemented

### ✅ **Stage 1: Design Creation → Product Page** (COMPLETE)
This is the **new pipeline** we just implemented:

1. **User goes to Design Studio** (`/design`)
   - Selects a template
   - Uploads photos
   - Generates AI design
   - Adjusts canvas (position, scale, rotation)
   - Clicks "Create Design"

2. **Design Creation Process** (`designStudio.jsx` → `handleCreateProduct`)
   - Exports design from canvas
   - Uploads design image to S3
   - Saves design to database (`designs` table) with:
     - `product_type` (tshirt/hoodie) - **locked in**
     - `color` (black/white) - **locked in**
     - `template_id`
     - `canvas_data` (position, scale, rotation)
   - Creates product on Printify (sends design image)
   - **Automatically redirects to `/product/${design.id}`**

3. **Product Page** (`product.jsx`)
   - Shows design with mockups
   - Product type and color are **LOCKED** (from design)
   - User can only select:
     - **Size** (S, M, L, XL, 2XL)
     - **Quantity**
   - User clicks "Add to Cart"
   - Item added to cart with locked product_type and color

---

## 🛒 Stage 2: Cart → Checkout (COMPLETE)

4. **Cart** (`CartContext.jsx`)
   - Stores items with:
     - Design ID
     - Product type (locked)
     - Color (locked)
     - Size (selected by user)
     - Quantity
   - User clicks "Checkout"

5. **Checkout Page** (`checkout.jsx`)
   - **Step 1: Shipping Information**
     - User enters name, email, address
     - Calculates shipping ($4.75 first item, $2.50 each additional)
   - **Step 2: Payment**
     - Optional discount codes (KNOCKOUT10, TEST99, FREE)
     - Click "Place Order"
   - Creates Stripe Checkout Session:
     - Includes all cart items as line items
     - Stores metadata (design_ids, sizes, colors, product_types)
     - Redirects to Stripe hosted checkout page

---

## 💳 Stage 3: Payment → Order Creation (COMPLETE)

6. **Stripe Checkout**
   - User enters payment info on Stripe's page
   - Stripe processes payment
   - On success, redirects to `/checkout/success?session_id=xxx`

7. **Stripe Webhook** (`stripe-webhook.js`)
   - Stripe sends `checkout.session.completed` event to backend
   - **Webhook Handler Process:**
     ```
     ✅ Verify payment status (must be "paid")
     ✅ Retrieve full session with line items
     ✅ Check for duplicate orders (idempotency)
     ✅ For each item in cart:
        - Extract design_id, size, color, product_type from metadata
        - Get design from database (to get printify_product_id)
        - Create order in database with status "paid"
        - Update design sales_count
        - Send order to Printify for fulfillment
        - Update order with printify_order_id and status "processing"
     ✅ Send order confirmation email (via Resend)
     ```
   - **Order Status Flow:**
     - `paid` → Created in DB (payment verified)
     - `processing` → Sent to Printify successfully
     - `needs_fulfillment` → Missing printify_product_id or shipping address
     - `payment_received` → Printify failed (can retry later)

---

## 📦 Stage 4: Printify Fulfillment (COMPLETE)

8. **Printify Order Creation** (`services/printify.js`)
   - Receives order from webhook
   - Creates order on Printify API with:
     - Product ID (from design.printify_product_id)
     - Variant ID (based on size + color)
     - Quantity
     - Shipping address
   - Printify processes and prints the product
   - Printify ships to customer

9. **Order Tracking** (Can be added later)
   - Printify can send webhooks about order status
   - Could update order status: `processing` → `shipped` → `delivered`
   - Could send tracking emails to customers

---

## 📊 Data Flow Diagram

```
User creates design
    ↓
Design saved to DB (with product_type, color locked)
    ↓
Product created on Printify (gets printify_product_id)
    ↓
Redirect to /product/{designId}
    ↓
User selects size + quantity
    ↓
Add to Cart
    ↓
Checkout (enter shipping info)
    ↓
Stripe Checkout Session created (with metadata)
    ↓
User pays on Stripe
    ↓
Stripe webhook → checkout.session.completed
    ↓
Backend creates order(s) in DB (status: "paid")
    ↓
Backend sends order to Printify
    ↓
Order updated (printify_order_id, status: "processing")
    ↓
Email confirmation sent
    ↓
Printify prints and ships
```

---

## 🗄️ Database Schema

### **Designs Table:**
- `id` - Unique design ID
- `title` - Design name
- `design_image_url` - S3 URL of design
- `product_type` - **LOCKED** (tshirt/hoodie)
- `color` - **LOCKED** (black/white)
- `printify_product_id` - Printify product ID (used for orders)
- `template_id` - Template used
- `canvas_data` - Position, scale, rotation
- `sales_count` - Number of times ordered

### **Orders Table:**
- `id` - Unique order ID
- `design_id` - References designs.id
- `customer_email` - Customer email
- `customer_name` - Customer name
- `shipping_address` - JSON address object
- `product_type` - From design (locked)
- `size` - User selected (S, M, L, XL, 2XL)
- `quantity` - User selected
- `total_amount` - Price paid (after discounts)
- `status` - paid, processing, needs_fulfillment, etc.
- `stripe_session_id` - Stripe checkout session
- `stripe_payment_id` - Stripe payment intent
- `printify_order_id` - Printify order ID

---

## ✅ What's Working Now

1. ✅ Design creation → Product page redirect
2. ✅ Product type and color locked on product page
3. ✅ Size and quantity selection
4. ✅ Add to cart
5. ✅ Checkout flow
6. ✅ Stripe payment processing
7. ✅ Webhook order creation
8. ✅ Printify order fulfillment
9. ✅ Email confirmations

---

## 🚧 What Could Be Added Later

### **Order Tracking:**
- Printify webhook to update order status
- Tracking number emails
- Order status page for customers

### **Admin Order Management:**
- View all orders
- Filter by status
- Manually retry failed Printify orders
- Mark orders as shipped/delivered

### **Customer Order History:**
- Customer login/account
- View past orders
- Track current orders

### **Printify Webhook Handler:**
- Listen for Printify status updates
- Auto-update order status when Printify ships

---

## 🔍 Key Files

### **Frontend:**
- `frontend/pages/designStudio.jsx` - Design creation & redirect
- `frontend/pages/product.jsx` - Product page with locked options
- `frontend/pages/checkout.jsx` - Checkout flow
- `frontend/context/CartContext.jsx` - Cart state management

### **Backend:**
- `backend/routes/stripe-webhook.js` - Main webhook handler (order creation)
- `backend/routes/stripe.js` - Stripe checkout session creation
- `backend/services/printify.js` - Printify API integration
- `backend/services/email.js` - Email confirmation sending
- `backend/routes/orders.js` - Order CRUD operations

---

## 🎯 Summary

**The pipeline is COMPLETE and working!**

✅ User creates design → Automatically redirected to product page  
✅ Product type & color locked → User selects size & quantity  
✅ Add to cart → Checkout → Pay with Stripe  
✅ Webhook creates order → Sends to Printify → Email confirmation  

The only thing we might want to add later is **order tracking** (Printify webhooks) and **customer order history**.
