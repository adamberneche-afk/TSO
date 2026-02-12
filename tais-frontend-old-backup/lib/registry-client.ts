/**
 * TAIS Registry API Client
 * 
 * Client for interacting with the TAIS Skill Registry API
 * Base URL: https://tso.onrender.com
 */

const REGISTRY_API_URL = process.env.NEXT_PUBLIC_REGISTRY_URL || 
  'https://tso.onrender.com';

// Error types
export class RegistryError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseData?: unknown
  ) {
    super(message);
    this.name = 'RegistryError';
  }
}

export class AuthenticationError extends RegistryError {
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends RegistryError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

// Types
export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface SkillPermission {
  network?: {
    domains?: string[];
    allowedMethods?: string[];
  };
  filesystem?: {
    read?: string[];
    write?: string[];
  };
  env?: string[];
  modules?: string[];
}

export interface Skill {
  id: string;
  skillHash: string;
  name: string;
  version: string;
  description: string;
  publisherAddress: string;
  ipfsHash?: string;
  trustScore: number;
  downloadCount: number;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: SkillPermission;
  categories?: Category[];
  tags?: Tag[];
  author?: {
    name?: string;
    url?: string;
  };
  license?: string;
  repository?: string;
  homepage?: string;
}

export interface SkillDetails extends Skill {
  audits?: Audit[];
  securityScans?: SecurityScan[];
  provenance?: ProvenanceInfo;
}

export interface Audit {
  id: string;
  skillId: string;
  auditorAddress: string;
  verdict: 'safe' | 'suspicious' | 'malicious';
  findings?: string;
  signature?: string;
  createdAt: string;
  auditor?: {
    trustScore?: number;
  };
}

export interface SecurityScan {
  id: string;
  skillId: string;
  status: 'pending' | 'completed' | 'failed';
  findings?: SecurityFinding[];
  scannedAt: string;
}

export interface SecurityFinding {
  ruleName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  matches?: string[];
}

export interface ProvenanceInfo {
  chain: IsnadLink[];
  overallTrust: number;
  lastVerified: string;
}

export interface IsnadLink {
  address: string;
  role: 'author' | 'auditor' | 'voucher';
  signature: string;
  timestamp: string;
  trustScore: number;
}

export interface CreateSkillDTO {
  name: string;
  version: string;
  description: string;
  permissions?: SkillPermission;
  categories?: string[];
  tags?: string[];
  author?: {
    name?: string;
    url?: string;
  };
  license?: string;
  repository?: string;
  homepage?: string;
  ipfsHash?: string;
}

export interface CreateAuditDTO {
  skillId: string;
  verdict: 'safe' | 'suspicious' | 'malicious';
  findings?: string;
  signature?: string;
}

export interface SearchResults {
  skills: Skill[];
  total: number;
  query: string;
}

export interface TrendingSkills {
  skills: Skill[];
  timeframe: string;
}

export interface RegistryStats {
  totalSkills: number;
  totalAudits: number;
  totalDownloads: number;
  blockedSkills: number;
}

// API Client Configuration
interface RegistryClientConfig {
  baseURL: string;
  headers?: Record<string, string>;
}

// API Client Class
class RegistryClient {
  private baseURL: string;
  private headers: Record<string, string>;

  constructor(config: RegistryClientConfig) {
    this.baseURL = config.baseURL;
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...config.headers,
    };
  }

  /**
   * Set wallet address for authenticated requests
   * Required for publishing skills and submitting audits
   */
  setWalletAddress(address: string) {
    this.headers['X-Wallet-Address'] = address;
  }

  /**
   * Clear wallet address
   */
  clearWalletAddress() {
    delete this.headers['X-Wallet-Address'];
  }

  /**
   * Get current wallet address if set
   */
  getWalletAddress(): string | undefined {
    return this.headers['X-Wallet-Address'];
  }

  /**
   * Make authenticated request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
      });

      // Handle non-JSON responses (like health checks)
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      if (!response.ok) {
        let errorData: unknown;
        
        if (isJson) {
          errorData = await response.json();
        } else {
          errorData = await response.text();
        }

        // Throw specific error types
        if (response.status === 401) {
          throw new AuthenticationError(
            typeof errorData === 'object' && errorData && 'message' in errorData
              ? String(errorData.message)
              : 'Authentication required. Please connect your wallet.'
          );
        }
        
        if (response.status === 404) {
          throw new NotFoundError(
            typeof errorData === 'object' && errorData && 'message' in errorData
              ? String(errorData.message)
              : `Resource not found: ${endpoint}`
          );
        }

        throw new RegistryError(
          typeof errorData === 'object' && errorData && 'message' in errorData
            ? String(errorData.message)
            : `HTTP error! status: ${response.status}`,
          response.status,
          errorData
        );
      }

      // Return null for 204 No Content
      if (response.status === 204) {
        return null as T;
      }

      // Parse JSON response
      if (isJson) {
        return await response.json() as T;
      }

      // Return text for non-JSON responses
      return await response.text() as unknown as T;
    } catch (error) {
      if (error instanceof RegistryError) {
        throw error;
      }
      
      // Network or other errors
      throw new RegistryError(
        error instanceof Error ? error.message : 'Network error',
        undefined,
        error
      );
    }
  }

  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * Health check
   * Returns server status
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }

  /**
   * Get API documentation URL
   */
  getDocsUrl(): string {
    return `${this.baseURL}/api/docs`;
  }

  /**
   * Fetch all skills with optional filtering
   */
  async getSkills(params?: {
    category?: string;
    tag?: string;
    search?: string;
    publisher?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ skills: Skill[]; total: number }> {
    const queryParams = new URLSearchParams();
    
    if (params?.category) queryParams.set('category', params.category);
    if (params?.tag) queryParams.set('tag', params.tag);
    if (params?.search) queryParams.set('search', params.search);
    if (params?.publisher) queryParams.set('publisher', params.publisher);
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.offset) queryParams.set('offset', String(params.offset));

    const query = queryParams.toString();
    return this.request<{ skills: Skill[]; total: number }>(
      `/api/skills${query ? `?${query}` : ''}`
    );
  }

  /**
   * Get skills by category
   */
  async getSkillsByCategory(categoryId: string): Promise<Skill[]> {
    const response = await this.getSkills({ category: categoryId });
    return response.skills;
  }

  /**
   * Get skill details by hash
   */
  async getSkill(skillHash: string): Promise<SkillDetails> {
    return this.request<SkillDetails>(`/api/skills/${skillHash}`);
  }

  /**
   * Get skill by ID
   */
  async getSkillById(skillId: string): Promise<SkillDetails> {
    // The API uses hash-based lookup, but we can search by ID
    const { skills } = await this.getSkills({ search: skillId });
    const skill = skills.find(s => s.id === skillId);
    if (!skill) {
      throw new NotFoundError(`Skill with ID ${skillId} not found`);
    }
    return this.getSkill(skill.skillHash);
  }

  /**
   * Search skills
   */
  async searchSkills(query: string, limit?: number): Promise<SearchResults> {
    const params = new URLSearchParams();
    params.set('q', query);
    if (limit) params.set('limit', String(limit));
    
    return this.request<SearchResults>(`/api/search?${params.toString()}`);
  }

  /**
   * Get trending skills
   */
  async getTrendingSkills(timeframe?: 'day' | 'week' | 'month'): Promise<TrendingSkills> {
    const params = new URLSearchParams();
    if (timeframe) params.set('timeframe', timeframe);
    
    return this.request<TrendingSkills>(`/api/search/trending?${params.toString()}`);
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>('/api/categories');
  }

  /**
   * Get all tags
   */
  async getTags(): Promise<Tag[]> {
    return this.request<Tag[]>('/api/tags');
  }

  // ==================== PROTECTED ENDPOINTS (Requires NFT) ====================

  /**
   * Publish a new skill
   * Requires: X-Wallet-Address header with Genesis NFT holder address
   */
  async publishSkill(skillData: CreateSkillDTO): Promise<Skill> {
    if (!this.getWalletAddress()) {
      throw new AuthenticationError('Wallet address required. Call setWalletAddress() first.');
    }

    return this.request<Skill>('/api/skills', {
      method: 'POST',
      body: JSON.stringify(skillData),
    });
  }

  /**
   * Submit an audit for a skill
   * Requires: X-Wallet-Address header with Genesis NFT holder address
   */
  async submitAudit(auditData: CreateAuditDTO): Promise<Audit> {
    if (!this.getWalletAddress()) {
      throw new AuthenticationError('Wallet address required. Call setWalletAddress() first.');
    }

    return this.request<Audit>('/api/audits', {
      method: 'POST',
      body: JSON.stringify(auditData),
    });
  }

  /**
   * Get audits for a skill
   */
  async getAudits(skillHash: string): Promise<Audit[]> {
    return this.request<Audit[]>(`/api/audits?skillHash=${skillHash}`);
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get system statistics (admin only)
   */
  async getStats(): Promise<RegistryStats> {
    return this.request<RegistryStats>('/api/admin/stats');
  }

  /**
   * Block a skill (admin only)
   */
  async blockSkill(skillId: string, reason: string): Promise<void> {
    await this.request<void>(`/api/admin/skills/${skillId}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  /**
   * Get blocked skills (admin only)
   */
  async getBlockedSkills(): Promise<Skill[]> {
    return this.request<Skill[]>('/api/admin/skills/blocked');
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Check if a skill is safe to install
   * Returns true if skill is not blocked and has no critical security findings
   */
  async isSkillSafe(skillHash: string): Promise<{
    safe: boolean;
    reasons: string[];
  }> {
    try {
      const skill = await this.getSkill(skillHash);
      const reasons: string[] = [];

      if (skill.isBlocked) {
        reasons.push('Skill has been blocked by administrators');
      }

      if (skill.trustScore < 0.3) {
        reasons.push(`Low trust score: ${Math.round(skill.trustScore * 100)}%`);
      }

      // Check latest security scan
      const latestScan = skill.securityScans?.[0];
      if (latestScan?.findings) {
        const criticalFindings = latestScan.findings.filter(
          f => f.severity === 'critical' || f.severity === 'high'
        );
        if (criticalFindings.length > 0) {
          reasons.push(`${criticalFindings.length} critical security issues found`);
        }
      }

      return {
        safe: reasons.length === 0,
        reasons,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        return {
          safe: false,
          reasons: ['Skill not found in registry'],
        };
      }
      throw error;
    }
  }

  /**
   * Get trust score color class based on score
   */
  getTrustScoreColor(score: number): {
    text: string;
    bg: string;
    label: string;
  } {
    if (score >= 0.8) {
      return {
        text: 'text-green-500',
        bg: 'bg-green-500/10',
        label: 'High',
      };
    }
    if (score >= 0.6) {
      return {
        text: 'text-yellow-500',
        bg: 'bg-yellow-500/10',
        label: 'Medium',
      };
    }
    if (score >= 0.4) {
      return {
        text: 'text-orange-500',
        bg: 'bg-orange-500/10',
        label: 'Low',
      };
    }
    return {
      text: 'text-red-500',
      bg: 'bg-red-500/10',
      label: 'Very Low',
    };
  }

  /**
   * Format trust score for display
   */
  formatTrustScore(score: number): string {
    return `${Math.round(score * 100)}%`;
  }

  /**
   * Get download count formatted
   */
  formatDownloadCount(count: number): string {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return String(count);
  }
}

// Create singleton instance
export const registryClient = new RegistryClient({
  baseURL: REGISTRY_API_URL,
});

// Export factory for creating custom instances
export function createRegistryClient(config: Partial<RegistryClientConfig> = {}) {
  return new RegistryClient({
    baseURL: config.baseURL || REGISTRY_API_URL,
    headers: config.headers,
  });
}

export default RegistryClient;
