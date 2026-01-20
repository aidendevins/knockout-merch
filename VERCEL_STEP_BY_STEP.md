# Step-by-Step: Vercel Domain Change to designforwear.com

## ✅ VERCEL STEPS (Do these in order)

### Step 1: Add Custom Domain in Vercel Dashboard

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select your project (frontend)

2. **Navigate to Domain Settings:**
   - Click on your project
   - Go to **Settings** tab (left sidebar)
   - Click on **Domains** (under Project Settings)

3. **Add Your Domain:**
   - Click **"Add Domain"** button
   - Enter: `designforwear.com`
   - Click **"Add"** or **"Continue"**
   - Vercel will check if the domain is available

4. **Add www subdomain (optional but recommended):**
   - Click **"Add Domain"** again
   - Enter: `www.designforwear.com`
   - Click **"Add"**

5. **Vercel will show you DNS configuration:**
   - You'll see a message like "Configure your DNS provider"
   - **WRITE DOWN** the DNS values Vercel provides (CNAME or A records)

### Step 2: Update DNS Records at Your DNS Provider (Squarespace)

**Based on what Vercel shows you, add these DNS records:**

**If Vercel gives you CNAME values:**
- Go to Squarespace → Settings → Domains → `designforwear.com` → DNS Settings
- Add:
  - **Type:** CNAME
  - **Name:** `www` 
  - **Value:** [The CNAME value Vercel gave you]

**If Vercel gives you A records (for apex domain):**
- **Type:** A
- **Name:** `@` (or blank/root)
- **Value:** [IP address Vercel gives you]
- Add multiple A records if Vercel provides multiple IPs

**For apex domain (designforwear.com without www):**
- Vercel may use A records or CNAME
- Follow exactly what Vercel tells you

### Step 3: Wait for DNS Propagation & Verification

1. **Wait 5-60 minutes** for DNS to propagate
2. **Vercel will automatically detect** when DNS is correct
3. **SSL Certificate** will be automatically provisioned by Vercel (free, automatic)
4. **Status will change** from "Pending" to "Valid" in Vercel dashboard

### Step 4: Verify Environment Variables in Vercel

**Check these are set correctly:**

1. Go to **Settings** → **Environment Variables**

2. **Verify `VITE_API_URL`:**
   - Should be: `https://your-railway-backend-url.railway.app/api`
   - ✅ **DO NOT CHANGE THIS** - it should point to your Railway backend
   - If missing, add it

3. **Verify `VITE_STRIPE_PUBLISHABLE_KEY`:**
   - Should be your Stripe publishable key
   - ✅ **DO NOT CHANGE THIS**
   - If missing, add it

### Step 5: Redeploy (if needed)

- After DNS is verified, Vercel will automatically redeploy
- Or manually trigger: Deployments → Latest → "Redeploy"

### Step 6: Test

- Visit: `https://designforwear.com`
- Should load your frontend
- Check browser console for any API errors

---

## ✅ RAILWAY STEPS (Only 1 change needed)

### Step 1: Update FRONTEND_URL Environment Variable

1. **Go to Railway Dashboard:**
   - Visit: https://railway.app/dashboard
   - Select your backend service

2. **Navigate to Variables:**
   - Click on your service
   - Click on **Variables** tab (left sidebar)

3. **Update `FRONTEND_URL`:**
   - Find `FRONTEND_URL` in the list
   - Click **Edit** (or click the variable name)
   - Change value from: `https://old-domain.com` (or whatever it was)
   - To: `https://designforwear.com`
   - Click **Save**

4. **Railway will automatically redeploy** with the new variable

### ✅ What this changes:
- Stripe checkout success URL: `https://designforwear.com/checkout/success`
- Stripe checkout cancel URL: `https://designforwear.com/checkout`
- CORS will allow requests from `https://designforwear.com` (already in code)

### ❌ What this does NOT change:
- Backend URL stays the same (Railway URL)
- Database URL stays the same
- All other environment variables stay the same

---

## 📋 Summary Checklist

### Vercel:
- [ ] Add `designforwear.com` as custom domain
- [ ] Add `www.designforwear.com` (optional)
- [ ] Add DNS records at Squarespace (follow Vercel instructions)
- [ ] Wait for DNS verification (5-60 minutes)
- [ ] Verify `VITE_API_URL` points to Railway backend ✅ (don't change)
- [ ] Verify `VITE_STRIPE_PUBLISHABLE_KEY` is set ✅ (don't change)
- [ ] Test site loads at `https://designforwear.com`

### Railway:
- [ ] Update `FRONTEND_URL` to `https://designforwear.com`
- [ ] Wait for automatic redeploy (~2-5 minutes)
- [ ] Verify backend is running

---

## ⚠️ Important Notes

1. **VITE_API_URL in Vercel:** This should point to your Railway backend URL, NOT to `designforwear.com`. The frontend talks to the backend, so this stays as your Railway URL.

2. **FRONTEND_URL in Railway:** This is the public frontend URL. After you add the domain to Vercel and it's working, set this to `https://designforwear.com`.

3. **DNS Propagation:** Can take anywhere from 5 minutes to 48 hours, but usually 15-60 minutes.

4. **SSL Certificates:** Vercel automatically provisions free SSL certificates once DNS is verified - you don't need to do anything.

5. **No Code Changes Needed:** The code is already updated with the new domain in CORS whitelist.
