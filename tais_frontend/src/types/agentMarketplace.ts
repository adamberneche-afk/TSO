// Agent Marketplace (docs/DOCS_VS_CODEBASE.md row 22, see
// docs/AGENT_MARKETPLACE_DATA_MODEL.md). Mirrors
// packages/registry/src/routes/agentListings.ts's real response shape
// (toPublicListing).

export type AgentListingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface AgentListing {
  id: string;
  walletAddress: string;
  name: string;
  description: string | null;
  category: string | null;
  status: AgentListingStatus;
  installCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BrowseListingsResult {
  listings: AgentListing[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateListingInput {
  configurationId: string;
  name: string;
  description?: string;
  category?: string;
}

export interface UpdateListingInput {
  name?: string;
  description?: string;
  category?: string;
}

export interface InstallResult {
  configuration: {
    id: string;
    walletAddress: string;
    name: string;
    [key: string]: unknown;
  };
}
