# Domain Change Checklist: designforwear.com

## ✅ Code Changes (Automated)
- [x] Backend CORS whitelist updated in `backend/server.js`
- [x] Email from address updated in `backend/services/email.js`

## 📋 Manual Steps Required

### 1. **Vercel (Frontend) Environment Variables**
Update in Vercel Dashboard → Your Project → Settings → Environment Variables:

**Update:**
- `VITE_API_URL`: Should be your Railway backend URL (e.g., `https://your-backend.railway.app/api`)

**Add (if needed):**
- No new variables needed

**Custom Domain:**
- Add `designforwear.com` and `www.designforwear.com` as custom domains
- Follow DNS instructions provided by Vercel

### 2. **Railway (Backend) Environment Variables**
Update in Railway Dashboard → Your Service → Variables:

**Update:**
- `FRONTEND_URL`: Change to `https://designforwear.com` (or `https://www.designforwear.com` if using www)
  - This is used for:
    - Stripe checkout success/cancel URLs
    - CORS origin validation
    - Webhook URL references

**Keep as is:**
- All other environment variables remain the same

### 3. **Stripe Dashboard**
Update webhook URL in Stripe Dashboard → Developers → Webhooks:

**Current:** `https://your-backend.railway.app/api/stripe/webhook` (should already be correct)

**Verify:**
- Webhook endpoint URL points to your Railway backend
- Events subscribed: `checkout.session.completed`, `payment_intent.succeeded`

**Update Success/Cancel URLs:**
- These are now controlled by `FRONTEND_URL` environment variable in Railway
- After updating `FRONTEND_URL`, they will automatically use `https://designforwear.com/checkout/success` and `https://designforwear.com/checkout`

### 4. **Resend (Email Service)**
Update email configuration in Resend Dashboard:

**Domain Verification:**
1. Go to Resend Dashboard → Domains
2. Add `designforwear.com` as a verified domain
3. Add DNS records as instructed by Resend
4. Wait for domain verification

**After verification:**
- Update `from` address in `backend/services/email.js` (already updated to `noreply@designforwear.com`)
- Update email subject/branding if needed

### 5. **DNS Configuration** ⚠️ CRITICAL - DO THIS IN YOUR DNS PROVIDER (e.g., Squarespace, Cloudflare, GoDaddy)

**Step 1: Add Domain in Vercel Dashboard**
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Click "Add Domain"
3. Enter `designforwear.com`
4. Click "Add"
5. Vercel will show you the DNS records you need to add

**Step 2: Add DNS Records at Your DNS Provider** (Based on what Vercel shows you)

**Option A: If Vercel gives you a CNAME value (most common for www):**
```
Type    Name    Value (Vercel will give you the exact value)
CNAME   www     [vercel-provided-value]
A       @       [Vercel-provided-IP-address] (for apex domain)
```

**Option B: If using Vercel's automatic DNS:**
```
Type    Name    Value
CNAME   @       cname.vercel-dns.com (or what Vercel specifies)
CNAME   www     cname.vercel-dns.com (or what Vercel specifies)
```

**Step 3: Email DNS Records (For Resend - do after domain is verified in Vercel)**

**For Email (Resend):**
1. Go to Resend Dashboard → Domains → Add Domain → `designforwear.com`
2. Resend will give you specific DNS records. Add these to your DNS:
```
Type    Name                   Value (Resend will provide exact values)
MX      @                      feedback-smtp.resend.com (priority 10)
TXT     @                      v=spf1 include:_spf.resend.com ~all
TXT     _resend                [Resend-provided-verification-string]
TXT     _dmarc                 v=DMARC1; p=none
CNAME   [subdomain].resend.com [Resend-provided-value] (for DKIM)
```

**⚠️ IMPORTANT DNS NOTES:**
- **DNS records are added at your domain registrar/DNS provider** (NOT in code)
- If you're using Squarespace (as shown in your image), add these in: Squarespace → Settings → Domains → DNS Settings
- **Propagation time**: DNS changes can take 24-48 hours to fully propagate
- **Verify DNS**: Use `dig` or online tools to check if DNS records are active
- **Vercel will verify**: Once DNS is correct, Vercel will automatically detect and configure SSL

### 6. **Files Already Updated**
- ✅ `backend/server.js` - CORS whitelist
- ✅ `backend/services/email.js` - Email from address

### 7. **Testing Checklist**
After all changes:
- [ ] Frontend loads at `https://designforwear.com`
- [ ] API calls work (check browser console)
- [ ] Stripe checkout redirects work
- [ ] Stripe webhook receives events
- [ ] Emails send from `noreply@designforwear.com`
- [ ] CORS allows requests from new domain

## Important Notes

1. **Email Domain Verification:** The email will continue to use `onboarding@resend.dev` until you verify `designforwear.com` in Resend. Test emails should still work to `p.a.devins@gmail.com` during this period.

2. **Backend URL:** Your `VITE_API_URL` in Vercel should point to your Railway backend URL, not to the frontend domain.

3. **FRONTEND_URL:** This should be the public frontend URL (`https://designforwear.com`), used by the backend for generating redirect URLs.

4. **DNS Propagation:** DNS changes can take 24-48 hours to fully propagate.

## Quick Reference: Current vs New

| Service | Old | New |
|---------|-----|-----|
| Frontend Domain | `knockout-merch.vercel.app` | `designforwear.com` |
| Email From | `onboarding@resend.dev` | `noreply@designforwear.com` |
| CORS Origins | `influencerboxingiscooked.com` | `designforwear.com` |
