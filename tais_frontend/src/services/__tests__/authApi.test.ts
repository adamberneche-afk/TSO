// @vitest-environment jsdom
//
// Regression test for authApi.ts's wallet-signature login double-wrapping
// its request bodies as `{ data: {...} }` -- api.post's second argument
// IS the request body, so the server received `{"data":{"walletAddress":
// "0x..."}}` instead of `{"walletAddress":"0x..."}`. routes/auth.ts's
// POST /nonce and /login both do a plain `const { walletAddress } =
// req.body`, so this always read undefined and failed wallet login's
// very first step -- the platform's primary auth path -- regardless of
// which wallet or signature was used. Same class of bug as
// registry-client.ts's publishSkill fix (docs/DOCS_VS_CODEBASE.md row 22).

import { describe, it, expect, vi, beforeEach } from 'vitest';

const post = vi.fn();

vi.mock('@/api/client', () => ({
  api: { post: (...args: unknown[]) => post(...args) },
}));

import { authApi } from '../authApi';

const WALLET = '0x1111111111111111111111111111111111111111';

describe('authApi.getNonce', () => {
  beforeEach(() => {
    post.mockReset();
  });

  it('sends { walletAddress } directly as the request body, not wrapped in { data: ... }', async () => {
    post.mockResolvedValue({ nonce: 'abc', message: 'sign this', expiresIn: '5m' });
    await authApi.getNonce(WALLET);
    expect(post).toHaveBeenCalledWith('/api/v1/auth/nonce', { walletAddress: WALLET });
  });
});

describe('authApi.login', () => {
  beforeEach(() => {
    post.mockReset();
    localStorage.clear();
  });

  it('sends { walletAddress, signature, nonce } directly, not wrapped in { data: ... }', async () => {
    post.mockResolvedValue({ token: 'tok', walletAddress: WALLET, expiresIn: '7d' });
    await authApi.login(WALLET, '0xsig', 'nonce123');
    expect(post).toHaveBeenCalledWith('/api/v1/auth/login', {
      walletAddress: WALLET,
      signature: '0xsig',
      nonce: 'nonce123',
    });
  });

  it('stores the returned token and wallet address', async () => {
    post.mockResolvedValue({ token: 'tok', walletAddress: WALLET, expiresIn: '7d' });
    await authApi.login(WALLET, '0xsig', 'nonce123');
    expect(localStorage.getItem('auth_token')).toBe('tok');
    expect(localStorage.getItem('wallet_address')).toBe(WALLET);
  });
});
