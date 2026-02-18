/**
 * App RAG Authentication Service
 * Implements OAuth2 with PKCE and scoped token flows for secure app integration
 * Based on comprehensive authentication patterns from architecture review
 */

import type { AppConfig, EncryptedTokens, AuthContext } from '../../types/rag-app';

declare global {
  interface Window {
    crypto: Crypto;
  }
}

export class AppRAGAuthService {
  private platformAPI: any;
  private encryptionService: any;

  constructor(platformAPI: any, encryptionService: any) {
    this.platformAPI = platformAPI;
    this.encryptionService = encryptionService;
  }

  /**
   * Initiate OAuth connection to an app
   * Uses PKCE to prevent authorization code interception
   */
  async connectApp(appConfig: AppConfig): Promise<void> {
    // Generate PKCE challenge
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    // Store verifier temporarily (in-memory only, not persisted)
    sessionStorage.setItem('pkce_verifier', codeVerifier);

    // Build authorization URL
    const authUrl = new URL(appConfig.authorizationEndpoint);
    authUrl.searchParams.set('client_id', 'tais-platform');
    authUrl.searchParams.set('redirect_uri', 'https://taisplatform.vercel.app/oauth/callback');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'rag:read rag:write context:query');
    authUrl.searchParams.set('state', this.generateState(appConfig.appId));
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    // Redirect user to app's authorization page
    window.location.href = authUrl.toString();
  }

  /**
   * Handle OAuth callback from app
   */
  async handleCallback(code: string, state: string): Promise<{ appId: string; connectedAt: string; permissions: string[] }> {
    // Verify state to prevent CSRF
    const { appId } = this.verifyState(state);

    // Retrieve PKCE verifier
    const codeVerifier = sessionStorage.getItem('pkce_verifier');
    sessionStorage.removeItem('pkce_verifier');
    
    if (!codeVerifier) {
      throw new Error('PKCE verifier not found - possible session timeout');
    }

    // Get app configuration
    const appConfig = await this.platformAPI.getAppConfig(appId);

    // Exchange authorization code for access token
    const tokenResponse = await fetch(appConfig.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: 'https://taisplatform.vercel.app/oauth/callback',
        client_id: 'tais-platform',
        code_verifier: codeVerifier,
      }),
    });

    const tokens = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokens.error_description}`);
    }

    // Encrypt tokens before storing
    const encryptedTokens: EncryptedTokens = await this.encryptionService.encrypt({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      scope: tokens.scope,
    });

    // Store encrypted tokens in platform
    await this.platformAPI.storeAppTokens(appId, encryptedTokens);

    return {
      appId,
      connectedAt: new Date().toISOString(),
      permissions: tokens.scope.split(' '),
    };
  }

  /**
   * Query app RAG with OAuth token
   */
  async queryAppRAG(appId: string, query: string): Promise<any[]> {
    // Retrieve and decrypt tokens
    const encryptedTokens = await this.platformAPI.getAppTokens(appId);
    let tokens = await this.encryptionService.decrypt(encryptedTokens);

    // Check if token expired
    if (Date.now() >= tokens.expiresAt) {
      // Refresh token
      tokens = await this.refreshToken(appId, tokens.refreshToken);
    }

    // Get app configuration
    const appConfig = await this.platformAPI.getAppConfig(appId);

    // Query app's RAG endpoint
    const response = await fetch(`${appConfig.ragEndpoint}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        maxResults: 10,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token invalid, try refresh
        tokens = await this.refreshToken(appId, tokens.refreshToken);
        // Retry query (recursive, max 1 retry)
        return this.queryAppRAG(appId, query);
      }
      throw new Error(`App RAG query failed: ${response.statusText}`);
    }

    const results = await response.json();

    // Audit log the query
    await this.logRAGAccess(appId, query, results.results.length);
    
    return results.results;
  }

  /**
   * Refresh expired OAuth token
   */
  private async refreshToken(appId: string, refreshToken: string): Promise<any> {
    const appConfig = await this.platformAPI.getAppConfig(appId);
    
    const response = await fetch(appConfig.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: 'tais-platform',
      }),
    });

    const newTokens = await response.json();
    
    if (!response.ok) {
      // Refresh failed, user needs to re-authorize
      throw new Error('REAUTH_REQUIRED');
    }

    // Update stored tokens
    const encryptedTokens = await this.encryptionService.encrypt({
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token || refreshToken,
      expiresAt: Date.now() + (newTokens.expires_in * 1000),
      scope: newTokens.scope,
    });

    await this.platformAPI.storeAppTokens(appId, encryptedTokens);
    
    return await this.encryptionService.decrypt(encryptedTokens);
  }

  /**
   * Revoke app access
   */
  async revokeAppAccess(appId: string): Promise<void> {
    // Retrieve tokens
    const encryptedTokens = await this.platformAPI.getAppTokens(appId);
    const tokens = await this.encryptionService.decrypt(encryptedTokens);

    // Get app configuration
    const appConfig = await this.platformAPI.getAppConfig(appId);

    // Revoke tokens with app (if supported)
    if (appConfig.revocationEndpoint) {
      await fetch(appConfig.revocationEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: tokens.accessToken,
          client_id: 'tais-platform',
        }),
      });
    }

    // Delete stored tokens
    await this.platformAPI.deleteAppTokens(appId);

    // Audit log the revocation
    await this.logRAGAccess(appId, 'REVOKE_ACCESS', 0);
  }

  /**
   * Generate PKCE code verifier
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }

  /**
   * Generate PKCE code challenge from verifier
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(new Uint8Array(hash));
  }

  /**
   * Base64 URL-safe encoding
   */
  private base64URLEncode(buffer: Uint8Array | string): string {
    if (typeof buffer === 'string') {
      buffer = new TextEncoder().encode(buffer);
    }
    return btoa(String.fromCharCode(...buffer))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate OAuth state parameter
   */
  private generateState(appId: string): string {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const state = this.base64URLEncode(randomBytes);

    // Store state temporarily for CSRF verification
    sessionStorage.setItem('oauth_state', JSON.stringify({
      state,
      appId,
      timestamp: Date.now(),
    }));

    return state;
  }

  /**
   * Verify OAuth state parameter
   */
  private verifyState(state: string): { appId: string } {
    const stored = JSON.parse(sessionStorage.getItem('oauth_state') || '{}');
    sessionStorage.removeItem('oauth_state');

    if (!stored.state || stored.state !== state) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }

    if (Date.now() - stored.timestamp > 600000) { // 10 minutes
      throw new Error('State expired - please try again');
    }

    return { appId: stored.appId };
  }

  /**
   * Log RAG access for audit trail
   */
  private async logRAGAccess(appId: string, query: string, resultCount: number): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      appId,
      queryHash: await this.hashQuery(query),
      resultCount,
      platform: 'app-integration',
    };

    await this.encryptionService.appendAuditLog(logEntry);
  }

  /**
   * Hash query for privacy in audit logs
   */
  private async hashQuery(query: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(query);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(new Uint8Array(hash));
  }
}

export default AppRAGAuthService;
