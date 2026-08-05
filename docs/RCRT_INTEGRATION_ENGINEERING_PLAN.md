# RCRT Integration - Engineering Execution Plan (Revised)

**Based on:** RCRT Integration PRD v2.0  
**Updated:** March 15, 2026  
**Timeline:** 12 weeks (6 phases)
**Status:** ✅ PHASES 1-4 COMPLETE | SPRINTS 9-12 COMPLETE (see correction note)

> **Correction (verified against codebase, Aug 2026):** This document's original "PENDING/PLANNED" status for Task 4.4, Task 4.5, and Sprints 9-12 was stale/inaccurate. Those deliverables exist in the codebase (audit log viewer, E2E test suite, platform installers, rate limiting/security headers) — see `docs/RCRT_SPRINT_PLAN.md` and the updated statuses below, which now agree.

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

Add to `packages/registry/src/routes/oauth.ts`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/oauth/confidential-grant` | Grant confidential |
| DELETE | `/api/v1/oauth/confidential-grant/:appId` | Revoke grant |
| GET | `/api/v1/oauth/confidential-grants` | List grants |

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
**Status:** ✅ COMPLETE (delivered in Sprint 9)

Audit log viewer with filtering (action, status) and pagination is embedded in
`tais_frontend/src/app/components/rcrt/RCRTIntegrationPanel.tsx`, backed by the
`rcrt_audit_logs` table (see `packages/registry/prisma/migrations/20260315161750_rcrt_audit_log/`)
and `GET/POST /api/v1/rcrt/audit` in `packages/registry/src/routes/rcrt.ts`.

### Task 4.5: Integration Tests
**Assignee:** QA  
**Estimate:** 8 hours
**Status:** ✅ COMPLETE (delivered in Sprint 10)

- [x] Test provisioning flow
- [x] Test connect/revoke flow
- [x] Test audit log endpoints (filter by action/status)
- [ ] Dedicated routing-decision test case (not found as a standalone test)
- [ ] Dedicated security-scanner test case (not found as a standalone test)

See `packages/registry/src/__tests__/routes/rcrt.e2e.test.ts` (Jest + Supertest,
consistent with `agent.e2e.test.ts`, `billing.e2e.test.ts`, `oauth.e2e.test.ts`).

---

## Sprint 9-12: Status (verified against codebase)

### Sprint 9: Audit & Logging — ✅ COMPLETE
- [x] `rcrt_audit_logs` table (migration `20260315161750_rcrt_audit_log`)
- [x] Audit log API endpoints (`GET/POST /api/v1/rcrt/audit`)
- [x] Frontend audit log viewer component (embedded in `RCRTIntegrationPanel.tsx`)
- [x] Filtering by action and status, with pagination

### Sprint 10: E2E Testing Infrastructure — ✅ COMPLETE
- [x] Test framework (Jest + Supertest, `packages/registry/jest.config.js`)
- [x] Provisioning flow test
- [x] Connect/revoke flow test
- [x] Audit log endpoint tests
- [ ] Standalone routing-decision test and security-scanner test not found (functionality covered indirectly, not as dedicated test cases)

### Sprint 11: RCRT Binary Distribution — ✅ COMPLETE (core), minor gaps
- [x] Windows installer (native `.bat` in `desktop-build/installer/native-install-windows.bat` and `crates/rcrt-standalone/install-windows.bat`)
- [x] macOS installer (native `.sh` in `desktop-build/installer/native-install-mac.sh` and `crates/rcrt-standalone/install-mac.sh`)
- [x] Linux installer (native `.sh`) — actual shipped format is native/sandbox shell + batch installers, not `.exe`/`.dmg` as originally scoped
- [ ] Auto-update mechanism not found
- [ ] Embedded onboarding flow not found (install scripts only)

### Sprint 12: Hardening & Performance — ✅ COMPLETE (core)
- [x] Rate limiting on RCRT endpoints (`rcrtLimiter`, 100 req/min, `packages/registry/src/middleware/rateLimit.ts`, applied via `apiV1Router.use('/rcrt', rateLimiters.rcrt, ...)`)
- [x] Security headers (`helmet`, `packages/registry/src/index.ts`)
- [x] Load testing scripts exist (`tests/load-test.js`, `tests/load-test.yaml`) — general API load test, not an RCRT-specific 1000-concurrent scenario
- [ ] No RCRT-specific 1000-concurrent load test found

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
| POST | `/api/v1/oauth/confidential-grant` | JWT | Grant access |
| DELETE | `/api/v1/oauth/confidential-grant/:appId` | JWT | Revoke access |

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
| 9 | Week 9 | Audit & Logging | ✅ Complete |
| 10 | Week 10 | E2E Testing Infrastructure | ✅ Complete |
| 11 | Week 11 | RCRT Binary Distribution | ✅ Complete (minor gaps, see above) |
| 12 | Week 12 | Hardening & Performance | ✅ Complete (minor gaps, see above) |

**Phase 1-4: COMPLETE** ✅  
**Sprints 9-12: COMPLETE** ✅ (verified against codebase; see notes above for the few sub-items — auto-update, dedicated routing/security-scanner tests, RCRT-specific load test — not found)
