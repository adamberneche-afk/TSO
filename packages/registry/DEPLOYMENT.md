# TAIS Registry Server - Deployment Guide

## Overview

The TAIS Registry Server is a hybrid on-chain/off-chain skill registry that provides:
- Fast search and discovery (centralized API)
- Censorship-resistant storage (IPFS + on-chain)
- Secure audit submission and verification
- Rate limiting and API key management

## Quick Start with Railway (Recommended)

Railway provides the easiest deployment with automatic HTTPS, PostgreSQL, and environment management.

### Step 1: Prerequisites

1. Create a Railway account at https://railway.app
2. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```
3. Login to Railway:
   ```bash
   railway login
   ```

### Step 2: Create Project

```bash
# Navigate to registry directory
cd packages/registry

# Initialize Railway project
railway init

# Link to existing project (if already created)
railway link
```

### Step 3: Add PostgreSQL Database

```bash
# Add PostgreSQL plugin through Railway dashboard or CLI
railway add --database postgres

# Get database URL
railway variables
```

The `DATABASE_URL` environment variable will be automatically set.

### Step 4: Deploy

```bash
# Deploy from current directory
railway up

# View deployment logs
railway logs

# Get deployment URL
railway status
```

### Step 5: Configure Environment Variables

In Railway dashboard or CLI:

```bash
railway variables set \
  NODE_ENV=production \
  JWT_SECRET=$(openssl rand -base64 32) \
  IPFS_ENABLED=true \
  IPFS_HOST=ipfs.infura.io \
  IPFS_PROJECT_ID=your_infura_id \
  IPFS_PROJECT_SECRET=your_infura_secret \
  CORS_ORIGIN=https://yourdomain.com
```

## Alternative: Vercel Deployment

Vercel is great for serverless deployments but requires some adjustments.

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Configure for Serverless

Create `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/index.js"
    }
  ],
  "env": {
    "DATABASE_URL": "@database_url"
  }
}
```

### Step 3: Deploy

```bash
vercel --prod
```

**Note:** You'll need to use an external PostgreSQL database (e.g., Supabase, Neon).

## Alternative: AWS Deployment

For production-scale deployments, AWS provides the most control.

### Architecture

```
┌─────────────┐
│   Route 53  │ (DNS)
└──────┬──────┘
       │
┌──────▼──────┐
│ CloudFront  │ (CDN)
└──────┬──────┘
       │
┌──────▼──────┐
│    ALB      │ (Load Balancer)
└──────┬──────┘
       │
┌──────▼──────┐
│    ECS      │ (Docker containers)
└──────┬──────┘
       │
┌──────▼──────┐
│    RDS      │ (PostgreSQL)
└─────────────┘
```

### Terraform Configuration

Create `infrastructure/main.tf`:

```hcl
provider "aws" {
  region = "us-east-1"
}

# VPC and Networking
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

# RDS PostgreSQL
resource "aws_db_instance" "tais_registry" {
  identifier        = "tais-registry"
  engine           = "postgres"
  engine_version   = "15.4"
  instance_class   = "db.t3.micro"
  allocated_storage = 20
  
  db_name  = "tais_registry"
  username = var.db_username
  password = var.db_password
  
  publicly_accessible = false
  skip_final_snapshot = true
}

# ECS Cluster
resource "aws_ecs_cluster" "tais" {
  name = "tais-registry"
}

# ECS Service
resource "aws_ecs_service" "registry" {
  name            = "tais-registry"
  cluster         = aws_ecs_cluster.tais.id
  task_definition = aws_ecs_task_definition.registry.arn
  desired_count   = 2
  launch_type     = "FARGATE"
}
```

Deploy with:

```bash
cd infrastructure
terraform init
terraform plan
terraform apply
```

## Database Setup

### Local Development

```bash
# Install PostgreSQL locally
# Mac
brew install postgresql
brew services start postgresql

# Create database
createdb tais_registry

# Run migrations
cd packages/registry
npx prisma migrate dev
```

### Production

Railway automatically handles migrations on deploy. For other platforms:

```bash
# Run migrations manually
npx prisma migrate deploy

# Seed database (optional)
npm run db:seed
```

## IPFS Configuration

### Option 1: Infura (Recommended)

1. Create account at https://infura.io
2. Create IPFS project
3. Copy Project ID and Project Secret
4. Add to environment variables:
   ```bash
   IPFS_ENABLED=true
   IPFS_HOST=ipfs.infura.io
   IPFS_PORT=5001
   IPFS_PROTOCOL=https
   IPFS_PROJECT_ID=your_project_id
   IPFS_PROJECT_SECRET=your_project_secret
   ```

### Option 2: Self-Hosted IPFS

```bash
# Run IPFS node locally
docker run -d --name ipfs \
  -v ipfs_data:/data/ipfs \
  -p 4001:4001 -p 5001:5001 -p 8080:8080 \
  ipfs/kubo:latest

# Configure registry to use local node
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http
```

## SSL/TLS Configuration

### Railway
SSL is automatically provided via Let's Encrypt.

### Custom Domain

```bash
# Add custom domain in Railway dashboard
railway domain

# Or configure DNS manually
# CNAME: registry.yourdomain.com → your-app.railway.app
```

### AWS Certificate Manager

```bash
# Request certificate
aws acm request-certificate \
  --domain-name registry.tais.ai \
  --validation-method DNS

# Add DNS validation records to Route 53
# Certificate will be auto-approved
```

## Monitoring & Logging

### Railway
- Logs are automatically captured
- View in Railway dashboard or CLI: `railway logs`

### Custom Monitoring

Add to environment variables:

```bash
# Enable detailed logging
LOG_LEVEL=debug

# Export to external service (optional)
DATADOG_API_KEY=your_key
NEW_RELIC_LICENSE_KEY=your_key
```

### Health Checks

The server exposes:
- `/health` - Full health check (database, IPFS)
- `/health/ready` - Kubernetes-style readiness probe
- `/health/live` - Liveness probe

## Backup Strategy

### Database Backups

Railway automatically creates daily backups. For additional safety:

```bash
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Automated backup script (run via cron)
#!/bin/bash
pg_dump $DATABASE_URL | gzip > backups/tais_$(date +%Y%m%d).sql.gz
aws s3 cp backups/ s3://tais-backups/ --recursive
```

### IPFS Pinning

Critical files should be pinned to multiple nodes:

```bash
# Pin to Pinata (free tier available)
curl -X POST https://api.pinata.cloud/pinning/pinByHash \
  -H "Authorization: Bearer YOUR_PINATA_JWT" \
  -d '{"hashToPin":"QmYourHash"}'

# Pin to your own node
ipfs pin add QmYourHash
```

## Security Checklist

- [ ] Database using SSL/TLS
- [ ] JWT secret is cryptographically random (32+ bytes)
- [ ] API keys rotated regularly
- [ ] Rate limiting enabled
- [ ] CORS restricted to specific origins
- [ ] IPFS credentials secured (not in code)
- [ ] Production logs don't expose sensitive data
- [ ] HTTPS enforced on all endpoints
- [ ] Database backups encrypted
- [ ] Admin endpoints protected

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check if migrations ran
npx prisma migrate status
```

### IPFS Connection Issues

```bash
# Test IPFS connection
curl -X POST https://ipfs.infura.io:5001/api/v0/version \
  -u "PROJECT_ID:PROJECT_SECRET"

# Check IPFS status in logs
railway logs | grep IPFS
```

### High Memory Usage

```bash
# Check memory usage
railway logs --follow | grep memory

# Scale up in Railway dashboard
# Or configure ECS task memory limits
```

## Cost Estimates

### Railway (Recommended for MVP)
- PostgreSQL: $0 (free tier: 500MB)
- Compute: $0 (free tier: 500 hours)
- Total: **$0/month** for hobby projects

### AWS (Production)
- RDS (db.t3.micro): ~$13/month
- ECS Fargate: ~$30/month (2 tasks)
- ALB: ~$16/month
- Route 53: ~$0.50/month
- Total: **~$60/month**

### Vercel + Supabase
- Vercel: $0 (free tier)
- Supabase: $0 (free tier: 500MB)
- Total: **$0/month** for hobby projects

## Support

For deployment issues:
1. Check logs: `railway logs` or platform equivalent
2. Review environment variables
3. Test database connection
4. Verify IPFS credentials
5. Check CORS configuration

For help, open an issue on GitHub or contact the TAIS team.