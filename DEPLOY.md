# TAIS Frontend Deployment Guide

This guide covers deploying the TAIS Interview Wizard to production.

## Quick Deploy (Vercel - Recommended)

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/thinksystem/TSO&root-directory=tais-frontend)

### Option 2: Manual Deployment

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from project root**
   ```bash
   cd /path/to/TSO
   vercel --prod
   ```

4. **Set Environment Variables**
   
   In Vercel Dashboard:
   - Go to Project Settings > Environment Variables
   - Add the following:

   | Variable | Value | Environment |
   |----------|-------|-------------|
   | `NEXT_PUBLIC_REGISTRY_URL` | `https://tso.onrender.com` | All |
   | `NEXT_PUBLIC_RPC_URL` | `https://cloudflare-eth.com` | All |
   | `NEXT_PUBLIC_GENESIS_CONTRACT` | `0x11B3EfbF04F0bA505F380aC20444B6952970AdA6` | All |

5. **Redeploy**
   ```bash
   vercel --prod
   ```

## Environment Variables

### Required

```bash
NEXT_PUBLIC_REGISTRY_URL=https://tso.onrender.com
NEXT_PUBLIC_RPC_URL=https://cloudflare-eth.com
NEXT_PUBLIC_GENESIS_CONTRACT=0x11B3EfbF04F0bA505F380aC20444B6952970AdA6
```

### What Each Variable Does

- **NEXT_PUBLIC_REGISTRY_URL**: Backend API endpoint for skills registry
- **NEXT_PUBLIC_RPC_URL**: Ethereum RPC for wallet connections
- **NEXT_PUBLIC_GENESIS_CONTRACT**: THINK Genesis NFT contract address

## Build Configuration

The project uses static export (`output: 'export'`) which generates:
- Static HTML files
- Optimized assets
- No server-side rendering required

### Build Output

```
tais-frontend/dist/
├── index.html          # Landing page
├── interview/          # Interview wizard
├── _next/              # Next.js assets
└── ...
```

## Local Testing Before Deploy

1. **Install dependencies**
   ```bash
   cd tais-frontend
   npm install
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env.local
   ```

3. **Build locally**
   ```bash
   npm run build
   ```

4. **Verify build output**
   ```bash
   ls dist/
   ```

5. **Test static files**
   ```bash
   npx serve dist
   ```

## Deployment Checklist

- [ ] Environment variables set in Vercel Dashboard
- [ ] Registry API is accessible (https://tso.onrender.com/health)
- [ ] Build completes without errors
- [ ] All routes work (/, /interview)
- [ ] Monaco Editor loads correctly
- [ ] MetaMask connection works
- [ ] Skills load from registry
- [ ] JSON preview displays correctly

## Troubleshooting

### Build Errors

**Error: "Cannot find module '@monaco-editor/react'"**
- Solution: Run `npm install` in tais-frontend directory

**Error: "window is not defined"**
- Solution: Ensure components using `window` have "use client" directive

### Runtime Errors

**Skills not loading**
- Check `NEXT_PUBLIC_REGISTRY_URL` is correct
- Verify registry is up: `curl https://tso.onrender.com/health`

**MetaMask not connecting**
- Ensure you're on HTTPS (required for MetaMask)
- Check browser console for errors

**Monaco Editor not loading**
- Check browser network tab for blocked requests
- Ensure no CSP headers blocking scripts

## Performance Optimization

### Already Configured

- ✅ Static export for fast CDN delivery
- ✅ Image optimization disabled (for static export)
- ✅ Code splitting by route
- ✅ Lazy loading for Monaco Editor

### Manual Optimizations

1. **Enable Vercel Analytics**
   ```bash
   vercel analytics enable
   ```

2. **Enable Vercel Speed Insights**
   - Dashboard > Speed Insights > Enable

## Custom Domain (Optional)

1. **Add Domain in Vercel**
   - Dashboard > Domains > Add
   - Enter your domain (e.g., `tais.think.dev`)

2. **Update DNS**
   - Add CNAME record pointing to `cname.vercel-dns.com`

3. **Wait for SSL**
   - Vercel auto-provisions SSL certificates
   - Usually takes 1-2 minutes

## Monitoring

### Vercel Dashboard

- **Deployments**: View all deployments and logs
- **Analytics**: Traffic and performance metrics
- **Speed Insights**: Core Web Vitals
- **Logs**: Real-time function logs

### External Monitoring

Recommended tools:
- UptimeRobot (free tier)
- Pingdom
- StatusCake

## Rollback

If deployment fails:

1. **Via Dashboard**
   - Go to Deployments
   - Find previous working deployment
   - Click "..." > "Promote to Production"

2. **Via CLI**
   ```bash
   vercel rollback
   ```

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Issues**: Create GitHub issue in TSO repository

---

## Production Checklist Summary

1. ✅ Environment variables configured
2. ✅ Build successful locally
3. ✅ Deployed to Vercel
4. ✅ Custom domain (optional)
5. ✅ SSL certificate active
6. ✅ Analytics enabled
7. ✅ Monitoring configured

**Status**: Ready for production 🚀
