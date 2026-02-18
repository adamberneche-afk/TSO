# Multi-RAG System Architecture

## Overview

A comprehensive Retrieval-Augmented Generation (RAG) system with four tiers to provide contextual information to AI agents based on privacy and sharing requirements.

## The Four RAG Tiers

### 1. Private RAG (Local-Only)
**Purpose:** Personal knowledge base stored entirely on user's device
**Storage:** Browser localStorage/IndexedDB with local vector embeddings
**Privacy:** 100% private, never leaves device
**Use Cases:**
- Personal notes and documents
- Private code snippets
- Sensitive business data
- Personal preferences and history

### 2. Public RAG (E2EE Platform)
**Purpose:** Community-shared knowledge base with end-to-end encryption
**Storage:** TAIS platform with client-side encryption
**Privacy:** E2EE - TAIS cannot read content, only encrypted blobs
**Use Cases:**
- Open source documentation
- Community best practices
- Public API documentation
- Shared skill knowledge bases

### 3. App-Specific RAG (SDK)
**Purpose:** Third-party developers can add RAG to their applications
**Storage:** Developer-managed (local, cloud, or hybrid)
**Privacy:** Configurable by developer
**Use Cases:**
- Custom business applications
- Specialized domain knowledge
- Proprietary datasets
- White-label solutions

### 4. Enterprise RAG (Org-Level)
**Purpose:** Organization-wide knowledge management with admin controls
**Storage:** Enterprise-controlled (self-hosted or private cloud)
**Privacy:** Enterprise-owned, SOC2/GDPR compliant
**Use Cases:**
- Company wikis and documentation
- Internal knowledge bases
- Compliance documents
- Team-specific resources

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Application                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Private RAG │  │  Public RAG  │  │  App RAG     │          │
│  │  (IndexedDB) │  │  (E2EE API)  │  │  (SDK)       │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                 │                 │                   │
│         └─────────────────┴─────────────────┘                   │
│                           │                                      │
│                    ┌──────────────┐                            │
│                    │ RAG Router   │                            │
│                    │ & Aggregator │                            │
│                    └──────────────┘                            │
│                           │                                      │
│                    ┌──────────────┐                            │
│                    │ LLM Context  │                            │
│                    │ Injection    │                            │
│                    └──────────────┘                            │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │   LLM Provider │
                    │ (OpenAI/Claude)│
                    └────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Enterprise RAG (Optional)                     │
│                   (Self-hosted/Private Cloud)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Query Flow
1. User asks question
2. RAG Router queries all enabled RAG sources
3. Each RAG retrieves relevant chunks (top-k)
4. Aggregator combines and ranks results
5. Context injected into LLM prompt
6. LLM generates response with citations

### Ingestion Flow

**Private RAG:**
```
Document → Chunking → Local Embeddings (TF.js) → IndexedDB
```

**Public RAG:**
```
Document → Chunking → Client Embeddings → Encrypt with Wallet Key → Upload to TAIS
```

**App RAG (SDK):**
```
Document → Developer Custom Processing → Storage
```

**Enterprise RAG:**
```
Document → Enterprise Processing → Vector DB → Access Control
```

---

## Security Model

### Encryption Layers

**Private RAG:**
- Data: Unencrypted (local only)
- Embeddings: Local computation
- Access: Device-only

**Public RAG:**
- Data: AES-256-GCM encrypted with user's wallet key
- Embeddings: Computed client-side, encrypted before upload
- Access: Anyone with decryption key (public key crypto for sharing)

**App RAG:**
- Data: Configurable (developer choice)
- Embeddings: Developer-managed
- Access: App-defined permissions

**Enterprise RAG:**
- Data: At-rest encryption (AES-256)
- Embeddings: Server-side with access logs
- Access: RBAC with audit trails

---

## Implementation Strategy

### Phase 1: Private RAG (Week 1)
- [ ] Local document ingestion (PDF, TXT, MD)
- [ ] Client-side chunking
- [ ] TensorFlow.js embeddings (Universal Sentence Encoder)
- [ ] IndexedDB storage
- [ ] Similarity search
- [ ] Basic UI for upload/manage

### Phase 2: Public RAG (Week 2)
- [ ] E2EE document upload flow
- [ ] Encrypted storage API
- [ ] Client-side search over encrypted data
- [ ] Sharing mechanisms (public key crypto)
- [ ] Community discovery features

### Phase 3: App RAG SDK (Week 3)
- [ ] SDK package with RAG client
- [ ] Pluggable storage backends
- [ ] Embedding model options
- [ ] Documentation and examples
- [ ] npm publish

### Phase 4: Enterprise RAG (Week 4)
- [ ] Self-hosted option
- [ ] Admin dashboard
- [ ] User/team management
- [ ] Audit logging
- [ ] SSO integration

---

## Technical Stack

**Embeddings:**
- TensorFlow.js Universal Sentence Encoder (local)
- OpenAI Embeddings API (optional)
- Custom embedding models (enterprise)

**Storage:**
- IndexedDB (private)
- TAIS Platform API (public)
- PostgreSQL + pgvector (enterprise)
- Configurable (app SDK)

**Vector Search:**
- Local: Brute-force cosine similarity (client-side)
- Remote: HNSW indexing (enterprise)
- Hybrid: Local cache + remote fetch

**Chunking:**
- Recursive character splitting
- Semantic chunking (optional)
- Custom chunk sizes per document type

---

## API Design

### Private RAG API
```typescript
interface PrivateRAG {
  addDocument(doc: Document): Promise<void>;
  removeDocument(id: string): Promise<void>;
  search(query: string, topK: number): Promise<Chunk[]>;
  listDocuments(): Promise<Document[]>;
}
```

### Public RAG API
```typescript
interface PublicRAG {
  uploadDocument(doc: Document): Promise<string>; // Returns encrypted ID
  downloadDocument(id: string): Promise<Document>;
  search(query: string): Promise<EncryptedChunk[]>;
  shareDocument(id: string, recipientPublicKey: string): Promise<void>;
}
```

### App RAG SDK
```typescript
interface RAGSDK {
  initialize(config: RAGConfig): RAGInstance;
  addDocument(doc: Document): Promise<void>;
  query(query: string): Promise<Context[]>;
}
```

### Enterprise RAG API
```typescript
interface EnterpriseRAG {
  admin: AdminAPI;
  user: UserAPI;
  ingestDocument(doc: Document, metadata: Metadata): Promise<void>;
  search(query: string, filters: Filters): Promise<Chunk[]>;
  auditLog(): Promise<AuditEntry[]>;
}
```

---

## Usage Examples

### Private RAG
```typescript
import { PrivateRAG } from '@tais/rag';

const rag = new PrivateRAG();
await rag.addDocument({
  content: "My personal notes about React...",
  metadata: { type: 'notes', topic: 'react' }
});

const results = await rag.search("How do I use hooks?", 5);
// Returns top 5 relevant chunks from private notes
```

### Public RAG
```typescript
import { PublicRAG } from '@tais/rag';

const rag = new PublicRAG(walletSigner);
const docId = await rag.uploadDocument({
  content: "Open source React patterns...",
  metadata: { type: 'documentation', license: 'MIT' }
});

// Search community knowledge
const results = await rag.search("React best practices");
```

### App RAG (SDK)
```typescript
import { createRAG } from '@tais/rag-sdk';

const rag = createRAG({
  storage: 'postgresql',
  embeddings: 'openai',
  apiKey: process.env.OPENAI_KEY
});

await rag.addDocument(doc);
const context = await rag.query(userQuestion);
```

### Enterprise RAG
```typescript
import { EnterpriseRAG } from '@tais/rag-enterprise';

const rag = new EnterpriseRAG({
  endpoint: 'https://rag.company.com',
  apiKey: enterpriseKey,
  userId: employeeId
});

// Search internal docs
const results = await rag.search(query, {
  departments: ['engineering'],
  clearance: 'confidential'
});
```

---

## Performance Considerations

**Private RAG:**
- Limit: ~1000 documents (browser memory)
- Search: <500ms for 10k chunks
- Embeddings: ~100ms per document

**Public RAG:**
- No client limit (cloud storage)
- Search: <1s (network + decryption)
- Lazy loading of embeddings

**Enterprise RAG:**
- Scale: Millions of documents
- Search: <100ms with HNSW index
- Caching: Redis/Memcached

---

**Status:** Architecture Finalized
**Ready for:** Phase 1 Implementation
**Estimated Timeline:** 4 weeks (1 week per phase)
