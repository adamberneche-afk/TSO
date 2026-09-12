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

// Mirrors packages/registry/src/validation's `skillSchema` (the real
// server-side Zod schema `POST /api/v1/skills` validates the raw request
// body against) -- `author` and `manifestCid` are required there but were
// missing from this DTO entirely, and `categoryIds` was misnamed
// `categories`, so a real call built from this type would always fail
// server-side validation with a 400 before this fix (see
// docs/DOCS_VS_CODEBASE.md row 22).
export interface CreateSkillDTO {
  name: string;
  version: string;
  description?: string;
  skillHash: string;
  author: string;
  manifestCid: string;
  packageCid?: string;
  categoryIds?: string[];
  permissions?: Record<string, boolean>;
}

export interface RegistryClientConfig {
  baseURL: string;
  headers?: Record<string, string>;
}
