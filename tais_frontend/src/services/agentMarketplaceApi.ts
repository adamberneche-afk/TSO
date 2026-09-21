// Agent Marketplace client (docs/DOCS_VS_CODEBASE.md row 22,
// docs/AGENT_MARKETPLACE_DATA_MODEL.md). Every call sends its body
// directly to api.post/api.patch (not wrapped in `{ data: ... }` -- see
// enterpriseAuthApi.ts's note on why that matters and which existing
// files get it wrong).

import { api } from '@/api/client';
import type {
  AgentListing,
  BrowseListingsResult,
  CreateListingInput,
  UpdateListingInput,
  InstallResult,
} from '@/types/agentMarketplace';

export const agentMarketplaceApi = {
  async browse(params: { category?: string; query?: string; limit?: number; offset?: number } = {}): Promise<BrowseListingsResult> {
    return api.get<BrowseListingsResult>('/api/v1/agent-listings', { params, useAuth: false });
  },

  async getMine(): Promise<AgentListing[]> {
    return api.get<AgentListing[]>('/api/v1/agent-listings/mine');
  },

  async getById(id: string): Promise<AgentListing> {
    return api.get<AgentListing>(`/api/v1/agent-listings/${id}`);
  },

  async create(input: CreateListingInput): Promise<AgentListing> {
    return api.post<AgentListing>('/api/v1/agent-listings', input);
  },

  async update(id: string, input: UpdateListingInput): Promise<AgentListing> {
    return api.put<AgentListing>(`/api/v1/agent-listings/${id}`, input);
  },

  async withdraw(id: string): Promise<void> {
    await api.delete(`/api/v1/agent-listings/${id}`);
  },

  async install(id: string): Promise<InstallResult> {
    return api.post<InstallResult>(`/api/v1/agent-listings/${id}/install`);
  },

  // Admin moderation -- the queue (GET) plus POST
  // /admin/agent-listings/:id/{approve,reject,suspend}, all requiring a
  // `reason` (mirrors the existing Skill block/unblock/verify
  // convention). A non-admin wallet gets a real 403 from the server;
  // this client makes no attempt to pre-check admin status.
  async adminQueue(status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' = 'PENDING'): Promise<{ listings: AgentListing[]; count: number }> {
    return api.get('/api/v1/admin/agent-listings', { params: { status } });
  },

  async approve(id: string, reason: string): Promise<{ listing: AgentListing }> {
    return api.post(`/api/v1/admin/agent-listings/${id}/approve`, { reason });
  },

  async reject(id: string, reason: string): Promise<{ listing: AgentListing }> {
    return api.post(`/api/v1/admin/agent-listings/${id}/reject`, { reason });
  },

  async suspend(id: string, reason: string): Promise<{ listing: AgentListing }> {
    return api.post(`/api/v1/admin/agent-listings/${id}/suspend`, { reason });
  },
};

export default agentMarketplaceApi;
