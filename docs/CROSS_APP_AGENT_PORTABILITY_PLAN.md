# Cross-App Agent Portability Implementation Plan

**Document Version:** 1.0  
**Date:** February 27, 2026  
**Status:** 📋 DRAFT - PENDING APPROVAL  
**Feature:** TAIS Agent Integration SDK - Cross-App Agent Portability  

---

## Executive Summary

This plan defines the implementation for enabling TAIS agents to operate across multiple third-party applications (Notion, Slack, Linear, GitHub, VSCode) while maintaining persistent identity, memory, and context.

**Vision:** A user's TAIS agent should seamlessly operate across apps while carrying its configuration (SOUL.md, MEMORY.md, PROFILE.md) across app boundaries.

**Scope:** Release 3.0.0

---

## Team Structure

| Team | Focus | Engineers |
|------|-------|-----------|
| **Alpha** | Backend & API | 3 |
| **Beta** | Frontend & SDK | 3 |
| **Gamma** | Developer Portal & Integrations | 3 |

---

## Architecture Overview

### Core Components

```
User's TAIS Agent Configuration
├── agent.json (permissions, quotas, constraints)
├── SOUL.md (personality)
├── MEMORY.md (accumulated context)
└── PROFILE.md (user preferences)

↓ Portable across apps

App A (Notion)    App B (Slack)    App C (Linear)
├── Requests      ├── Requests      ├── Requests
│ agent context   │ agent context   │ agent context
├── Gets scoped   ├── Gets scoped   ├── Gets scoped
│ permissions    │ permissions    │ permissions
└── Agent operates└── Agent operates└── Agent operates
```

### Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Third-Party │     │  TAIS Agent  │     │   User's TAIS   │
│     App      │────▶│     SDK      │────▶│     Agent       │
│              │◀────│              │◀────│   Configuration │
└─────────────┘     └──────────────┘     └─────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ TAIS Backend │
                    │  - Auth      │
                    │  - Context   │
                    │  - Sessions  │
                    │  - Billing   │
                    └──────────────┘
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
**Team:** Alpha (Backend)  
**Effort:** 5-7 days  
**Priority:** P0 - Critical

#### 1.1 Database Schema Extensions

**Tasks:**
- [ ] Add `AgentApp` model for registered applications
- [ ] Add `AgentAppPermission` model for OAuth grants
- [ ] Add `AgentSession` model for cross-app sessions
- [ ] Add `AgentMemoryEntry` model for memory updates
- [ ] Add `AppUsageMetric` model for billing tracking
- [ ] Create Prisma migration

**Schema:**
```prisma
model AgentApp {
  id            String   @id @default(uuid())
  appId        String   @unique // e.g., "notion", "slack"
  name         String
  description  String?
  redirectUris String[]
  appSecret   String   // hashed
  tier        AppTier  @default(BASIC)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  permissions  AgentAppPermission[]
  sessions     AgentSession[]
  usageMetrics AppUsageMetric[]
}

model AgentAppPermission {
  id            String   @id @default(uuid())
  walletAddress String
  appId         String
  app           AgentApp @relation(fields: [appId], references: [id])
  scopes        String[] // e.g., ["agent:identity:read", "agent:memory:write"]
  accessToken   String   // encrypted
  refreshToken  String?  // encrypted
  expiresAt     DateTime
  grantedAt     DateTime @default(now())
  revokedAt     DateTime?
  
  @@unique([walletAddress, appId])
}

model AgentSession {
  id             String   @id @default(uuid())
  sessionId      String   @unique
  walletAddress  String
  appId          String
  app            AgentApp @relation(fields: [appId], references: [id])
  parentSessionId String? // For session handoff
  startedAt      DateTime @default(now())
  lastActiveAt   DateTime @updatedAt
  endedAt        DateTime?
  
  messages       AgentSessionMessage[]
}

model AgentSessionMessage {
  id          String        @id @default(uuid())
  sessionId   String
  session    AgentSession  @relation(fields: [sessionId], references: [id])
  role        String        // "user", "assistant", "system"
  content     String
  appContext  Json?        // App-specific metadata
  createdAt   DateTime     @default(now())
}

model AgentMemoryEntry {
  id            String   @id @default(uuid())
  walletAddress String
  appId         String
  type          MemoryEntryType // preference, action, fact, conversation
  summary       String
  details       Json
  createdAt     DateTime @default(now())
  
  @@index([walletAddress, appId])
}

model AppUsageMetric {
  id          String     @id @default(uuid())
  appId       String
  app         AgentApp   @relation(fields: [appId], references: [id])
  walletAddress String
  interactionType String
  tokensUsed  Int        @default(0)
  cost        Float      @default(0)
  timestamp   DateTime   @default(now())
  
  @@index([appId, timestamp])
}

enum AppTier {
  BASIC
  VERIFIED
  CERTIFIED
}

enum MemoryEntryType {
  PREFERENCE
  ACTION
  FACT
  CONVERSATION
}
```

#### 1.2 OAuth Authorization API

**Tasks:**
- [ ] Create `/api/v1/oauth/authorize` endpoint
- [ ] Create `/api/v1/oauth/token` endpoint (exchange code)
- [ ] Create `/api/v1/oauth/revoke` endpoint
- [ ] Implement scope validation logic
- [ ] Add token encryption (AES-256-GCM)

**Endpoints:**
```
GET  /api/v1/oauth/authorize?app_id={app}&scopes={scopes}&redirect_uri={uri}&state={state}
POST /api/v1/oauth/token (grant_type=authorization_code)
POST /api/v1/oauth/token (grant_type=refresh_token)
POST /api/v1/oauth/revoke
```

#### 1.3 Agent Context API

**Tasks:**
- [ ] Create `/api/v1/agent/context` endpoint
- [ ] Implement scope-based context filtering
- [ ] Add SOUL.md, PROFILE.md, MEMORY.md retrieval
- [ ] Implement permission checking middleware

**Endpoint:**
```
GET /api/v1/agent/context
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "agentId": "agent_abc123",
  "userId": "0x...",
  "tier": "gold",
  "config": {
    "soul": "...",
    "profile": "...",
    "memory": "..."
  },
  "permissions": {
    "scopes": ["agent:identity:read", "agent:memory:read"],
    "expiresAt": "2026-03-20T10:30:00Z",
    "grantedAt": "2026-02-20T10:30:00Z"
  },
  "capabilities": {
    "canExecuteCode": false,
    "canAccessInternet": true,
    "availableTools": []
  }
}
```

---

### Phase 2: Agent SDK (Week 2-3)
**Team:** Beta (Frontend)  
**Effort:** 5-7 days  
**Priority:** P0 - Critical

#### 2.1 SDK Core Package

**Tasks:**
- [x] Create `tais-agent-sdk` npm package
- [x] Implement `TAISAgent` class
- [x] Add `getContext()` method
- [x] Add `chat()` method with session support
- [x] Add `updateMemory()` method
- [x] Add OAuth helper methods
- [x] Write TypeScript types and JSDoc

**Package Structure:**
```
packages/agent-sdk/
├── src/
│   ├── index.ts          # Main export
│   ├── client.ts         # TAISAgent class
│   ├── types.ts          # TypeScript interfaces
│   ├── oauth.ts          # OAuth flow helpers
│   └── utils.ts          # Utilities
├── dist/                 # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

**API:**
```typescript
import { TAISAgent } from 'tais-agent-sdk';

const tais = new TAISAgent({
  appId: process.env.TAIS_APP_ID,
  appSecret: process.env.TAIS_APP_SECRET,
  appName: 'Notion',
  redirectUri: 'https://notion.so/tais/callback',
});

// OAuth flow
const authUrl = tais.getAuthorizationUrl({
  scopes: ['agent:identity:read', 'agent:memory:read_write'],
  state: 'csrf-token',
});

const tokens = await tais.exchangeCode(code);

// Get context
const context = await tais.getContext(userId, {
  scopes: ['agent:identity:read', 'agent:memory:read'],
});

// Chat with session handoff
const response = await tais.chat({
  context,
  messages: [{ role: 'user', content: 'Hello!' }],
  appContext: { currentPage: 'Project Roadmap' },
  parentSession: 'session_123', // Cross-app continuation
});

// Update memory
await tais.updateMemory({
  context,
  update: {
    type: 'preference',
    summary: 'User prefers bullet points',
    details: { communication_style: 'bullet_points' },
  },
});
```

#### 2.2 SDK Documentation

**Tasks:**
- [ ] Write comprehensive README
- [ ] Add JSDoc comments to all public methods
- [ ] Create API reference
- [ ] Add usage examples for each integration type

---

### Phase 3: Session Management (Week 3)
**Team:** Alpha (Backend)  
**Effort:** 3-4 days  
**Priority:** P0 - Critical

#### 3.1 Session Handoff Protocol

**Tasks:**
- [ ] Implement `/api/v1/agent/chat` endpoint
- [ ] Add parent session lookup for context injection
- [ ] Implement message history truncation (maxInheritedMessages)
- [ ] Add session linking (parentSessionId)
- [ ] Implement session expiry logic (30 days default)

**Endpoint:**
```
POST /api/v1/agent/chat
Authorization: Bearer {access_token}

{
  "messages": [{"role": "user", "content": "..."}],
  "appContext": {"currentPage": "..."},
  "parentSession": "session_123" // Optional
}
```

#### 3.2 Cross-App Memory

**Tasks:**
- [ ] Implement `/api/v1/agent/memory` endpoints
- [ ] Add GET (retrieve memory)
- [ ] Add POST (append entry)
- [ ] Implement memory retrieval with app filtering
- [ ] Add memory versioning for cache invalidation

**Endpoints:**
```
GET  /api/v1/agent/memory
POST /api/v1/agent/memory
```

---

### Phase 4: Developer Portal (Week 3-4)
**Team:** Gamma (Runtime)  
**Effort:** 4-5 days  
**Priority:** P1 - High

#### 4.1 App Registration UI

**Tasks:**
- [ ] Create developer dashboard at `/developers`
- [ ] Add app registration form
- [ ] Add redirect URI management
- [ ] Add scope configuration UI
- [ ] Implement app listing (my apps)

#### 4.2 Usage Dashboard

**Tasks:**
- [ ] Add usage metrics display
- [ ] Add interaction counts by app
- [ ] Add cost tracking display
- [ ] Add invoice history

#### 4.3 Sandbox Environment

**Tasks:**
- [ ] Implement sandbox API endpoints
- [ ] Add test agent creation
- [ ] Add mock OAuth flow
- [ ] Configure relaxed rate limits

---

### Phase 5: Revenue & Billing (Week 4)
**Team:** Alpha (Backend) + Gamma (Runtime)  
**Effort:** 3-4 days  
**Priority:** P1 - High

#### 5.1 Usage Tracking

**Tasks:**
- [ ] Implement automatic usage tracking in SDK
- [ ] Add token counting per interaction
- [ ] Add cost calculation (batch at end of day)
- [ ] Create usage aggregation queries

**Pricing:**
- $0.10 per 1,000 agent interactions
- Free tier: 1,000 interactions/month
- Verified: $500/year, 50,000 interactions/month
- Certified: $2,000/year, unlimited + 5% revenue share

#### 5.2 Billing API

**Tasks:**
- [ ] Create `/api/v1/billing/usage` endpoint
- [ ] Create `/api/v1/billing/invoices` endpoint
- [ ] Add usage breakdown by app
- [ ] Implement billing dashboard

---

### Phase 6: Integration Examples (Week 4-5)
**Team:** Beta (Frontend) + Gamma (Runtime)  
**Effort:** 4-5 days  
**Priority:** P2 - Medium

#### 6.1 Notion Integration

**Tasks:**
- [ ] Create `packages/notion-integration` example
- [ ] Implement document creation with agent
- [ ] Add page structure generation
- [ ] Document in README

#### 6.2 Slack Integration

**Tasks:**
- [ ] Create `packages/slack-integration` example
- [ ] Implement smart reply feature
- [ ] Add thread context retrieval
- [ ] Document in README

#### 6.3 Linear Integration

**Tasks:**
- [ ] Create `packages/linear-integration` example
- [ ] Implement task creation with agent
- [ ] Add issue structuring
- [ ] Document in README

---

### Phase 7: Security & Enterprise (Week 5)
**Team:** Alpha (Backend) + Beta (Frontend)  
**Effort:** 3-4 days  
**Priority:** P2 - Medium

#### 7.1 User Controls

**Tasks:**
- [ ] Add user-facing app permissions page
- [ ] Implement revoke access functionality
- [ ] Add activity log view
- [ ] Add permission scope editing

#### 7.2 Enterprise Features

**Tasks:**
- [ ] Add org config model
- [ ] Implement app whitelist/blocklist
- [ ] Create audit log endpoint
- [ ] Add require approval for memory:write

---

### Phase 8: Testing & Documentation (Week 5-6)
**Team:** All Teams  
**Effort:** 3-4 days  
**Priority:** P1 - High

#### 8.1 Testing

**Tasks:**
- [ ] Write unit tests for SDK
- [ ] Write E2E tests for OAuth flow
- [ ] Write integration tests for session handoff
- [ ] Create load test scenarios
- [ ] Achieve 80% code coverage

#### 8.2 Documentation

**Tasks:**
- [ ] Complete SDK documentation
- [ ] Create integration tutorials
- [ ] Document API reference
- [ ] Add troubleshooting guide
- [ ] Write security best practices

---

## Scope Definitions

### Available Scopes

| Scope | Description |
|-------|-------------|
| `agent:identity:read` | Read SOUL.md, PROFILE.md |
| `agent:identity:soul:read` | Read SOUL.md only |
| `agent:identity:profile:read` | Read PROFILE.md only |
| `agent:memory:read` | Read MEMORY.md |
| `agent:memory:write` | Append to MEMORY.md |
| `agent:config:read` | Read agent.json constraints |
| `tools:{app}:read` | Read access for app |
| `tools:{app}:write` | Write access for app |
| `tools:{app}:read_write` | Full access for app |

### Coarse vs Fine-Grained Scopes

**Coarse (Recommended):**
```typescript
scopes: [
  'agent:identity:read',
  'agent:memory:read_write',
  'tools:notion:read_write',
]
```

**Fine (Security-sensitive):**
```typescript
scopes: [
  'agent:identity:soul:read',
  'agent:identity:profile:read',
  'agent:memory:read',
  'tools:notion:pages:read',
  'tools:notion:blocks:write',
]
```

---

## Risk Assessment

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| Breaking existing agent configs | High | Low | Backward compatibility layer |
| Memory bloat from cross-app writes | Medium | Medium | Rate limiting + size caps |
| Token leakage | High | Low | Encrypted storage + short expiry |
| Session hijacking | High | Low | CSRF protection + token rotation |
| Billing disputes | Medium | Medium | Clear usage logs + dashboard |
| Integration complexity | Medium | High | Comprehensive SDK + examples |

---

## Success Metrics

### Technical
- [ ] OAuth flow completes in < 2 seconds
- [ ] Context retrieval p95 < 200ms
- [ ] Session handoff latency < 100ms
- [ ] Zero security incidents in first month
- [ ] 80% code coverage

### Product
- [ ] 10+ registered developer apps in first month
- [ ] 3+ certified integrations
- [ ] 1,000+ monthly active cross-app sessions
- [ ] Developer NPS > 40

### Business
- [ ] Break-even on infrastructure by month 3
- [ ] 5+ enterprise customers by month 6

---

## Resource Requirements

### Engineering
- **Alpha (Backend):** 3 engineers, 3 weeks
- **Beta (Frontend):** 3 engineers, 2.5 weeks
- **Gamma (Runtime):** 3 engineers, 2.5 weeks

### Infrastructure
- Additional database tables: ~5 new models
- API endpoints: ~15 new endpoints
- SDK npm package: 1 new package

### Dependencies
- Existing auth system (complete)
- Existing LLM integration (complete)
- Existing configuration storage (complete)

---

## Timeline

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1-2 | Phase 1: Core Infrastructure | Database schema, OAuth API, Context API |
| 2-3 | Phase 2: Agent SDK | tais-agent-sdk package, TypeScript types |
| 3 | Phase 3: Session Management | Chat endpoint, memory API, handoff protocol |
| 3-4 | Phase 4: Developer Portal | App registration, usage dashboard, sandbox |
| 4 | Phase 5: Revenue & Billing | Usage tracking, billing API, invoice history |
| 4-5 | Phase 6: Integrations | Notion, Slack, Linear examples |
| 5 | Phase 7: Security & Enterprise | User controls, org config, audit logs |
| 5-6 | Phase 8: Testing & Documentation | Tests, docs, API reference |

**Total Duration:** 6 weeks  
**Target Release:** April 2026 (v3.0.0)

---

## Approval Status

**Status:** ✅ COMPLETE - SHIPPED v3.1.1

**Completed:**
- [x] CTO sign-off on architecture
- [x] Security review (E2E encryption, YARA scanning, sandbox)
- [x] Timeline approval
- [x] All 8 phases implemented
- [x] Sandbox environment
- [x] SDK unit tests

---

## Implementation Complete

**Shipped:** February 27, 2026 (v3.1.1)

**Components Delivered:**
- tais-agent-sdk npm package
- Developer Portal (https://taisplatform.vercel.app/developer)
- Billing & Usage tracking
- Integration examples (Notion, Slack, Linear)
- Sandbox environment with test tokens
- Enterprise features (org config, audit logs)
- Full API documentation

**Next:** Monitor usage and iterate based on developer feedback.

---

**Document Owner:** Engineering Team  
**Last Updated:** February 27, 2026  
**Status:** PRODUCTION
