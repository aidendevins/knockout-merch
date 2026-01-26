# 📖 How to Use This Template

**Last Updated**: January 26, 2026  
**Template Location**: `/Users/aiden/Documents/GitHub/knockout-merch/starter-template`

---

## 🎯 What Is This?

This is your **reusable fullstack starter template** for quickly creating and deploying production-ready web applications.

**What's included:**
- ✅ Modern React frontend (Vite + Tailwind CSS)
- ✅ Express backend with API routes
- ✅ Beautiful landing page (ready to customize)
- ✅ Pre-configured for Vercel + Railway
- ✅ Automated setup script
- ✅ Complete documentation

**Based on**: DesignForWear (knockout-merch) architecture

---

## 🚀 Three Ways to Use This

### Option 1: Automated (Recommended) ⚡
**Time**: 2 minutes

```bash
cd /Users/aiden/Documents/GitHub/knockout-merch/starter-template
./setup-new-project.sh my-new-project
cd ../my-new-project
```

✅ Done! Everything is set up automatically.

### Option 2: Manual Copy
**Time**: 5 minutes

```bash
cp -r /Users/aiden/Documents/GitHub/knockout-merch/starter-template my-new-project
cd my-new-project
rm -rf .git  # Remove template git history
git init
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### Option 3: GitHub Template (Future)
1. Push this starter-template folder to its own GitHub repo
2. Click "Use this template" button
3. Clone your new repo
4. Run `npm install` in backend/ and frontend/

---

## 📋 Complete Workflow (Start to Deployed)

### Step 1: Create Project (2 min)
```bash
cd /Users/aiden/Documents/GitHub/knockout-merch/starter-template
./setup-new-project.sh my-awesome-app
cd ../my-awesome-app
```

### Step 2: Test Locally (3 min)
```bash
# Terminal 1 - Backend
cd backend
npm run dev
# → http://localhost:8000/health should show {"status":"ok"}

# Terminal 2 - Frontend  
cd frontend
npm run dev
# → http://localhost:5173 should show beautiful landing page
# → API status should show "✅ Connected"
```

### Step 3: Push to GitHub (1 min)

**Option A - GitHub CLI (easiest):**
```bash
gh repo create my-awesome-app --public --source=. --push
```

**Option B - Manual:**
```bash
# 1. Create repo on GitHub.com
# 2. Then:
git remote add origin https://github.com/yourusername/my-awesome-app.git
git push -u origin main
```

### Step 4: Deploy to Vercel (1 min)
1. Go to https://vercel.com/new
2. Import your GitHub repo
3. **Set Root Directory**: `frontend`
4. Click "Deploy"
5. **Copy your URL**: `https://my-awesome-app.vercel.app`

### Step 5: Deploy to Railway (2 min)
1. Go to https://railway.app/new
2. Deploy from GitHub repo
3. **Set Root Directory**: `backend`
4. **Add env var**: `FRONTEND_URL` = your Vercel URL
5. Click "Deploy"
6. **Copy your URL**: `https://my-awesome-app.up.railway.app`

### Step 6: Connect Them (30 sec)
1. Vercel → Settings → Environment Variables
2. Add: `VITE_API_URL` = `https://my-awesome-app.up.railway.app/api`
3. Redeploy

### Step 7: Verify! 🎉
Visit your Vercel URL → Should see ✅ Connected!

---

## 📁 Template Structure Explained

```
starter-template/
├── backend/                      # Express API Server
│   ├── server.js                # Main entry point
│   ├── routes/
│   │   └── api.js               # API route handlers
│   ├── package.json             # Backend dependencies
│   ├── railway.toml             # Railway deployment config
│   └── env.example              # Environment variables template
│
├── frontend/                     # React App
│   ├── src/
│   │   ├── main.jsx            # React entry point
│   │   ├── App.jsx             # Main component (landing page)
│   │   └── index.css           # Tailwind styles
│   ├── index.html              # HTML template
│   ├── package.json            # Frontend dependencies
│   ├── vite.config.js          # Vite configuration
│   ├── tailwind.config.js      # Tailwind configuration
│   ├── vercel.json             # Vercel deployment config
│   └── env.example             # Environment variables template
│
├── setup-new-project.sh         # 🚀 Automated setup script
├── .gitignore                   # Git ignore rules
│
├── README.md                    # Project overview
├── QUICK_START.md               # 5-minute deploy guide
├── DEPLOY_CHECKLIST.md          # Deployment checklist
├── DEPLOYMENT_GUIDE.md          # Visual deployment guide
└── HOW_TO_USE_THIS_TEMPLATE.md  # This file!
```

---

## 🎨 Customize Your Project

### 1. Change Landing Page Content

Edit `frontend/src/App.jsx`:

```jsx
// Line 33 - Change title
<h1 className="text-5xl sm:text-7xl font-black text-white mb-6">
  Your Project Name  {/* ← Change this */}
</h1>

// Line 40 - Change description
<p className="text-xl sm:text-2xl text-white/80 mb-12">
  Your custom description here  {/* ← Change this */}
</p>

// Line 47 - Change button text
<button>Get Started</button>  {/* ← Change this */}
```

### 2. Change Color Scheme

Edit `frontend/src/App.jsx`:

```jsx
// Line 17 - Background gradient
className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900"
// Change to your colors:
// from-blue-900 via-teal-900 to-green-900
// from-orange-900 via-red-900 to-pink-900
// from-gray-900 via-slate-900 to-zinc-900
```

### 3. Add More API Routes

Edit `backend/routes/api.js`:

```javascript
// Add new endpoint
router.get('/your-endpoint', (req, res) => {
  res.json({ message: 'Your response' });
});

// Add POST endpoint
router.post('/your-endpoint', (req, res) => {
  const data = req.body;
  // Process data
  res.json({ success: true, data });
});
```

### 4. Add New Pages

1. Create `frontend/src/pages/About.jsx`
2. Install React Router: `npm install react-router-dom`
3. Update `App.jsx` to use routing

---

## 🔧 Development Tips

### Hot Reload
Both frontend and backend have hot reload:
- **Frontend**: Changes appear instantly
- **Backend**: Auto-restarts on file changes (nodemon)

### Debugging
```bash
# Backend logs
cd backend && npm run dev
# Watch terminal for console.log() output

# Frontend debugging
# Open browser DevTools → Console tab
```

### Database (Optional)
To add PostgreSQL:

1. **Railway**: Click "+ New" → "Database" → "PostgreSQL"
2. **Backend**: Railway auto-sets `DATABASE_URL` env var
3. **Code**: Install `pg` package and connect

```javascript
// backend/db.js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
module.exports = pool;
```

---

## 📚 Next Steps After Deployment

### 1. Add Authentication
Reference: `COMPLETE_TECHNICAL_DOCUMENTATION.md` → Section 11

**Quick add:**
- JWT tokens
- Password hashing (bcrypt)
- Protected routes

### 2. Add Database
Reference: `COMPLETE_TECHNICAL_DOCUMENTATION.md` → Section 6

**Quick add:**
- PostgreSQL (Railway provides free)
- Migrations
- Models/schemas

### 3. Add Payment Processing
Reference: `COMPLETE_TECHNICAL_DOCUMENTATION.md` → Section 7

**Quick add:**
- Stripe integration
- Checkout flow
- Webhooks

### 4. Add AI Features
Reference: `COMPLETE_TECHNICAL_DOCUMENTATION.md` → Section 8

**Quick add:**
- OpenAI/Gemini API
- Image generation
- Text processing

---

## 🔄 Reusing This Template

Keep this template forever! Each time you need a new project:

```bash
cd /Users/aiden/Documents/GitHub/knockout-merch/starter-template
./setup-new-project.sh project-name-here
```

**Template is safe** - The script copies files, doesn't move them.

---

## 🆘 Troubleshooting

### Script won't run
```bash
chmod +x setup-new-project.sh
./setup-new-project.sh my-project
```

### Frontend can't connect to backend
1. Check `VITE_API_URL` in Vercel env vars
2. Must include `/api` at the end
3. Redeploy after adding env var

### Backend crashes on Railway
1. Check logs in Railway dashboard
2. Verify `railway.toml` is in backend folder
3. Ensure `package.json` has `start` script

### Port issues locally
```bash
# If port 8000 or 5173 is in use
# Backend: edit backend/.env → PORT=8001
# Frontend: edit frontend/vite.config.js → port: 5174
```

---

## 📞 Where to Get Help

1. **Your Docs**: 
   - `COMPLETE_TECHNICAL_DOCUMENTATION.md` (comprehensive)
   - All 18 sections cover different topics

2. **Quick Guides in This Template**:
   - `QUICK_START.md` - Fast deployment
   - `DEPLOY_CHECKLIST.md` - Step-by-step checklist
   - `DEPLOYMENT_GUIDE.md` - Visual diagrams

3. **Official Docs**:
   - React: https://react.dev
   - Express: https://expressjs.com
   - Vercel: https://vercel.com/docs
   - Railway: https://docs.railway.app

---

## 🎉 You're All Set!

This template is your foundation for every new project. Keep it organized, reference it often, and build amazing things!

**Happy coding! 🚀**

---

**Created**: January 2026  
**Author**: Based on DesignForWear project  
**Location**: `/Users/aiden/Documents/GitHub/knockout-merch/starter-template`
