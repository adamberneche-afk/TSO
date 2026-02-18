# Public RAG - Quick Deployment Checklist

Use this checklist during deployment to ensure nothing is missed.

## Pre-Flight Checks

### ⚠️ DATABASE ARCHITECTURE (TWO SEPARATE DATABASES)

**CRITICAL: The Public RAG service uses a DIFFERENT database from the skills registry**

**Database 1: `tais-rag`** ← Use THIS ONE for Public RAG
- Purpose: Encrypted documents, chunks, audit logs
- Service: Public RAG API (tso.onrender.com)
- Tables: rag_documents, rag_chunks, rag_user_usage, etc.

**Database 2: `tais_registry`** ← NOT for this service
- Purpose: Skills registry, authentication, NFT data
- Service: Main registry API (different deployment)
- Tables: skills, audits, auth tables, etc.

### Database Setup for Public RAG
- [ ] PostgreSQL instance running and accessible
- [ ] **Database `tais-rag` created** (NOT tais_registry!)
- [ ] Connection string points to `tais-rag`
- [ ] Connection string tested: `psql $DATABASE_URL -c "SELECT 1"`
- [ ] SSL configured for production
- [ ] Verified migrations will run on `tais-rag`

### Object Storage (Choose One)
**Option A: Supabase Storage (Free 1GB - Recommended for MVP)**
- [ ] Supabase account created
- [ ] New project created
- [ ] Storage bucket created: `tais-rag-documents`
- [ ] S3 credentials generated (Settings → API → S3 Credentials)
- [ ] Endpoint: `https://[project-ref].supabase.co/storage/v1/s3`

**Option B: Database Storage (Zero Cost - Simplest MVP)**
- [ ] Set `RAG_STORAGE_PROVIDER=database`
- [ ] Documents stored as base64 in PostgreSQL
- [ ] Limited by database size (Render free: 1GB, paid: more)

**Option C: Cloudflare R2 (Production)**
- [ ] Requires payment method
- [ ] Cloudflare R2 bucket created: `tais-rag-documents`
- [ ] API token generated
- [ ] Endpoint URL: `https://[account-id].r2.cloudflarestorage.com`

### Environment Variables
**Required:**
- [ ] `RAG_DATABASE_URL` - PostgreSQL connection string for **tais-rag**
  - Example: `postgresql://user:pass@host/tais-rag?sslmode=require`
  - ⚠️ Must point to tais-rag database
- [ ] `SKILLS_DATABASE_URL` - PostgreSQL connection string for **tais_registry**
  - Example: `postgresql://user:pass@host/tais_registry?sslmode=require`
  - Stores skills, auth, configurations
- [ ] `JWT_SECRET` - 32+ character random string
- [ ] `JWT_EXPIRES_IN` - `7d` (or as needed)
- [ ] `CORS_ORIGIN` - Production frontend domain(s)

**Legacy (fallback if above not set):**
- [ ] `DATABASE_URL` - Single database mode (not recommended for production)

**Storage (Choose One):**

**Option 1 - Database Storage (Simplest):**
- [ ] `RAG_STORAGE_PROVIDER=database`

**Option 2 - Supabase Storage:**
- [ ] `RAG_STORAGE_ENDPOINT` - `https://[project-ref].supabase.co/storage/v1/s3`
- [ ] `RAG_STORAGE_REGION` - `ap-southeast-1` (or your region)
- [ ] `RAG_STORAGE_ACCESS_KEY` - Supabase S3 access key
- [ ] `RAG_STORAGE_SECRET_KEY` - Supabase S3 secret key
- [ ] `RAG_STORAGE_BUCKET` - `tais-rag-documents`

**Option 3 - R2/S3:**
- [ ] `RAG_STORAGE_ENDPOINT` - Your endpoint URL
- [ ] `RAG_STORAGE_REGION` - `auto` (for R2) or region
- [ ] `RAG_STORAGE_ACCESS_KEY` - Your access key
- [ ] `RAG_STORAGE_SECRET_KEY` - Your secret key
- [ ] `RAG_STORAGE_BUCKET` - Bucket name

### Hosting Platform
- [ ] Account created (Render/Railway/VPS)
- [ ] Git repository connected
- [ ] Auto-deploy configured or manual deploy ready

---

## Deployment Steps

### 1. Database Migration (5 mins)
```bash
cd packages/registry
npm install
npx prisma generate
npx prisma migrate deploy
```
- [ ] Migration shows: `20250218000000_add_rag_tables`
- [ ] No errors in output
- [ ] `npx prisma migrate status` shows all migrations applied

### 2. Deploy Backend (10 mins)
- [ ] Environment variables added to hosting platform
- [ ] Sensitive variables marked as secret
- [ ] Deploy triggered
- [ ] Build succeeds (no TypeScript errors)
- [ ] Service starts without crashes

### 3. Verify Backend (5 mins)
```bash
# Test health endpoint
curl https://api.tais.io/health
```
- [ ] Returns `{"status": "healthy"}`
- [ ] Response time < 500ms

```bash
# Test quota endpoint (with valid JWT)
curl https://api.tais.io/api/v1/rag/quota \
  -H "Authorization: Bearer YOUR_JWT"
```
- [ ] Returns quota information
- [ ] No errors

### 4. Deploy Frontend (10 mins)
```bash
cd tais_frontend
npm install
# Set NEXT_PUBLIC_API_URL to production API
npm run build
# Deploy to Vercel/Netlify
```
- [ ] Build succeeds
- [ ] Environment variables configured
- [ ] Deployment successful

### 5. Enable Feature Flag (2 mins)
- [ ] `NEXT_PUBLIC_ENABLE_PUBLIC_RAG=true` set in production
- [ ] Public RAG tab visible in UI
- [ ] No console errors

---

## End-to-End Testing (15 mins)

### User Flow Test
- [ ] Open app in browser
- [ ] Connect wallet
- [ ] Navigate to Public RAG tab
- [ ] Generate key pair (click "Initialize")
- [ ] Upload a test document (< 1MB)
- [ ] Wait for upload to complete (progress bar reaches 100%)
- [ ] Search for document content
- [ ] Verify results appear
- [ ] Verify decryption works (content readable)
- [ ] Check "My Documents" tab shows uploaded document

### Security Verification
- [ ] Open browser DevTools → Network tab
- [ ] Upload another document
- [ ] Inspect upload request payload
- [ ] ✅ Verify data is encrypted (not plaintext)
- [ ] ✅ Verify server only receives: `encryptedData`, `iv`, `salt`, `embeddingHashes`
- [ ] Check R2 bucket (should see binary encrypted data, not text)

### Quota Test
- [ ] Check quota display shows correct tier
- [ ] Verify storage used updated after upload
- [ ] Verify can't exceed tier limits

---

## Monitoring Setup (10 mins)

### Alerts to Configure
- [ ] Database connection failures
- [ ] R2 storage errors
- [ ] API error rate > 5%
- [ ] Response time > 2 seconds
- [ ] Disk space > 80% full

### Health Checks
- [ ] Uptime monitoring: `https://api.tais.io/health`
- [ ] Frequency: Every 5 minutes
- [ ] Alert on 2 consecutive failures

---

## Post-Deployment Sign-Off

**Technical Lead:**
- [ ] All tests passed
- [ ] No critical errors in logs
- [ ] Performance acceptable (<2s search, <5s upload)
- [ ] Security verified

**Product Owner:**
- [ ] Feature works as expected
- [ ] UI/UX acceptable
- [ ] Documentation complete

**Security Review:**
- [ ] E2EE verified (server never sees plaintext)
- [ ] Authentication working
- [ ] Rate limiting active
- [ ] No sensitive data in logs

---

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Infrastructure | | |
| Backend Dev | | |
| Frontend Dev | | |
| Security | | |
| Product | | |

---

## Rollback Instructions

**If critical issues found:**

1. **Disable feature immediately:**
   ```bash
   # Update frontend env
   NEXT_PUBLIC_ENABLE_PUBLIC_RAG=false
   # Redeploy frontend
   ```

2. **Rollback backend (if needed):**
   ```bash
   git revert HEAD
git push
   ```

3. **Database (only if migration caused issues):**
   ```bash
   npx prisma migrate resolve --rolled-back 20250218000000_add_rag_tables
   ```

---

## Notes

**Deployment Date:** ___________

**Deployed By:** ___________

**Issues Encountered:**
- 
- 
- 

**Follow-up Tasks:**
- 
- 
- 

---

**Checklist Version:** 1.0  
**Last Updated:** February 18, 2026
