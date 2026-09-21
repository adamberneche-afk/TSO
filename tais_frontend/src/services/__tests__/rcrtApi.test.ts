// @vitest-environment jsdom
//
// Regression test for rcrtApi.ts/kbApi/grantApi double-wrapping their
// request bodies as `{ data: {...} }` -- same bug class as
// registry-client.ts's publishSkill fix. kb.ts's routes and
// oauth.ts's /confidential-grant all do a plain `const { ... } =
// req.body`. rcrtApi.refreshToken/scanContent are left calling routes
// that don't exist server-side at all (see the comment in the source) --
// this test still locks in their corrected body shape, but they remain
// dead/404 until a real endpoint is built; not this fix's job to invent
// one.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const post = vi.fn();
const patch = vi.fn();

vi.mock('@/api/client', () => ({
  api: {
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

import { rcrtApi, kbApi, grantApi } from '../rcrtApi';

beforeEach(() => {
  post.mockReset();
  patch.mockReset();
  localStorage.clear();
});

describe('rcrtApi', () => {
  it('provision sends { wallet } directly, not wrapped in { data: ... }', async () => {
    localStorage.setItem('wallet_address', '0xwallet');
    post.mockResolvedValue({ agentId: 'agent1', token: 'tok' });
    await rcrtApi.provision();
    expect(post).toHaveBeenCalledWith('/api/v1/rcrt/provision', { wallet: '0xwallet' });
  });

  it('refreshToken and scanContent send a flat body (still 404 -- no matching server route exists)', async () => {
    post.mockResolvedValue({});
    await rcrtApi.refreshToken('rt1');
    expect(post).toHaveBeenCalledWith('/api/v1/rcrt/refresh', { refreshToken: 'rt1' });

    await rcrtApi.scanContent('some content');
    expect(post).toHaveBeenCalledWith('/api/v1/rcrt/scan', { content: 'some content' });
  });
});

describe('kbApi', () => {
  it('registerKB sends its fields directly, not wrapped in { data: ... }', async () => {
    post.mockResolvedValue({ success: true, kbId: 'kb1', contextType: 'public' });
    await kbApi.registerKB('kb1', { contextType: 'public' });
    expect(post).toHaveBeenCalledWith('/api/v1/kb/register', {
      kbId: 'kb1',
      appId: undefined,
      contextType: 'public',
      excludeFromRCRT: false,
    });
  });

  it('updateContextType sends { contextType } directly', async () => {
    patch.mockResolvedValue(undefined);
    await kbApi.updateContextType('kb1', 'private');
    expect(patch).toHaveBeenCalledWith('/api/v1/kb/kb1/context-type', { contextType: 'private' });
  });

  it('setExcludeFromRCRT sends { exclude } directly', async () => {
    post.mockResolvedValue(undefined);
    await kbApi.setExcludeFromRCRT('kb1', true);
    expect(post).toHaveBeenCalledWith('/api/v1/kb/kb1/exclude-rcrt', { exclude: true });
  });
});

describe('grantApi', () => {
  it('addConfidentialGrant sends { appId } directly', async () => {
    post.mockResolvedValue(undefined);
    await grantApi.addConfidentialGrant('app1');
    expect(post).toHaveBeenCalledWith('/api/v1/oauth/confidential-grant', { appId: 'app1' });
  });
});
