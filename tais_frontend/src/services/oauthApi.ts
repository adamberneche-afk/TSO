// tais_frontend/src/services/oauthApi.ts
// OAuth API for Cross-App Agent Portability

const API_BASE_URL = import.meta.env.VITE_REGISTRY_URL || 'https://tso.onrender.com';

export interface OAuthApp {
  appId: string;
  name: string;
  description?: string;
  iconUrl?: string;
  websiteUrl?: string;
  tier: 'BASIC' | 'VERIFIED' | 'CERTIFIED' | 'GOLD';
  createdAt: string;
}

export interface RegisteredApp {
  appId: string;
  name: string;
  appSecret: string;
  tier: string;
  redirectUris: string[];
}

export interface AppPermission {
  appId: string;
  appName: string;
  scopes: string[];
  grantedAt: string;
  expiresAt: string;
}

export interface UsageMetric {
  id: string;
  appId: string;
  walletAddress: string;
  interactionType: string;
  tokensUsed: number;
  cost: number;
  timestamp: string;
}

class OAuthAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/v1/oauth`;
  }

  /**
   * Register a new application
   */
  async registerApp(
    appId: string,
    name: string,
    redirectUris: string[],
    wallet: string,
    signature: string,
    options?: {
      description?: string;
      websiteUrl?: string;
      developerEmail?: string;
      developerName?: string;
    }
  ): Promise<RegisteredApp> {
    const response = await fetch(`${this.baseUrl}/register-app`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId,
        name,
        redirectUris,
        wallet,
        signature,
        ...options,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to register app');
    }

    return response.json();
  }

  /**
   * Get list of registered apps
   */
  async getApps(wallet: string): Promise<OAuthApp[]> {
    const response = await fetch(`${this.baseUrl}/apps?wallet=${wallet}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch apps');
    }

    const result = await response.json();
    return result.apps;
  }

  /**
   * Get user's permissions across all apps
   */
  async getPermissions(wallet: string, appId?: string): Promise<AppPermission[]> {
    let url = `${this.baseUrl}/permissions?wallet=${wallet}`;
    if (appId) {
      url += `&app_id=${appId}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch permissions');
    }

    const result = await response.json();
    return result.permissions;
  }

  /**
   * Revoke access to an app
   */
  async revokeAccess(
    accessToken: string,
    wallet: string,
    appId: string
  ): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: accessToken,
        wallet,
        app_id: appId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to revoke access');
    }

    return response.json();
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthorizationUrl(
    appId: string,
    scopes: string[],
    redirectUri: string,
    wallet: string,
    state?: string
  ): string {
    const params = new URLSearchParams({
      app_id: appId,
      scopes: scopes.join(','),
      redirect_uri: redirectUri,
      wallet,
    });

    if (state) {
      params.set('state', state);
    }

    return `${this.baseUrl}/authorize?${params.toString()}`;
  }

  /**
   * Approve authorization (signs the challenge)
   */
  async approveAuthorization(
    authorizationId: string,
    wallet: string,
    signature: string
  ): Promise<{ success: boolean; redirectUri: string }> {
    const response = await fetch(`${this.baseUrl}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorizationId,
        wallet,
        signature,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Authorization approval failed');
    }

    return response.json();
  }

  /**
   * Exchange code for tokens
   */
  async exchangeCode(
    code: string,
    appId: string,
    appSecret: string,
    grantType: 'authorization_code' | 'refresh_token' = 'authorization_code',
    refreshToken?: string
  ): Promise<{
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    walletAddress: string;
    scopes: string[];
  }> {
    const body: Record<string, string> = {
      grant_type: grantType,
      app_id: appId,
      app_secret: appSecret,
    };

    if (grantType === 'authorization_code') {
      body.code = code;
    } else if (refreshToken) {
      body.refresh_token = refreshToken;
    }

    const response = await fetch(`${this.baseUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Token exchange failed');
    }

    return response.json();
  }

  /**
   * Get billing usage for an app
   */
  async getUsage(
    wallet: string,
    options?: {
      appId?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    wallet: string;
    tier: string;
    summary: {
      totalInteractions: number;
      totalTokens: number;
      totalCost: number;
      freeLimit: number;
      billableInteractions: number;
      estimatedCost: number;
      currency: string;
    };
    byApp: Array<{ appId: string; interactions: number; tokens: number; cost: number }>;
    byDay: Array<{ date: string; interactions: number; tokens: number; cost: number }>;
  }> {
    let url = `${this.baseUrl.replace('oauth', 'billing')}/usage?wallet=${wallet}`;
    if (options?.appId) url += `&app_id=${options.appId}`;
    if (options?.startDate) url += `&start_date=${options.startDate}`;
    if (options?.endDate) url += `&end_date=${options.endDate}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch usage');
    }

    return response.json();
  }

  /**
   * Get billing invoices
   */
  async getInvoices(wallet: string): Promise<{
    wallet: string;
    tier: string;
    invoices: any[];
    currentInvoice: any;
  }> {
    const response = await fetch(`${this.baseUrl.replace('oauth', 'billing')}/invoices?wallet=${wallet}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch invoices');
    }

    return response.json();
  }

  /**
   * Get billing summary/dashboard
   */
  async getBillingSummary(wallet: string): Promise<{
    wallet: string;
    tier: string;
    plan: string;
    limits: { free: number; verified: number; unlimited: boolean };
    usage: {
      thisMonth: { interactions: number; cost: number; limit: number; percentUsed: number };
      allTime: { interactions: number; cost: number };
    };
    apps: number;
    pricing: { per1kInteractions: number; currency: string };
  }> {
    const response = await fetch(`${this.baseUrl.replace('oauth', 'billing')}/summary?wallet=${wallet}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch billing summary');
    }

    return response.json();
  }

  /**
   * Get activity log for a specific app
   */
  async getPermissionActivity(
    wallet: string,
    appId: string
  ): Promise<{
    permission: { appId: string; appName: string; scopes: string[]; grantedAt: string; expiresAt: string };
    activity: { recentSessions: any[]; recentUsage: any[] };
  }> {
    const response = await fetch(`${this.baseUrl.replace('oauth', 'enterprise')}/permissions/${appId}/activity?wallet=${wallet}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch activity');
    }

    return response.json();
  }

  /**
   * Update permission scopes
   */
  async updatePermissionScopes(
    wallet: string,
    appId: string,
    scopes: string[]
  ): Promise<{ success: boolean; scopes: string[] }> {
    const response = await fetch(`${this.baseUrl.replace('oauth', 'enterprise')}/permissions/${appId}?wallet=${wallet}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scopes }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update scopes');
    }

    return response.json();
  }

  /**
   * Get user's overall activity log
   */
  async getActivityLog(wallet: string, limit?: number): Promise<{
    wallet: string;
    activities: any[];
    total: number;
  }> {
    let url = `${this.baseUrl.replace('oauth', 'enterprise')}/activity?wallet=${wallet}`;
    if (limit) url += `&limit=${limit}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch activity');
    }

    return response.json();
  }

  /**
   * Get enterprise organization info
   */
  async getOrganization(wallet: string): Promise<any> {
    const response = await fetch(`${this.baseUrl.replace('oauth', 'enterprise')}/organization/${wallet}?wallet=${wallet}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status === 404) return null;
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch organization');
    }

    return response.json();
  }

  /**
   * Create or update enterprise organization
   */
  async upsertOrganization(
    wallet: string,
    name: string,
    approvedApps: string[],
    blockedApps: string[]
  ): Promise<{ success: boolean; organization: any }> {
    const response = await fetch(`${this.baseUrl.replace('oauth', 'enterprise')}/organization`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, name, approvedApps, blockedApps }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save organization');
    }

    return response.json();
  }

  /**
   * Get audit log
   */
  async getAuditLog(
    wallet: string,
    options?: { startDate?: string; endDate?: string; appId?: string }
  ): Promise<{ wallet: string; auditLog: any[]; total: number }> {
    let url = `${this.baseUrl.replace('oauth', 'enterprise')}/audit-log?wallet=${wallet}`;
    if (options?.appId) url += `&appId=${options.appId}`;
    if (options?.startDate) url += `&startDate=${options.startDate}`;
    if (options?.endDate) url += `&endDate=${options.endDate}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch audit log');
    }

    return response.json();
  }

  /**
   * Create sandbox app for testing
   */
  async createSandbox(wallet: string, name: string): Promise<{
    success: boolean;
    sandbox: boolean;
    app: { appId: string; name: string; appSecret: string; redirectUris: string[] };
    message: string;
  }> {
    const response = await fetch(`${this.baseUrl}/sandbox/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create sandbox');
    }

    return response.json();
  }

  /**
   * Get sandbox status
   */
  async getSandboxStatus(wallet: string): Promise<{
    wallet: string;
    sandboxApps: Array<{ appId: string; name: string; isActive: boolean; createdAt: string }>;
    rateLimit: { requestsPerMinute: number; maxRequests: number };
    features: { mockOAuth: boolean; testTokens: boolean; debugMode: boolean };
  }> {
    const response = await fetch(`${this.baseUrl}/sandbox/status?wallet=${wallet}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch sandbox status');
    }

    return response.json();
  }

  /**
   * Generate test token for sandbox
   */
  async generateSandboxToken(wallet: string, appId: string): Promise<{
    success: boolean;
    sandbox: boolean;
    access_token: string;
    token_type: string;
    expires_in: number;
    walletAddress: string;
    scopes: string[];
  }> {
    const response = await fetch(`${this.baseUrl}/sandbox/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, appId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate sandbox token');
    }

    return response.json();
  }
}

export const oauthApi = new OAuthAPI();
