# 🚀 Deployment Checklist

**Print this or keep it open while deploying!**

---

## ✅ Pre-Deployment

- [ ] Run setup script: `./setup-new-project.sh my-project-name`
- [ ] Navigate to project: `cd ../my-project-name`
- [ ] Test locally:
  - [ ] Backend: `cd backend && npm run dev` → http://localhost:8000/health
  - [ ] Frontend: `cd frontend && npm run dev` → http://localhost:5173
- [ ] Verify API connection shows ✅ on landing page

---

## ✅ GitHub

- [ ] Create GitHub repository (if using CLI):
  ```bash
  gh repo create my-project-name --public --source=. --push
  ```
- [ ] OR create manually on GitHub.com and push:
  ```bash
  git remote add origin https://github.com/yourusername/my-project-name.git
  git push -u origin main
  ```
- [ ] Verify code is on GitHub

---

## ✅ Vercel (Frontend)

- [ ] Go to https://vercel.com/new
- [ ] Click "Import Git Repository"
- [ ] Select your repository
- [ ] **Important**: Set Root Directory to `frontend`
- [ ] Click "Deploy"
- [ ] Wait for deployment to complete
- [ ] **Copy Vercel URL**: _____________________
- [ ] Test by visiting URL - should see landing page
- [ ] Note: API connection will show ⚠️ until backend is deployed

---

## ✅ Railway (Backend)

- [ ] Go to https://railway.app/new
- [ ] Click "Deploy from GitHub repo"
- [ ] Select your repository
- [ ] **Important**: Set Root Directory to `backend`
- [ ] Add environment variable:
  - [ ] Name: `FRONTEND_URL`
  - [ ] Value: Your Vercel URL (from above)
- [ ] (Optional) Add PostgreSQL database:
  - [ ] Click "+ New" → "Database" → "PostgreSQL"
- [ ] Click "Deploy"
- [ ] Wait for deployment to complete
- [ ] **Copy Railway URL**: _____________________
- [ ] Test by visiting: `your-railway-url.up.railway.app/health`
  - [ ] Should return: `{"status":"ok",...}`

---

## ✅ Connect Frontend to Backend

- [ ] Go back to Vercel dashboard
- [ ] Click your project
- [ ] Go to "Settings" → "Environment Variables"
- [ ] Add new variable:
  - [ ] Name: `VITE_API_URL`
  - [ ] Value: `https://your-railway-url.up.railway.app/api` (with `/api` at end!)
  - [ ] Environment: Production
- [ ] Click "Save"
- [ ] Go to "Deployments" tab
- [ ] Click "Redeploy" on latest deployment
- [ ] Wait for redeploy to complete

---

## ✅ Final Verification

- [ ] Visit your Vercel URL
- [ ] Check API Status badge shows: `✅ Connected`
- [ ] Verify "API Connection" section shows:
  - [ ] Status: ✅ Connected
  - [ ] Response: online
  - [ ] Endpoint: your Railway URL
- [ ] Click around - everything should work!

---

## 🎉 Success!

**Your URLs:**
- Frontend: _____________________
- Backend: _____________________

**Share your site!** It's live and ready! 🚀

---

## 📝 Post-Deployment

- [ ] Add custom domain (optional)
  - [ ] Vercel: Settings → Domains
  - [ ] Railway: Settings → Networking → Custom Domain
- [ ] Set up monitoring
  - [ ] Vercel Analytics (free)
  - [ ] Railway Metrics
- [ ] Add to your portfolio
- [ ] Tweet about it! 📣

---

## 🔄 For Future Projects

To create another project using this template:

```bash
cd /Users/aiden/Documents/GitHub/knockout-merch/starter-template
./setup-new-project.sh another-project
```

Then repeat this checklist! ✅

---

**Reference Documentation:**
`/Users/aiden/Documents/GitHub/knockout-merch/COMPLETE_TECHNICAL_DOCUMENTATION.md`

**Need help?** See Section 12: Hosting & Deployment
