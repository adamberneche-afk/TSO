# Pre-Flight Checks Documentation

## Overview

Pre-flight checks ensure the TAIS Registry is ready for deployment by validating:
- Environment configuration
- Database state
- Security posture
- Build artifacts
- Dependencies

## Quick Start

```bash
# Run all pre-flight checks
npm run preflight

# Run deployment readiness check (includes security audit and migration verification)
npm run deploy:check

# Run individual checks
npm run security:audit    # Security audit only
npm run db:verify         # Database migration verification only
npm run security:check    # npm audit only
```

## Available Checks

### 1. Pre-Flight Check (`npm run preflight`)

Comprehensive validation before deployment:

| Check | Description | Critical? |
|-------|-------------|-----------|
| **Node Version** | Verifies Node.js >= 18.0.0 | ✅ Yes |
| **Environment Variables** | Validates all required env vars | ✅ Yes |
| **JWT Secret** | Checks secret length and default values | ✅ Yes |
| **Database Connection** | Tests PostgreSQL connectivity | ✅ Yes |
| **Database Migrations** | Ensures all migrations applied | ✅ Yes |
| **Prisma Client** | Verifies client is generated | ✅ Yes |
| **Build Artifacts** | Checks dist/ folder exists | ✅ Yes |
| **Security Headers** | Confirms Helmet middleware | ✅ Yes |
| **Dependencies** | Runs npm audit | ⚠️ Warn |
| **SSL Certificates** | Checks SSL configuration | ⚠️ Warn |
| **Port Availability** | Verifies configured port | ℹ️ Info |
| **Disk Space** | Checks available disk space | ℹ️ Info |

**Usage:**
```bash
npm run preflight
```

**Example Output:**
```
🔍 TAIS Registry Pre-Flight Checks

✓ Node Version
  ✅ Node v18.17.0 (>= 18.0.0)

✓ Environment Variables
  ✅ All required variables set

✓ Database Connection
  ✅ Successfully connected

...

📊 Summary:
  ✅ Passed: 12
  ❌ Failed: 0
  ⚠️  Warnings: 0

✅ All critical checks passed! Ready for deployment.
```

### 2. Security Audit (`npm run security:audit`)

Scans for security vulnerabilities:

| Check | Description | Severity |
|-------|-------------|----------|
| **Hardcoded Secrets** | Searches for passwords, API keys in code | Critical |
| **Environment Files** | Verifies .env files are in .gitignore | Critical |
| **npm Audit** | Checks for vulnerable dependencies | Critical/High |
| **Risky Dependencies** | Flags potentially dangerous packages | Medium |
| **Security Headers** | Confirms Helmet, CORS, rate limiting | High |
| **Debug Code** | Finds debugger statements and TODOs | Medium |
| **Docker Security** | Checks Dockerfile best practices | Medium |
| **Sensitive Files** | Ensures no secrets in repo | Critical |

**Usage:**
```bash
npm run security:audit
```

**Example Output:**
```
🔒 Security Audit

✓ Hardcoded Secrets [CRITICAL]
  No hardcoded secrets found in source code

✓ Environment Files [HIGH]
  1 .env file(s) found

✗ npm audit [CRITICAL]
  2 critical vulnerabilities found

📊 Summary:
  ✅ Passed: 5
  ❌ Critical: 1
  ❌ High: 0
  ⚠️  Warnings: 2

❌ Critical security issues found! Fix before deploying.
```

### 3. Database Verification (`npm run db:verify`)

Validates database state:

- ✅ Database connectivity
- ✅ Migration status
- ✅ Failed migration detection
- ✅ Required tables exist
- ✅ Schema version check

**Usage:**
```bash
npm run db:verify
```

**Example Output:**
```
🔍 Verifying Database Migrations

✅ Database connection successful
✅ 12 migration(s) found

📋 Recent Migrations:
  ✓ 20240205120000_init - 2/5/2024, 12:00:00 PM
  ✓ 20240205130000_add_skills - 2/5/2024, 1:00:00 PM

✅ All required tables exist

✅ Database verification passed!
```

### 4. Deployment Checklist

Manual checklist for human verification:

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

## Pre-Deployment Workflow

### Automated Checks

```bash
# 1. Run pre-flight checks
npm run preflight

# 2. Run security audit
npm run security:audit

# 3. Verify database
npm run db:verify

# 4. Run tests
npm test

# 5. Build application
npm run build

# Or run all at once:
npm run predeploy
```

### Manual Checklist

- [ ] Review [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- [ ] Check environment variables in production
- [ ] Verify SSL certificates
- [ ] Confirm monitoring is set up
- [ ] Test rollback procedure

## Environment Configuration

### Required Environment Variables

```bash
# Core
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=your-super-secret-key-min-32-chars

# Optional but Recommended
LOG_LEVEL=info
CORS_ORIGIN=https://yourdomain.com

# IPFS (if enabled)
IPFS_ENABLED=true
IPFS_HOST=ipfs.infura.io
IPFS_PROJECT_ID=your_id
IPFS_PROJECT_SECRET=your_secret

# Blockchain (if enabled)
RPC_URL=https://...
PUBLISHER_NFT_ADDRESS=0x...
AUDITOR_NFT_ADDRESS=0x...
```

### Environment Validation

The application validates environment variables on startup using Zod schema validation:

```typescript
// src/config/env.ts
import { env } from './config/env';

// Throws error if validation fails
console.log(env.DATABASE_URL); // Validated and typed
```

Validation includes:
- Required fields
- Type checking
- Format validation (URLs, addresses)
- Length constraints (JWT_SECRET >= 32 chars)
- Production-specific rules

## CI/CD Integration

### GitHub Actions

Pre-flight checks run automatically on every PR:

```yaml
# .github/workflows/test.yml
jobs:
  preflight:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run pre-flight checks
        run: npm run preflight
      - name: Security audit
        run: npm run security:audit
      - name: Verify database
        run: npm run db:verify
```

### Deployment Gate

Prevent deployment if checks fail:

```bash
# deploy.sh
#!/bin/bash

npm run deploy:check
if [ $? -ne 0 ]; then
  echo "Pre-flight checks failed. Aborting deployment."
  exit 1
fi

# Continue with deployment...
railway up
```

## Troubleshooting

### Common Issues

**1. Database Connection Failed**
```
❌ Database Connection
  Failed to connect
  Details: P1001: Can't reach database server
```

**Solution:**
- Check DATABASE_URL format
- Verify PostgreSQL is running
- Check network connectivity
- Confirm database exists

**2. JWT Secret Too Short**
```
❌ JWT Secret Strength
  JWT_SECRET must be at least 32 characters
```

**Solution:**
```bash
# Generate secure secret
openssl rand -base64 32
```

**3. Missing Migrations**
```
⚠️  Database Migrations
  No migrations found. Run: npx prisma migrate deploy
```

**Solution:**
```bash
npx prisma migrate deploy
```

**4. Security Vulnerabilities**
```
❌ npm audit [CRITICAL]
  2 critical vulnerabilities found
```

**Solution:**
```bash
# Fix automatically
npm audit fix

# Or update specific packages
npm update package-name
```

### Debug Mode

Run checks with detailed output:

```bash
# Debug mode
DEBUG=preflight npm run preflight

# Verbose tests
npm test -- --verbose

# Show all logs
npm run preflight 2>&1 | tee preflight.log
```

## Best Practices

1. **Always run pre-flight checks before deploying**
2. **Never ignore critical security issues**
3. **Keep dependencies updated**
4. **Use strong, unique secrets**
5. **Test in staging first**
6. **Have rollback plan ready**

## Extending Pre-Flight Checks

Add custom checks to `scripts/preflight.ts`:

```typescript
private async checkCustomRequirement() {
  // Your custom check
  if (requirementMet) {
    this.addResult('Custom Check', 'pass', '✅ Requirement met');
  } else {
    this.addResult('Custom Check', 'fail', '❌ Requirement not met');
  }
}
```

## References

- [Deployment Guide](./DEPLOYMENT.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Testing Guide](./TESTING.md)
- [Prisma Documentation](https://www.prisma.io/docs)
- [npm Audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)

---

**Last Updated:** February 5, 2026
**Version:** 1.0.0