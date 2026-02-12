# 🚀 VERCEL DEPLOYMENT - QUICK START

## Backend Status: ✅ LIVE ON RENDER
**URL:** https://tso.onrender.com

---

## ⚡ DEPLOY TO VERCEL (Choose One)

### Option A: CLI (Fastest - 2 minutes)
```bash
# From project root directory
npx vercel --prod

# When prompted:
# - Set framework to Vite
# - Root directory: tais-frontend
# - Build command: npm run build
# - Output: dist
```

### Option B: GitHub Integration
```bash
# Push to GitHub
git add .
git commit -m "Ready for Vercel deployment"
git push origin main

# Then go to https://vercel.com/dashboard
# Import your GitHub repo
```

---

## ⚙️ ENVIRONMENT VARIABLES (Add in Vercel Dashboard)

```
VITE_REGISTRY_URL=https://tso.onrender.com
VITE_RPC_URL=https://cloudflare-eth.com
VITE_GENESIS_CONTRACT=0x11B3EfbF04F0bA505F380aC20444B6952970AdA6
```

**How:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable above
3. Save and redeploy

---

## ✅ VERIFICATION

After deployment, verify:
1. ✅ Site loads (no 404s)
2. ✅ Wallet connect button works
3. ✅ Skills load from backend
4. ✅ MetaMask popup appears

---

## 🛠️ WHAT I FIXED

✅ **vercel.json** - Changed framework from "nextjs" to "vite"  
✅ **Build config** - Pointed to correct output directory (dist)  
✅ **Deployment guide** - Created complete step-by-step instructions

---

**Status:** ✅ Ready for Vercel  
**Action:** Run `npx vercel --prod` now  
**ETA:** 2-3 minutes to live

**🚀 GO FOR VERCEL DEPLOYMENT! 🚀**
