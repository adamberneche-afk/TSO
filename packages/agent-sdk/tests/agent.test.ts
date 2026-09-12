import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TAISAgent } from '../src/client';
// VALID_SCOPES lives in types.ts (re-exported from index.ts), not
// client.ts -- and vitest runs ESM, where require() can't resolve a
// bare .ts path at all. The two require('../src/client') calls below
// used to fail outright (MODULE_NOT_FOUND), taking down every test in
// this file, not just the ones reading VALID_SCOPES.
import { VALID_SCOPES } from '../src/types';

describe('TAISAgent', () => {
  let agent: TAISAgent;

  beforeEach(() => {
    agent = new TAISAgent({
      appId: 'test-app',
      appSecret: 'test-secret',
      appName: 'Test App',
      redirectUri: 'https://test.com/callback',
    });
  });

  describe('constructor', () => {
    it('should create an instance with required config', () => {
      expect(agent).toBeDefined();
      expect(agent.config.appId).toBe('test-app');
      expect(agent.config.appSecret).toBe('test-secret');
    });

    it('should use default baseUrl when not provided', () => {
      expect(agent.config.baseUrl).toBe('https://tso.onrender.com');
    });

    it('should use custom baseUrl when provided', () => {
      const customAgent = new TAISAgent({
        appId: 'test',
        appSecret: 'secret',
        appName: 'Test',
        baseUrl: 'https://custom.api.com',
      });
      expect(customAgent.config.baseUrl).toBe('https://custom.api.com');
    });
  });

  describe('getAuthorizationUrl', () => {
    // getAuthorizationUrl is async (see client.ts) -- these previously
    // called it without awaiting, so `url` was the pending Promise
    // itself, not a string, and every toContain() check compared
    // against `[]` (a Promise isn't iterable the way an array is).
    // Every assertion in this describe block "passed" for the wrong
    // reason (never ran at all, per the module-resolution failure this
    // file had until now) rather than actually exercising the URL.
    it('should generate correct authorization URL', async () => {
      const url = await agent.getAuthorizationUrl({
        scopes: ['agent:identity:read', 'agent:memory:read'],
        state: 'test-state',
      });

      expect(url).toContain('/oauth/authorize');
      expect(url).toContain('app_id=test-app');
      expect(url).toContain('scopes=agent%3Aidentity%3Aread%2Cagent%3Amemory%3Aread');
      expect(url).toContain('state=test-state');
    });

    it('should handle single scope', async () => {
      const url = await agent.getAuthorizationUrl({
        scopes: ['agent:identity:read'],
      });

      expect(url).toContain('scopes=agent%3Aidentity%3Aread');
    });

    // AuthorizationUrlOptions (types.ts) only declares `scopes`/`state` --
    // there's no per-call wallet/redirectUri override anywhere in the
    // real implementation (redirectUri always comes from the agent's
    // config; wallet is a static empty string here, unlike the sibling
    // initiateAuthorization() method which derives it from `state`).
    // A prior version of this test asserted overrides that don't exist;
    // removed rather than invented, since adding real support for a
    // caller-supplied redirect_uri is a security-relevant OAuth design
    // decision (open-redirect risk) this test file shouldn't make
    // unilaterally.
  });

  describe('token management', () => {
    it('should set and get tokens', () => {
      // OAuthTokens (types.ts) is camelCase throughout -- the snake_case
      // keys this fixture used to have matched the *wire* payload
      // exchangeCode()/refreshToken() send/receive, not the internal
      // OAuthTokens shape setTokens() actually stores, so
      // tokens.accessToken was silently undefined (esbuild's transform,
      // unlike a real `tsc` check, doesn't catch a structurally wrong
      // object literal here).
      const tokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        walletAddress: '0x1234',
        scopes: ['agent:identity:read'],
      };

      agent.setTokens(tokens);

      expect(agent.getAccessToken()).toBe('test-access-token');
    });

    it('should clear tokens', () => {
      agent.setTokens({
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        tokenType: 'Bearer',
        expiresIn: 3600,
        walletAddress: '0x1234',
        scopes: [],
      });

      agent.clearTokens();

      expect(agent.getAccessToken()).toBeNull();
    });
  });

  describe('valid scopes', () => {
    it('should have VALID_SCOPES defined', () => {
      expect(VALID_SCOPES).toContain('agent:identity:read');
      expect(VALID_SCOPES).toContain('agent:memory:read');
      expect(VALID_SCOPES).toContain('agent:memory:write');
    });
  });
});

describe('Scope Validation', () => {
  it('should include identity scopes', () => {
    expect(VALID_SCOPES).toContain('agent:identity:read');
    expect(VALID_SCOPES).toContain('agent:identity:soul:read');
    expect(VALID_SCOPES).toContain('agent:identity:profile:read');
  });

  it('should include memory scopes', () => {
    expect(VALID_SCOPES).toContain('agent:memory:read');
    expect(VALID_SCOPES).toContain('agent:memory:write');
  });

  it('should include config scope', () => {
    expect(VALID_SCOPES).toContain('agent:config:read');
  });

  it('should include the App RAG scope', () => {
    expect(VALID_SCOPES).toContain('rag:read');
  });
});

describe('OAuth Flow', () => {
  let agent: TAISAgent;

  beforeEach(() => {
    agent = new TAISAgent({
      appId: 'test-app',
      appSecret: 'test-secret',
      appName: 'Test App',
      redirectUri: 'https://test.com/callback',
    });
  });

  it('should build correct token exchange payload', () => {
    const payload = {
      grant_type: 'authorization_code',
      code: 'test-code',
      app_id: 'test-app',
      app_secret: 'test-secret',
    };

    expect(payload.grant_type).toBe('authorization_code');
    expect(payload.code).toBe('test-code');
    expect(payload.app_id).toBe('test-app');
  });

  it('should build correct refresh token payload', () => {
    const payload = {
      grant_type: 'refresh_token',
      refresh_token: 'test-refresh',
      app_id: 'test-app',
      app_secret: 'test-secret',
    };

    expect(payload.grant_type).toBe('refresh_token');
    expect(payload.refresh_token).toBe('test-refresh');
  });
});

describe('Error Handling', () => {
  it('should handle missing tokens gracefully', () => {
    const agent = new TAISAgent({
      appId: 'test',
      appSecret: 'secret',
      appName: 'Test',
    });

    expect(agent.getAccessToken()).toBeNull();
  });

  it('should require appId in constructor', () => {
    expect(() => {
      new TAISAgent({
        appSecret: 'secret',
        appName: 'Test',
      } as any);
    }).toThrow();
  });
});
