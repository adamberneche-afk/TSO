import { api } from '@/api/client';

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

export const configApi = {
  /**
   * Check configuration status and limits
   */
  async getStatus(): Promise<ConfigStatus> {
    return api.get<ConfigStatus>('/api/v1/configurations/status');
  },

  /**
   * Get all configurations for the authenticated wallet
   */
  async getConfigurations(): Promise<{
    configurations: AgentConfiguration[];
    limit: number;
    used: number;
    remaining: number;
  }> {
    return api.get('/api/v1/configurations');
  },

  /**
   * Save a new configuration
   */
  async saveConfiguration(
    name: string,
    configData: any,
    description?: string
  ): Promise<SaveConfigResponse> {
    return api.post<SaveConfigResponse>('/api/v1/configurations', {
      data: { name, configData, description }
    });
  },

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
    return api.put(`/api/v1/configurations/${configId}`, {
      data: updates
    });
  },

  /**
   * Delete (soft delete) a configuration
   */
  async deleteConfiguration(configId: string): Promise<{
    success: boolean;
    remaining: number;
    limit: number;
  }> {
    return api.delete(`/api/v1/configurations/${configId}`);
  },

  /**
   * Verify NFT ownership
   */
  async verifyNFTOwnership(): Promise<NFTVerificationResult> {
    return api.get<NFTVerificationResult>('/api/v1/configurations/nft/verify');
  },

  /**
   * Get version history for a configuration
   */
  async getConfigVersions(configId: string): Promise<{
    configId: string;
    currentVersion: number;
    tier: string;
    versions: Array<{
      id: string;
      version: number;
      versionNote: string | null;
      tier: string;
      createdAt: string;
      expiresAt: string | null;
    }>;
  }> {
    return api.get(`/api/v1/configurations/${configId}/versions`);
  },

  /**
   * Get specific version details
   */
  async getVersionDetails(configId: string, version: number): Promise<any> {
    return api.get(`/api/v1/configurations/${configId}/versions/${version}`);
  },

  /**
   * Rollback to a specific version
   */
  async rollbackToVersion(configId: string, version: number): Promise<{
    success: boolean;
    config: AgentConfiguration;
    message: string;
  }> {
    return api.post(`/api/v1/configurations/${configId}/rollback/${version}`);
  }
};