// tais_frontend/src/services/rcrtApi.ts
// RCRT Integration API

import { env } from '../lib/env';

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

class RCRTAPI {
  private baseUrl: string;

  constructor() {
    // Use env wrapper with fallback
    const registryUrl = env.registryUrl || 'https://tso.onrender.com';
    this.baseUrl = `${registryUrl}/api/v1/rcrt`;
    console.log('RCRT API baseUrl:', this.baseUrl);
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    console.log('Auth token present:', !!token);
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async getStatus(): Promise<RCRTStatus> {
    const url = `${this.baseUrl}/status`;
    console.log('Fetching RCRT status from:', url);
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    console.log('RCRT status response:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('RCRT status error:', error);
      throw new Error(error.error || 'Failed to get RCRT status');
    }

    return response.json();
  }

  async provision(): Promise<RCRTProvision> {
    const wallet = localStorage.getItem('wallet_address');
    const response = await fetch(`${this.baseUrl}/provision`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ wallet }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to provision RCRT');
    }

    return response.json();
  }

  async revoke(agentId: string): Promise<void> {
    const wallet = localStorage.getItem('wallet_address');
    const response = await fetch(`${this.baseUrl}/provision`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ wallet, agentId }),
    });

    if (!response.ok) {
      throw new Error('Failed to revoke RCRT');
    }
  }

  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    const response = await fetch(`${this.baseUrl}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    return response.json();
  }

  async scanContent(content: string): Promise<SecurityScanResult> {
    const response = await fetch(`${this.baseUrl}/scan`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error('Failed to scan content');
    }

    return response.json();
  }

  async getAuditLogs(options?: {
    action?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogResponse> {
    const params = new URLSearchParams();
    if (options?.action) params.append('action', options.action);
    if (options?.status) params.append('status', options.status);
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await fetch(`${this.baseUrl}/audit?${params}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get audit logs');
    }

    return response.json();
  }
}

class KBAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${env.registryUrl}/kb`;
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async registerKB(
    kbId: string,
    options?: {
      appId?: string;
      contextType?: 'private' | 'confidential' | 'shared' | 'public';
      excludeFromRCRT?: boolean;
    }
  ): Promise<{ success: boolean; kbId: string; contextType: string }> {
    const response = await fetch(`${this.baseUrl}/register`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        kbId,
        appId: options?.appId,
        contextType: options?.contextType || 'public',
        excludeFromRCRT: options?.excludeFromRCRT || false,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to register KB');
    }

    return response.json();
  }

  async getRegistries(): Promise<{ kbRegistries: KBRegistry[] }> {
    const response = await fetch(`${this.baseUrl}/registry`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get KB registries');
    }

    return response.json();
  }

  async updateContextType(kbId: string, contextType: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${kbId}/context-type`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ contextType }),
    });

    if (!response.ok) {
      throw new Error('Failed to update context type');
    }
  }

  async setExcludeFromRCRT(kbId: string, exclude: boolean): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${kbId}/exclude-rcrt`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ exclude }),
    });

    if (!response.ok) {
      throw new Error('Failed to update RCRT exclusion');
    }
  }

  async getAccessHistory(kbId: string): Promise<{ accessHistory: KBAccessHistory[] }> {
    const response = await fetch(`${this.baseUrl}/${kbId}/access`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get access history');
    }

    return response.json();
  }
}

class GrantAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${env.registryUrl}/oauth`;
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async addConfidentialGrant(appId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/confidential-grant`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ appId }),
    });

    if (!response.ok) {
      throw new Error('Failed to add confidential grant');
    }
  }

  async revokeConfidentialGrant(appId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/confidential-grant/${appId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to revoke confidential grant');
    }
  }

  async getConfidentialGrants(): Promise<{ grants: ConfidentialGrant[] }> {
    const response = await fetch(`${this.baseUrl}/confidential-grants`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get confidential grants');
    }

    return response.json();
  }
}

export const rcrtApi = new RCRTAPI();
export const kbApi = new KBAPI();
export const grantApi = new GrantAPI();