# Deployment Readiness Checklist

Use this checklist before deploying TAIS Registry to production.

## ✅ Pre-Deployment Checks

### Environment Setup
- [ ] All environment variables configured in `.env`
- [ ] Database URL is correct and accessible
- [ ] JWT_SECRET is strong (>= 32 characters) and unique
- [ ] Node.js version >= 18.0.0
- [ ] IPFS credentials configured (if using IPFS)
- [ ] Blockchain RPC URL configured (if using on-chain features)

### Database
- [ ] Database migrations applied: `npx prisma migrate deploy`
- [ ] Prisma client generated: `npx prisma generate`
- [ ] Database connection verified
- [ ] Test data cleaned from production database
- [ ] Database backups configured

### Code Quality
- [ ] All TypeScript compilation errors resolved: `npm run build`
- [ ] All tests passing: `npm test`
- [ ] Code coverage >= 80%
- [ ] No ESLint errors: `npm run lint`
- [ ] Pre-flight checks passing: `npm run preflight`

### Security
- [ ] JWT_SECRET changed from default value
- [ ] Helmet security middleware enabled
- [ ] Rate limiting configured
- [ ] CORS origins restricted (not `*`)
- [ ] No hardcoded secrets in code
- [ ] npm audit vulnerabilities resolved: `npm audit fix`
- [ ] API key authentication configured (if needed)

### Build & Deployment
- [ ] Build artifacts created: `npm run build`
- [ ] Docker image builds successfully: `docker build -t tais-registry .`
- [ ] Health check endpoint responds: `/health`
- [ ] All API endpoints tested locally
- [ ] Database connection pool configured
- [ ] Logging configured (Winston)

### Infrastructure
- [ ] Hosting provider selected (Railway/Vercel/AWS)
- [ ] Domain name configured (if using custom domain)
- [ ] SSL/TLS certificates configured
- [ ] CDN configured for static assets (optional)
- [ ] Monitoring and alerting set up
- [ ] Log aggregation configured

## 🔍 Pre-Flight Check Script

Run the automated pre-flight check:

```bash
npm run preflight
```

This validates:
- ✅ Node.js version (>= 18)
- ✅ Environment variables
- ✅ Database connection
- ✅ Database migrations
- ✅ Prisma client
- ✅ Build artifacts
- ✅ Security headers
- ✅ Dependencies (npm audit)
- ✅ SSL certificates

## 🚀 Deployment Steps

### Option 1: Railway (Recommended for MVP)

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Link Project**
   ```bash
   cd packages/registry
   railway link
   ```

3. **Configure Environment Variables**
   ```bash
   railway variables set DATABASE_URL="your_db_url"
   railway variables set JWT_SECRET="your_secret"
   railway variables set NODE_ENV="production"
   ```

4. **Deploy**
   ```bash
   railway up
   ```

5. **Verify Deployment**
   ```bash
   railway status
   curl https://your-app.railway.app/health
   ```

### Option 2: Manual Deployment

1. **Prepare Environment**
   ```bash
   npm ci --production
   npm run build
   npx prisma migrate deploy
   npx prisma generate
   ```

2. **Start Server**
   ```bash
   NODE_ENV=production npm start
   ```

3. **Verify Health**
   ```bash
   curl http://localhost:3000/health
   ```

## ✅ Post-Deployment Verification

### Immediate Checks (within 5 minutes)
- [ ] Server responds to health check
- [ ] Database connection stable
- [ ] Logs show no errors
- [ ] SSL certificate valid (if using HTTPS)

### Short-term Checks (within 1 hour)
- [ ] API endpoints responding correctly
- [ ] Database queries performing well
- [ ] Memory usage stable
- [ ] Error rate is zero

### Long-term Monitoring (ongoing)
- [ ] Response times < 200ms
- [ ] Database connection pool healthy
- [ ] Disk usage < 80%
- [ ] Memory usage < 80%
- [ ] Zero unhandled exceptions
- [ ] Uptime > 99.9%

## 🚨 Rollback Plan

If deployment fails:

1. **Immediate Rollback**
   ```bash
   # Railway
   railway rollback

   # Docker
   docker-compose down
   docker-compose up -d previous-version
   ```

2. **Verify Rollback**
   - Check `/health` endpoint
   - Verify database state
   - Test critical API endpoints

3. **Investigate Issues**
   - Check application logs
   - Review error tracking (Sentry)
   - Analyze metrics dashboard

## 📊 Success Metrics

Deployment is successful when:
- ✅ All health checks pass
- ✅ Response time < 200ms (p95)
- ✅ Zero 5xx errors
- ✅ Database queries < 50ms average
- ✅ Memory usage < 512MB

## 🆘 Emergency Contacts

- **Database Issues:** Check Railway dashboard or AWS RDS
- **Deployment Failures:** Review Railway/Vercel/AWS logs
- **Security Incidents:** Rotate JWT_SECRET immediately
- **Performance Issues:** Scale horizontally or vertically

## 📝 Notes

- Keep this checklist updated as the application evolves
- Run pre-flight checks before every deployment
- Document any issues encountered
- Update runbooks based on incidents
- Review checklist quarterly

---

**Last Updated:** February 5, 2026
**Version:** 1.0.0