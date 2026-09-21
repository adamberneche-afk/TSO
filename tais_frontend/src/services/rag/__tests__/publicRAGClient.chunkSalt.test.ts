// Regression test for the RAG chunk salt-drop bug.
//
// Each chunk is encrypted with its own independently-generated salt --
// e2eeEncryption.ts's encrypt()/encryptForCommunity() call
// crypto.getRandomValues() fresh per call, so every chunk gets a distinct
// salt and a key derived from it. uploadDocument used to build each
// chunk's upload payload from only `{ index, encryptedContent, iv,
// embeddingHash }`, discarding the salt that chunk was actually encrypted
// with. Without it, that chunk's key could never be re-derived: it was
// permanently undecryptable. downloadDocument, symmetrically, never
// decrypted chunks at all -- it returned the raw encrypted chunk records
// untouched, mislabeled as `chunks: string[]`.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { webcrypto } from 'node:crypto';

// hashEmbedding() uses the Web Crypto API (crypto.subtle), which isn't a
// global under vitest's node environment on this Node version.
if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = webcrypto;
}

const encrypt = vi.fn();
const encryptForCommunity = vi.fn();
const decrypt = vi.fn();
const decryptCommunity = vi.fn();
const getPublicKey = vi.fn();

vi.mock('../e2eeEncryption', () => ({
  getE2EEEncryptionService: () => ({
    encrypt,
    encryptForCommunity,
    decrypt,
    decryptCommunity,
    getPublicKey,
  }),
}));

vi.mock('../embeddings', () => ({
  chunkText: (content: string) => content.split('|'),
  generateEmbeddings: async (texts: string[]) => texts.map(() => [0.1, 0.2]),
}));

const uploadDocument = vi.fn();
const getDocument = vi.fn();
const getDocumentChunks = vi.fn();

vi.mock('../ragApi', () => ({
  ragApi: {
    uploadDocument: (...args: any[]) => uploadDocument(...args),
    getDocument: (...args: any[]) => getDocument(...args),
    getDocumentChunks: (...args: any[]) => getDocumentChunks(...args),
  },
}));

import { PublicRAGClient } from '../publicRAGClient';

const WALLET = '0xabc0000000000000000000000000000000dead';

function makeClient(): PublicRAGClient {
  const client = new PublicRAGClient();
  // uploadDocument/downloadDocument only gate on walletAddress being set;
  // bypass the wallet-signing initializeWithWallet() flow entirely for
  // this unit test.
  (client as any).walletAddress = WALLET;
  return client;
}

describe('PublicRAGClient chunk salt handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploadDocument threads each chunk\'s own salt through to the upload payload', async () => {
    getPublicKey.mockReturnValue('owner-pubkey');
    encrypt.mockResolvedValue({ encrypted: 'doc-ciphertext', iv: 'doc-iv', salt: 'doc-salt' });

    // encryptForCommunity is also used for the whole document's content and
    // its metadata (both encrypted before any chunk is), so a call-order
    // counter would be misleading. Instead derive salt/iv from the input
    // text itself -- exactly like real encryption, a distinct salt per
    // distinct chunk -- so each chunk's salt is unambiguously tied to that
    // chunk regardless of call order.
    encryptForCommunity.mockImplementation(async (text: string) => ({
      encrypted: `enc-${text}`,
      iv: `iv-${text}`,
      salt: `salt-${text}`,
    }));

    const client = makeClient();
    const chunkTexts = ['chunk one', 'chunk two', 'chunk three'];
    await client.uploadDocument({
      title: 'Doc',
      content: chunkTexts.join('|'),
      metadata: { title: 'Doc', type: 'txt', tags: [], size: 0 },
      isPublic: true,
      tags: [],
    });

    expect(uploadDocument).toHaveBeenCalledTimes(1);
    const payload = uploadDocument.mock.calls[0][0];
    expect(payload.chunks).toHaveLength(3);

    payload.chunks.forEach((chunk: any, i: number) => {
      expect(chunk.salt).toBeDefined();
      expect(chunk.salt).toBe(`salt-${chunkTexts[i]}`);
    });

    const salts = new Set(payload.chunks.map((c: any) => c.salt));
    expect(salts.size).toBe(3);
  });

  it('downloadDocument decrypts each chunk with its own iv/salt, not the document\'s', async () => {
    getDocument.mockResolvedValue({
      walletAddress: WALLET,
      isPublic: false,
      encryptedData: 'doc-ciphertext',
      encryptedMetadata: 'meta-ciphertext',
      iv: 'doc-iv',
      salt: 'doc-salt',
    });

    getDocumentChunks.mockResolvedValue([
      { index: 0, encryptedContent: 'chunk-0-cipher', iv: 'chunk-0-iv', salt: 'chunk-0-salt', embeddingHash: 'h0' },
      { index: 1, encryptedContent: 'chunk-1-cipher', iv: 'chunk-1-iv', salt: 'chunk-1-salt', embeddingHash: 'h1' },
    ]);

    decrypt.mockImplementation(async (encryptedContent: string, iv: string, salt: string) => {
      if (encryptedContent === 'doc-ciphertext') return 'document text';
      if (encryptedContent === 'meta-ciphertext') return JSON.stringify({ title: 't', type: 'text/plain', tags: [] });
      // Only correctly "decryptable" when called with the exact iv/salt
      // that chunk was encrypted with -- proves the document-level
      // iv/salt was not (mis)used for a chunk.
      return `decrypted:${encryptedContent}:${iv}:${salt}`;
    });

    const client = makeClient();
    const result = await client.downloadDocument('doc-1');

    expect(result.chunks).toEqual([
      'decrypted:chunk-0-cipher:chunk-0-iv:chunk-0-salt',
      'decrypted:chunk-1-cipher:chunk-1-iv:chunk-1-salt',
    ]);

    expect(decrypt).toHaveBeenCalledWith('chunk-0-cipher', 'chunk-0-iv', 'chunk-0-salt');
    expect(decrypt).toHaveBeenCalledWith('chunk-1-cipher', 'chunk-1-iv', 'chunk-1-salt');
  });
});
