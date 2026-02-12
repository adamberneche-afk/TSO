// tais_frontend/src/services/configApi.ts
// API client for agent configuration persistence

const API_BASE_URL = import.meta.env.VITE_REGISTRY_URL || 'http://localhost:3000';

interface ConfigStatus {
  allowed: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  tokenCount: number;
  error?: string;
  configurations: AgentConfiguration[];
}

interface AgentConfiguration {
  id: string;
  walletAddress: string;
  name: string;
  description?: string;
  configData: any;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SaveConfigResponse {
  success: boolean;
  configuration: AgentConfiguration;
  limit: number;
  remaining: number;
}

interface NFTVerificationResult {
  isHolder: boolean;
  tokenCount: number;
  tokenIds: string[];
  configLimit: number;
  configsUsed: number;
  configsRemaining: number;
  error?: string;
}

class ConfigAPI {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/v1/configurations`;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      this.token = null;
      throw new Error('Authentication required. Please connect your wallet.');
    }

    return response;
  }

  /**
   * Check configuration status and limits
   */
  async getStatus(): Promise<ConfigStatus> {
    const response = await this.fetchWithAuth(`${this.baseUrl}/status`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get configuration status');
    }

    return response.json();
  }

  /**
   * Get all configurations for the authenticated wallet
   */
  async getConfigurations(): Promise<{
    configurations: AgentConfiguration[];
    limit: number;
    used: number;
    remaining: number;
  }> {
    const response = await this.fetchWithAuth(this.baseUrl);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get configurations');
    }

    return response.json();
  }

  /**
   * Save a new configuration
   */
  async saveConfiguration(
    name: string,
    configData: any,
    description?: string
  ): Promise<SaveConfigResponse> {
    const response = await this.fetchWithAuth(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify({
        name,
        configData,
        description,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save configuration');
    }

    return response.json();
  }

  /**
   * Update an existing configuration
   */
  async updateConfiguration(
    configId: string,
    updates: {
      name?: string;
      description?: string;
      configData?: any;
    }
  ): Promise<{ success: boolean; configuration: AgentConfiguration }> {
    const response = await this.fetchWithAuth(`${this.baseUrl}/${configId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update configuration');
    }

    return response.json();
  }

  /**
   * Delete (soft delete) a configuration
   */
  async deleteConfiguration(configId: string): Promise<{
    success: boolean;
    remaining: number;
    limit: number;
  }> {
    const response = await this.fetchWithAuth(`${this.baseUrl}/${configId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete configuration');
    }

    return response.json();
  }

  /**
   * Verify NFT ownership
   */
  async verifyNFTOwnership(): Promise<NFTVerificationResult> {
    const response = await this.fetchWithAuth(`${this.baseUrl}/nft/verify`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to verify NFT ownership');
    }

    return response.json();
  }
}

export const configApi = new ConfigAPI();
export type {
  ConfigStatus,
  AgentConfiguration,
  SaveConfigResponse,
  NFTVerificationResult,
};
export default configApi;
