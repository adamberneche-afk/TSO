// Regression test for oauthApi.ts double-wrapping every request body as
// `{ data: {...} }` -- api.post/patch's second argument IS the request
// body, so every one of these calls sent the server a body with none of
// the top-level fields routes/oauth.ts and routes/enterprise.ts actually
// destructure. Several of these are wired into real, live UI
// (registerApp/approveAuthorization/createSandbox/generateSandboxToken/
// upsertOrganization via OAuthAuthorize.tsx and DeveloperPortal.tsx), so
// this wasn't dead code -- it was live and broken. Same bug class as
// registry-client.ts's publishSkill fix (docs/DOCS_VS_CODEBASE.md row 22).

import { describe, it, expect, vi, beforeEach } from 'vitest';

const post = vi.fn();
const patch = vi.fn();

vi.mock('@/api/client', () => ({
  api: {
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
    get: vi.fn(),
  },
}));

import { oauthApi } from '../oauthApi';

beforeEach(() => {
  post.mockReset();
  patch.mockReset();
});

describe('oauthApi write calls send a flat body, not { data: ... }', () => {
  it('registerApp', async () => {
    post.mockResolvedValue({ appId: 'a1', name: 'App', appSecret: 's', tier: 'BASIC', redirectUris: [] });
    await oauthApi.registerApp('a1', 'App', ['https://example.com'], '0xwallet', '0xsig', 123);
    expect(post).toHaveBeenCalledWith('/api/v1/oauth/register-app', {
      appId: 'a1',
      name: 'App',
      redirectUris: ['https://example.com'],
      wallet: '0xwallet',
      signature: '0xsig',
      timestamp: 123,
    });
  });

  it('revokeAccess', async () => {
    post.mockResolvedValue({ success: true });
    await oauthApi.revokeAccess('token1', '0xwallet', 'a1');
    expect(post).toHaveBeenCalledWith('/api/v1/oauth/revoke', {
      access_token: 'token1',
      wallet: '0xwallet',
      app_id: 'a1',
    });
  });

  it('approveAuthorization', async () => {
    post.mockResolvedValue({ success: true, redirectUri: 'https://example.com' });
    await oauthApi.approveAuthorization('auth1', '0xwallet', '0xsig');
    expect(post).toHaveBeenCalledWith('/api/v1/oauth/approve', {
      authorizationId: 'auth1',
      wallet: '0xwallet',
      signature: '0xsig',
    });
  });

  it('exchangeCode', async () => {
    post.mockResolvedValue({
      access_token: 'at',
      refresh_token: 'rt',
      token_type: 'bearer',
      expires_in: 3600,
      walletAddress: '0xwallet',
      scopes: [],
    });
    await oauthApi.exchangeCode('code1', 'a1', 'secret1');
    expect(post).toHaveBeenCalledWith('/api/v1/oauth/token', {
      grant_type: 'authorization_code',
      app_id: 'a1',
      app_secret: 'secret1',
      code: 'code1',
    });
  });

  it('updatePermissionScopes sends { scopes }, not a bare array or { data: scopes }', async () => {
    patch.mockResolvedValue({ success: true, scopes: ['a:read'] });
    await oauthApi.updatePermissionScopes('0xwallet', 'a1', ['a:read']);
    expect(patch).toHaveBeenCalledWith('/api/v1/enterprise/permissions/a1?wallet=0xwallet', { scopes: ['a:read'] });
  });

  it('upsertOrganization', async () => {
    post.mockResolvedValue({ success: true, organization: {} });
    await oauthApi.upsertOrganization('0xwallet', 'Acme', ['app1'], ['app2']);
    expect(post).toHaveBeenCalledWith('/api/v1/enterprise/organization', {
      wallet: '0xwallet',
      name: 'Acme',
      approvedApps: ['app1'],
      blockedApps: ['app2'],
    });
  });

  it('createSandbox', async () => {
    post.mockResolvedValue({ success: true, sandbox: true, app: {}, message: 'ok' });
    await oauthApi.createSandbox('0xwallet', 'Test Sandbox');
    expect(post).toHaveBeenCalledWith('/api/v1/oauth/sandbox/create', { wallet: '0xwallet', name: 'Test Sandbox' });
  });

  it('generateSandboxToken', async () => {
    post.mockResolvedValue({
      success: true,
      sandbox: true,
      access_token: 'at',
      token_type: 'bearer',
      expires_in: 3600,
      walletAddress: '0xwallet',
      scopes: [],
    });
    await oauthApi.generateSandboxToken('0xwallet', 'a1');
    expect(post).toHaveBeenCalledWith('/api/v1/oauth/sandbox/token', { wallet: '0xwallet', appId: 'a1' });
  });
});
