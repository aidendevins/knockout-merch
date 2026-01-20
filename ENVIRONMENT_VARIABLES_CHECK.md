# Environment Variables Check - designforwear.com

## What to Check & Update

### ⚠️ Critical Issues Causing "Not Populating Fully":

The website loads but data isn't loading because of environment variable mismatches.

---

## 1. **Vercel (Frontend) Environment Variables**

**Location:** Vercel Dashboard → Your Project → Settings → Environment Variables

**Check/Update:**
- `VITE_API_URL` → Should be: `https://knockout-merch-production.up.railway.app/api` (or your Railway backend URL)
  - ✅ **DO NOT** change this to `designforwear.com` - it must point to your Railway backend!
  - This tells your frontend where to make API calls

**After updating:**
- Click "Save" 
- **Redeploy** the frontend (Vercel → Deployments → "Redeploy" on latest deployment)

---

## 2. **Railway (Backend) Environment Variables**

**Location:** Railway Dashboard → Your Service → Variables

**Check/Update:**
- `FRONTEND_URL` → Should be: `https://designforwear.com`
  - This is used for Stripe redirects and CORS validation
  - ⚠️ **If this is still set to the old domain, update it NOW!**

**After updating:**
- Railway will **auto-redeploy** when you save environment variables
- Check the deployments tab to confirm it's redeploying

---

## 3. **How to Verify What's Wrong**

### In Browser Console (F12):
Look for errors like:
- `CORS policy` errors → Backend `FRONTEND_URL` not updated
- `Failed to fetch` or `Network error` → `VITE_API_URL` pointing to wrong backend
- `404 Not Found` → Backend URL incorrect

### Check Network Tab:
1. Open browser DevTools (F12)
2. Go to "Network" tab
3. Refresh the page
4. Look for failed API calls (red status codes)
5. Click on failed requests to see the error details

---

## 4. **Quick Fix Checklist**

- [ ] Updated `FRONTEND_URL` in Railway to `https://designforwear.com`
- [ ] Verified `VITE_API_URL` in Vercel points to Railway backend (NOT designforwear.com)
- [ ] Redeployed frontend in Vercel (after any env var changes)
- [ ] Waited for Railway to auto-redeploy (after env var changes)
- [ ] Checked browser console for errors
- [ ] Tested API calls in Network tab

---

## 5. **Common Issues**

### Issue: "CORS policy blocked"
**Fix:** Update `FRONTEND_URL` in Railway to `https://designforwear.com`

### Issue: "Failed to fetch" or "Network error"
**Fix:** Verify `VITE_API_URL` in Vercel is correct Railway backend URL

### Issue: "404 Not Found" on API calls
**Fix:** Check that `VITE_API_URL` ends with `/api` (e.g., `https://backend.railway.app/api`)

### Issue: Site loads but no data
**Fix:** 
1. Check browser console for errors
2. Verify backend is running (check Railway deployments)
3. Test backend directly: `https://your-backend.railway.app/api/health`

---

## 6. **Test After Updates**

1. **Clear browser cache** (hard refresh: Cmd+Shift+R or Ctrl+Shift+R)
2. **Test frontend:** Visit `https://www.designforwear.com`
3. **Check console:** Open DevTools (F12) → Console tab
4. **Check network:** Open DevTools → Network tab → Look for failed requests
5. **Test API directly:** `https://your-railway-backend.railway.app/api/health`

---

## Need Help?

If still not working after these updates:
1. Share what errors you see in browser console
2. Share what API calls are failing in Network tab
3. Verify both services are deployed successfully
