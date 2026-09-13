// @vitest-environment jsdom
//
// Enterprise RAG org client (docs/ENTERPRISE_RAG_IDENTITY.md,
// docs/ENTERPRISE_RAG_DATA_MODEL.md). Proves every call sends its body
// directly to api.post/api.patch (not wrapped in `{ data: ... }` -- the
// pre-existing bug found in authApi.ts/oauthApi.ts this file deliberately
// avoids repeating), and that the document-sharing flow encrypts exactly
// once (not once per field, which would silently reuse a nonce under
// AES-GCM for two different plaintexts -- see uploadOrgDocument's own
// comment) rather than going anywhere near the wallet-signature-gated
// publicRAGClient.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();

vi.mock('@/api/client', () => ({
  api: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
    delete: (...args: unknown[]) => del(...args),
  },
}));

import { orgsApi } from '../orgsApi';

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  patch.mockReset();
  del.mockReset();
  localStorage.clear();
});

describe('orgsApi org/member/invitation calls', () => {
  it('createOrganization sends the input object directly', async () => {
    post.mockResolvedValue({ id: 'org1', name: 'Acme', slug: 'acme', description: null });
    await orgsApi.createOrganization({ name: 'Acme', slug: 'acme', ownerEmail: 'owner@acme.com' });
    expect(post).toHaveBeenCalledWith('/api/v1/orgs', { name: 'Acme', slug: 'acme', ownerEmail: 'owner@acme.com' });
  });

  it('listMyOrganizations calls GET /api/v1/orgs', async () => {
    get.mockResolvedValue([]);
    await orgsApi.listMyOrganizations();
    expect(get).toHaveBeenCalledWith('/api/v1/orgs');
  });

  it('changeMemberRole sends { role } directly via PATCH', async () => {
    patch.mockResolvedValue({ id: 'm1', walletAddress: '0xabc', role: 'ADMIN' });
    await orgsApi.changeMemberRole('org1', 'm1', 'ADMIN');
    expect(patch).toHaveBeenCalledWith('/api/v1/orgs/org1/members/m1', { role: 'ADMIN' });
  });

  it('createInvitation sends { email, role } directly', async () => {
    post.mockResolvedValue({ email: 'a@b.com', role: 'MEMBER', expiresAt: '2026-01-01', emailSent: true });
    await orgsApi.createInvitation('org1', 'a@b.com', 'MEMBER');
    expect(post).toHaveBeenCalledWith('/api/v1/orgs/org1/invitations', { email: 'a@b.com', role: 'MEMBER' });
  });

  it('previewInvitation is unauthenticated (useAuth: false)', async () => {
    get.mockResolvedValue({ organizationName: 'Acme', email: 'a@b.com', role: 'MEMBER', expiresAt: '2026-01-01', requiresPassword: true });
    await orgsApi.previewInvitation('tok123');
    expect(get).toHaveBeenCalledWith('/api/v1/orgs/invitations/tok123', { useAuth: false });
  });

  it('acceptInvitation stores the returned session the same way a plain login does', async () => {
    const header = btoa(JSON.stringify({ alg: 'HS256' }));
    const payload = btoa(JSON.stringify({ walletAddress: '0x4444444444444444444444444444444444444444' }));
    const token = `${header}.${payload}.sig`;
    post.mockResolvedValue({ token, expiresIn: '7d', organizationId: 'org1', organizationName: 'Acme', role: 'OWNER' });

    await orgsApi.acceptInvitation('tok123', 'a-new-password');

    expect(post).toHaveBeenCalledWith('/api/v1/orgs/invitations/tok123/accept', { password: 'a-new-password' }, { useAuth: false });
    expect(localStorage.getItem('auth_token')).toBe(token);
    expect(localStorage.getItem('wallet_address')).toBe('0x4444444444444444444444444444444444444444');
    expect(localStorage.getItem('auth_identity_kind')).toBe('email');
  });

  it('acceptInvitation without a password (already-registered email) sends an empty body', async () => {
    const header = btoa(JSON.stringify({ alg: 'HS256' }));
    const payload = btoa(JSON.stringify({ walletAddress: '0x5555555555555555555555555555555555555555' }));
    const token = `${header}.${payload}.sig`;
    post.mockResolvedValue({ token, expiresIn: '7d', organizationId: 'org1', organizationName: 'Acme', role: 'MEMBER' });

    await orgsApi.acceptInvitation('tok456');

    expect(post).toHaveBeenCalledWith('/api/v1/orgs/invitations/tok456/accept', {}, { useAuth: false });
  });
});

describe('orgsApi document sharing', () => {
  it('uploadOrgDocument encrypts once and reuses that ciphertext for both encryptedData and encryptedMetadata', async () => {
    post
      .mockResolvedValueOnce({ encrypted: 'ciphertext-abc', iv: 'iv-xyz', salt: 'salt-marker' }) // community/encrypt
      .mockResolvedValueOnce({ id: 'doc1', organizationId: 'org1' }); // rag/documents

    await orgsApi.uploadOrgDocument('org1', { title: 'Handbook', content: 'Welcome!', tags: ['hr'] });

    expect(post).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/rag/community/encrypt', {
      data: JSON.stringify({ title: 'Handbook', content: 'Welcome!' }),
    });
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/api/v1/rag/documents',
      expect.objectContaining({
        encryptedData: 'ciphertext-abc',
        encryptedMetadata: 'ciphertext-abc', // same ciphertext, same iv/salt -- no nonce reuse across distinct plaintexts
        iv: 'iv-xyz',
        salt: 'salt-marker',
        organizationId: 'org1',
        tags: ['hr'],
      })
    );
  });

  it('decryptOrgDocument round-trips the community/decrypt response back into { title, content }', async () => {
    post.mockResolvedValue({ data: JSON.stringify({ title: 'Handbook', content: 'Welcome!' }) });

    const result = await orgsApi.decryptOrgDocument({ encryptedData: 'ct', iv: 'iv', salt: 'salt' });

    expect(post).toHaveBeenCalledWith('/api/v1/rag/community/decrypt', { encrypted: 'ct', iv: 'iv', salt: 'salt' });
    expect(result).toEqual({ title: 'Handbook', content: 'Welcome!' });
  });

  it('deleteDocument calls DELETE on the generic rag document route', async () => {
    del.mockResolvedValue({});
    await orgsApi.deleteDocument('doc1');
    expect(del).toHaveBeenCalledWith('/api/v1/rag/documents/doc1');
  });
});
