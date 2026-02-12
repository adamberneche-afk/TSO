// TAIS Platform - Registry API Client

import { Skill, SearchResults, CreateSkillDTO, RegistryClientConfig } from '../types/registry';
import { MOCK_SKILLS, MOCK_TRENDING_SKILLS, USE_MOCK_DATA } from './mock-data';

const REGISTRY_API_URL = import.meta.env.VITE_REGISTRY_URL || 'https://tso.onrender.com';

class RegistryClient {
  private baseURL: string;
  private headers: Record<string, string>;

  constructor(config: RegistryClientConfig) {
    this.baseURL = config.baseURL;
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
  }

  // Set wallet address for authenticated requests
  setWalletAddress(address: string) {
    this.headers['X-Wallet-Address'] = address;
  }

  // Fetch all skills with optional filters
  async getSkills(params?: {
    category?: string;
    search?: string;
    trending?: boolean;
  }): Promise<SearchResults> {
    // Use mock data if enabled
    if (USE_MOCK_DATA) {
      console.log('[Mock] Using mock skills data');
      let skills = [...MOCK_SKILLS];
      
      if (params?.search) {
        skills = skills.filter(skill =>
          skill.name.toLowerCase().includes(params.search!.toLowerCase()) ||
          skill.description?.toLowerCase().includes(params.search!.toLowerCase())
        );
      }
      
      if (params?.trending) {
        skills = [...MOCK_TRENDING_SKILLS];
      }
      
      return {
        skills,
        total: skills.length,
        page: 1,
        limit: skills.length,
      };
    }

    try {
      const queryParams = new URLSearchParams();
      if (params?.category) queryParams.append('category', params.category);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.trending) queryParams.append('trending', 'true');

      const url = `${this.baseURL}/api/skills${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, { 
        headers: this.headers,
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch skills: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Handle different response formats
      if (Array.isArray(data)) {
        return {
          skills: data,
          total: data.length,
          page: 1,
          limit: data.length
        };
      }
      
      return data;
    } catch (error) {
      console.warn('Registry API unavailable, using mock data:', error);
      // Fallback to mock data when API fails
      let skills = [...MOCK_SKILLS];
      
      if (params?.search) {
        skills = skills.filter(skill =>
          skill.name.toLowerCase().includes(params.search!.toLowerCase()) ||
          skill.description?.toLowerCase().includes(params.search!.toLowerCase())
        );
      }
      
      if (params?.trending) {
        skills = [...MOCK_TRENDING_SKILLS];
      }
      
      return {
        skills,
        total: skills.length,
        page: 1,
        limit: skills.length,
      };
    }
  }

  // Fetch skill details
  async getSkill(skillHash: string): Promise<Skill | null> {
    try {
      const response = await fetch(
        `${this.baseURL}/api/skills/${skillHash}`,
        { headers: this.headers }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch skill: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching skill:', error);
      return null;
    }
  }

  // Publish skill (requires NFT)
  async publishSkill(skillData: CreateSkillDTO): Promise<Skill | null> {
    try {
      const response = await fetch(`${this.baseURL}/api/skills`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(skillData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to publish skill: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error publishing skill:', error);
      return null;
    }
  }

  // Search skills
  async searchSkills(query: string): Promise<SearchResults> {
    try {
      const response = await fetch(
        `${this.baseURL}/api/search?q=${encodeURIComponent(query)}`,
        { headers: this.headers }
      );
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        return {
          skills: data,
          total: data.length,
          page: 1,
          limit: data.length
        };
      }
      
      return data;
    } catch (error) {
      console.error('Error searching skills:', error);
      return {
        skills: [],
        total: 0,
        page: 1,
        limit: 10
      };
    }
  }

  // Get trending skills
  async getTrendingSkills(): Promise<Skill[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/api/search/trending`,
        { headers: this.headers }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch trending: ${response.statusText}`);
      }
      
      const data = await response.json();
      return Array.isArray(data) ? data : data.skills || [];
    } catch (error) {
      console.error('Error fetching trending skills:', error);
      return [];
    }
  }
}

export const registryClient = new RegistryClient({
  baseURL: REGISTRY_API_URL,
});

export default registryClient;