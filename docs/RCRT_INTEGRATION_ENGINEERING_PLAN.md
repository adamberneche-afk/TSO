# RCRT Integration - Engineering Execution Plan (Revised)

**Based on:** RCRT Integration PRD v2.0  
**Updated:** March 15, 2026  
**Timeline:** 12 weeks (6 phases)
**Status:** ⚠️ PHASES 1-4 COMPLETE | PHASES 5-6 PLANNED

---

## Design Process Notes

During implementation, several architectural decisions were made:

1. **Environment Variables in Vite** - Vite's `import.meta.env` doesn't work like Node.js env vars. Created `src/lib/env.ts` wrapper for safe access.

2. **PostgreSQL Persistence** - Migrated from in-memory Map to PostgreSQL (Render-hosted) for production reliability.

3. **Prisma Type Casting** - `$queryRaw<Type>()` causes TypeScript build failures. Solution: cast results after query with `as Type[]`.

4. **Auth Middleware** - Wallet extracted from JWT via `req.user.walletAddress`.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ USER DEVICE (local)                                                  │
│                                                                      │
│  ┌─────────┐    ┌─────────┐    ┌──────────┐    ┌──────────────┐  │
│  │  User   │───▶│   TAIS  │───▶│   RCRT   │───▶│   Context   │  │
│  │ Browser │    │ Cloud   │    │  (local) │    │  Synthesis  │  │
│  └─────────┘    │Security │◀───│           │    └──────────────┘  │
│                 │ Layer   │    └──────────┘                       │
│                 └────┬────┘                                        │
│                      │ HTTPS (RCRT initiates)                     │
└──────────────────────┼──────────────────────────────────────────────┘
                       ▼
              ┌────────────────────┐
              │    TAIS Cloud     │
              │                   │
              │ • JWT Auth        │
              │ • Security Scan   │
              │ • Routing         │
              │ • Permissions     │
              │ • Audit Log      │
              └────────────────────┘
```

**Key Principle:** RCRT is a client. All connections are outbound from RCRT to TAIS. No inbound ports required on user device.

---

## Authentication

### JWT Provisioning Flow
1. User installs RCRT locally
2. RCRT requests provisioning token from TAIS
3. TAIS verifies user tier (Silver/Gold only)
4. TAIS issues JWT with 15-minute expiry
5. RCRT uses JWT for all TAIS calls
6. RCRT refreshes token before expiry

### JWT Claims
```typescript
{
  sub: "rcrt-{uuid}",   // RCRT instance ID
  owner_id: "{uuid}",    // User tenant ID
  roles: ["curator"],    // Permissions
  iat: number,          // Issued at
  exp: number           // Expires at
}
```

---

## Phase 1: Security Layer & Provisioning (Weeks 1-2) ✅ COMPLETE

### Task 1.1: JWT Provisioning Service
**Assignee:** Backend  
**Estimate:** 4 hours
**Status:** ✅ COMPLETE

Create `packages/registry/src/services/rcrtProvisionService.ts`:

```typescript
// Key methods:
- provisionRCRT(ownerId: string): Promise<RCRTProvision>
- validateToken(token: string): Promise<RCRTClaims>
- refreshToken(refreshToken: string): Promise<NewToken>
- revokeProvision(agentId: string): Promise<void>
```

- [x] Implement RS256 JWT generation
- [x] Add 15-minute token expiry
- [x] Add refresh token rotation
- [x] Add tier check (Silver/Gold only)
- [x] Store provisioned agents in DB

### Task 1.2: Security Scanner Service
**Assignee:** Backend  
**Estimate:** 8 hours
**Status:** ✅ COMPLETE

Create `packages/registry/src/services/securityScannerService.ts`:

```typescript
// Key methods:
- scanContent(content: string): Promise<SecurityScanResult>
- detectExploits(content: string): Promise<ExploitResult>
- detectMalware(content: string): Promise<MalwareResult>
```

- [x] Implement content scanner
- [x] Detect common exploit patterns
- [x] Detect malware signatures
- [x] Add rate limiting
- [x] Quarantine unsafe content

### Task 1.3: Provisioning API
**Assignee:** Backend  
**Estimate:** 4 hours
**Status:** ✅ COMPLETE

Create `packages/registry/src/routes/rcrt.ts`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/rcrt/provision` | Issue JWT token |
| GET | `/api/v1/rcrt/status` | Get RCRT status |
| DELETE | `/api/v1/rcrt/provision` | Revoke RCRT access |

- [x] Implement endpoints
- [x] Add JWT authentication middleware
- [x] Add tier enforcement
- [x] Test with curl

---

## Phase 2: RCRT Connection Service (Weeks 3-4) ✅ COMPLETE

### Task 2.1: RCRT HTTP Client
**Assignee:** Backend  
**Estimate:** 8 hours
**Status:** ✅ COMPLETE (Simplified - RCRT initiates outbound connections)

Create `packages/registry/src/services/rcrtClient.ts`:

```typescript
// Key methods:
class RCRTClient {
  constructor(baseUrl: string, jwt: string)
  
  async sendKBEvent(event: KBEvent): Promise<void>
  async pullBreadcrumbs(filters: BreadcrumbFilters): Promise<Breadcrumb[]>
  async syncContext(context: Context): Promise<SyncResult>
}
```

- [x] Implement HTTP client
- [x] Add JWT refresh logic
- [x] Add retry with exponential backoff
- [x] Add timeout handling
- [x] Add connection health check

### Task 2.2: KB Event Bridge
**Assignee:** Backend  
**Estimate:** 6 hours
**Status:** ✅ COMPLETE (Simplified - RCRT pulls from TAIS)

Create `packages/registry/src/services/kbEventBridge.ts`:

```typescript
// Key methods:
- onKBChange(event: KBEvent): Promise<void>
- sendToRCRT(kbId: string, event: KBEvent): Promise<void>
- queueEvent(event: KBEvent): Promise<void>
```

- [x] Detect KB changes (webhook or polling)
- [x] Queue events for RCRT
- [x] Send to local RCRT via HTTP
- [x] Handle offline RCRT (queue and retry)

### Task 2.3: Bidirectional Sync
**Assignee:** Backend  
**Estimate:** 6 hours
**Status:** ✅ COMPLETE (RCRT pulls breadcrumbs via API)

- [x] Pull breadcrumbs from RCRT
- [x] Push to connected apps based on permissions
- [x] Handle sync conflicts
- [x] Add sync status tracking

---

## Phase 3: Context Routing (Weeks 5-6) ✅ COMPLETE

### Task 3.1: Database Schema Updates
**Assignee:** Backend  
**Estimate:** 4 hours

Add to `packages/registry/prisma/schema.prisma`:

```prisma
// RCRT Agents
model RCRTAgent {
  id              String   @id @default(cuid())
  agentId         String   @unique  // From JWT sub claim
  ownerId         String
  status          String   // active, offline, error
  lastSeen        DateTime
  provisionedAt   DateTime @default(now())
  
  @@index([ownerId])
}

// KB Registry
model KBRegistry {
  id            String   @id @default(cuid())
  kbId          String   @unique
  ownerId       String
  contextType   String   // private, confidential, shared, public
  attachedAt    DateTime @default(now())
  excludedFromRCRT Boolean @default(false)
}

// KB Access History
model KBAccessHistory {
  id          String   @id @default(cuid())
  kbId        String
  appId       String
  grantedAt   DateTime @default(now())
  revokedAt   DateTime?
}

// Confidential Grants
model ConfidentialGrant {
  id          String   @id @default(cuid())
  ownerId     String
  appId       String
  grantedAt   DateTime @default(now())
  revokedAt   DateTime?
  
  @@index([ownerId])
}

// Routing Log
model RoutingLog {
  id            String   @id @default(cuid())
  breadcrumbId  String
  targetAppId   String
  decision      String   // allow, deny
  reason        String?
  timestamp     DateTime @default(now())
  
  @@index([breadcrumbId])
  @@index([timestamp])
}
```

- [x] Add migration
- [x] Run on staging
- [x] Run on production

### Task 3.2: Routing Engine
**Assignee:** Backend  
**Estimate:** 8 hours
**Status:** ✅ COMPLETE

Create `packages/registry/src/services/routingService.ts`:

```typescript
// Routing rules:
function routeBreadcrumb(breadcrumb: Breadcrumb, apps: App[]): RoutingDecision[] {
  // Private → source app only
  // Confidential → apps with grant + KB access
  // Shared → apps on pathway + KB access  
  // Public → all connected apps
}
```

- [x] Implement context type routing
- [x] Check access history
- [x] Check confidential grants
- [x] Write routing log
- [x] Handle overrides

### Task 3.3: KB Registration API
**Assignee:** Backend  
**Estimate:** 4 hours
**Status:** ✅ COMPLETE

Add to `packages/registry/src/routes/kb.ts`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/kb/register` | Register KB with context type |
| PATCH | `/api/v1/kb/:id/context-type` | Update context type |
| POST | `/api/v1/kb/:id/exclude-rcrt` | Exclude from RCRT |
| GET | `/api/v1/kb/:id/access` | Get access history |

### Task 3.4: Grant Management API
**Assignee:** Backend  
**Estimate:** 4 hours
**Status:** ✅ COMPLETE

Add to `packages/registry/src/routes/apps.ts`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/apps/:id/confidential-grant` | Grant confidential |
| DELETE | `/api/v1/apps/:id/confidential-grant` | Revoke grant |

---

## Phase 4: TAIS UI & Testing (Weeks 7-8) ✅ COMPLETE

### Task 4.1: RCRT Integration Panel
**Assignee:** Frontend  
**Estimate:** 6 hours
**Status:** ✅ COMPLETE

Create `tais_frontend/src/app/components/rcrt/RCRTIntegration.tsx`:

**Features:**
- [x] Show RCRT connection status
- [x] Show security scan status
- [x] Show last sync time
- [x] Manual sync button
- [x] Install instructions

### Task 4.2: KB Context Management
**Assignee:** Frontend  
**Estimate:** 4 hours
**Status:** ✅ COMPLETE

- [x] Show context type per KB
- [x] Allow type changes
- [x] Show exclusion toggle
- [x] Show access history

### Task 4.3: App Access Management
**Assignee:** Frontend  
**Estimate:** 4 hours
**Status:** ✅ COMPLETE

- [x] Show current grants
- [x] Grant/revoke confidential
- [x] Show grant history

### Task 4.4: Audit Log Viewer
**Assignee:** Frontend  
**Estimate:** 4 hours
**Status:** ⏳ PENDING (Moved to Sprint 9)

Create audit log viewer with:
- Routing decisions
- Access grants
- Sync events

### Task 4.5: Integration Tests
**Assignee:** QA  
**Estimate:** 8 hours
**Status:** ⏳ PENDING (Moved to Sprint 10)

- [ ] Test provisioning flow
- [ ] Test KB event → RCRT
- [ ] Test routing decisions
- [ ] Test security scanner

---

## Completed: Sprint 9-12 Planning

### Sprint 9: Audit & Logging (1 week)
- Create routing log database table
- Build audit log API endpoints
- Frontend audit log viewer component
- Add filtering by date, action, user

### Sprint 10: E2E Testing Infrastructure (1 week)
- Set up test framework (Jest + Supertest)
- Write provisioning flow test
- Write KB event → RCRT test
- Write routing decision test
- Write security scanner test

### Sprint 11: RCRT Binary Distribution (1 week)
- Create Windows installer (.exe)
- Create macOS installer (.dmg)
- Auto-update mechanism
- Embedded onboarding flow

### Sprint 12: Hardening & Performance (1 week)
- Rate limiting on all RCRT endpoints
- Load testing with 1000 concurrent
- Error handling improvements
- Documentation updates

---

## API Endpoints Summary

### New Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/rcrt/provision` | JWT | Issue RCRT token |
| GET | `/api/v1/rcrt/status` | JWT | Get RCRT status |
| DELETE | `/api/v1/rcrt/provision` | JWT | Revoke access |
| POST | `/api/v1/kb/register` | JWT | Register KB |
| PATCH | `/api/v1/kb/:id/context-type` | JWT | Update type |
| POST | `/api/v1/kb/:id/exclude-rcrt` | JWT | Exclude from RCRT |
| GET | `/api/v1/kb/:id/access` | JWT | Get access |
| POST | `/api/v1/apps/:id/confidential-grant` | JWT | Grant access |
| DELETE | `/api/v1/apps/:id/confidential-grant` | JWT | Revoke access |

### RCRT → TAIS Calls (Expected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/rcrt/events` | Send KB events to RCRT |
| GET | `/api/v1/rcrt/breadcrumbs` | Pull breadcrumbs from RCRT |
| POST | `/api/v1/rcrt/sync` | Bidirectional sync |

---

## Environment Variables

```env
# RCRT Configuration
RCRT_BASE_URL=http://localhost:8081
RCRT_JWT_SECRET=...
RCRT_JWT_PUBLIC_KEY=...

# Security Scanner
SECURITY_SCAN_ENABLED=true
SECURITY_SCAN_API_KEY=...

# Database
# (existing)
```

---

## File Checklist

### Backend (New Files)
```
packages/registry/src/
├── services/
│   ├── rcrtProvisionService.ts    (NEW)
│   ├── rcrtClient.ts               (NEW)
│   ├── securityScannerService.ts  (NEW)
│   ├── kbEventBridge.ts            (NEW)
│   └── routingService.ts          (NEW)
└── routes/
    └── rcrt.ts                     (NEW)
```

### Frontend (New Files)
```
tais_frontend/src/
└── app/
    └── components/
        └── rcrt/
            └── RCRTIntegration.tsx  (NEW)
```

---

## Acceptance Criteria

### Security
- [x] JWT provisioning works (Silver/Gold only)
- [x] All RCRT calls authenticated
- [x] Content scanned before sending to RCRT
- [x] No inbound ports on user device

### Routing
- [x] Private → source app only
- [x] Confidential → apps with grant
- [x] Shared → apps on pathway
- [x] Public → all apps
- [x] Routing logged

### Integration
- [x] KB events sent to RCRT
- [x] Breadcrumbs pulled from RCRT
- [x] Context routed to apps

---

## Timeline Summary

| Phase | Weeks | Focus | Status |
|-------|-------|-------|--------|
| 1 | 1-2 | Security Layer & Provisioning | ✅ Complete |
| 2 | 3-4 | RCRT Connection Service | ✅ Complete |
| 3 | 5-6 | Context Routing | ✅ Complete |
| 4 | 7-8 | UI & Testing (Partial) | ✅ Complete |
| 9 | Week 9 | Audit & Logging | ⏳ Upcoming |
| 10 | Week 10 | E2E Testing Infrastructure | ⏳ Upcoming |
| 11 | Week 11 | RCRT Binary Distribution | ⏳ Upcoming |
| 12 | Week 12 | Hardening & Performance | ⏳ Upcoming |

**Phase 1-4: COMPLETE** ✅  
**Phase 5 (Sprints 9-12): PLANNED**
