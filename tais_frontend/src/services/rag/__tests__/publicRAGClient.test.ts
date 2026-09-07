// Regression test for PublicRAGClient.decryptResult's JSON.parse bug.
//
// uploadDocument encrypts each chunk of a document's raw prose text in
// isolation (`encryptionService.encrypt(chunk)` / `encryptForCommunity(chunk)`)
// -- encryptedContent never contains JSON, and metadata (title/type/tags) is
// encrypted completely separately as its own field and never bundled into
// the chunk payload. PublicRAGSearchResult.metadata is already a plain,
// unencrypted object on the search result.
//
// decryptResult used to do `JSON.parse(content)` on the decrypted chunk
// text to get "metadata", based on a comment claiming content held both
// text and metadata. Since content is plain prose, JSON.parse threw a
// SyntaxError on every real result.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PublicRAGSearchResult } from '../../../types/rag-public';

const decrypt = vi.fn();
const decryptCommunity = vi.fn();
const isCommunitySalt = vi.fn();

vi.mock('../e2eeEncryption', () => ({
  getE2EEEncryptionService: () => ({
    decrypt,
    decryptCommunity,
    isCommunitySalt,
  }),
}));

import { PublicRAGClient } from '../publicRAGClient';

function baseResult(overrides: Partial<PublicRAGSearchResult> = {}): PublicRAGSearchResult {
  return {
    documentId: 'doc-1',
    encryptedContent: 'ciphertext',
    iv: 'iv',
    salt: 'salt',
    score: 0.9,
    ownerPublicKey: 'pubkey',
    metadata: { title: 'A Doc', type: 'note', tags: ['a', 'b'] },
    ...overrides,
  };
}

describe('PublicRAGClient.decryptResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not throw on plain prose content and returns the real metadata', async () => {
    const prose = 'The quick brown fox jumps over the lazy dog.';
    isCommunitySalt.mockReturnValue(true);
    decryptCommunity.mockResolvedValue(prose);

    const client = new PublicRAGClient();
    const result = baseResult();

    const decrypted = await client.decryptResult(result);

    expect(decrypted.content).toBe(prose);
    // Must be the plain object already on the search result, not a
    // JSON.parse of the prose content (which would have thrown).
    expect(decrypted.metadata).toEqual(result.metadata);
  });

  it('uses wallet decryption for a non-community salt', async () => {
    const prose = 'Some private document text.';
    isCommunitySalt.mockReturnValue(false);
    decrypt.mockResolvedValue(prose);

    const client = new PublicRAGClient();
    const result = baseResult({ salt: 'wallet-salt' });

    const decrypted = await client.decryptResult(result);

    expect(decrypt).toHaveBeenCalledWith(result.encryptedContent, result.iv, result.salt);
    expect(decryptCommunity).not.toHaveBeenCalled();
    expect(decrypted.content).toBe(prose);
    expect(decrypted.metadata).toEqual(result.metadata);
  });
});
