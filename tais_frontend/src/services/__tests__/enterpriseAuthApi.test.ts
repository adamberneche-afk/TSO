// @vitest-environment jsdom
//
// Enterprise RAG email/password login (docs/ENTERPRISE_RAG_IDENTITY.md).
// Proves this file doesn't repeat the pre-existing `{ data: {...} }`
// double-wrapping bug found in authApi.ts/oauthApi.ts (api.post's second
// argument *is* the request body -- see registry-client.publishSkill's
// own regression test for the same class of bug), and that a successful
// login stores the JWT under the exact same localStorage keys a
// wallet-signature login uses, so the rest of the app's `api.*` calls
// treat the two kinds of session identically.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const post = vi.fn();

vi.mock('@/api/client', () => ({
  api: { post: (...args: unknown[]) => post(...args) },
}));

import { enterpriseAuthApi } from '../enterpriseAuthApi';

// A syntactically real (HS256, unsigned-verification-irrelevant here)
// JWT whose payload is { walletAddress: '0xabc...' } -- enough for
// authApi.getWalletFromToken()'s base64 decode, since it never verifies
// the signature client-side.
function fakeToken(walletAddress: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ walletAddress }));
  return `${header}.${payload}.fake-signature`;
}

describe('enterpriseAuthApi.login', () => {
  beforeEach(() => {
    post.mockReset();
    localStorage.clear();
  });

  it('sends { email, password } directly as the request body, not wrapped in { data: ... }', async () => {
    post.mockResolvedValue({ token: fakeToken('0x1111111111111111111111111111111111111111'), expiresIn: '7d', email: 'a@b.com' });

    await enterpriseAuthApi.login('a@b.com', 'hunter2');

    expect(post).toHaveBeenCalledWith('/api/v1/auth/email/login', { email: 'a@b.com', password: 'hunter2' });
  });

  it('stores the token and decoded pseudo-address under the same keys a wallet login uses', async () => {
    const walletAddress = '0x2222222222222222222222222222222222222222';
    const token = fakeToken(walletAddress);
    post.mockResolvedValue({ token, expiresIn: '7d', email: 'someone@company.com' });

    await enterpriseAuthApi.login('someone@company.com', 'hunter2');

    expect(localStorage.getItem('auth_token')).toBe(token);
    expect(localStorage.getItem('wallet_address')).toBe(walletAddress);
    expect(enterpriseAuthApi.isEmailSession()).toBe(true);
    expect(enterpriseAuthApi.getStoredEmail()).toBe('someone@company.com');
  });

  it('logout clears everything this file wrote', async () => {
    post.mockResolvedValue({ token: fakeToken('0x3333333333333333333333333333333333333333'), expiresIn: '7d', email: 'x@y.com' });
    await enterpriseAuthApi.login('x@y.com', 'hunter2');

    enterpriseAuthApi.logout();

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('wallet_address')).toBeNull();
    expect(enterpriseAuthApi.isEmailSession()).toBe(false);
  });

  it('propagates a login failure instead of swallowing it', async () => {
    post.mockRejectedValue(new Error('Invalid credentials'));

    await expect(enterpriseAuthApi.login('a@b.com', 'wrong')).rejects.toThrow('Invalid credentials');
  });
});

describe('enterpriseAuthApi.forgotPassword / resetPassword', () => {
  beforeEach(() => {
    post.mockReset();
  });

  it('forgotPassword sends { email } directly, not wrapped', async () => {
    post.mockResolvedValue({ message: 'ok' });
    await enterpriseAuthApi.forgotPassword('a@b.com');
    expect(post).toHaveBeenCalledWith('/api/v1/auth/email/forgot-password', { email: 'a@b.com' });
  });

  it('resetPassword sends { token, newPassword } directly, not wrapped', async () => {
    post.mockResolvedValue({ message: 'ok' });
    await enterpriseAuthApi.resetPassword('tok123', 'new-password');
    expect(post).toHaveBeenCalledWith('/api/v1/auth/email/reset-password', { token: 'tok123', newPassword: 'new-password' });
  });
});
