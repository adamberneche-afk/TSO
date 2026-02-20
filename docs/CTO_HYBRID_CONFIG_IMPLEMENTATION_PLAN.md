# CTO Implementation Plan: Hybrid JSON + Markdown Agent Configuration System

**Document Version:** 1.1  
**Date:** February 20, 2026  
**Status:** ✅ CTO APPROVED  
**Proposed Implementation:** Release 2.7.0

---

## Executive Summary

This plan proposes a hybrid architecture that separates agent configuration into:
1. **JSON Framework** (rigid, validated, type-safe) - permissions, quotas, skills, constraints
2. **Markdown Personality** (flexible, LLM-friendly, human-readable) - prompts, examples, communication style

This builds upon the existing v2.6.0 architecture while enabling community sharing, LLM-optimized prompts, and better developer experience.

---

## CTO Decisions (February 20, 2026)

### Decision 1: Team Structure
**Approved:** Alpha/Beta/Gamma naming convention for team rotation and fresh perspectives.

| Team | Focus | Engineers |
|------|-------|-----------|
| Alpha | Backend | 3 |
| Beta | Frontend | 3 |
| Gamma | Runtime | 3 |

**Note:** Teams remain intact (no engineer swapping) to maximize domain expertise during implementation.

### Decision 2: Architecture
**Approved:** JSON + Markdown split approach.

| Parameter | Decision |
|-----------|----------|
| Storage | Database (accessible across all hardware) |
| Size Limit | 10KB base, scaled by access tier |
| Tier Scaling | Limits pegged to dollar value of user's NFT/access tier |

### Decision 3: Timeline
**Approved:** Minimize downtime during database migration.

### Decision 4: Feature Scope
| Feature | Status |
|---------|--------|
| Community templates | ❌ DEFERRED (doesn't align with North Star) |
| AI-assisted personality generation | ✅ PRIORITY |
| Personality versioning | ✅ REQUIRED |

### Decision 5: Resource Allocation
**Approved:** Keep engineers in their assigned teams throughout implementation.

### Decision 6: Markdown Parser
**Approved:** `marked` + `DOMPurify`

Rationale:
- Smaller bundle size (~40KB vs ~200KB)
- Faster compilation for frequent personality loads
- Simpler for markdown → text + HTML preview use case
- We already sanitize inputs via YARA scanner

### Decision 7: Backward Compatibility
**Approved:** Support both sliders AND markdown personality configurations.

Users can:
- Use quick sliders for simple setup
- Switch to markdown for advanced customization
- Switch back and forth without data loss

---

## Current Architecture (v2.6.0)

### What Teams Have Built

**Frontend Team:**
- 8-step Interview Wizard (`InterviewWizard.tsx`)
- ConversationalGoalsStep with LLM integration
- BehaviorStep with personality sliders (0-100)
- KnowledgeStep for RAG integration
- ConfigPreview with JSON + Natural Language views
- My Agents dashboard with edit mode

**Backend Team:**
- Configuration persistence API (`/api/v1/configurations`)
- NFT ownership verification (2 configs per Genesis NFT)
- Prisma schema with `AgentConfiguration` model
- JWT authentication + rate limiting

**Current Personality Model:**
```typescript
// tais_frontend/src/types/agent.ts
interface Personality {
  tone: 'direct' | 'balanced' | 'conversational';
  verbosity: 'brief' | 'balanced' | 'detailed';
  formality: 'casual' | 'balanced' | 'professional';
}

// Interview answers use sliders (0-100)
interface InterviewAnswers {
  personality: {
    tone: number;      // 0-100 mapped to enum
    verbosity: number; // 0-100 mapped to enum
    formality: number; // 0-100 mapped to enum
  };
}
```

**Mapping Logic (`interview-config.ts`):**
```typescript
function mapSliderToTone(value: number): Personality['tone'] {
  if (value < 33) return 'direct';
  if (value < 66) return 'balanced';
  return 'conversational';
}
```

### Current Database Schema

```prisma
model AgentConfiguration {
  id          String   @id @default(uuid())
  walletAddress String @map("wallet_address")
  nftTokenId  String   @map("nft_token_id")
  name        String
  description String?
  configData  Json     @map("config_data") // Full JSON config
  version     Int      @default(1)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## Proposed Hybrid Architecture

### Design Philosophy

| Aspect | JSON Framework | Markdown Personality |
|--------|---------------|---------------------|
| **Purpose** | Machine-readable constraints | LLM-readable instructions |
| **Validation** | Zod schema strict | Flexible, versioned |
| **Editability** | Form-based (wizards) | Text editor / AI-assisted |
| **Sharing** | Copy/paste JSON | Community marketplace |
| **Version Control** | Schema migrations | Git-friendly diffing |

### New Configuration Structure

```
agent-config/
├── framework.json          # Rigid, validated
│   ├── name: string
│   ├── version: semver
│   ├── skills: SkillReference[]
│   ├── constraints: Constraints
│   ├── knowledge: KnowledgeConfig
│   └── autonomy: Autonomy
│
├── personality.md          # Flexible, LLM-optimized
│   ├── # Agent Identity
│   ├── ## Communication Style
│   ├── ## Response Guidelines
│   ├── ## Example Interactions
│   └── ## Domain Knowledge
│
└── metadata.json           # Provenance (not shared)
    ├── authorSignature
    ├── nftTokenId
    └── createdAt
```

### Example Output

**framework.json:**
```json
{
  "name": "dev-assistant",
  "version": "1.0.0",
  "skills": [
    { "id": "code-review", "source": "registry", "version": "2.1.0", "trustScore": 0.95 }
  ],
  "constraints": {
    "privacy": "local",
    "maxCostPerAction": 0.05,
    "blockedModules": ["child_process", "fs"]
  },
  "knowledge": {
    "sources": [{ "id": "docs-rag", "type": "public-rag", "priority": 5 }],
    "retrievalConfig": { "topK": 5, "similarityThreshold": 0.7 }
  },
  "autonomy": { "level": "suggest" }
}
```

**personality.md:**
```markdown
# Dev Assistant

## Identity
You are an expert software developer assistant specializing in code review,
debugging, and architecture guidance. You prioritize code quality, security,
and maintainability.

## Communication Style
- **Tone:** Direct but constructive. Get to the point quickly.
- **Detail Level:** Comprehensive when explaining concepts, brief for simple answers.
- **Formality:** Professional yet approachable. Use industry-standard terminology.

## Response Guidelines
1. Always explain the "why" behind suggestions
2. Provide code examples in the user's preferred language
3. Flag potential security issues immediately
4. Suggest alternatives when recommending changes

## Example Interactions

### User: "Review this function"
```
You: I've identified 3 issues in this function:

1. **Security (Critical):** SQL injection vulnerability on line 12
   - Use parameterized queries instead of string concatenation
   - Example: `db.query('SELECT * FROM users WHERE id = $1', [userId])`

2. **Performance:** N+1 query pattern in the loop
   - Consider batch fetching or using JOINs

3. **Style:** Missing error handling for edge cases
   - Add try/catch for database operations
```

## Domain Knowledge
- Strong in: TypeScript, React, Node.js, PostgreSQL
- Familiar with: Python, Go, Kubernetes
- Avoids: Opinions on frameworks without user context
```

---

## Implementation Roadmap

### Phase 1: Schema Extension (Week 1)
**Team:** Alpha (Backend)  
**Effort:** 2-3 days

**Tasks:**
1. Add `personalityMd` field to `AgentConfiguration` model
2. Create `PersonalityTemplate` model for community sharing
3. Update Prisma migration
4. Add validation for markdown content (max 10KB, sanitization)

**Schema Changes:**
```prisma
model AgentConfiguration {
  // ... existing fields
  personalityMd    String?  @map("personality_md")    // Markdown personality
  personalityVersion Int    @default(1) @map("personality_version") // Version tracking
}

// DEFERRED: PersonalityTemplate model for community sharing
// Will be added in future release if aligned with North Star
```

### Phase 2: Frontend Components (Week 1-2)
**Team:** Beta (Frontend)  
**Effort:** 4-5 days  
**Engineers:** 3

**Tasks:**
1. Create `PersonalityEditor` component (Monaco with markdown preview)
2. Add `PersonalityStep` to Interview Wizard (after BehaviorStep)
3. Update `ConfigPreview` to show framework.json + personality.md tabs
4. **PRIORITY:** AI-assisted personality generation (uses existing LLM integration)
5. Implement personality versioning UI

**New Components:**
```
tais_frontend/src/app/components/interview/
├── PersonalityStep.tsx       # New step in wizard
├── PersonalityEditor.tsx     # Markdown editor with preview
└── PersonalityGallery.tsx    # Community templates
```

### Phase 3: Runtime Integration (Week 2)
**Team:** Gamma (Runtime)  
**Effort:** 3-4 days  
**Engineers:** 3

**Tasks:**
1. Create personality compiler (markdown → system prompt) using `marked` + `DOMPurify`
2. **REQUIRED:** Implement personality versioning for cache invalidation
3. Integrate with existing LLM client
4. Add personality metrics tracking (token usage, effectiveness)

**New Service:**
```typescript
// tais_frontend/src/services/personalityCompiler.ts
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface CompiledPersonality {
  systemPrompt: string;
  tokenCount: number;
  version: string;
}

export function compilePersonality(markdown: string): CompiledPersonality {
  // Parse markdown sections
  // Generate optimized system prompt
  // Estimate token count
}
```

### Phase 4: Tier-Based Storage Limits (Week 3)
**Team:** Alpha (Backend)  
**Effort:** 1-2 days  
**Engineers:** 3

**Tasks:**
1. Implement tier-based personality size limits
2. Add storage quota enforcement
3. Create upgrade prompts for tier limits

**Tier Limits (Pegged to Dollar Value):**
| Tier | Max Personality Size | Basis |
|------|---------------------|-------|
| Free | 5KB | Default |
| Bronze | 10KB | ~$10 value |
| Silver | 20KB | ~$50 value |
| Gold (Genesis) | 50KB | NFT holder |

---

## Backward Compatibility

### Migration Strategy

**Existing Configurations:**
1. On load, convert existing personality enums to markdown
2. Use default personality templates based on enum values
3. Save migrated config with personalityMd populated

**Migration Code:**
```typescript
function migratePersonality(personality: Personality): string {
  const templates = {
    'direct-brief-casual': 'direct-casual-brief.md',
    'balanced-balanced-balanced': 'balanced-default.md',
    'conversational-detailed-professional': 'conversational-pro.md',
    // ... 27 combinations
  };
  
  const key = `${personality.tone}-${personality.verbosity}-${personality.formality}`;
  return loadTemplate(templates[key] || 'balanced-default.md');
}
```

**Interview Wizard Changes:**
- BehaviorStep sliders remain for quick setup
- New PersonalityStep allows customization
- Sliders populate initial personality.md draft

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking existing configs | High | Migration script + backward compat layer |
| Large markdown storage | Medium | 10KB limit + compression option |
| Template quality varies | Medium | Community ratings + moderation |
| LLM token bloat | Medium | Token counting + truncation warnings |
| Security in markdown | Low | Sanitization + no code execution |

---

## Success Metrics

**Technical:**
- [ ] All existing configs migrate successfully
- [ ] Personality load time < 50ms
- [ ] Template API p95 < 100ms
- [ ] Zero data loss in migration

**Product:**
- [ ] 50% of new configs use custom personality
- [ ] 100+ community templates in first month
- [ ] 4.0+ average template rating
- [ ] 30% reduction in "edit config" actions

---

## Resource Requirements

**Engineering:**
- Alpha (Backend): 3 engineers, 1 week + 2 days for tier limits
- Beta (Frontend): 3 engineers, 1.5 weeks
- Gamma (Runtime): 3 engineers, 1 week

**Infrastructure:**
- Database migration: Minimal downtime (blue-green or rolling migration)
- Storage increase: ~2-10KB per config (tier-dependent)

**Dependencies:**
- Existing LLM integration (complete)
- Monaco editor (already in use)
- `marked` + `dompurify` (to be installed)

---

## Approval Status

**CTO Approval:** ✅ APPROVED (February 20, 2026)

**Decisions Made:**
1. ✅ Team structure: Alpha/Beta/Gamma with 3 engineers each
2. ✅ Architecture: JSON + Markdown split approved
3. ✅ Timeline: Minimize downtime
4. ✅ Scope: AI-assisted generation priority, versioning required, community templates deferred
5. ✅ Resources: Engineers remain in assigned teams
6. ✅ Parser: `marked` + `DOMPurify`
7. ✅ Compatibility: Support both sliders and markdown

---

**Document Status:** READY FOR IMPLEMENTATION  
**Target Release:** 2.7.0 (March 2026)
