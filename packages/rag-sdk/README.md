# tais-rag-sdk

TypeScript SDK for TAIS RAG (Retrieval-Augmented Generation) API. Enable third-party developers to integrate secure, encrypted knowledge storage into their applications.

## Requirements

**Gold Tier Access Required** - The TAIS RAG SDK is available exclusively to THINK Genesis Bundle NFT holders. This ensures premium features and higher quotas for serious integrations.

[Get Genesis NFT on OpenSea →](https://opensea.io/collection/think-genesis-bundle)

## Features

- **E2EE Support** - End-to-end encryption for document storage
- **Privacy-Preserving Search** - Query by embedding hash (server never sees content)
- **Wallet Signature Auth** - Secure authentication via wallet signature
- **Gold Tier Quotas** - 100GB storage, 2M embeddings/month, 100K queries/day
- **Document Sharing** - Share encrypted documents with other users
- **Community Documents** - Access public knowledge base

## Installation

```bash
npm install tais-rag-sdk
```

## Quick Start

```typescript
import { TAISClient } from 'tais-rag-sdk';

// Initialize client with wallet address
const client = new TAISClient({
  walletAddress: '0xYourWalletAddress',
});

// Check health
const health = await client.healthCheck();
console.log(health.status); // 'healthy'
```

## Authentication (Wallet Signature)

The SDK uses wallet signature authentication. Only Genesis NFT holders (Gold tier) can authenticate:

```typescript
import { TAISClient } from 'tais-rag-sdk';

const client = new TAISClient({
  walletAddress: '0xYourWalletAddress',
});

// Option 1: Use with MetaMask/ethers
const result = await client.authenticateWithSignature(async (message) => {
  // MetaMask
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  return await window.ethereum.request({
    method: 'personal_sign',
    params: [message, accounts[0]],
  });
});

// Option 2: Use with ethers.js
const result = await client.authenticateWithSignature(async (message) => {
  const signer = await ethersProvider.getSigner();
  return await signer.signMessage(message);
});

if (result.success) {
  console.log('API Key:', result.apiKey);
  console.log('Tier:', result.tier); // 'gold'
  console.log('NFT Count:', result.nftCount);
  console.log('Expires:', result.expiresAt);
  console.log('Rate Limit:', result.rateLimit, 'requests/day');
  
  // Client now has API key set automatically
  // Ready to use all SDK methods
}
```

### Error Handling

```typescript
try {
  await client.authenticateWithSignature(signFn);
} catch (error) {
  if (error.code === 'INSUFFICIENT_TIER') {
    console.log('Gold tier required');
    console.log('Upgrade:', error.details.upgradeUrl);
  }
}
```

## Document Upload (with E2EE)

### Session-Based Upload (Recommended)

Start a session once, upload unlimited documents for 1 hour:

```typescript
import { TAISClient, encryptDocument } from 'tais-rag-sdk';

const client = new TAISClient({ walletAddress: '0x...' });

// Start session (sign once, valid 1 hour)
const session = await client.startRAGSession(async (message) => {
  return await wallet.signMessage(message);
});

console.log('Session expires in:', session.expiresIn, 'seconds');

// Upload multiple documents without re-signing
for (const doc of documents) {
  const { encryptedData, iv, salt } = await encryptDocument(doc.content, key);
  
  await client.uploadDocument(encryptedData, {
    title: doc.title,
    tags: doc.tags,
    isPublic: false,
  });
}

// Check session status anytime
const status = await client.getSessionStatus();
console.log('Documents uploaded:', status.documentCount);
console.log('Session expires in:', status.expiresIn, 'seconds');

// End session when done (optional)
await client.endRAGSession();
```

### Per-Document Upload (Legacy)

```typescript
import { TAISClient, encryptDocument } from 'tais-rag-sdk';

const client = new TAISClient({ walletAddress: '0x...' });

// Encrypt your document locally
const { encryptedData, iv, salt } = await encryptDocument(
  'Your document content here',
  encryptionKey
);

// Upload encrypted document
const result = await client.uploadDocument(encryptedData, {
  title: 'My Document',
  tags: ['research', 'ai'],
  isPublic: false,
});

console.log(result.documentId);
```

## Search

```typescript
// Generate embedding hash from your query (client-side)
const queryHash = await generateEmbeddingHash('machine learning');

// Search for matching documents
const results = await client.search(queryHash, { topK: 5 });

// Decrypt results locally
for (const result of results) {
  const content = await decryptContent(
    result.encryptedContent,
    result.iv,
    result.salt,
    decryptionKey
  );
  console.log(content, result.score);
}
```

## Document Sharing

```typescript
// Share with another user's public key
await client.shareDocument(documentId, recipientPublicKey);

// Get someone's public key
const { publicKey } = await client.getPublicKey('0xRecipientWallet');
```

## Community Documents

```typescript
// Browse public documents
const communityDocs = await client.getCommunityDocuments(20, 0);

for (const doc of communityDocs) {
  console.log(doc.title, 'by', doc.author);
}
```

## API Reference

### `TAISClient`

#### Constructor

```typescript
new TAISClient(config?: TAISRAGConfig)
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | string | `https://tso.onrender.com` | API base URL |
| `apiKey` | string | - | API key for authentication |
| `walletAddress` | string | - | User's wallet address |
| `timeout` | number | 30000 | Request timeout in ms |

#### Methods

| Method | Description |
|--------|-------------|
| `uploadDocument(encryptedData, options)` | Upload encrypted document |
| `getDocuments()` | List user's documents |
| `getDocument(id)` | Get document details |
| `deleteDocument(id)` | Delete document |
| `search(queryHash, options)` | Search documents |
| `shareDocument(id, recipientPublicKey)` | Share document |
| `registerPublicKey(publicKey)` | Register user's public key |
| `getPublicKey(walletAddress)` | Get user's public key |
| `getCommunityDocuments(limit, offset)` | Browse public docs |
| `getQuota()` | Get quota status |
| `getStats()` | Get RAG statistics |
| `healthCheck()` | Check API health |

### Errors

```typescript
try {
  await client.getDocuments();
} catch (error) {
  if (error instanceof TAISAPIError) {
    console.log(error.statusCode); // HTTP status
    console.log(error.message);    // Error message
    console.log(error.details);    // Additional details
  }
}
```

## Tier Limits (Gold Tier - Genesis NFT Required)

| Tier | Storage | Embeddings/mo | Queries/day | SDK Access |
|------|---------|---------------|-------------|------------|
| Free | 10MB | 1,000 | 100 | ❌ |
| Bronze | 100MB | 10,000 | 1,000 | ❌ |
| Silver | 1GB | 100,000 | 10,000 | ❌ |
| **Gold** | **100GB** | **2,000,000** | **100,000** | ✅ |

Only Gold tier (Genesis NFT holders) can use the SDK.

## E2EE Utilities

The SDK includes optional encryption utilities:

```typescript
import {
  generateKeyPair,
  encryptDocument,
  decryptContent,
  generateEmbeddingHash
} from '@taisplatform/rag-sdk/crypto';
```

## Examples

See the `examples/` directory for complete usage examples:

- **Node.js CLI** - Command-line document manager
- **React App** - Web component with wallet integration
- **Server Integration** - Backend service integration

## License

MIT
