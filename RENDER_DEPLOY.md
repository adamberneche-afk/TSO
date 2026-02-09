# Deploy to Render

## Option A: One-Click Deploy (Easiest)

1. Push this code to GitHub (if not already)
2. Go to: https://dashboard.render.com/blueprint
3. Click **"New Blueprint Instance"**
4. Connect your GitHub repo: `YOUR_USERNAME/TSO`
5. Render will automatically:
   - Create the web service from `packages/registry`
   - Provision a free PostgreSQL database
   - Run migrations
   - Deploy the API

## Option B: Manual Deploy

1. Go to https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Configure:
   - **Name**: tais-registry
   - **Root Directory**: `packages/registry`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build && npx prisma generate && npx prisma migrate deploy`
   - **Start Command**: `npm start`
5. Click **"Create Web Service"**
6. Add PostgreSQL:
   - Click **"New +"** → **"PostgreSQL"**
   - Name it `tais-db`
   - Copy the Internal Database URL
   - Add as environment variable: `DATABASE_URL`

## Environment Variables to Set

After deployment, add these in Render Dashboard:

| Variable | Value | Required |
|----------|-------|----------|
| `IPFS_PROJECT_ID` | Your Infura Project ID | Yes |
| `IPFS_PROJECT_SECRET` | Your Infura Secret | Yes |
| `JWT_SECRET` | Auto-generated or set manually | Yes |
| `ADMIN_WALLET_ADDRESSES` | Comma-separated wallet addresses | No |

## Get Your Infura Credentials

1. Go to https://infura.io
2. Create free account
3. Create IPFS project
4. Copy Project ID and Secret
5. Add to Render environment variables

## Verify Deployment

Once deployed, your API will be at:
`https://tais-registry.onrender.com`

Check health:
```bash
curl https://tais-registry.onrender.com/api/health
```

## Troubleshooting

**Build fails?**
- Check build logs in Render dashboard
- Ensure `packages/registry/package.json` exists
- Verify Node version compatibility

**Database connection error?**
- Ensure PostgreSQL service is created
- Check `DATABASE_URL` is set correctly

**IPFS upload fails?**
- Verify Infura credentials are set
- Check IPFS is enabled in environment

## Next Steps

1. 🚀 Deploy using Option A or B
2. 🔑 Add Infura credentials
3. 🧪 Test with demo skills
4. 📊 Monitor via `/api/metrics`

---

**Need help?** Check Render docs: https://render.com/docs
