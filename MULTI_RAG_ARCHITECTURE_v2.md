# Multi-RAG System Architecture v2.0

## Overview

A comprehensive Retrieval-Augmented Generation (RAG) system with four tiers, implementing end-to-end encryption, context isolation, and platform-aware dynamic source selection. Based on detailed architecture review and community feedback.

## The Four RAG Tiers

### 1. Private RAG (Local-Only) ✅ IMPLEMENTED
**Purpose:** Personal knowledge base stored entirely on user's device  
**Storage:** Browser IndexedDB with client-side embeddings  
**Privacy:** 100% private, never leaves device  
**Encryption:** Local encryption with user-managed keys  
**Scope:** `['personal', 'sensitive']`  
**Access Conditions:** `['desktop', 'local']`  

**Implementation Status:**
- ✅ IndexedDB storage with document/chunk separation
- ✅ TensorFlow.js Universal Sentence Encoder for embeddings
- ✅ Client-side cosine similarity search
- ✅ MMR re-ranking for diversity
- ✅ Progress tracking during ingestion
- ✅ 50MB default storage limit (configurable)

**Files:**
- `src/services/rag/privateRAG.ts` - Core service
- `src/services/rag/embeddings.ts` - Embedding utilities
- `src/app/components/rag/PrivateRAGManager.tsx` - UI component

### 2. Public RAG (E2EE Platform) 🚧 PLANNED
**Purpose:** Community-shared knowledge base with end-to-end encryption  
**Storage:** TAIS platform with client-side encryption  
**Privacy:** E2EE - TAIS cannot read content, only encrypted blobs  
**Encryption:** AES-256-GCM with user-held keys derived from wallet signature  
**Scope:** `['cross-device', 'general-knowledge']`  
**Access Conditions:** `['web', 'mobile', 'desktop']`, `authenticated: true`  

**Architecture:**
```
Document → Chunking → Client Embeddings (TF.js) 
    → Encrypt with Wallet Key → Upload to TAIS Platform
    → Encrypted Index maintained server-side
    → Search: Query embedding → Encrypted similarity → Download & Decrypt
```

**Key Features:**
- Encrypted embeddings stored on server
- Client-side decryption before similarity computation
- Public key sharing for community knowledge
- Zero-knowledge architecture

### 3. App-Specific RAG (SDK) 🚧 PLANNED
**Purpose:** Third-party developers can add RAG to their applications  
**Storage:** Developer-managed (local, cloud, or hybrid)  
**Privacy:** Configurable by developer, sandboxed per app  
**Encryption:** App-scoped encryption keys  
**Scope:** `['app-context', 'integration-data']`  
**Access Conditions:** `['app-integration']`, `appId: required`  

**SDK Design:**
```typescript
import { createRAG } from '@tais/rag-sdk';

const rag = createRAG({
  appId: 'my-app',
  storage: 'postgresql', // or 'local', 's3', 'custom'
  embeddings: 'openai', // or 'tensorflow', 'custom'
  encryption: 'app-scoped'
});

await rag.addDocument(doc);
const context = await rag.query(userQuery);
```

### 4. Enterprise RAG (Org-Level) 🚧 PLANNED
**Purpose:** Organization-wide knowledge management with admin controls  
**Storage:** Enterprise-controlled (self-hosted or private cloud)  
**Privacy:** Enterprise-owned, SOC2/GDPR compliant  
**Encryption:** At-rest encryption with RBAC  
**Scope:** `['enterprise', 'compliance', 'team-specific']`  
**Access Conditions:** `['enterprise']`, `authenticated: true`, SSO required  

**Features:**
- Self-hosted PostgreSQL + pgvector
- Admin dashboard for user/team management
- Audit logging with query tracking
- SSO integration (SAML, OIDC)
- Role-based access control (RBAC)

---

## Enhanced Configuration Schema

Based on architecture review feedback, here's the complete configuration structure:

### Context Source Configuration
```typescript
{
  "id": "private-local-rag",
  "type": "local",
  "priority": 1,
  "name": "Private Knowledge Base",
  "description": "Personal documents stored locally",
  "storage": {
    "type": "indexeddb",
    "encrypted": true,
    "encryptionKey": "user-managed",
    "encryptionScheme": "AES-256-GCM"
  },
  "scope": ["personal", "sensitive"],
  "embeddings": {
    "model": "tensorflow-use",
    "dimensions": 512
  },
  "accessConditions": {
    "platforms": ["desktop", "local"],
    "authenticated": false
  }
}
```

### RAG Configuration
```typescript
{
  "contextSources": [...],
  "retrievalStrategy": "hybrid",
  "maxChunks": 10,
  "chunkSize": 500,
  "chunkOverlap": 50,
  "similarityThreshold": 0.5,
  "reranking": true,
  "fallbackOrder": ["private-local-rag", "tais-platform-rag", "app-specific-rag"],
  "sourceWeights": {
    "private-local-rag": 1.5,
    "tais-platform-rag": 1.0,
    "app-specific-rag": 0.8
  }
}
```

### Context Isolation
```typescript
{
  "privateStaysLocal": true,
  "noCrossContamination": true,
  "auditLog": {
    "enabled": true,
    "trackSourceUsage": true,
    "trackRetrieval": true,
    "location": "local-only",
    "retentionDays": 30
  }
}
```

### Data Governance
```typescript
{
  "classificationRules": {
    "private": ["password", "api-key", "secret", "personal", "confidential"],
    "platform": ["preference", "config", "setting", "profile"],
    "app": ["app-state", "integration", "workflow"],
    "public": ["documentation", "guide", "tutorial"]
  },
  "retentionPolicies": {
    "private": "infinite",
    "platform": "user-controlled",
    "app": "app-controlled",
    "public": 365
  },
  "autoClassify": true,
  "manualOverride": true
}
```

---

## Platform Detection & Dynamic Source Selection

### Platform Detection
```typescript
const platform = detectPlatform(); // 'web' | 'mobile' | 'desktop' | 'local'
const capabilities = getPlatformCapabilities();
// {
//   localStorage: true,
//   indexedDB: true,
//   fileSystem: false,
//   encryption: 'web-crypto-api',
//   secureContext: true,
//   ...
// }
```

### Dynamic Source Selection
```typescript
function selectRAGSources(context: SelectionContext): string[] {
  const { platform, userAuth, appId, dataClassification } = context;
  
  const activeSources = [];
  
  // Private RAG only on local platforms
  if (platform === 'desktop' || platform === 'local') {
    activeSources.push('private-local-rag');
  }
  
  // Platform RAG when authenticated
  if (userAuth && ['web', 'mobile', 'desktop'].includes(platform)) {
    activeSources.push('tais-platform-rag');
  }
  
  // App-specific RAG when in app context
  if (appId && platform === 'app-integration') {
    activeSources.push({
      id: 'app-specific-rag',
      appConfig: getAppRAGConfig(appId)
    });
  }
  
  return activeSources;
}
```

---

## Skills + RAG Integration

Skills can declare their RAG requirements:

```typescript
{
  "id": "skill-12",
  "source": "registry",
  "version": "1.0.5",
  "contextRequirements": {
    "requiredRAGs": ["tais-platform-rag"],
    "optionalRAGs": ["app-specific-rag"],
    "minContextChunks": 5
  },
  "ragAware": true
}
```

**Runtime Behavior:**
1. Skill declares RAG needs
2. Platform checks source availability
3. If required sources unavailable, skill shows warning
4. If optional sources available, skill uses them for enhanced functionality

---

## Security Architecture

### Encryption Layers

**Private RAG:**
- Data: Unencrypted (device-only)
- Embeddings: Local computation with TensorFlow.js
- Access: Device-only, no network transmission

**Public RAG (E2EE):**
- Data: AES-256-GCM encrypted with wallet-derived key
- Embeddings: Computed client-side, encrypted before upload
- Index: Encrypted similarity computation
- Sharing: Public key cryptography for access control

**App RAG:**
- Data: Configurable (developer choice)
- Embeddings: Developer-managed
- Access: App-defined permissions with sandboxing

**Enterprise RAG:**
- Data: At-rest encryption (AES-256)
- Embeddings: Server-side with access logs
- Access: RBAC with audit trails
- Compliance: SOC2, GDPR, HIPAA ready

### Key Management

**Private RAG:**
- No keys needed (local storage)

**Public RAG:**
- Keys derived from wallet signature
- Static message: "TAIS RAG Encryption Key"
- SHA-256 hash → AES-256-GCM key material
- Keys never stored, derived on-demand

**Enterprise RAG:**
- KMS integration (AWS KMS, Azure Key Vault)
- Key rotation policies
- Audit logging of key access

---

## Implementation Roadmap

### Phase 1: Private RAG ✅ COMPLETE
- ✅ Local document ingestion (TXT, MD, JSON, PDF)
- ✅ Client-side chunking (500 chars, 50 overlap)
- ✅ TensorFlow.js embeddings (USE model)
- ✅ IndexedDB storage (documents + chunks)
- ✅ Cosine similarity search
- ✅ MMR re-ranking
- ✅ UI components (upload, list, delete)

### Phase 2: Public RAG (Week 2)
- [ ] Encrypted document upload API
- [ ] E2EE storage backend
- [ ] Encrypted index management
- [ ] Client-side search over encrypted data
- [ ] Public key sharing mechanism
- [ ] Community discovery features

### Phase 3: App RAG SDK (Week 3)
- [ ] SDK package structure
- [ ] Pluggable storage backends
- [ ] Embedding model abstraction
- [ ] Documentation and examples
- [ ] npm publish

### Phase 4: Enterprise RAG (Week 4)
- [ ] Self-hosted deployment option
- [ ] Admin dashboard
- [ ] User/team management
- [ ] Audit logging system
- [ ] SSO integration (SAML/OIDC)

### Phase 5: Platform Integration (Week 5)
- [ ] Dynamic source selection
- [ ] Skills + RAG integration
- [ ] Context isolation enforcement
- [ ] Data governance automation
- [ ] Cross-platform sync

---

## File Structure

```
src/
├── types/
│   ├── rag.ts                      # Base RAG types
│   └── rag-enhanced.ts             # Enhanced types with context isolation
├── services/
│   └── rag/
│       ├── embeddings.ts           # TF.js embedding utilities
│       ├── privateRAG.ts           # Local IndexedDB RAG ✅
│       ├── platformDetection.ts    # Platform detection & capabilities
│       ├── ragRouter.ts            # Multi-source aggregation
│       ├── publicRAG.ts            # E2EE platform RAG 🚧
│       ├── appRAG.ts               # SDK for app developers 🚧
│       └── enterpriseRAG.ts        # Enterprise features 🚧
├── hooks/
│   └── useRAG.ts                   # React hooks for RAG operations ✅
└── app/components/
    └── rag/
        ├── RAGSourceManager.tsx    # Source configuration UI ✅
        ├── PrivateRAGManager.tsx   # Document management UI ✅
        ├── PublicRAGBrowser.tsx    # Community knowledge browser 🚧
        ├── RAGSettings.tsx         # Complete settings panel 🚧
        └── index.ts                # Component exports
```

---

## UI Components

### RAG Dashboard
- Show active context sources
- Data volume per source
- Sync status (local ↔ platform)
- Health indicators

### Knowledge Sources Panel
- Configure each RAG tier
- Set access rules
- Manage encryption keys
- View audit logs

### Context Inspector (Debug)
- See which RAG was queried
- View retrieved chunks
- Understand ranking decisions
- Export context for debugging

### Skills + Context Matrix
- Show which skills require which RAG sources
- Permission warnings
- Suggest missing sources

---

## Performance Targets

**Private RAG:**
- Document ingestion: <2s per 10KB
- Search latency: <500ms for 10k chunks
- Embeddings: ~100ms per chunk
- Storage: Up to 50MB (configurable)

**Public RAG:**
- Upload: Network dependent + encryption
- Search: <1s (network + decryption)
- Scalable to millions of documents

**Enterprise RAG:**
- Search: <100ms with HNSW index
- Throughput: 1000+ QPS
- Storage: Unlimited (self-hosted)

---

## Dependencies

**Core:**
- `@tensorflow/tfjs` - Embeddings
- `@tensorflow-models/universal-sentence-encoder` - USE model
- `ethers` - Wallet integration for encryption

**Storage:**
- IndexedDB API (browser native)
- LocalStorage API (browser native)

**Optional (Enterprise):**
- `pgvector` - PostgreSQL extension
- `redis` - Caching layer

---

## Usage Examples

### Basic Private RAG Usage
```typescript
import { getPrivateRAG } from './services/rag/privateRAG';

const rag = getPrivateRAG();
await rag.initialize();

// Add document
const doc = await rag.addDocument(
  "My React notes...",
  { title: "React Notes", type: "md" }
);

// Search
const results = await rag.search("How do I use hooks?", 5);
```

### Using RAG Router
```typescript
import { useRAG } from './hooks/useRAG';

function MyComponent() {
  const { queryWithContext, getContextString } = useRAG();
  
  const handleUserQuery = async (query: string) => {
    const context = await queryWithContext(query);
    const contextString = getContextString();
    
    // Send to LLM with context
    const response = await llm.complete({
      messages: [
        { role: 'system', content: contextString },
        { role: 'user', content: query }
      ]
    });
  };
}
```

---

## Future Enhancements

- **Semantic Chunking:** Use NLP to split at semantic boundaries
- **Multi-modal RAG:** Support for images, audio, video
- **Real-time Sync:** Live collaboration on shared knowledge
- **AI-powered Organization:** Auto-categorize and tag documents
- **Federated Search:** Query multiple enterprise RAGs simultaneously
- **RAG Marketplace:** Pre-built knowledge bases for popular domains

---

**Status:** Phase 1 Complete ✅  
**Next Milestone:** Phase 2 - Public RAG with E2EE  
**Last Updated:** February 18, 2026  
**Architecture Review:** Incorporated detailed feedback on context isolation, platform detection, and data governance
