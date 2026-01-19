# DNS Records to Add at Squarespace for designforwear.com

## ⚠️ Important: These DNS records are added in SQUARESPACE, NOT in Vercel

Vercel shows "Invalid Configuration" because the DNS records at Squarespace aren't pointing to Vercel yet.

## Step 1: Get DNS Records from Vercel

**Option A: Check Vercel Dashboard**
1. Look at the `www.designforwear.com` domain entry
2. Click anywhere on it to expand or look for a "DNS" or "Configuration" section
3. Vercel should show you the DNS records needed

**Option B: Common Vercel DNS Setup**
If you can't find the exact values, Vercel typically uses:
- **For www subdomain:** CNAME pointing to Vercel
- **For apex domain:** Either CNAME (via ALIAS) or A records

## Step 2: Add DNS Records at Squarespace

**Go to Squarespace:**
1. Log in to Squarespace
2. Settings → Domains → `designforwear.com`
3. Click "DNS Settings" or "Advanced DNS"

**Add these DNS records:**

### For `www.designforwear.com`:
```
Type: CNAME
Host/Name: www
Points to/Target: cname.vercel-dns.com
```

**OR** if Vercel gave you a specific value (like `cname.vercel-dns.com.vercel-dns.com`), use that exact value.

### For `designforwear.com` (apex domain):

**Option A: If Squarespace supports ALIAS/CNAME for apex:**
```
Type: CNAME (or ALIAS)
Host/Name: @ (or blank/root)
Points to/Target: cname.vercel-dns.com
```

**Option B: If Squarespace requires A records (most common):**
Vercel usually provides 3 IP addresses. Add these A records:
```
Type: A
Host/Name: @ (or blank/root)
Points to/Target: 76.76.21.21
```
(Repeat for each IP address Vercel provides - usually 3-4 IPs)

**Common Vercel A record IPs** (check what Vercel tells you):
- `76.76.21.21`
- `76.76.21.22`
- `76.223.126.88`
- (Vercel will give you the exact IPs to use)

## Step 3: Save and Wait

1. **Save the DNS records** in Squarespace
2. **Wait 5-15 minutes** for DNS propagation
3. **Go back to Vercel** and click "Refresh" on both domains
4. Status should change from "Invalid Configuration" to "Valid"

## What to Look For in Vercel

After adding DNS records, Vercel should show:
- ✅ **"Valid"** instead of "Invalid Configuration"
- ✅ Green checkmark instead of red warning
- ✅ SSL certificate provisioning (automatic)

## Troubleshooting

**If still showing "Invalid Configuration":**
1. Double-check DNS values match exactly (no typos, correct capitalization)
2. Make sure you saved the DNS records in Squarespace
3. Use https://dnschecker.org to verify DNS propagation globally
4. Wait longer (can take up to 48 hours, but usually 15-60 minutes)

**If you can't find DNS settings in Squarespace:**
- Some Squarespace plans manage DNS externally
- Contact Squarespace support if DNS is managed elsewhere
- You may need to update DNS at your domain registrar instead
