# Fullstack Starter Template

A production-ready fullstack application starter with:
- **Frontend**: React + Vite + Tailwind CSS → Deployed on Vercel
- **Backend**: Express + PostgreSQL → Deployed on Railway
- **Beautiful Landing Page** ready to customize

## 🚀 Quick Deploy (5 minutes)

### Prerequisites
- Node.js 18+
- Git
- GitHub account
- Vercel account (free)
- Railway account (free)

### Deploy Steps

1. **Create New Project from This Template**
   ```bash
   # Run the automated setup script
   ./setup-new-project.sh my-awesome-project
   ```

2. **Push to GitHub**
   ```bash
   cd my-awesome-project
   git remote add origin https://github.com/yourusername/my-awesome-project.git
   git push -u origin main
   ```

3. **Deploy Frontend (Vercel)**
   - Go to https://vercel.com/new
   - Import your GitHub repo
   - Root Directory: `frontend`
   - Click "Deploy"
   - Done! ✅

4. **Deploy Backend (Railway)**
   - Go to https://railway.app/new
   - Click "Deploy from GitHub repo"
   - Select your repo
   - Root Directory: `backend`
   - Add PostgreSQL database (click "+ New")
   - Click "Deploy"
   - Done! ✅

5. **Connect Frontend to Backend**
   - In Vercel, add environment variable:
     - `VITE_API_URL` = Your Railway backend URL
   - Redeploy frontend
   - Done! ✅

---

## 📁 Project Structure

```
my-awesome-project/
├── backend/
│   ├── server.js          # Express server
│   ├── routes/
│   │   └── api.js         # API routes
│   ├── package.json
│   └── railway.toml       # Railway config
├── frontend/
│   ├── src/
│   │   ├── main.jsx       # Entry point
│   │   ├── App.jsx        # Landing page
│   │   └── index.css      # Tailwind styles
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json        # Vercel config
├── setup-new-project.sh   # Automated setup script
└── README.md
```

---

## 🎨 Customize Your Landing Page

Edit `frontend/src/App.jsx` to customize:
- Hero section
- Features
- Call-to-action
- Colors and branding

---

## 🔧 Local Development

```bash
# Backend (runs on http://localhost:8000)
cd backend
npm install
npm run dev

# Frontend (runs on http://localhost:5173)
cd frontend
npm install
npm run dev
```

---

## 🌍 Environment Variables

### Backend (.env)
```env
PORT=8000
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/mydb
```

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:8000/api
```

---

## 📚 Reference

This template is based on the architecture from:
`/Users/aiden/Documents/GitHub/knockout-merch/COMPLETE_TECHNICAL_DOCUMENTATION.md`

Refer to that document for:
- Authentication setup
- Database migrations
- Payment integration
- AI services
- Advanced features

---

## 🎯 Next Steps

1. ✅ Deploy (done with this template)
2. Add authentication (reference: Section 11 of docs)
3. Add database models (reference: Section 6 of docs)
4. Build your features
5. Scale and iterate

---

## 📦 Reusable Template

Keep this template as your starter for future projects!

To start a new project:
```bash
./setup-new-project.sh new-project-name
cd new-project-name
# Customize and deploy
```

---

**Created**: January 2026
**Based on**: DesignForWear (knockout-merch) architecture
