export interface KBEvent {
  eventType: 'kb.created' | 'kb.updated' | 'kb.deleted' | 'entry.created' | 'entry.updated';
  kbId: string;
  entryId?: string;
  data?: any;
  timestamp: string;
}

export interface Breadcrumb {
  id: string;
  title: string;
  context: any;
  tags: string[];
  schemaName?: string;
  visibility: 'public' | 'team' | 'private';
  sensitivity: 'low' | 'pii' | 'secret';
  createdAt: string;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  errors?: string[];
}

export class RCRTClient {
  private baseUrl: string;
  private token: string;
  private refreshToken: string;
  private tokenExpiry: Date;

  constructor(baseUrl: string, token: string, refreshToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
    this.refreshToken = refreshToken;
    this.tokenExpiry = new Date(Date.now() + 14 * 60 * 1000); // Refresh 1 min before 15 min expiry
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    if (new Date() >= this.tokenExpiry) {
      const response = await fetch(`${this.baseUrl}/api/v1/rcrt/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const tokens = await response.json();
      this.token = tokens.token;
      this.refreshToken = tokens.refreshToken;
      this.tokenExpiry = new Date(Date.now() + 14 * 60 * 1000);
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    await this.refreshTokenIfNeeded();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`RCRT API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async sendKBEvent(event: KBEvent): Promise<void> {
    await this.request('/api/v1/rcrt/events', {
      method: 'POST',
      body: JSON.stringify(event)
    });
  }

  async pullBreadcrumbs(filters?: {
    tags?: string[];
    schemaName?: string;
    since?: string;
  }): Promise<Breadcrumb[]> {
    const params = new URLSearchParams();
    
    if (filters?.tags) {
      params.set('tags', filters.tags.join(','));
    }
    if (filters?.schemaName) {
      params.set('schema', filters.schemaName);
    }
    if (filters?.since) {
      params.set('since', filters.since);
    }

    const query = params.toString();
    const result = await this.request<{ breadcrumbs: Breadcrumb[] }>(
      `/api/v1/rcrt/breadcrumbs${query ? `?${query}` : ''}`
    );

    return result.breadcrumbs;
  }

  async pushBreadcrumb(breadcrumb: Omit<Breadcrumb, 'id' | 'createdAt'>): Promise<Breadcrumb> {
    return this.request('/api/v1/rcrt/breadcrumbs', {
      method: 'POST',
      body: JSON.stringify(breadcrumb)
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.request('/health', { method: 'GET' });
      return true;
    } catch {
      return false;
    }
  }
}

// Factory function to create client from provisioning
export async function createRCRTClient(
  baseUrl: string,
  walletAddress: string
): Promise<RCRTClient> {
  // Get provision from TAIS
  const response = await fetch(`${process.env.VITE_REGISTRY_URL || 'https://tso.onrender.com'}/api/v1/rcrt/provision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // This would need proper auth in production
    }
  });

  if (!response.ok) {
    throw new Error('Failed to provision RCRT client');
  }

  const { token, refreshToken } = await response.json();

  return new RCRTClient(baseUrl, token, refreshToken);
}
