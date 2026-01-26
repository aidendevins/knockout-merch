# 🚀 Quick Start Guide

**Deploy your fullstack app in 5 minutes!**

---

## Step 1: Create Your Project (1 minute)

```bash
cd /Users/aiden/Documents/GitHub/knockout-merch/starter-template
./setup-new-project.sh my-awesome-app
```

This automatically:
- ✅ Creates project structure
- ✅ Copies all files
- ✅ Installs dependencies
- ✅ Initializes Git repo

---

## Step 2: Push to GitHub (1 minute)

```bash
cd ../my-awesome-app

# Option A: Using GitHub CLI (easiest)
gh repo create my-awesome-app --public --source=. --push

# Option B: Manual
# 1. Create repo on GitHub.com
# 2. Then run:
git remote add origin https://github.com/yourusername/my-awesome-app.git
git push -u origin main
```

---

## Step 3: Deploy Frontend to Vercel (1 minute)

1. Go to **https://vercel.com/new**
2. Click **"Import Git Repository"**
3. Select your **my-awesome-app** repo
4. **Root Directory**: Set to `frontend`
5. Click **"Deploy"**
6. ✅ Done! Your frontend is live!

**Copy your Vercel URL** (e.g., `my-awesome-app.vercel.app`)

---

## Step 4: Deploy Backend to Railway (2 minutes)

1. Go to **https://railway.app/new**
2. Click **"Deploy from GitHub repo"**
3. Select your **my-awesome-app** repo
4. **Root Directory**: Set to `backend`
5. **Add Environment Variable** (Settings → Variables):
   - `FRONTEND_URL` = `https://your-vercel-url.vercel.app`
6. **(Optional)** Add PostgreSQL database:
   - Click **"+ New"** → **"Database"** → **"PostgreSQL"**
7. Click **"Deploy"**
8. ✅ Done! Your backend is live!

**Copy your Railway URL** (e.g., `your-app.up.railway.app`)

---

## Step 5: Connect Frontend to Backend (30 seconds)

1. Go back to **Vercel dashboard**
2. Click your project → **"Settings"** → **"Environment Variables"**
3. Add variable:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-railway-url.up.railway.app/api`
4. Go to **"Deployments"** → Click **"Redeploy"**
5. ✅ Done! Everything is connected!

---

## 🎉 You're Live!

Visit your Vercel URL to see your app running!

The landing page will show:
- ✅ Beautiful gradient design
- ✅ API connection status
- ✅ Tech stack badges
- ✅ Ready to customize!

---

## 🧪 Local Development

```bash
# Terminal 1 - Backend
cd my-awesome-app/backend
npm run dev
# → http://localhost:8000

# Terminal 2 - Frontend
cd my-awesome-app/frontend
npm run dev
# → http://localhost:5173
```

---

## 📝 Customize Your Landing Page

Edit `frontend/src/App.jsx`:

```jsx
// Change the title
<h1>Your Awesome Project Name</h1>

// Change colors in className
className="bg-gradient-to-br from-indigo-900 to-pink-900"

// Add your content
<p>Your amazing description here!</p>
```

---

## 🔄 Reuse This Template

To create another project:

```bash
cd /Users/aiden/Documents/GitHub/knockout-merch/starter-template
./setup-new-project.sh another-project
```

---

## 📚 Next Steps

1. ✅ **Deployed!** (You just did this)
2. **Add Features** - Reference: `COMPLETE_TECHNICAL_DOCUMENTATION.md`
   - Authentication (Section 11)
   - Database (Section 6)
   - Payment processing (Section 7)
   - AI integration (Section 8)
3. **Customize Design** - Make it yours!
4. **Add Pages** - More routes, more features
5. **Scale & Iterate** - Build something awesome!

---

## 🆘 Troubleshooting

### Frontend can't connect to backend

**Issue**: API status shows "Not connected"

**Fix**:
1. Check Vercel environment variable `VITE_API_URL` is correct
2. Make sure Railway backend is deployed and running
3. Redeploy Vercel after adding env var

### Backend won't start on Railway

**Issue**: Deploy fails or crashes

**Fix**:
1. Check Railway logs for errors
2. Make sure `railway.toml` is in backend folder
3. Verify `package.json` has `start` script

### Need help?

Reference the full documentation:
- `/Users/aiden/Documents/GitHub/knockout-merch/COMPLETE_TECHNICAL_DOCUMENTATION.md`
- Section 12: Hosting & Deployment
- Section 18: Development Workflow

---

**That's it! You now have a production-ready fullstack app! 🚀**
