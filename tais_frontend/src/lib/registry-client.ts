// TAIS Platform - Registry API Client
// Refactored to use the typed API client for consistency and security

import type { Skill, SearchResults, CreateSkillDTO, RegistryClientConfig } from '../types/registry';
import { MOCK_SKILLS, MOCK_TRENDING_SKILLS, USE_MOCK_DATA } from './mock-data';
import { api } from '@/api/client';

// Base API URL is already configured in the api client
const API_BASE = '/api/v1';

export class RegistryClient {
  /**
   * Get skills with optional filters
   * Uses mock data if USE_MOCK_DATA is true or if API fails
   */
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
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (params?.category) queryParams.append('category', params.category);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.trending) queryParams.append('trending', 'true');

      const response = await api.get<SearchResults>(`${API_BASE}/skills`, {
        params: Object.fromEntries(queryParams)
      });
      
      return response;
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

  /**
   * Get skill details by hash
   */
  async getSkill(skillHash: string): Promise<Skill | null> {
    if (USE_MOCK_DATA) {
      const skill = MOCK_SKILLS.find(s => s.skillHash === skillHash);
      return skill || null;
    }

    try {
      const result = await api.get<Skill | null>(`${API_BASE}/skills/${skillHash}`);
      return result;
    } catch (error) {
      console.error('Error fetching skill:', error);
      return null;
    }
  }

  /**
   * Publish skill (requires authentication via JWT, and the publishing
   * wallet holding a Publisher/Genesis NFT -- enforced server-side by
   * `requirePublisherNFT`, which responds 403 with a real message rather
   * than a generic failure).
   *
   * Unlike the read methods above, a create action must not swallow its
   * error into a fallback value: the caller needs the real reason (401
   * not logged in, 403 no publisher NFT, 400 a specific field failed
   * validation) to show the user, so this lets `api.post` throw rather
   * than catching it. It also used to pass `{ data: skillData }` as the
   * request body instead of `skillData` itself -- `api.post`'s second
   * argument *is* the body, so the server was receiving `{ data: {...} }`
   * and every real call would have failed validation regardless of the
   * DTO shape.
   */
  async publishSkill(skillData: CreateSkillDTO): Promise<Skill> {
    if (USE_MOCK_DATA) {
      // Simulate successful publish
      const newSkill: Skill = {
        ...skillData,
        id: `mock-${Date.now()}`,
        owner: skillData.author,
        trustScore: 0,
        downloadCount: 0,
        categories: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return newSkill;
    }

    return api.post<Skill>(`${API_BASE}/skills`, skillData);
  }

  /**
   * Search skills
   */
  async searchSkills(query: string): Promise<SearchResults> {
    if (USE_MOCK_DATA) {
      const skills = MOCK_SKILLS.filter(skill =>
        skill.name.toLowerCase().includes(query.toLowerCase()) ||
        skill.description?.toLowerCase().includes(query.toLowerCase())
      );
      return {
        skills,
        total: skills.length,
        page: 1,
        limit: skills.length,
      };
    }

    try {
      const result = await api.get<SearchResults>(`${API_BASE}/search`, {
        params: { q: query }
      });
      return result;
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

  /**
   * Get trending skills
   */
  async getTrendingSkills(): Promise<Skill[]> {
    if (USE_MOCK_DATA) {
      return [...MOCK_TRENDING_SKILLS];
    }

    try {
      // There is no separate /search/trending endpoint on the backend --
      // trending is a query flag on the same route getSkills() already uses.
      const result = await this.getSkills({ trending: true });
      return result.skills;
    } catch (error) {
      console.error('Error fetching trending skills:', error);
      return [];
    }
  }
}

// Export a singleton instance with default config
export const registryClient = new RegistryClient();

export default registryClient;