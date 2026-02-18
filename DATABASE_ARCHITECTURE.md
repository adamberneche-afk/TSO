# TAIS Platform - Database Architecture

## Overview

TAIS Platform uses a **two-database architecture** to separate concerns and enable independent scaling of different services.

```
┌─────────────────────────────────────────────────────────────┐
│                    TAIS PLATFORM                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────┐        ┌───────────────────┐         │
│  │  PUBLIC RAG API   │        │  REGISTRY API     │         │
│  │  (tso.onrender)   │        │  (Separate Svc)   │         │
│  └─────────┬─────────┘        └─────────┬─────────┘         │
│            │                            │                   │
│            ▼                            ▼                   │
│  ┌───────────────────┐        ┌───────────────────┐         │
│  │   tais-rag DB     │        │ tais_registry DB  │         │
│  │  ┌─────────────┐  │        │  ┌─────────────┐  │         │
│  │  │ rag_docs    │  │        │  │ skills      │  │         │
│  │  │ rag_chunks  │  │        │  │ audits      │  │         │
│  │  │ rag_usage   │  │        │  │ auth        │  │         │
│  │  │ rag_audit   │  │        │  │ configs     │  │         │
│  │  └─────────────┘  │        │  └─────────────┘  │         │
│  └───────────────────┘        └───────────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Database 1: tais-rag

**Purpose:** End-to-end encrypted document storage for Public RAG

**Service:** Public RAG API (`tso.onrender.com`)

**Tables:**
- `rag_documents` - Encrypted document metadata
- `rag_chunks` - Document chunks with embedding hashes
- `rag_user_usage` - Per-user quota tracking
- `rag_public_keys` - User public keys for sharing
- `rag_app_connections` - OAuth app integrations
- `rag_audit_logs` - Compliance logging

**Characteristics:**
- Grows with user uploads
- Stores encrypted binary data
- High write volume (document uploads)
- Can be backed up independently

**Connection String:**
```bash
postgresql://user:pass@host:5432/tais-rag?sslmode=require
```

## Database 2: tais_registry

**Purpose:** Skills registry, authentication, and platform metadata

**Service:** Main Registry API (separate deployment)

**Tables:**
- `skills` - Skill registry
- `audits` - Skill audit records
- `auth` tables - Authentication data
- `categories`, `tags` - Skill metadata
- `configurations` - User configurations

**Characteristics:**
- Smaller, metadata-focused
- Lower write volume
- Critical for platform operations
- Different backup requirements

**Connection String:**
```bash
postgresql://user:pass@host:5432/tais_registry?sslmode=require
```

## Why Two Databases?

### 1. Separation of Concerns
- **tais-rag**: Document storage (blob-like data)
- **tais_registry**: Platform registry (metadata)

### 2. Independent Scaling
- Scale RAG DB based on storage needs
- Scale Registry DB based on query volume
- Different backup strategies

### 3. Security Isolation
- Encrypted docs isolated from auth data
- Different access patterns
- Separate backup/restore procedures

### 4. Deployment Independence
- Deploy RAG service without affecting registry
- Different teams can own different services
- Easier to migrate/replace one service

## Common Mistakes to Avoid

### ❌ WRONG: Using tais_registry for RAG
```bash
# DON'T DO THIS
DATABASE_URL="postgresql://.../tais_registry"
```
This will pollute your skills database with document data.

### ✅ CORRECT: Using tais-rag for RAG
```bash
# DO THIS
DATABASE_URL="postgresql://.../tais-rag"
```

### ❌ WRONG: Running migrations on wrong DB
```bash
# DON'T DO THIS
# DATABASE_URL points to tais_registry
npx prisma migrate deploy
# Creates RAG tables in skills database!
```

### ✅ CORRECT: Verify before migrating
```bash
# Check which database
npx prisma migrate status
# Should show: PostgreSQL database "tais-rag"
```

## Deployment Checklist

### Before Deploying Public RAG
- [ ] Create separate `tais-rag` database on Render/Railway
- [ ] Create `tais_registry` database (for skills, if not exists)
- [ ] Set `RAG_DATABASE_URL` to tais-rag connection string
- [ ] Set `SKILLS_DATABASE_URL` to tais_registry connection string
- [ ] Run `npx prisma migrate status` to confirm correct DB
- [ ] Apply migrations to both databases

### Verifying Correct Setup
```bash
# Check RAG database connection
cd packages/registry
export DATABASE_URL=$RAG_DATABASE_URL

# This should show tais-rag
npx prisma migrate status
# Output: Datasource "db": PostgreSQL database "tais-rag"...

# List tables - should see rag_* tables
psql $RAG_DATABASE_URL -c "\dt"
# Should show: rag_documents, rag_chunks, rag_user_usage, etc.

# Check Skills database
psql $SKILLS_DATABASE_URL -c "\dt"
# Should show: skills, audits, auth tables, etc.
```

## Migration Strategy

### If You Applied RAG Migrations to Wrong DB

**Option 1: Keep Using Same DB (Not Recommended)**
```bash
# Just accept it - both services use one DB
# Update both services' DATABASE_URL to point to same DB
# Not ideal but works for small scale
```

**Option 2: Separate the Databases (Recommended)**
```bash
# 1. Create new tais-rag database
# 2. Copy RAG tables from tais_registry to tais-rag
# 3. Update Public RAG service to use tais-rag
# 4. Delete RAG tables from tais_registry
```

### Running Migrations Safely

Always verify before running:
```bash
# 1. Check environment
echo $DATABASE_URL
# Should contain: .../tais-rag?...

# 2. Check migration status
npx prisma migrate status
# Verify: "PostgreSQL database \"tais-rag\""

# 3. Apply migrations
npx prisma migrate deploy
```

## Cost Implications

**Separate Databases:**
- Render Free Tier: 2 free databases (1GB each)
- Can run both services on free tier
- Easy upgrade path when needed

**Combined Database:**
- Single database serves both
- Simpler but harder to scale
- Backup/restore more complex

## Monitoring

**tais-rag Metrics:**
- Storage usage (approaching 1GB limit?)
- Document upload rate
- Query performance
- Connection pool utilization

**tais_registry Metrics:**
- Connection count
- Query response time
- Skills registry health
- Auth request latency

## Environment Variables

### For Render/Railway Deployment

```bash
# RAG Database (Public RAG service)
RAG_DATABASE_URL="postgresql://user:pass@host/tais-rag?sslmode=require"

# Skills Database (Registry service)
SKILLS_DATABASE_URL="postgresql://user:pass@host/tais_registry?sslmode=require"

# Note: DATABASE_URL is used as fallback if above are not set
```

### Code Usage

```typescript
// In your routes/services
import { createRAGPrismaClient, createSkillsPrismaClient } from './config/database';

// For RAG operations
const ragPrisma = createRAGPrismaClient(logger);

// For Skills/Registry operations  
const skillsPrisma = createSkillsPrismaClient(logger);
```

## Backup Strategy

**tais-rag:**
- Daily automated backups (Render provides)
- Weekly manual dumps before major deployments
- Point-in-time recovery if needed

**tais_registry:**
- Daily automated backups
- Critical: Auth data must never be lost
- Test restore procedures regularly

## Future Considerations

### When to Merge Databases
- Small-scale MVP with <100 users
- Cost optimization needed
- Don't need independent scaling

### When to Keep Separate
- Production with 1000+ users
- Different scaling requirements
- Team separation (RAG team vs. Registry team)
- Different compliance requirements

---

**Version:** 1.0  
**Last Updated:** February 18, 2026  
**Status:** Production Architecture
