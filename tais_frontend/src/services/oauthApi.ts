import { api } from '@/api/client';

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

export const oauthApi = {
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
    return api.post<RegisteredApp>('/api/v1/oauth/register-app', {
      data: {
        appId,
        name,
        redirectUris,
        wallet,
        signature,
        ...options,
      }
    });
  },

  /**
   * Get list of registered apps
   */
  async getApps(wallet: string): Promise<OAuthApp[]> {
    const result = await api.get<{ apps: OAuthApp[] }>(`/api/v1/oauth/apps?wallet=${wallet}`);
    return result.apps;
  },

  /**
   * Get user's permissions across all apps
   */
  async getPermissions(wallet: string, appId?: string): Promise<AppPermission[]> {
    let url = `/api/v1/oauth/permissions?wallet=${wallet}`;
    if (appId) {
      url += `&app_id=${appId}`;
    }
    const result = await api.get<{ permissions: AppPermission[] }>(url);
    return result.permissions;
  },

  /**
   * Revoke access to an app
   */
  async revokeAccess(
    accessToken: string,
    wallet: string,
    appId: string
  ): Promise<{ success: boolean }> {
    return api.post<{ success: boolean }>('/api/v1/oauth/revoke', {
      data: {
        access_token: accessToken,
        wallet,
        app_id: appId,
      }
    });
  },

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

    return `${import.meta.env.VITE_REGISTRY_URL || 'https://tso.onrender.com'}/api/v1/oauth/authorize?${params.toString()}`;
  },

  /**
   * Approve authorization (signs the challenge)
   */
  async approveAuthorization(
    authorizationId: string,
    wallet: string,
    signature: string
  ): Promise<{ success: boolean; redirectUri: string }> {
    return api.post<{ success: boolean; redirectUri: string }>('/api/v1/oauth/approve', {
      data: {
        authorizationId,
        wallet,
        signature,
      }
    });
  },

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

    const result = await api.post<{
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
      walletAddress: string;
      scopes: string[];
    }>('/api/v1/oauth/token', {
      data: body
    });

    return result;
  },

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
    let url = `/api/v1/billing/usage?wallet=${wallet}`;
    if (options?.appId) url += `&app_id=${options.appId}`;
    if (options?.startDate) url += `&start_date=${options.startDate}`;
    if (options?.endDate) url += `&end_date=${options.endDate}`;

    const result = await api.get<{
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
    }>(url);

    return result;
  },

  /**
   * Get billing invoices
   */
  async getInvoices(wallet: string): Promise<{
    wallet: string;
    tier: string;
    invoices: any[];
    currentInvoice: any;
  }> {
    const result = await api.get<{
      wallet: string;
      tier: string;
      invoices: any[];
      currentInvoice: any;
    }>(`/api/v1/billing/invoices?wallet=${wallet}`);

    return result;
  },

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
    const result = await api.get<{
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
    }>(`/api/v1/billing/summary?wallet=${wallet}`);

    return result;
  },

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
    const result = await api.get<{
      permission: { appId: string; appName: string; scopes: string[]; grantedAt: string; expiresAt: string };
      activity: { recentSessions: any[]; recentUsage: any[] };
    }>(`/api/v1/enterprise/permissions/${appId}/activity?wallet=${wallet}`);

    return result;
  },

  /**
   * Update permission scopes
   */
  async updatePermissionScopes(
    wallet: string,
    appId: string,
    scopes: string[]
  ): Promise<{ success: boolean; scopes: string[] }> {
    return api.patch<{ success: boolean; scopes: string[] }>(`/api/v1/enterprise/permissions/${appId}?wallet=${wallet}`, {
      data: scopes
    });
  },

  /**
   * Get user's overall activity log
   */
  async getActivityLog(wallet: string, limit?: number): Promise<{
    wallet: string;
    activities: any[];
    total: number;
  }> {
    let url = `/api/v1/enterprise/activity?wallet=${wallet}`;
    if (limit) url += `&limit=${limit}`;

    const result = await api.get<{
      wallet: string;
      activities: any[];
      total: number;
    }>(url);

    return result;
  },

  /**
   * Get enterprise organization info
   */
  async getOrganization(wallet: string): Promise<any> {
    const result = await api.get(`/api/v1/enterprise/organization/${wallet}?wallet=${wallet}`);

    if (result.status === 404) return null;

    return result;
  },

  /**
   * Create or update enterprise organization
   */
  async upsertOrganization(
    wallet: string,
    name: string,
    approvedApps: string[],
    blockedApps: string[]
  ): Promise<{ success: boolean; organization: any }> {
    return api.post<{ success: boolean; organization: any }>('/api/v1/enterprise/organization', {
      data: { wallet, name, approvedApps, blockedApps }
    });
  },

  /**
   * Get audit log
   */
  async getAuditLog(
    wallet: string,
    options?: { startDate?: string; endDate?: string; appId?: string }
  ): Promise<{ wallet: string; auditLog: any[]; total: number }> {
    let url = `/api/v1/enterprise/audit-log?wallet=${wallet}`;
    if (options?.appId) url += `&appId=${options.appId}`;
    if (options?.startDate) url += `&startDate=${options.startDate}`;
    if (options?.endDate) url += `&endDate=${options.endDate}`;

    const result = await api.get<{ wallet: string; auditLog: any[]; total: number }>(url);

    return result;
  },

  /**
   * Create sandbox app for testing
   */
  async createSandbox(wallet: string, name: string): Promise<{
    success: boolean;
    sandbox: boolean;
    app: { appId: string; name: string; appSecret: string; redirectUris: string[] };
    message: string;
  }> {
    return api.post<{
      success: boolean;
      sandbox: boolean;
      app: { appId: string; name: string; appSecret: string; redirectUris: string[] };
      message: string;
    }>('/api/v1/oauth/sandbox/create', {
      data: { wallet, name }
    });
  },

  /**
   * Get sandbox status
   */
  async getSandboxStatus(wallet: string): Promise<{
    wallet: string;
    sandboxApps: Array<{ appId: string; name: string; isActive: boolean; createdAt: string }>;
    rateLimit: { requestsPerMinute: number; maxRequests: number };
    features: { mockOAuth: boolean; testTokens: boolean; debugMode: boolean };
  }> {
    const result = await api.get<{
      wallet: string;
      sandboxApps: Array<{ appId: string; name: string; isActive: boolean; createdAt: string }>;
      rateLimit: { requestsPerMinute: number; maxRequests: number };
      features: { mockOAuth: boolean; testTokens: boolean; debugMode: boolean };
    }>(`/api/v1/oauth/sandbox/status?wallet=${wallet}`);

    return result;
  },

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
    return api.post<{
      success: boolean;
      sandbox: boolean;
      access_token: string;
      token_type: string;
      expires_in: number;
      walletAddress: string;
      scopes: string[];
    }>('/api/v1/oauth/sandbox/token', {
      data: { wallet, appId }
    });
  }
};