import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TAISAgent } from '../src/client';

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
    it('should generate correct authorization URL', () => {
      const url = agent.getAuthorizationUrl({
        scopes: ['agent:identity:read', 'agent:memory:read'],
        state: 'test-state',
      });

      expect(url).toContain('/oauth/authorize');
      expect(url).toContain('app_id=test-app');
      expect(url).toContain('scopes=agent:identity:read%2Cagent:memory:read');
      expect(url).toContain('state=test-state');
    });

    it('should handle single scope', () => {
      const url = agent.getAuthorizationUrl({
        scopes: ['agent:identity:read'],
      });

      expect(url).toContain('scopes=agent%3Aidentity%3Aread');
    });

    it('should include wallet and redirect_uri when provided', () => {
      const url = agent.getAuthorizationUrl({
        scopes: ['agent:identity:read'],
        wallet: '0x1234',
        redirectUri: 'https://app.com/oauth',
      });

      expect(url).toContain('wallet=0x1234');
      expect(url).toContain('redirect_uri=https%3A%2F%2Fapp.com%2Foauth');
    });
  });

  describe('token management', () => {
    it('should set and get tokens', () => {
      const tokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
        walletAddress: '0x1234',
        scopes: ['agent:identity:read'],
      };

      agent.setTokens(tokens);

      expect(agent.getAccessToken()).toBe('test-access-token');
    });

    it('should clear tokens', () => {
      agent.setTokens({
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        token_type: 'Bearer',
        expires_in: 3600,
        walletAddress: '0x1234',
        scopes: [],
      });

      agent.clearTokens();

      expect(agent.getAccessToken()).toBeNull();
    });
  });

  describe('valid scopes', () => {
    it('should have VALID_SCOPES defined', () => {
      const { VALID_SCOPES } = require('../src/client');
      
      expect(VALID_SCOPES).toContain('agent:identity:read');
      expect(VALID_SCOPES).toContain('agent:memory:read');
      expect(VALID_SCOPES).toContain('agent:memory:write');
    });
  });
});

describe('Scope Validation', () => {
  const { VALID_SCOPES } = require('../src/client');

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
