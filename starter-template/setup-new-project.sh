#!/bin/bash

# Fullstack Starter Template - Automated Setup Script
# Usage: ./setup-new-project.sh my-project-name

set -e  # Exit on error

PROJECT_NAME=$1

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if project name provided
if [ -z "$PROJECT_NAME" ]; then
  echo "Usage: ./setup-new-project.sh <project-name>"
  echo "Example: ./setup-new-project.sh my-awesome-app"
  exit 1
fi

echo -e "${BLUE}🚀 Creating new project: ${PROJECT_NAME}${NC}\n"

# 1. Create project directory
echo -e "${GREEN}1/8${NC} Creating project directory..."
mkdir -p "../$PROJECT_NAME"
cd "../$PROJECT_NAME"

# 2. Copy template files
echo -e "${GREEN}2/8${NC} Copying template files..."
cp -r ../starter-template/backend ./
cp -r ../starter-template/frontend ./
cp ../starter-template/.gitignore ./
cp ../starter-template/README.md ./

# 3. Update package.json names
echo -e "${GREEN}3/8${NC} Updating package.json files..."
sed -i '' "s/starter-backend/${PROJECT_NAME}-backend/g" backend/package.json || sed -i "s/starter-backend/${PROJECT_NAME}-backend/g" backend/package.json
sed -i '' "s/starter-frontend/${PROJECT_NAME}-frontend/g" frontend/package.json || sed -i "s/starter-frontend/${PROJECT_NAME}-frontend/g" frontend/package.json

# 4. Create environment files
echo -e "${GREEN}4/8${NC} Creating environment files..."
cp backend/env.example backend/.env
cp frontend/env.example frontend/.env.local

# 5. Initialize Git
echo -e "${GREEN}5/8${NC} Initializing Git repository..."
git init
git add .
git commit -m "Initial commit - ${PROJECT_NAME}"

# 6. Install backend dependencies
echo -e "${GREEN}6/8${NC} Installing backend dependencies..."
cd backend
npm install --silent
cd ..

# 7. Install frontend dependencies
echo -e "${GREEN}7/8${NC} Installing frontend dependencies..."
cd frontend
npm install --silent
cd ..

# 8. Done!
echo -e "\n${GREEN}✅ Project created successfully!${NC}\n"

echo -e "${BLUE}📁 Project structure:${NC}"
echo "   $PROJECT_NAME/"
echo "   ├── backend/     (Express API)"
echo "   ├── frontend/    (React + Vite)"
echo "   └── README.md"

echo -e "\n${BLUE}🎯 Next steps:${NC}"
echo "   1. Create GitHub repo:"
echo "      ${YELLOW}cd $PROJECT_NAME${NC}"
echo "      ${YELLOW}gh repo create $PROJECT_NAME --public${NC}"
echo "      ${YELLOW}git remote add origin https://github.com/yourusername/$PROJECT_NAME.git${NC}"
echo "      ${YELLOW}git push -u origin main${NC}"
echo ""
echo "   2. Deploy frontend to Vercel:"
echo "      • Go to https://vercel.com/new"
echo "      • Import your GitHub repo"
echo "      • Root Directory: ${YELLOW}frontend${NC}"
echo "      • Click Deploy"
echo ""
echo "   3. Deploy backend to Railway:"
echo "      • Go to https://railway.app/new"
echo "      • Deploy from GitHub repo"
echo "      • Root Directory: ${YELLOW}backend${NC}"
echo "      • Add PostgreSQL database (optional)"
echo "      • Click Deploy"
echo ""
echo "   4. Connect frontend to backend:"
echo "      • In Vercel, add environment variable:"
echo "        ${YELLOW}VITE_API_URL${NC} = your-railway-url"
echo "      • Redeploy frontend"
echo ""
echo -e "${BLUE}🧪 Local development:${NC}"
echo "   Backend:  cd backend && npm run dev   (http://localhost:8000)"
echo "   Frontend: cd frontend && npm run dev  (http://localhost:5173)"
echo ""
echo -e "${BLUE}📚 Reference documentation:${NC}"
echo "   ~/Documents/GitHub/knockout-merch/COMPLETE_TECHNICAL_DOCUMENTATION.md"
echo ""
echo -e "${GREEN}Happy building! 🎉${NC}\n"
