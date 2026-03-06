# RCRT Integration - Engineering Execution Plan

**Based on:** RCRT Integration PRD v2.0  
**Created:** March 5, 2026  
**Timeline:** 20 weeks (6 phases)

---

## Overview

RCRT (Right Context, Right Time) is a **locally-installed** context orchestration module that:
- Pulls context from knowledge bases
- Uses pgvector for semantic alignment
- Routes context through TAIS as gatekeeper
- Operates with local ONNX embeddings (no cloud by default)

---

## Phase 1: Database Schema & Core Infrastructure (Weeks 1-3)

### Task 1.1: Database Schema
**Assignee:** Backend  
**Estimate:** 8 hours

Create new tables in `packages/registry/prisma/schema.prisma`:

```prisma
// Knowledge Base Registry
model KBRegistry {
  id            String   @id @default(cuid())
  kbId         String   @unique
  ownerId      String
  appId        String
  contextType  ContextType @default(PUBLIC)
  attachedAt   DateTime @default(now())
  excludedFromRCRT Boolean @default(false)
  createdAt    DateTime @default(now())
  
  @@index([ownerId])
  @@index([kbId])
}

enum ContextType {
  PRIVATE
  CONFIDENTIAL
  SHARED
  PUBLIC
}

// KB Access History
model KBAccessHistory {
  id          String   @id @default(cuid())
  kbId        String
  appId       String
  grantType   GrantType
  grantedAt   DateTime
  revokedAt   DateTime?
  
  @@index([kbId])
  @@index([appId])
}

enum GrantType {
  READ
  WRITE
  CONFIDENTIAL
}

// Confidential Grants
model ConfidentialGrant {
  id          String   @id @default(cuid())
  ownerId     String
  appId       String
  grantedAt   DateTime @default(now())
  revokedAt   DateTime?
  
  @@index([ownerId])
  @@index([appId])
}

// RCRT Provisions
model RCRTProvision {
  id              String   @id @default(cuid())
  ownerId         String
  agentId         String   @unique
  jwtPublicKey    String
  provisionedAt   DateTime @default(now())
  revokedAt       DateTime?
  
  @@index([ownerId])
}

// Routing Log
model RoutingLog {
  id            String        @id @default(cuid())
  breadcrumbId  String
  targetAppId   String
  contextType   ContextType
  decision      RoutingDecision
  reason        String?
  timestamp     DateTime      @default(now())
  
  @@index([breadcrumbId])
  @@index([targetAppId])
  @@index([timestamp])
}

enum RoutingDecision {
  ALLOW
  DENY
}

// Override Audit
model OverrideAudit {
  id          String   @id @default(cuid())
  ownerId     String
  eventType   OverrideEventType
  kbId        String?
  appId       String?
  breadcrumbId String?
  oldValue    Json?
  newValue    Json?
  timestamp   DateTime @default(now())
  
  @@index([ownerId])
  @@index([eventType])
  @@index([timestamp])
}

enum OverrideEventType {
  KB_GRANTED
  KB_RESTRICTED
  BC_ACL_MODIFIED
  BC_REVOKED
}
```

- [ ] Add all new models to schema
- [ ] Create migration
- [ ] Run migration on staging
- [ ] Test on production

### Task 1.2: RCRT Provisioning Service
**Assignee:** Backend  
**Estimate:** 6 hours

Create `packages/registry/src/services/rcrtProvisionService.ts`:

```typescript
// Key methods:
- provisionRCRT(ownerId: string): Promise<RCRTProvision>
- validateProvision(agentId: string): Promise<boolean>
- revokeProvision(agentId: string): Promise<void>
- refreshProvision(ownerId: string): Promise<RCRTProvision>
```

- [ ] Implement JWT-based provisioning (RS256)
- [ ] Add 15-minute token expiry
- [ ] Implement refresh token rotation
- [ ] Add tier check (Silver/Gold only)

### Task 1.3: KB Registration API
**Assignee:** Backend  
**Estimate:** 4 hours

Update/create `packages/registry/src/routes/kb.ts`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/kb/register` | Register KB with context type |
| GET | `/api/v1/kb/:kbId` | Get KB info |
| PATCH | `/api/v1/kb/:kbId/context-type` | Update context type |
| POST | `/api/v1/kb/:kbId/exclude-rcrt` | Exclude from RCRT |
| DELETE | `/api/v1/kb/:kbId` | Unregister KB |

- [ ] Implement endpoints
- [ ] Add tier enforcement
- [ ] Add validation

---

## Phase 2: RCRT Core Service (Weeks 4-6)

### Task 2.1: RCRT Local Service Setup
**Assignee:** Backend/DevOps  
**Estimate:** 8 hours

Create `packages/rcrt-service/` (new package):

```
packages/rcrt-service/
├── src/
│   ├── main.rs           # Entry point
│   ├── config.rs         # Configuration
│   ├── db.rs             # PostgreSQL connection
│   ├── nats.rs           # NATS JetStream consumer
│   ├── embedding.rs       # ONNX embedding
│   ├── alignment.rs       # pgvector similarity
│   ├── synthesis.rs       # Breadcrumb creation
│   └── api.rs            # TAIS API client
├── Cargo.toml
├── Dockerfile
└── docker-compose.yml
```

- [ ] Set up Rust project with dependencies
- [ ] Add ONNX runtime (ort crate)
- [ ] Add pgvector client
- [ ] Add NATS client

### Task 2.2: Embedding Pipeline
**Assignee:** Backend (Rust)  
**Estimate:** 8 hours

In `packages/rcrt-service/src/embedding.rs`:

```rust
// Key functions:
- load_model() -> EmbeddingModel
- embed(text: &str) -> Vec<f32>  // 384d MiniLM L6 v2
```

- [ ] Bundle MiniLM L6 v2 ONNX model
- [ ] Implement tokenizer
- [ ] Add batch processing
- [ ] Test inference speed (<500ms target)

### Task 2.3: Alignment Scoring
**Assignee:** Backend (Rust)  
**Estimate:** 8 hours

In `packages/rcrt-service/src/alignment.rs`:

```rust
// Key functions:
- score_alignment(entry: &KBEntry) -> AlignmentResult
- find_similar(embedding: Vec<f32>, threshold: f32) -> Vec<BreadcrumbMatch>
```

- [ ] Implement pgvector cosine similarity
- [ ] Set default threshold: 0.72
- [ ] Add configurable threshold
- [ ] Implement ANN search (top 20)

### Task 2.4: NATS Event Consumer
**Assignee:** Backend (Rust)  
**Estimate:** 6 hours

In `packages/rcrt-service/src/nats.rs`:

```rust
// Subscribe to: tais.kb.events.{tenant_id}
// Event payload:
struct KBEntryUpdated {
    kb_id: String,
    entry_id: String,
    tenant_id: String,
    timestamp: DateTime<Utc>,
}
```

- [ ] Set up durable consumer
- [ ] Add ack-required processing
- [ ] Implement error handling
- [ ] Add retry logic

### Task 2.5: Breadcrumb Synthesis
**Assignee:** Backend (Rust)  
**Estimate:** 8 hours

In `packages/rcrt-service/src/synthesis.rs`:

```rust
// Key functions:
- synthesize(entry: &KBEntry, matches: Vec<BreadcrumbMatch>) -> Breadcrumb
- determine_type(sources: Vec<KBEntry>) -> ContextType  // Most restrictive wins
- check_provenance(chain: &ProvenanceChain) -> bool  // Max depth 3
```

- [ ] Implement synthesis from matched breadcrumbs
- [ ] Apply type inheritance rule
- [ ] Add provenance tracking
- [ ] Implement cycle prevention

---

## Phase 3: TAIS Gatekeeper Enforcement (Weeks 7-9)

### Task 3.1: Routing Logic
**Assignee:** Backend  
**Estimate:** 8 hours

Create `packages/registry/src/services/routingService.ts`:

```typescript
// Key function:
async function routeBreadcrumb(
  breadcrumb: Breadcrumb,
  appRegistry: AppRegistry
): Promise<RoutingDecision[]> {
  // Private: source app only
  // Confidential: apps with grant + access to ALL source KBs
  // Shared: apps on pathway + access to ALL source KBs
  // Public: all connected apps
}
```

- [ ] Implement routing by context type
- [ ] Add access history enforcement
- [ ] Add confidential grant check
- [ ] Add share pathway check
- [ ] Write to routing_log

### Task 3.2: Confidential Grant Flow
**Assignee:** Backend  
**Estimate:** 6 hours

Create/update `packages/registry/src/routes/apps.ts`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/apps/:appId/confidential-grant` | Grant confidential access |
| DELETE | `/api/v1/apps/:appId/confidential-grant` | Revoke grant |
| GET | `/api/v1/apps/:appId/access` | Get current access level |

- [ ] Implement grant flow
- [ ] Add confirmation requirement
- [ ] Write to audit log
- [ ] Update KB access history

### Task 3.3: Override System
**Assignee:** Backend  
**Estimate:** 8 hours

Create `packages/registry/src/services/overrideService.ts`:

```typescript
// Override types:
type Override = 
  | { type: 'KB_GRANTED', kbId: string, appId: string, newType: ContextType }
  | { type: 'KB_RESTRICTED', kbId: string, oldType: ContextType, newType: ContextType }
  | { type: 'BC_ACL_MODIFIED', breadcrumbId: string, appId: string, action: 'allow' | 'deny' }
  | { type: 'BC_REVOKED', breadcrumbId: string, affectedApps: string[] }
```

- [ ] Implement KB-level overrides
- [ ] Implement breadcrumb-level overrides
- [ ] Add reversal for reversible overrides
- [ ] Write immutable audit entries

### Task 3.4: Breadcrumb API Updates
**Assignee:** Backend  
**Estimate:** 4 hours

Update `packages/registry/src/routes/breadcrumbs.ts`:

- [ ] Accept new fields: context_type, source_kb_ids, source_app_ids
- [ ] Make fields immutable after creation
- [ ] Add RCRT-specific schema validation
- [ ] Add routing_log writes

### Task 3.5: Revocation Flow
**Assignee:** Backend  
**Estimate:** 4 hours

Add endpoint:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/breadcrumbs/:id/revoke` | Revoke distributed breadcrumb |

- [ ] Emit breadcrumb.revoked event
- [ ] Mark as revoked in audit
- [ ] Send to all receiving apps
- [ ] Cannot be unrevoked (irreversible)

---

## Phase 4: TAIS UI (Weeks 10-12)

### Task 4.1: RCRT Integration Panel
**Assignee:** Frontend  
**Estimate:** 8 hours

Create `tais_frontend/src/app/components/rcrt/RCRTIntegration.tsx`:

**Features:**
- Show RCRT installation status
- Install/uninstall buttons
- Local model status display
- Configuration options

**Layout:**
```
┌─────────────────────────────────────────────┐
│ RCRT - Context Orchestration               │
├─────────────────────────────────────────────┤
│ Status: [Active | Not Installed]           │
│ Local Model: [Detected: MiniLM L6 v2]      │
│ [Install RCRT]  [Configure]  [Uninstall]    │
├─────────────────────────────────────────────┤
│ Knowledge Bases:                            │
│ • KB A (Private)    [Exclude from RCRT]     │
│ • KB B (Confidential) [Manage Access]      │
│ • KB C (Shared)     [Manage Access]        │
│ • KB D (Public)     [Manage Access]        │
└─────────────────────────────────────────────┘
```

### Task 4.2: KB Context Type Management
**Assignee:** Frontend  
**Estimate:** 6 hours

Add to existing KB management UI:

- [ ] Show context type badge
- [ ] Dropdown to change type
- [ ] Warning for type changes
- [ ] Exclusion toggle

### Task 4.3: Connected App Access Levels
**Assignee:** Frontend  
**Estimate:** 6 hours

Update app detail view:

- [ ] Show current access level (Public/Confidential)
- [ ] Grant Confidential button with confirmation modal
- [ ] Show grant history
- [ ] Revoke button

### Task 4.4: Audit Log Viewer
**Assignee:** Frontend  
**Estimate:** 6 hours

Create `tais_frontend/src/app/components/audit/AuditLogViewer.tsx`:

- [ ] Filter by event type
- [ ] Filter by date range
- [ ] Filter by KB/app
- [ ] Show reversible indicators
- [ ] Reverse action buttons

---

## Phase 5: Local Model & Synthesis (Weeks 13-16)

### Task 5.1: ONNX Embedding Integration
**Assignee:** Backend (Rust)  
**Estimate:** 8 hours

- [ ] Bundle MiniLM L6 v2 model
- [ ] Implement tokenizer
- [ ] Add warm-up inference
- [ ] Test cold start <15 seconds

### Task 5.2: Local LLM Support (Optional)
**Assignee:** Backend (Rust)  
**Estimate:** 8 hours

- [ ] Detect Ollama at localhost:11434
- [ ] Add synthesis prompt templates
- [ ] Add summarization (extractive default)
- [ ] Add cloud fallback toggle (off by default)

### Task 5.3: Synthesis Templates
**Assignee:** Backend (Rust)  
**Estimate:** 4 hours

```rust
// Template-based synthesis (default):
struct SynthesisTemplate {
    summary: "Based on your context: {matched_content}",
    tags: extract_tags(matched_breadcrumbs),
    owner_signal: classify_interest(matched_breadcrumbs),
}
```

- [ ] Implement extractive summarization
- [ ] Add tag extraction
- [ ] Add owner-signal classification

---

## Phase 6: Testing & Rollout (Weeks 17-20)

### Task 6.1: Unit Tests
**Assignee:** Backend  
**Estimate:** 8 hours

- [ ] Test routing logic (all context types)
- [ ] Test type inheritance (most restrictive wins)
- [ ] Test confidential grant flow
- [ ] Test override system
- [ ] Test revocation

### Task 6.2: Integration Tests
**Assignee:** Backend  
**Estimate:** 8 hours

- [ ] Test RCRT → TAIS event flow
- [ ] Test KB exclusion → breadcrumb deletion
- [ ] Test full synthesis pipeline
- [ ] Test routing_log writes

### Task 6.3: E2E Tests
**Assignee:** QA  
**Estimate:** 8 hours

- [ ] Test complete user flows
- [ ] Test RCRT installation
- [ ] Test confidential grant
- [ ] Test revocation

### Task 6.4: Security Audit
**Assignee:** Security  
**Estimate:** 16 hours

- [ ] Penetration testing
- [ ] JWT validation
- [ ] Tenant isolation verification
- [ ] Routing enforcement verification

### Task 6.5: Performance Testing
**Assignee:** DevOps  
**Estimate:** 8 hours

- [ ] 10k events/hour load test
- [ ] KB event → processing <2s
- [ ] Full synthesis <5s
- [ ] ONNX cold start <15s

### Task 6.6: Staged Rollout
**Assignee:** DevOps  
**Estimate:** 8 hours

| Week | Target | Criteria |
|------|--------|----------|
| 17 | Gold tier | Error rate <1% |
| 18 | Silver tier | Error rate <0.5% |
| 19-20 | Full rollout | Error rate <0.1% |

- [ ] Deploy to staging
- [ ] Gold tier deployment
- [ ] Silver tier deployment
- [ ] Full rollout
- [ ] Rollback plan tested

---

## File Checklist

### New Backend Files
```
packages/registry/
├── prisma/
│   └── schema.prisma (update)
├── src/
│   ├── services/
│   │   ├── rcrtProvisionService.ts (NEW)
│   │   ├── routingService.ts (NEW)
│   │   └── overrideService.ts (NEW)
│   └── routes/
│       ├── kb.ts (update)
│       ├── apps.ts (update)
│       └── breadcrumbs.ts (update)
```

### New RCRT Service
```
packages/rcrt-service/ (NEW - Rust)
├── Cargo.toml
├── Dockerfile
├── docker-compose.yml
└── src/
    ├── main.rs
    ├── config.rs
    ├── db.rs
    ├── nats.rs
    ├── embedding.rs
    ├── alignment.rs
    ├── synthesis.rs
    └── api.rs
```

### New Frontend Files
```
tais_frontend/src/
├── app/
│   └── components/
│       ├── rcrt/
│       │   └── RCRTIntegration.tsx (NEW)
│       └── audit/
│           └── AuditLogViewer.tsx (NEW)
```

---

## API Endpoints Summary

### New Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/rcrt/provision` | Issue provisioning token |
| GET | `/api/v1/rcrt/status` | Get RCRT status |
| POST | `/api/v1/kb/register` | Register KB with type |
| PATCH | `/api/v1/kb/:id/context-type` | Update context type |
| POST | `/api/v1/kb/:id/exclude-rcrt` | Exclude from RCRT |
| POST | `/api/v1/apps/:id/confidential-grant` | Grant confidential |
| DELETE | `/api/v1/apps/:id/confidential-grant` | Revoke grant |
| GET | `/api/v1/audit/overrides` | Get override audit log |
| POST | `/api/v1/breadcrumbs/:id/revoke` | Revoke breadcrumb |

### Modified Endpoints
| Method | Endpoint | Changes |
|--------|----------|---------|
| POST | `/api/v1/breadcrumbs` | New fields required |

---

## Dependencies

### Infrastructure
- [ ] PostgreSQL with pgvector extension
- [ ] NATS JetStream server
- [ ] Docker/Docker Compose

### External Services
- [ ] TAIS Platform (existing)
- [ ] OpenRouter API (optional, cloud synthesis)

### npm/Rust Packages
```toml
# Rust (Cargo.toml)
ort = "1.0"  # ONNX runtime
pgvector = "0.2"
nats = "0.24"
tokio = "1.0"
axum = "0.7"
serde = "1.0"
```

---

## Environment Variables (RCRT Service)

```env
# TAIS
TAIS_API_URL=https://tso.onrender.com
TAIS_API_KEY=...

# Database
DATABASE_URL=postgresql://...

# NATS
NATS_URL=nats://localhost:4222

# Local Model
EMBED_MODEL_PATH=./models/minilm-l6-v2.onnx
EMBED_TOKENIZER_PATH=./models/tokenizer.json
EMBED_PROVIDER=local  # or 'remote'

# Local LLM (optional)
OLLAMA_URL=http://localhost:11434
USE_CLOUD_LLM=false

# Security
LOCAL_KEK_BASE64=...  # Optional: envelope encryption key
```

---

## Acceptance Criteria Checklist

### Context Type Enforcement
- [ ] Private → source app only (0 others)
- [ ] Confidential → apps with grant + KB access
- [ ] Shared → apps on pathway + KB access
- [ ] Public → all connected apps
- [ ] Synthesis inherits most restrictive type

### Performance
- [ ] KB event → RCRT processing <2s
- [ ] Alignment scoring <500ms
- [ ] Breadcrumb creation <1s
- [ ] Full event → routed <5s
- [ ] KB exclusion → deletion <60s

### Local Model
- [ ] Zero cloud calls by default
- [ ] ONNX load <3s
- [ ] Service cold start <15s
- [ ] Cloud opt-in requires explicit toggle

### Security
- [ ] RS256 JWT provisioning
- [ ] Tenant isolation via RLS
- [ ] TLS 1.3 on all traffic
- [ ] Audit log immutable

---

## Rollback Plan

| Scenario | Rollback |
|----------|----------|
| RCRT service failure | Disable RCRT in TAIS, events queue in NATS |
| Routing bug | Revert code, redeploy |
| Data breach | Revoke all provisions, reset routing |
| Performance degradation | Roll back to previous version |
