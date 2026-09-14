# Multi-RAG System Components

Complete implementation of the four-tier RAG (Retrieval-Augmented Generation) system for the TAIS platform.

## Overview

The Multi-RAG system provides contextual knowledge retrieval from four different sources, each with distinct privacy and sharing characteristics:

1. **Private RAG** - Local-only, 100% private
2. **Public RAG** - E2EE community knowledge sharing
3. **App RAG** - Third-party developer SDK, via OAuth
4. **Enterprise RAG** - Organization-level with admin controls, invite-only, no wallet required

## Current Implementation Status

✅ **Phase 1: Private RAG** - COMPLETE
✅ **Phase 2: Public RAG** - COMPLETE
✅ **Phase 3: App RAG** - COMPLETE (2026-09-12) -- see below
✅ **Phase 4: Enterprise RAG** - COMPLETE (2026-09-13) -- see below

---

## App RAG

A registered, OAuth-authorized third-party app can read a wallet's own
public/community RAG documents with the user's consent -- reusing the
exact same app-registration and OAuth authorize/approve/token-exchange
flow already built for Cross-App Agent Portability
(`packages/registry/src/routes/oauth.ts`), just with a new scope:

```
rag:read
```

An app requests it like any other scope (`GET /oauth/authorize?...&scopes=rag:read`) and the existing `OAuthAuthorize.tsx` consent screen displays and approves it with no changes needed -- it already renders whatever scopes an app requests generically.

Once authorized, the app calls the registry directly (or via `@think/agent-sdk`'s `TAISAgent.getRagDocuments()`):

```typescript
import { TAISAgent } from '@think/agent-sdk';

const agent = new TAISAgent({ appId: 'my-app', appSecret: '...' });
// ... after the user completes OAuth with rag:read granted ...
const { documents, skipped } = await agent.getRagDocuments();
```

**Why this needed no new encryption scheme:** every "community"
(`isPublic: true`) document is already encrypted server-side with a
single server-held key (`packages/registry/src/services/
communityCrypto.ts`), not a per-wallet or per-recipient one -- the
server already legitimately decrypts a community document on behalf of
its owning wallet's own browser session (`POST /rag/community/decrypt`).
`GET /api/v1/agent/rag` does the same decryption, just on an authorized
app's behalf instead, gated by the OAuth scope. A user's **private**
documents (`isPublic: false`) are never included -- those stay encrypted
with a wallet-derived key the server never has, exactly as designed.

A public document created before the community-crypto scheme existed
(encrypted client-side with an ordinary wallet-derived key) can't be
decrypted server-side either -- it's counted in the response's `skipped`
field rather than returned or erroring the whole request.

---

## Enterprise RAG

Organization-level document sharing for teams, with membership that's
**invite-only and requires no crypto wallet** -- see
`docs/ENTERPRISE_RAG_IDENTITY.md` (backend) and `docs/ENTERPRISE_RAG_DATA_MODEL.md`
(data model) for the full design. This is a deliberate exception to
every other tier here: Private/Public/App RAG all assume a connected
wallet is the user's identity; an Enterprise RAG member logs in with
just an email and password.

An org admin invites a member's email; accepting the invitation link
(`/orgs/invitations/:token`) sets a password and logs them straight in.
That login issues the exact same `{walletAddress}` JWT a wallet-signature
login does -- just over a deterministic, non-signable address derived
from the email (`packages/registry/src/services/emailIdentity.ts`), never
a real wallet. Every other RAG-tier component on this page, and every
`api.*` call in this app, keeps working unchanged for that session.

Org documents reuse Public RAG's community-key encryption exactly like
App RAG does above (`POST /rag/community/encrypt`/`/decrypt`) -- not
`PublicRAGClient`, which requires a connected wallet just to derive its
own encryption key, something an email-identity member never has.

```tsx
import { EnterprisePage } from '../enterprise/EnterprisePage';

<EnterprisePage />
```

`EnterprisePage` shows email sign-in (or the org dashboard, if already
signed in) and, separately, an admin-only "provision a new organization"
panel that's the one part of this feature that legitimately still uses
the existing wallet-connect flow (creating an org is a platform-admin
action, not something a member does).

**Components** (`src/app/components/enterprise/`): `EnterpriseLogin`,
`ForgotPasswordForm`, `ResetPasswordForm`, `InvitationAccept`,
`OrgDashboard` (members, roles, invite form, document panel),
`CreateOrganizationForm`.

**Services:** `src/services/enterpriseAuthApi.ts` (email session,
stored under the same `localStorage` keys `authApi.ts`'s wallet login
uses), `src/services/orgsApi.ts` (org/member/invitation/document calls).

---

## Components

### RAGSourceManager
Configure and manage RAG sources with weights and enable/disable toggles.

```tsx
import { RAGSourceManager } from './components/rag';

<RAGSourceManager />
```

**Features:**
- Enable/disable RAG sources
- Set relevance weights per source
- View document counts and stats
- Refresh source status

### PrivateRAGManager
Upload and manage documents in your private knowledge base (IndexedDB).

```tsx
import { PrivateRAGManager } from './components/rag';

<PrivateRAGManager />
```

**Features:**
- Upload documents (TXT, MD, JSON, PDF)
- View document list with metadata
- Delete individual documents
- Clear all documents
- Storage statistics
- Progress tracking during upload

### PublicRAGManager
Share and discover knowledge with the community using E2EE.

```tsx
import { PublicRAGManager } from './components/rag';

<PublicRAGManager />
```

**Features:**
- **Upload Tab**: Upload documents with public/private toggle
- **Search Tab**: Search community knowledge (client-side decryption)
- **My Docs Tab**: Manage your uploaded documents
- **Community Tab**: Browse public documents
- **Sharing**: Share documents via public keys
- **Public Key**: Display and copy your public key

---

## Services

### E2EE Encryption Service
`src/services/rag/e2eeEncryption.ts`

Handles all encryption/decryption for Public RAG:

```typescript
import { getE2EEEncryptionService } from './services/rag';

const encryption = getE2EEEncryptionService();
await encryption.initialize(signer);

// Encrypt data
const encrypted = await encryption.encrypt('sensitive data');

// Decrypt data
const decrypted = await encryption.decrypt(
  encrypted.encrypted,
  encrypted.iv,
  encrypted.salt
);

// Encrypt for specific recipient (ECIES scheme)
const shared = await encryption.encryptForRecipient(data, recipientPublicKey);

// Decrypt from sender (uses ephemeral public key)
const received = await encryption.decryptFromSender(
  shared.encryptedData,
  shared.ephemeralPublicKey,
  shared.iv
);
```

**Security Features:**
- ECIES (Elliptic Curve Integrated Encryption Scheme)
- ECDH with P-384 curve for key exchange
- HKDF for key derivation
- AES-256-GCM for data encryption
- Private keys encrypted with wallet-derived keys
- Key storage in localStorage (encrypted)

### Public RAG Client
`src/services/rag/publicRAGClient.ts`

API client for E2EE platform communication:

```typescript
import { getPublicRAGClient } from './services/rag';

const client = getPublicRAGClient();
await client.initializeWithWallet();

// Upload document
const doc = await client.uploadDocument({
  title: 'My Document',
  content: 'Document content...',
  metadata: { type: 'md', tags: ['tutorial'] },
  isPublic: true,
  tags: ['react', 'javascript']
});

// Search
const results = await client.search({ query: 'how to use hooks' });

// Decrypt results
const decrypted = await Promise.all(
  results.map(r => client.decryptResult(r))
);

// Share document
await client.shareDocument(docId, recipientPublicKey);
```

**Features:**
- Wallet authentication
- Client-side encryption
- Privacy-preserving search (hash-based)
- Document sharing
- Community discovery

### Private RAG Service
`src/services/rag/privateRAG.ts`

Local-only document storage and search:

```typescript
import { getPrivateRAG } from './services/rag';

const rag = getPrivateRAG();
await rag.initialize();

// Add document
const doc = await rag.addDocument(
  'Document content...',
  { title: 'My Notes', type: 'txt' }
);

// Search
const results = await rag.search('search query', 5);

// List documents
const docs = await rag.listDocuments();

// Delete document
await rag.removeDocument(docId);
```

**Features:**
- IndexedDB storage
- TensorFlow.js embeddings
- Client-side similarity search
- MMR re-ranking
- Progress tracking

### RAG Router
`src/services/rag/ragRouter.ts`

Aggregates results from multiple RAG sources:

```typescript
import { createDefaultRAGRouter } from './services/rag';

const router = createDefaultRAGRouter();

// Query all enabled sources
const context = await router.query({
  query: 'user question',
  topK: 10
});

// Build context string for LLM
const contextString = router.buildContextString(context);

// Get citations
const citations = router.getCitations(context);
```

**Features:**
- Multi-source aggregation
- Weighted ranking
- Deduplication
- Fallback ordering
- Context injection

---

## Hooks

### useRAG
Query multiple RAG sources and get context:

```typescript
import { useRAG } from './hooks';

function MyComponent() {
  const {
    queryWithContext,
    getContextString,
    sources,
    isInitialized
  } = useRAG();

  const handleQuery = async (query: string) => {
    const context = await queryWithContext(query);
    const contextStr = getContextString();
    // Use with LLM...
  };
}
```

### usePrivateRAG
Manage private documents:

```typescript
import { usePrivateRAG } from './hooks';

function MyComponent() {
  const {
    documents,
    uploadDocument,
    deleteDocument,
    isUploading
  } = usePrivateRAG();

  // Use in UI...
}
```

### usePublicRAG
Use Public RAG features:

```typescript
import { usePublicRAG, usePublicRAGUpload } from './hooks';

function MyComponent() {
  const {
    isInitialized,
    isSearching,
    searchResults,
    performSearch,
    documents,
    communityDocuments,
    shareDocument
  } = usePublicRAG();

  const { upload, isUploading, uploadProgress } = usePublicRAGUpload();

  // Use in UI...
}
```

---

## Security Architecture

### Private RAG
- **Storage**: IndexedDB (browser local)
- **Encryption**: None needed (local only)
- **Privacy**: 100% private, never leaves device

### Public RAG
- **Storage**: TAIS Platform API
- **Encryption**: AES-256-GCM with wallet-derived keys
- **Search**: Embedding hashes only (zero-knowledge)
- **Sharing**: Public key cryptography
- **Authentication**: Wallet-based API keys

### Key Derivation
```
Wallet Signature("TAIS Public RAG Encryption Key")
  ↓
SHA-256 Hash
  ↓
AES-256-GCM Key Material
```

### Encryption Flow
```
Document Content
  ↓
Client-side AES-256-GCM Encryption
  ↓
Upload Encrypted Blob to Server
  ↓
Server Stores Only Ciphertext
```

### Search Flow
```
User Query
  ↓
Generate Embedding (TF.js)
  ↓
Hash Embedding (SHA-256)
  ↓
Send Hash to Server
  ↓
Server Returns Encrypted Matches
  ↓
Client Decrypts Results
```

---

## Usage Example

### Complete Integration

```tsx
import { useState } from 'react';
import { useRAG, usePrivateRAG, usePublicRAG } from './hooks';
import { LLMClient } from './services/llmClient';

function KnowledgeAssistant() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  
  const rag = useRAG();
  const privateRAG = usePrivateRAG();
  const publicRAG = usePublicRAG();
  
  const handleAsk = async () => {
    // Get context from all RAG sources
    const context = await rag.queryWithContext(query);
    const contextStr = rag.getContextString(context);
    
    // Query LLM with context
    const llm = new LLMClient('openai', apiKey);
    const result = await llm.complete({
      messages: [
        { 
          role: 'system', 
          content: `Use this context to answer: ${contextStr}` 
        },
        { role: 'user', content: query }
      ]
    });
    
    setResponse(result.content);
  };
  
  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <button onClick={handleAsk}>Ask</button>
      <p>{response}</p>
    </div>
  );
}
```

---

## Configuration

### Environment Variables
```bash
VITE_PUBLIC_RAG_API_URL=https://api.taisplatform.com/v1/rag
```

### TypeScript Types
All types are exported from:
- `src/types/rag.ts` - Base RAG types
- `src/types/rag-public.ts` - Public RAG types
- `src/types/rag-enhanced.ts` - Enhanced types with context isolation
- App RAG's types (`RagDocumentResult`/`RagQueryResult`) live in
  `packages/agent-sdk/src/types.ts` -- App RAG is a third-party app
  concern (via `@think/agent-sdk`), not a `tais_frontend` one; see the
  "App RAG" section above.

---

## File Structure

```
src/
├── services/rag/
│   ├── index.ts                 # Service exports
│   ├── embeddings.ts            # TF.js embedding utilities
│   ├── privateRAG.ts            # Local IndexedDB RAG
│   ├── publicRAGClient.ts       # E2EE platform client
│   ├── e2eeEncryption.ts        # Encryption service
│   ├── ragRouter.ts             # Multi-source router
│   └── platformDetection.ts     # Platform detection
├── hooks/
│   ├── index.ts                 # Hook exports
│   ├── useRAG.ts                # RAG hooks
│   └── usePublicRAG.ts          # Public RAG hooks
├── app/components/rag/
│   ├── index.ts                 # Component exports
│   ├── RAGSourceManager.tsx     # Source configuration
│   ├── PrivateRAGManager.tsx    # Private RAG UI
│   └── PublicRAGManager.tsx     # Public RAG UI
├── app/components/enterprise/    # Enterprise RAG (email/password, no wallet)
│   ├── EnterprisePage.tsx
│   ├── EnterpriseLogin.tsx
│   ├── ForgotPasswordForm.tsx / ResetPasswordForm.tsx
│   ├── InvitationAccept.tsx
│   ├── OrgDashboard.tsx
│   └── CreateOrganizationForm.tsx
├── services/
│   ├── enterpriseAuthApi.ts      # Enterprise RAG email session
│   └── orgsApi.ts                # Org/member/invitation/document calls
└── types/
    ├── rag.ts                   # Base types
    ├── rag-public.ts            # Public RAG types
    ├── rag-enhanced.ts          # Enhanced types
    └── enterprise.ts            # Enterprise RAG types
```

App RAG has no `tais_frontend` component of its own -- the consuming
app calls the registry directly (or via `@think/agent-sdk`), and the
OAuth consent UI it goes through
(`src/app/components/oauth/OAuthAuthorize.tsx`) is the same one every
other cross-app scope already uses.

---

## Performance

### Private RAG
- **Document Ingestion**: <2s per 10KB
- **Search Latency**: <500ms for 10k chunks
- **Embeddings**: ~100ms per chunk (TF.js USE)
- **Storage**: 50MB default (configurable)

### Public RAG
- **Upload**: Network dependent + encryption overhead
- **Search**: ~1s (network + client-side decryption)
- **Encryption**: <100ms for typical documents
- **Scalability**: Millions of documents supported

---

## Security Checklist

✅ **Private RAG**
- [x] 100% local storage (IndexedDB)
- [x] No network transmission
- [x] No server-side processing

✅ **Public RAG**
- [x] Client-side encryption (AES-256-GCM)
- [x] Wallet-derived keys
- [x] Zero-knowledge search (hashes only)
- [x] Public key sharing
- [x] TLS 1.3 for all communication
- [x] API key authentication

✅ **App RAG**
- [x] OAuth-scoped access (`rag:read`), no new credential type
- [x] Private documents never included, regardless of scope
- [x] Server-side-only community key -- an app never sees it

✅ **Enterprise RAG**
- [x] Invite-only membership -- no self-serve join or org creation
- [x] No wallet, private key, or blockchain call anywhere in the login path
- [x] Org creation is a separate, admin-wallet-gated action from member login
- [x] Org documents use the same server-held community key as Public/App RAG -- no new crypto
- [x] Password hashing (bcrypt), single-use hashed invite/reset tokens

✅ **Encryption Service**
- [x] Deterministic key generation
- [x] Secure key storage
- [x] Hybrid encryption for sharing
- [x] Proper IV and salt usage

---

## Troubleshooting

### Private RAG not working
- Check IndexedDB support in browser
- Verify sufficient storage quota
- Check console for quota exceeded errors

### Public RAG connection failed
- Ensure wallet is connected
- Check API endpoint configuration
- Verify network connectivity

### Encryption errors
- Ensure secure context (HTTPS)
- Check Web Crypto API support
- Verify wallet signature availability

---

## Version

**Current:** 2.7.0  
**Status:** Phases 1-4 Complete (Private, Public, App, Enterprise RAG)  
**Last Updated:** September 13, 2026

---

## License

MIT
