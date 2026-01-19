# Fix "Invalid Configuration" in Vercel

## What This Means

Both `designforwear.com` and `www.designforwear.com` show "Invalid Configuration" - this means **DNS records are not correctly set up or haven't propagated yet**.

## Step 1: Check What Vercel Needs

1. **Click "Learn more"** next to "Invalid Configuration" on either domain
   - This will show you exactly what DNS records Vercel expects
   - It will tell you what's missing or incorrect

2. **Note down the DNS records Vercel shows you:**
   - Usually it will show something like:
     - CNAME: `www` → `cname.vercel-dns.com` (or a specific value)
     - A record: `@` → `IP address` (for apex domain)
     - Or other specific values

## Step 2: Check Your DNS Records at Squarespace

1. **Go to Squarespace:**
   - Log in to Squarespace
   - Go to **Settings** → **Domains** → `designforwear.com`
   - Click **DNS Settings**

2. **Check what DNS records you currently have:**
   - Look for CNAME or A records pointing to Vercel
   - Compare them to what Vercel expects

## Step 3: Fix the DNS Records

**Most Common Issues:**

### Issue A: Missing DNS Records
- **Problem:** No DNS records pointing to Vercel
- **Fix:** Add the DNS records Vercel tells you to add

### Issue B: Wrong DNS Values
- **Problem:** DNS records exist but point to wrong values
- **Fix:** Update the DNS records to match exactly what Vercel specifies

### Issue C: DNS Not Propagated Yet
- **Problem:** DNS records are correct but haven't propagated (takes 15-60 minutes)
- **Fix:** Wait and click "Refresh" in Vercel periodically

## Step 4: Add/Update DNS Records at Squarespace

**For `www.designforwear.com`:**
1. In Squarespace DNS Settings
2. Look for a CNAME record with Name: `www`
3. If it exists, edit it
4. If it doesn't exist, add it:
   - **Type:** CNAME
   - **Name/Host:** `www`
   - **Value/Target:** [What Vercel tells you - usually something like `cname.vercel-dns.com` or a specific value]
   - **Save**

**For `designforwear.com` (apex domain):**
1. Vercel will either ask for:
   - **A records** (IP addresses), OR
   - **CNAME** pointing to Vercel's DNS
2. Add exactly what Vercel specifies
3. If using A records, you may need multiple (Vercel will tell you)

## Step 5: Wait and Refresh

1. **After updating DNS:**
   - Wait 5-15 minutes for DNS to propagate
   - Click "Refresh" button in Vercel
   - Vercel will re-check the DNS

2. **If still invalid:**
   - Click "Learn more" again
   - Check if the DNS values match exactly
   - Sometimes there are typos or formatting issues

## Common DNS Record Examples

**If Vercel says to use CNAME for www:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**If Vercel says to use A records for apex:**
```
Type: A
Name: @ (or blank)
Value: 76.76.21.21 (example - use what Vercel gives you)
```
(You may need multiple A records if Vercel specifies multiple IPs)

## Troubleshooting

- **"Invalid Configuration" persists:** 
  - Double-check DNS values match exactly (case-sensitive)
  - Make sure there are no extra spaces
  - Try clicking "Refresh" in Vercel after 15 minutes

- **DNS propagates slowly:**
  - Use online tool: https://dnschecker.org
  - Check if your DNS records are visible globally
  - Can take 24-48 hours but usually 15-60 minutes

- **Can't find DNS settings:**
  - In Squarespace: Settings → Domains → [your domain] → DNS Settings
  - Or contact Squarespace support if DNS is managed elsewhere
