# CTO Review: Cross-App Agent Portability
**Date:** February 27, 2026
**Prepared for:** CTO Review
**Feature:** TAIS Agent Integration SDK - Cross-App Agent Portability
**Document:** `docs/CROSS_APP_AGENT_PORTABILITY_PLAN.md`

---

## Executive Summary

**Vision:** Enable TAIS agents to operate across Notion, Slack, Linear, GitHub, VSCode while maintaining persistent identity and memory.

**What's the goal?** Users carry their agent (SOUL.md, MEMORY.md, PROFILE.md) across apps - agent "just knows" them without re-onboarding.

**Target:** v3.0.0 (April 2026)

---

## Key Components

| Component | Description |
|-----------|-------------|
| **@tais/agent-sdk** | npm package for third-party devs |
| **OAuth Flow** | Permission grants (like GitHub OAuth) |
| **Session Handoff** | Continue conversations across apps |
| **Memory Sharing** | Agent learns across apps |
| **Revenue Share** | 7% (5% certified) from app integrations |

---

## Architecture

```
User's TAIS Agent
├── agent.json (permissions)
├── SOUL.md (personality)
├── MEMORY.md (learned context)
└── PROFILE.md (preferences)

↓ Portable

App A (Notion)    App B (Slack)    App C (Linear)
```

---

## Team & Timeline

| Team | Focus | Duration |
|------|-------|----------|
| Alpha | Backend & API | 3 weeks |
| Beta | Frontend & SDK | 2.5 weeks |
| Gamma | Developer Portal | 2.5 weeks |

**Total:** 6 weeks (March - April 2026)

---

## Phase Breakdown

| Phase | Duration | Key Deliverables |
|-------|----------|-----------------|
| 1. Core Infrastructure | Week 1-2 | DB schema, OAuth API, Context API |
| 2. Agent SDK | Week 2-3 | @tais/agent-sdk npm package |
| 3. Session Management | Week 3 | Chat endpoint, memory API, handoff |
| 4. Developer Portal | Week 3-4 | App registration, usage dashboard |
| 5. Revenue & Billing | Week 4 | Usage tracking, invoicing |
| 6. Integrations | Week 4-5 | Notion, Slack, Linear examples |
| 7. Security & Enterprise | Week 5 | User controls, org config |
| 8. Testing & Docs | Week 5-6 | Unit/E2E tests, API reference |

---

## Technical Highlights

### OAuth-Style Permissions
```typescript
// App requests scopes
scopes: ['agent:identity:read', 'agent:memory:read', 'tools:notion:read_write']

// User sees approval screen
// [Approve] [Deny]
```

### Session Handoff
```typescript
// User in Slack
parentSession = await tais.chat({ messages: [...] });

// User switches to Notion - agent continues
await tais.chat({ 
  messages: [{ role: 'user', content: 'Create roadmap' }],
  parentSession: slackSession.id  // Continues context
});
```

### Scope Levels
| Scope | Access |
|-------|--------|
| `agent:identity:read` | SOUL.md + PROFILE.md |
| `agent:memory:read` | MEMORY.md |
| `agent:memory:write` | Append to MEMORY.md |
| `tools:notion:read_write` | Full Notion API |

---

## Revenue Model

| Tier | Cost | What |
|------|------|------|
| Basic | Free | Listed in directory |
| Verified | $500/year | Security audit, priority support |
| Certified | $2,000/year | Full audit, 5% revenue share |

**Usage Fee:** $0.10 per 1,000 agent interactions

**Example:** Notion charges $5/month for "TAIS AI"
- Notion keeps: $4.65 (93%)
- TAIS gets: $0.35 + $1.00 (usage) = $1.35/user/month

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Token leakage | High | Encrypted storage, short expiry |
| Memory bloat | Medium | Rate limits + size caps |
| Billing disputes | Medium | Clear dashboard + logs |

---

## Required Decisions

### Decision 1: Team Structure
**Recommendation:** Alpha/Beta/Gamma (3 engineers each)

### Decision 2: Timeline
**Recommendation:** 6 weeks (March - April 2026)

### Decision 3: Scope Priority
**Recommendation:** 
- P0: Core SDK + OAuth + Session handoff
- P1: Developer portal + Billing
- P2: Integrations + Enterprise features

---

## Approval Checklist

- [ ] CTO sign-off on architecture
- [ ] Security review
- [ ] Timeline approval
- [ ] Team allocation

---

## Next Steps

1. **Approve plan** - Sign off on approach
2. **Security audit** - Schedule review
3. **Team briefing** - Assign engineers
4. **Sprint 1** - Begin Phase 1 implementation

---

**Document Owner:** Engineering Team
**Contact:** Engineering leads or #engineering-discussions
