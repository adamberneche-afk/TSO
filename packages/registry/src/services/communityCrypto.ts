import crypto from 'crypto';

// Shared AES-256-GCM crypto for "community" (isPublic: true) RAG
// documents -- extracted out of routes/rag.ts's /community/encrypt and
// /community/decrypt handlers (which still use it, via
// encryptCommunityData/decryptCommunityData below) so the same,
// already-tested logic can also back the App RAG read path
// (routes/agent.ts's GET /rag) without duplicating the crypto.
//
// Every community document shares this single server-side key -- unlike
// a user's own private documents (encrypted client-side with a
// wallet-derived key the server never has), the server can always
// decrypt a community document on behalf of an authenticated caller.
// That's what makes it safe to expose to an OAuth-authorized third-party
// app with the rag:read scope: no new key-wrapping/sharing crypto is
// needed, since the server already legitimately holds this key and
// already decrypts on demand for the owning wallet's own browser
// session via /community/decrypt.
//
// The salt is kept as a public, non-secret marker -- its only
// cryptographic role is to prevent rainbow-table reuse across unrelated
// PBKDF2 derivations, not to gate access, so there's no harm in it being
// a well-known constant. The actual secret is the password, which lives
// only in this process's environment and is never sent to any client.
// It defaults to the same value the client used to hardcode, purely so
// documents already encrypted under it remain decryptable without a
// data migration -- operators should set RAG_COMMUNITY_ENCRYPTION_KEY to
// a real secret in production.
const COMMUNITY_SALT_MARKER = 'TAIS-RAG-COMMUNITY-SHARED-KEY-v1';

export function deriveCommunityKey(): Buffer {
  const password = process.env.RAG_COMMUNITY_ENCRYPTION_KEY || COMMUNITY_SALT_MARKER;
  return crypto.pbkdf2Sync(password, COMMUNITY_SALT_MARKER, 100000, 32, 'sha256');
}

export function communitySaltBase64(): string {
  return Buffer.from(COMMUNITY_SALT_MARKER, 'utf8').toString('base64');
}

export function encryptCommunityData(data: string): { encrypted: string; iv: string; salt: string } {
  const iv = crypto.randomBytes(12);
  const key = deriveCommunityKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  // Match the Web Crypto API convention this replaces: AES-GCM
  // ciphertext has the auth tag appended to its end, not kept separate.
  const combined = Buffer.concat([ciphertext, cipher.getAuthTag()]);

  return {
    encrypted: combined.toString('base64'),
    iv: iv.toString('base64'),
    salt: communitySaltBase64(),
  };
}

/**
 * Throws if `salt` isn't the community marker (i.e. this document wasn't
 * actually encrypted with the community key -- see
 * isCommunityEncrypted below for a non-throwing check) or if the
 * ciphertext/auth tag don't verify.
 */
export function decryptCommunityData(encrypted: string, iv: string, salt: string): string {
  if (salt !== communitySaltBase64()) {
    throw new Error('Invalid salt for community document');
  }

  const ivBuf = Buffer.from(iv, 'base64');
  const combined = Buffer.from(encrypted, 'base64');
  const authTag = combined.subarray(combined.length - 16);
  const ciphertext = combined.subarray(0, combined.length - 16);

  const key = deriveCommunityKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuf);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * True if `salt` matches the community marker. A public (isPublic: true)
 * document created before the community-crypto migration (or via a
 * client that encrypted it with an ordinary wallet-derived key instead)
 * won't match -- the server has no way to decrypt those on an app's
 * behalf, so callers should skip rather than call decryptCommunityData
 * on them.
 */
export function isCommunityEncrypted(salt: string): boolean {
  return salt === communitySaltBase64();
}
