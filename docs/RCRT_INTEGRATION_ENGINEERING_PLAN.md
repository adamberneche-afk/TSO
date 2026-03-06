# RCRT Integration - Engineering Execution Plan (Revised)

**Based on:** RCRT Integration PRD v2.0  
**Updated:** March 5, 2026  
**Timeline:** 8 weeks (4 phases)

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

## Phase 1: Security Layer & Provisioning (Weeks 1-2)

### Task 1.1: JWT Provisioning Service
**Assignee:** Backend  
**Estimate:** 4 hours

Create `packages/registry/src/services/rcrtProvisionService.ts`:

```typescript
// Key methods:
- provisionRCRT(ownerId: string): Promise<RCRTProvision>
- validateToken(token: string): Promise<RCRTClaims>
- refreshToken(refreshToken: string): Promise<NewToken>
- revokeProvision(agentId: string): Promise<void>
```

- [ ] Implement RS256 JWT generation
- [ ] Add 15-minute token expiry
- [ ] Add refresh token rotation
- [ ] Add tier check (Silver/Gold only)
- [ ] Store provisioned agents in DB

### Task 1.2: Security Scanner Service
**Assignee:** Backend  
**Estimate:** 8 hours

Create `packages/registry/src/services/securityScannerService.ts`:

```typescript
// Key methods:
- scanContent(content: string): Promise<SecurityScanResult>
- detectExploits(content: string): Promise<ExploitResult>
- detectMalware(content: string): Promise<MalwareResult>
```

- [ ] Implement content scanner
- [ ] Detect common exploit patterns
- [ ] Detect malware signatures
- [ ] Add rate limiting
- [ ] Quarantine unsafe content

### Task 1.3: Provisioning API
**Assignee:** Backend  
**Estimate:** 4 hours

Create `packages/registry/src/routes/rcrt.ts`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/rcrt/provision` | Issue JWT token |
| GET | `/api/v1/rcrt/status` | Get RCRT status |
| DELETE | `/api/v1/rcrt/provision` | Revoke RCRT access |

- [ ] Implement endpoints
- [ ] Add JWT authentication middleware
- [ ] Add tier enforcement
- [ ] Test with curl

---

## Phase 2: RCRT Connection Service (Weeks 3-4)

### Task 2.1: RCRT HTTP Client
**Assignee:** Backend  
**Estimate:** 8 hours

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

- [ ] Implement HTTP client
- [ ] Add JWT refresh logic
- [ ] Add retry with exponential backoff
- [ ] Add timeout handling
- [ ] Add connection health check

### Task 2.2: KB Event Bridge
**Assignee:** Backend  
**Estimate:** 6 hours

Create `packages/registry/src/services/kbEventBridge.ts`:

```typescript
// Key methods:
- onKBChange(event: KBEvent): Promise<void>
- sendToRCRT(kbId: string, event: KBEvent): Promise<void>
- queueEvent(event: KBEvent): Promise<void>
```

- [ ] Detect KB changes (webhook or polling)
- [ ] Queue events for RCRT
- [ ] Send to local RCRT via HTTP
- [ ] Handle offline RCRT (queue and retry)

### Task 2.3: Bidirectional Sync
**Assignee:** Backend  
**Estimate:** 6 hours

- [ ] Pull breadcrumbs from RCRT
- [ ] Push to connected apps based on permissions
- [ ] Handle sync conflicts
- [ ] Add sync status tracking

---

## Phase 3: Context Routing (Weeks 5-6)

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

- [ ] Add migration
- [ ] Run on staging
- [ ] Run on production

### Task 3.2: Routing Engine
**Assignee:** Backend  
**Estimate:** 8 hours

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

- [ ] Implement context type routing
- [ ] Check access history
- [ ] Check confidential grants
- [ ] Write routing log
- [ ] Handle overrides

### Task 3.3: KB Registration API
**Assignee:** Backend  
**Estimate:** 4 hours

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

Add to `packages/registry/src/routes/apps.ts`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/apps/:id/confidential-grant` | Grant confidential |
| DELETE | `/api/v1/apps/:id/confidential-grant` | Revoke grant |

---

## Phase 4: TAIS UI & Testing (Weeks 7-8)

### Task 4.1: RCRT Integration Panel
**Assignee:** Frontend  
**Estimate:** 6 hours

Create `tais_frontend/src/app/components/rcrt/RCRTIntegration.tsx`:

**Features:**
- Show RCRT connection status
- Show security scan status
- Show last sync time
- Manual sync button
- Install instructions

### Task 4.2: KB Context Management
**Assignee:** Frontend  
**Estimate:** 4 hours

- [ ] Show context type per KB
- [ ] Allow type changes
- [ ] Show exclusion toggle
- [ ] Show access history

### Task 4.3: App Access Management
**Assignee:** Frontend  
**Estimate:** 4 hours

- [ ] Show current grants
- [ ] Grant/revoke confidential
- [ ] Show grant history

### Task 4.4: Audit Log Viewer
**Assignee:** Frontend  
**Estimate:** 4 hours

Create audit log viewer with:
- Routing decisions
- Access grants
- Sync events

### Task 4.5: Integration Tests
**Assignee:** QA  
**Estimate:** 8 hours

- [ ] Test provisioning flow
- [ ] Test KB event → RCRT
- [ ] Test routing decisions
- [ ] Test security scanner

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
- [ ] JWT provisioning works (Silver/Gold only)
- [ ] All RCRT calls authenticated
- [ ] Content scanned before sending to RCRT
- [ ] No inbound ports on user device

### Routing
- [ ] Private → source app only
- [ ] Confidential → apps with grant
- [ ] Shared → apps on pathway
- [ ] Public → all apps
- [ ] Routing logged

### Integration
- [ ] KB events sent to RCRT
- [ ] Breadcrumbs pulled from RCRT
- [ ] Context routed to apps

---

## Timeline Summary

| Phase | Weeks | Focus |
|-------|-------|-------|
| 1 | 1-2 | Security Layer & Provisioning |
| 2 | 3-4 | RCRT Connection Service |
| 3 | 5-6 | Context Routing |
| 4 | 7-8 | UI & Testing |

**Total: 8 weeks**
