// TAIS Platform Types - Registry API

export interface Skill {
  id: string;
  name: string;
  version: string;
  description?: string;
  skillHash: string;
  owner: string;
  trustScore: number;
  downloadCount: number;
  categories?: { id: string; name: string }[];
  permissions?: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResults {
  skills: Skill[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateSkillDTO {
  name: string;
  version: string;
  description?: string;
  skillHash: string;
  categories?: string[];
  permissions?: Record<string, boolean>;
}

export interface RegistryClientConfig {
  baseURL: string;
  headers?: Record<string, string>;
}
