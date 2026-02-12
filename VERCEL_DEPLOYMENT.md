# 🚀 VERCEL DEPLOYMENT GUIDE

**Date:** February 13, 2026  
**Status:** Ready for Deployment  
**Frontend:** Vite + React + TypeScript  
**Backend:** Already deployed on Render ✅

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### ✅ Backend Status
- [x] Render deployment: **LIVE** (https://tso.onrender.com)
- [x] Registry API: **OPERATIONAL**
- [x] Health check: **PASSING**
- [x] CORS configured for Vercel domains

### ✅ Frontend Configuration
- [x] `vercel.json` configured (framework: vite)
- [x] Environment variables set
- [x] Build command: `npm run build`
- [x] Output directory: `dist`

---

## 🚀 DEPLOYMENT OPTIONS

### Option 1: Vercel CLI (Recommended)

**Step 1: Install Vercel CLI**
```bash
npm i -g vercel
```

**Step 2: Login to Vercel**
```bash
vercel login
```

**Step 3: Deploy**
```bash
# From project root
vercel --prod

# Or specify directory
vercel --prod ./tais-frontend
```

**Configuration:**
- Framework Preset: Vite
- Build Command: `cd tais-frontend && npm run build`
- Output Directory: `tais-frontend/dist`
- Install Command: `cd tais-frontend && npm install`

---

### Option 2: Git Integration (GitHub)

**Step 1: Connect Repository**
1. Go to https://vercel.com/dashboard
2. Click "Add New Project"
3. Import GitHub repository
4. Select the TSO repository

**Step 2: Configure Build Settings**
```
Framework Preset: Vite
Root Directory: ./tais-frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

**Step 3: Environment Variables**
Add these in Vercel dashboard:
```
VITE_REGISTRY_URL=https://tso.onrender.com
VITE_RPC_URL=https://cloudflare-eth.com
VITE_GENESIS_CONTRACT=0x11B3EfbF04F0bA505F380aC20444B6952970AdA6
```

**Step 4: Deploy**
- Click "Deploy"
- Vercel will build and deploy automatically

---

### Option 3: Vercel Dashboard (Manual)

**Step 1: Upload Files**
1. Go to https://vercel.com/dashboard
2. Click "Add New Project"
3. Select "Import Git Repository" or "Upload"

**Step 2: Configure**
```
Project Name: tais-frontend
Framework: Vite
Root Directory: tais-frontend
```

**Step 3: Build Settings**
Same as Option 2 above.

**Step 4: Deploy**
Click "Deploy" button.

---

## ⚙️ ENVIRONMENT VARIABLES

### Required Variables

```bash
# Registry API (your Render deployment)
VITE_REGISTRY_URL=https://tso.onrender.com

# Blockchain RPC
VITE_RPC_URL=https://cloudflare-eth.com

# NFT Contract
VITE_GENESIS_CONTRACT=0x11B3EfbF04F0bA505F380aC20444B6952970AdA6
```

### Setting in Vercel Dashboard

1. Go to Project Settings → Environment Variables
2. Add each variable
3. Select environments (Production, Preview, Development)
4. Save

---

## 🔧 BUILD CONFIGURATION

### vite.config.ts
Make sure your Vite config is correct:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 3000,
  }
})
```

### package.json scripts

```json
{
  "scripts": {
    "build": "vite build",
    "dev": "vite",
    "preview": "vite preview"
  }
}
```

---

## ✅ POST-DEPLOYMENT VERIFICATION

### Step 1: Health Check
```bash
curl https://your-vercel-domain.vercel.app/health
```
Expected: `200 OK`

### Step 2: API Connection Test
Open browser console and verify:
```javascript
// Should log successful connection
fetch('https://tso.onrender.com/health')
  .then(r => r.json())
  .then(data => console.log('Backend:', data))
```

### Step 3: Wallet Connection Test
- Open deployed site
- Click "Connect Wallet"
- Verify MetaMask popup appears

### Step 4: Registry API Test
- Navigate to skills list
- Verify skills load from backend

---

## 🌐 CUSTOM DOMAIN (Optional)

### Step 1: Add Domain in Vercel
1. Project Settings → Domains
2. Enter your domain: `tais.io` or `app.tais.io`
3. Follow DNS configuration instructions

### Step 2: DNS Configuration
Add these records to your DNS provider:

```
Type: A
Name: @ or app
Value: 76.76.21.21 (Vercel's IP)

Or CNAME:
Name: @ or app
Value: cname.vercel-dns.com
```

### Step 3: SSL Certificate
Vercel automatically provisions SSL certificates.

---

## 🚨 TROUBLESHOOTING

### Issue: Build Fails
**Solution:**
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: CORS Errors
**Solution:**
- Verify backend CORS_ORIGIN includes Vercel domain
- Check backend is running: `curl https://tso.onrender.com/health`

### Issue: Environment Variables Not Loading
**Solution:**
- Prefix with `VITE_` (Vite requirement)
- Redeploy after adding variables
- Check variable names match code exactly

### Issue: 404 on Refresh
**Solution:**
Add to `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 📊 DEPLOYMENT STATUS

### Backend (Render)
- ✅ **Status:** LIVE
- ✅ **URL:** https://tso.onrender.com
- ✅ **Health:** PASSING

### Frontend (Vercel)
- ⏳ **Status:** READY TO DEPLOY
- ⏳ **URL:** Pending (will be assigned after deploy)
- ⏳ **Build:** CONFIGURED

---

## 🎯 QUICK START COMMANDS

### Deploy Now
```bash
# Option 1: CLI (fastest)
npx vercel --prod

# Option 2: Git push (if connected)
git push origin main
```

### Verify Deployment
```bash
# Check build
npm run build

# Preview locally
npm run preview

# Deploy
vercel --prod
```

---

## 📞 SUPPORT

If deployment fails:
1. Check Vercel dashboard logs
2. Verify environment variables
3. Test build locally: `npm run build`
4. Check backend is running

---

**Status:** ✅ **READY TO DEPLOY**  
**Estimated Time:** 2-3 minutes  
**Next Step:** Run `npx vercel --prod`

**🚀 LET'S GET THE FRONTEND LIVE! 🚀**
