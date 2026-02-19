# Public RAG Deployment Guide

## Executive Summary

The Public RAG system has been **successfully deployed to production** on Render. This guide documents the deployment configuration and current operational status.

**Status:** ✅ DEPLOYED AND LIVE  
**Service URL:** https://tso.onrender.com  
**Deployment Date:** February 19, 2026  
**Version:** 2.5.0  
**Port:** 10000  
**Frontend:** https://taisplatform.vercel.app

---

## Pre-Deployment Checklist

### 1. Infrastructure Requirements

#### Database Architecture (TWO SEPARATE DATABASES)

**TAIS Platform uses two separate PostgreSQL databases:**

**Database 1: `tais-rag`** (Public RAG Documents)
- Stores encrypted documents, chunks, audit logs
- Purpose: End-to-end encrypted document storage
- Tables: rag_documents, rag_chunks, rag_user_usage, rag_public_keys, rag_app_connections, rag_audit_logs

**Database 2: `tais_registry`** (Skills & Registry)
- Stores skills, auth, NFT data, configurations
- Purpose: Core platform registry and authentication
- Tables: skills, audits, auth tables, configurations

**Why Two Databases?**
- Separation of concerns (documents vs. registry)
- Different scaling patterns (RAG grows with user data, registry is metadata)
- Security isolation (encrypted docs separate from auth data)
- Easier backup strategies

**Connection String Formats:**
```bash
# Public RAG Database (for this service)
RAG_DATABASE_URL="postgresql://user:pass@host:5432/tais-rag?schema=public&sslmode=require"

# Skills/Registry Database (for this service)
SKILLS_DATABASE_URL="postgresql://user:pass@host:5432/tais_registry?schema=public&sslmode=require"

# Legacy fallback (single database mode)
# DATABASE_URL="postgresql://user:pass@host:5432/tais-rag?schema=public&sslmode=require"
```

#### Object Storage (Cloudflare R2 Recommended)
Cloudflare R2 is recommended over AWS S3 due to:
- No egress fees (crucial for encrypted document downloads)
- S3-compatible API
- Better pricing for our use case

**R2 Setup Steps:**
1. Create Cloudflare account
2. Navigate to R2 in dashboard
3. Create bucket: `tais-rag-documents`
4. Go to "Manage API Tokens"
5. Create token with permissions:
   - Object Read & Write
   - Bucket Read
6. Note:
   - Endpoint URL: `https://[account-id].r2.cloudflarestorage.com`
   - Access Key ID
   - Secret Access Key

**Alternative: AWS S3**
- Standard setup
- Be aware of egress fees (~$0.09/GB)
- Use S3 Transfer Acceleration for global users

#### Hosting Platform
**Recommended Options:**
1. **Render** (Easiest)
   - Native PostgreSQL support
   - Easy environment variable management
   - Automatic HTTPS
   - Free tier for testing

2. **Railway** (Developer-friendly)
   - PostgreSQL included
   - Great developer experience
   - Auto-deploy from Git

3. **VPS/Dedicated** (Maximum control)
   - AWS EC2, DigitalOcean, Hetzner
   - Requires manual setup
   - Best for high-scale production

---

## Deployment Steps

### Step 1: Environment Configuration

Create `.env.production` in `packages/registry/`:

**✅ WORKING PRODUCTION CONFIGURATION:**
```bash
# Server Configuration
NODE_ENV=production
PORT=10000
LOG_LEVEL=info

# Dual-Database Configuration (REQUIRED - WORKING)
# RAG Database - Stores encrypted documents, chunks, audit logs
RAG_DATABASE_URL="postgresql://public_rag_user:HIe8HmUXOGyb9S5v9WfKLQQgBMnqWONl@dpg-d6au87vpm1nc73djp6t0-a.oregon-postgres.render.com/public_rag?sslmode=require"

# Skills Database - Stores skills registry, auth, configurations
SKILLS_DATABASE_URL="postgresql://user:pass@host/tais_registry?sslmode=require"

# RAG Storage Options:

## Option A: Database Storage (RECOMMENDED - CURRENTLY DEPLOYED)
# Stores encrypted documents directly in PostgreSQL
# ✅ ZERO COST MVP - Currently in production
RAG_STORAGE_PROVIDER=database

## Option B: Supabase Storage (Free 1GB)
# RAG_STORAGE_ENDPOINT=https://[project-ref].supabase.co/storage/v1/s3
# RAG_STORAGE_REGION=ap-southeast-1
# RAG_STORAGE_ACCESS_KEY=your_supabase_key
# RAG_STORAGE_SECRET_KEY=your_supabase_secret
# RAG_STORAGE_BUCKET=tais-rag-documents

## Option C: Cloudflare R2 (Production)
# RAG_STORAGE_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
# RAG_STORAGE_REGION=auto
# RAG_STORAGE_ACCESS_KEY=your_r2_key
# RAG_STORAGE_SECRET_KEY=your_r2_secret
# RAG_STORAGE_BUCKET=tais-rag-documents

# JWT Configuration (REQUIRED)
JWT_SECRET=your_super_secret_jwt_key_min_32_chars_long
JWT_EXPIRES_IN=7d

# Blockchain (REQUIRED)
RPC_URL=https://cloudflare-eth.com
STAKING_CONTRACT_ADDRESS=0x08071901A5C4D2950888Ce2b299bBd0e3087d101

# NFT Contract Addresses (REQUIRED)
GENESIS_NFT_ADDRESS=0x11B3EfbF04F0bA505F380aC20444B6952970AdA6
PUBLISHER_NFT_ADDRESS=0x11B3EfbF04F0bA505F380aC20444B6952970AdA6
AUDITOR_NFT_ADDRESS=0x11B3EfbF04F0bA505F380aC20444B6952970AdA6

# Rate Limiting (Optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Admin (Optional)
ADMIN_WALLET_ADDRESSES=0x123...,0x456...

# CORS (Adjust for production domain)
# ✅ CONFIGURED AND WORKING
CORS_ORIGIN="https://taisplatform.vercel.app"

# JWT (REQUIRED)
JWT_SECRET="your-secret"
JWT_EXPIRES_IN=7d
```

**Security Notes:**
- Use strong JWT_SECRET (32+ random characters)
- Never commit `.env.production` to Git
- Rotate R2 keys periodically
- Use separate R2 buckets for staging/production

### Step 2: Database Migration

**⚠️ CRITICAL: Apply migrations to BOTH databases**

The Public RAG service uses dual-database architecture.

```bash
cd packages/registry

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Deploy migrations to RAG database
export DATABASE_URL=$RAG_DATABASE_URL
npx prisma migrate deploy
# Verify: Should show "PostgreSQL database \"tais-rag\""

# Deploy migrations to Skills database  
export DATABASE_URL=$SKILLS_DATABASE_URL
npx prisma migrate deploy
# Verify: Should show "PostgreSQL database \"tais_registry\""

# Reset for normal operation
unset DATABASE_URL
```

**Expected Output:**
```
Datasource "db": PostgreSQL database "tais-rag", schema "public"

Following migration(s) have been applied:
- 20250210000000_init
- 20250211120000_add_auth_tables
- 20250213000000_add_token_blacklist
- 20250218000000_add_rag_tables  ← This creates the RAG tables
- 20260212143257_add_agent_configurations
- 20250218000000_add_rag_tables  ✓ NEW
```

**Verify Tables Created:**
```sql
\dt
-- Should show: rag_documents, rag_chunks, rag_user_usage, rag_public_keys, etc.
```

### Step 3: Deploy Backend

#### Option A: Render (Recommended)

1. **Create New Web Service**
   - Connect GitHub repository
   - Select branch: `main`
   - Root directory: `packages/registry`
   - Build command: `npm install && npx prisma generate && npm run build`
   - Start command: `npm start`

2. **Add PostgreSQL**
   - Create new PostgreSQL instance
   - Copy internal connection string
   - Add to environment variables as `DATABASE_URL`

3. **Configure Environment Variables**
   - Add all variables from `.env.production`
   - Mark `JWT_SECRET` and `RAG_STORAGE_SECRET_KEY` as sensitive

4. **Deploy**
   - Auto-deploy on push or manual deploy
   - Monitor logs for errors

#### Option B: Railway

1. **Create Project**
   - Deploy from GitHub repo
   - Add PostgreSQL plugin
   - Environment variables auto-configured

2. **Add Environment Variables**
   - Manually add RAG storage credentials
   - Add JWT secret

3. **Deploy**
   - Automatic deployment

#### Option C: VPS (Ubuntu 22.04)

```bash
# SSH to server
ssh user@your-server.com

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Clone repository
git clone https://github.com/your-org/tais.git
cd tais/packages/registry

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with production values

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate deploy

# Build
npm run build

# Install PM2 for process management
sudo npm install -g pm2

# Start with PM2
pm2 start dist/index.js --name tais-registry
pm2 startup
pm2 save

# Setup Nginx reverse proxy (optional but recommended)
sudo apt install nginx
# Configure /etc/nginx/sites-available/tais-api
sudo systemctl restart nginx

# Setup SSL with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.tais.io
```

### Step 4: Verify Deployment

**Health Check:**
```bash
curl https://api.tais.io/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2026-02-18T...",
  "version": "1.0.0"
}
```

**Test RAG Endpoints:**
```bash
# Get quota (requires valid JWT)
curl https://api.tais.io/api/v1/rag/quota \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected response:
{
  "walletAddress": "0x...",
  "tier": "BRONZE",
  "storageUsed": 0,
  "storageLimit": 1073741824,
  "embeddingsThisMonth": 0,
  "embeddingsLimit": 100000,
  "queriesToday": 0,
  "queriesLimit": 1000
}
```

**Test Authentication:**
```bash
# Should return 401 without token
curl https://api.tais.io/api/v1/rag/documents

# Should work with valid token
curl https://api.tais.io/api/v1/rag/documents \
  -H "Authorization: Bearer VALID_JWT"
```

### Step 5: Frontend Configuration

Update `tais_frontend/.env.production`:

```bash
# API URL
NEXT_PUBLIC_API_URL=https://api.tais.io

# Enable Public RAG
NEXT_PUBLIC_ENABLE_PUBLIC_RAG=true

# Optional: Feature flags
NEXT_PUBLIC_ENABLE_APP_RAG=false
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

**Build and Deploy Frontend:**
```bash
cd tais_frontend
npm install
npm run build

# Deploy to Vercel/Netlify
vercel --prod
# or
netlify deploy --prod
```

---

## Post-Deployment Verification

### 1. End-to-End Test

**Test Script:**
```typescript
// Test complete flow
async function testPublicRAG() {
  const signer = await getSigner();
  
  // 1. Initialize encryption
  const encryption = getE2EEEncryptionService();
  await encryption.initialize(signer);
  console.log('✓ Key pair generated');
  
  // 2. Register public key
  const client = getPublicRAGClient({
    apiUrl: 'https://api.tais.io',
    walletAddress: await signer.getAddress()
  });
  await client.registerPublicKey(encryption.getPublicKey());
  console.log('✓ Public key registered');
  
  // 3. Upload document
  const content = 'Test document for Public RAG';
  const encrypted = await encryption.encrypt(content, signer);
  const doc = await client.uploadDocument({
    encryptedData: encrypted.encrypted,
    iv: encrypted.iv,
    salt: encrypted.salt,
    chunkCount: 1,
    isPublic: false,
    tags: ['test']
  });
  console.log('✓ Document uploaded:', doc.documentId);
  
  // 4. Search
  const results = await client.search({ query: 'Test' });
  console.log('✓ Search results:', results.length);
  
  // 5. Decrypt results
  if (results.length > 0) {
    const decrypted = await encryption.decrypt(
      results[0].encryptedContent,
      results[0].iv,
      results[0].salt,
      signer
    );
    console.log('✓ Decrypted:', decrypted === content ? 'SUCCESS' : 'FAILED');
  }
}
```

### 2. Security Verification

**Checklist:**
- [ ] Verify encrypted data in R2 (should be binary, not readable)
- [ ] Check database - only hashes, no plaintext
- [ ] Test rate limiting (make 100+ rapid requests)
- [ ] Verify JWT required for all endpoints
- [ ] Test CORS - should reject requests from unauthorized domains
- [ ] Verify server never receives plaintext (inspect network tab)

### 3. Performance Testing

**Load Test:**
```bash
# Install k6
brew install k6

# Run load test
cat > rag-load-test.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10 },
    { duration: '5m', target: 10 },
    { duration: '2m', target: 20 },
    { duration: '5m', target: 20 },
    { duration: '2m', target: 0 },
  ],
};

export default function() {
  let res = http.get('https://api.tais.io/api/v1/rag/quota', {
    headers: { 'Authorization': 'Bearer TEST_TOKEN' }
  });
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
EOF

k6 run rag-load-test.js
```

---

## Monitoring & Maintenance

### Essential Monitoring

**Set up alerts for:**
1. **Database Connection Failures**
2. **R2 Storage Errors**
3. **High Error Rates** (>5% of requests)
4. **Rate Limit Violations**
5. **Quota Exceeded Events**

**Recommended Tools:**
- **Sentry** - Error tracking
- **Datadog/NewRelic** - APM and monitoring
- **UptimeRobot** - Health check monitoring
- **LogRocket** - Frontend session replay

### Daily Checks

```bash
# Database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('tais_registry'));"

# R2 storage usage
aws s3 ls s3://tais-rag-documents --recursive --summarize

# Recent errors
curl -s https://api.tais.io/health | jq
```

### Backup Strategy

**Database:**
- Daily automated backups (Render/Railway provide this)
- Weekly manual dumps for disaster recovery

**R2 Storage:**
- Enable object versioning
- Cross-region replication (for enterprise tier)
- Monthly integrity checks

---

## Rollback Plan

### If Issues Arise:

**Option 1: Disable Public RAG Feature**
```bash
# Update frontend env
NEXT_PUBLIC_ENABLE_PUBLIC_RAG=false

# Rebuild and deploy frontend
# Private RAG continues working (no backend needed)
```

**Option 2: Rollback Backend**
```bash
# Revert to previous commit
git revert HEAD

# Rebuild and redeploy
```

**Option 3: Database Rollback**
```bash
# If migration caused issues
npx prisma migrate resolve --rolled-back 20250218000000_add_rag_tables
```

---

## Cost Estimates

### Monthly Costs (1,000 Active Users)

| Component | Service | Cost |
|-----------|---------|------|
| Database | Render PostgreSQL (Starter) | $15 |
| Storage | Cloudflare R2 (100GB) | $0 |
| API Hosting | Render (Standard) | $25 |
| Bandwidth | R2 Egress (100GB) | $0 |
| Monitoring | Sentry (Developer) | $0 |
| **Total** | | **$40/month** |

### Scaling Estimates

| Users | Storage | Monthly Cost |
|-------|---------|--------------|
| 1,000 | 100 GB | $40 |
| 10,000 | 1 TB | $100 |
| 50,000 | 5 TB | $300 |
| 100,000 | 10 TB | $500 |

---

## Troubleshooting

### Common Issues

**1. Migration Fails**
```bash
# Check migration status
npx prisma migrate status

# Reset and reapply (DANGER - data loss)
npx prisma migrate reset

# Or mark as rolled back
npx prisma migrate resolve --rolled-back [migration_name]
```

**2. R2 Connection Errors**
- Verify endpoint URL format
- Check access key permissions
- Ensure bucket exists and is accessible
- Test with AWS CLI: `aws s3 ls s3://tais-rag-documents --endpoint-url=https://...`

**3. JWT Authentication Fails**
- Verify JWT_SECRET matches between auth service and RAG
- Check token expiration
- Ensure `Authorization` header format: `Bearer TOKEN`

**4. CORS Errors**
- Update CORS_ORIGIN in environment
- Include `https://` prefix
- Add all subdomains used by frontend

---

## Success Criteria

**Deployment is successful when:**

1. ✅ Database migration applied without errors
2. ✅ Health check returns 200 OK
3. ✅ JWT authentication works for all endpoints
4. ✅ Document upload succeeds (<5s for 1MB)
5. ✅ Search returns results (<2s)
6. ✅ Client-side decryption works
7. ✅ Server never receives plaintext (verified)
8. ✅ Rate limiting active
9. ✅ Quota enforcement working
10. ✅ No CORS errors in browser

---

## Support & Escalation

**If deployment fails:**
1. Check logs: `render logs --tail` or `pm2 logs`
2. Verify environment variables are set
3. Test database connection: `npx prisma db pull`
4. Test R2 connection: Use AWS CLI test command
5. Check rate limiting isn't blocking requests

**Emergency Contacts:**
- Infrastructure: [Your DevOps contact]
- Security: [Your security contact]
- Product: [Your product contact]

---

**Document Version:** 2.0  
**Last Updated:** February 19, 2026  
**Status:** ✅ DEPLOYED AND LIVE  
**Service URL:** https://tso.onrender.com  
**Health Check:** https://tso.onrender.com/health
