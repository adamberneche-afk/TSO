import { api } from '@/api/client';
import { env } from '../lib/env';

// The base path for RCRT endpoints
const RCRT_BASE = '/api/v1/rcrt';

export interface RCRTStatus {
  provisioned: boolean;
  agentId?: string;
  status?: string;
}

export interface RCRTProvision {
  agentId: string;
  token: string;
  refreshToken: string;
  expiresAt: string;
  expiresIn: number;
}

export interface KBRegistry {
  id: string;
  kbId: string;
  ownerId: string;
  appId?: string;
  contextType: 'private' | 'confidential' | 'shared' | 'public';
  attachedAt: string;
  excludedFromRCRT: boolean;
}

export interface KBAccessHistory {
  id: string;
  kbId: string;
  appId: string;
  grantType: string;
  grantedAt: string;
  revokedAt?: string;
}

export interface ConfidentialGrant {
  id: string;
  ownerId: string;
  appId: string;
  grantedAt: string;
  revokedAt?: string;
}

export interface RoutingLog {
  id: string;
  breadcrumbId: string;
  targetAppId: string;
  contextType: string;
  decision: string;
  reason: string;
  timestamp: string;
}

export interface SecurityScanResult {
  safe: boolean;
  threats: Threat[];
  score: number;
}

export interface Threat {
  type: 'malware' | 'exploit' | 'pii' | 'injection' | 'suspicious';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
}

export interface RCRTAuditLog {
  id: string;
  ownerId: string;
  action: string;
  agentId?: string;
  token?: string;
  status?: string;
  errorMessage?: string;
  contextType?: string;
  targetAppId?: string;
  breadcrumbId?: string;
  ipAddress?: string;
  userAgent?: string;
  duration?: number;
  createdAt: string;
}

export interface AuditLogResponse {
  logs: RCRTAuditLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * RCRT API service
 */
export const rcrtApi = {
  /**
   * Get RCRT provisioning status
   */
  async getStatus(): Promise<RCRTStatus> {
    const wallet = localStorage.getItem('wallet_address') || localStorage.getItem('wallet') || localStorage.getItem('walletAddress');
    if (wallet) {
      return api.get<RCRTStatus>(`${RCRT_BASE}/status`, {
        params: { wallet }
      });
    }
    return api.get<RCRTStatus>(`${RCRT_BASE}/status`);
  },

  /**
   * Provision RCRT agent
   */
  async provision(): Promise<RCRTProvision> {
    const wallet = localStorage.getItem('wallet_address') || localStorage.getItem('wallet');
    if (!wallet) {
      throw new Error('Wallet not found. Please connect your wallet first.');
    }
    // /rcrt/provision actually sources the wallet from the authenticated
    // session (req.user), not the body, so this field is currently
    // ignored server-side either way -- fixed for consistency, not
    // because it changes behavior.
    return api.post<RCRTProvision>(`${RCRT_BASE}/provision`, { wallet });
  },

  /**
   * Revoke RCRT agent
   */
  async revoke(agentId: string): Promise<void> {
    const wallet = localStorage.getItem('wallet_address') || localStorage.getItem('wallet');
    if (!wallet) {
      throw new Error('Wallet not found. Please connect your wallet first.');
    }
    await api.delete(`${RCRT_BASE}/provision`, {
      params: { agentId }
    });
  },

  /**
   * Refresh RCRT token
   */
  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    // NOTE: no POST /api/v1/rcrt/refresh route exists in packages/registry
    // (searched -- there is genuinely no server handler for this path).
    // This call 404s regardless of body shape; fixed the shape for
    // consistency, but this method is dead until a real endpoint exists.
    // Not called anywhere in tais_frontend today.
    return api.post<{ token: string; refreshToken: string }>(`${RCRT_BASE}/refresh`, { refreshToken });
  },

  /**
   * Scan content for security threats
   */
  async scanContent(content: string): Promise<SecurityScanResult> {
    // Same as refreshToken above: no POST /api/v1/rcrt/scan route exists
    // server-side. Dead, uncalled method; shape fixed for consistency only.
    return api.post<SecurityScanResult>(`${RCRT_BASE}/scan`, { content });
  },

  /**
   * Get audit logs
   */
  async getAuditLogs(options?: {
    action?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogResponse> {
    let url = `${RCRT_BASE}/audit`;
    const params = new URLSearchParams();
    if (options?.action) params.append('action', options.action);
    if (options?.status) params.append('status', options.status);
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    if (params.toString()) {
      url += `?${params}`;
    }

    return api.get<AuditLogResponse>(url);
  }
};

/**
 * KB API service
 */
export const kbApi = {
  /**
   * Register a knowledge base
   */
  async registerKB(
    kbId: string,
    options?: {
      appId?: string;
      contextType?: 'private' | 'confidential' | 'shared' | 'public';
      excludeFromRCRT?: boolean;
    }
  ): Promise<{ success: boolean; kbId: string; contextType: string }> {
    return api.post<{ success: boolean; kbId: string; contextType: string }>(`/api/v1/kb/register`, {
      kbId,
      appId: options?.appId,
      contextType: options?.contextType || 'public',
      excludeFromRCRT: options?.excludeFromRCRT || false,
    });
  },

  /**
   * Get all KB registries
   */
  async getRegistries(): Promise<{ kbRegistries: KBRegistry[] }> {
    return api.get<{ kbRegistries: KBRegistry[] }>(`/api/v1/kb/registry`);
  },

  /**
   * Update context type for a KB
   */
  async updateContextType(kbId: string, contextType: string): Promise<void> {
    await api.patch(`/api/v1/kb/${kbId}/context-type`, { contextType });
  },

  /**
   * Set RCRT exclusion for a KB
   */
  async setExcludeFromRCRT(kbId: string, exclude: boolean): Promise<void> {
    await api.post(`/api/v1/kb/${kbId}/exclude-rcrt`, { exclude });
  },

  /**
   * Get access history for a KB
   */
  async getAccessHistory(kbId: string): Promise<{ accessHistory: KBAccessHistory[] }> {
    return api.get<{ accessHistory: KBAccessHistory[] }>(`/api/v1/kb/${kbId}/access`);
  }
};

/**
 * Grant API service
 */
export const grantApi = {
  /**
   * Add a confidential grant
   */
  async addConfidentialGrant(appId: string): Promise<void> {
    await api.post(`/api/v1/oauth/confidential-grant`, { appId });
  },

  /**
   * Revoke a confidential grant
   */
  async revokeConfidentialGrant(appId: string): Promise<void> {
    await api.delete(`/api/v1/oauth/confidential-grant/${appId}`);
  },

  /**
   * Get all confidential grants
   */
  async getConfidentialGrants(): Promise<{ grants: ConfidentialGrant[] }> {
    return api.get<{ grants: ConfidentialGrant[] }>(`/api/v1/oauth/confidential-grants`);
  }
};