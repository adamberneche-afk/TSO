// Enterprise RAG types (docs/ENTERPRISE_RAG_IDENTITY.md,
// docs/ENTERPRISE_RAG_DATA_MODEL.md). Mirrors packages/registry/src/routes/orgs.ts
// and routes/emailAuth.ts's real response shapes.

export type OrganizationRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface MyOrganization extends Organization {
  yourRole: OrganizationRole;
}

export interface OrganizationDetail extends Organization {
  yourRole: OrganizationRole;
}

export interface OrganizationMember {
  id: string;
  walletAddress: string;
  role: OrganizationRole;
  joinedAt: string;
}

export interface InvitationPreview {
  organizationName: string;
  email: string;
  role: OrganizationRole;
  expiresAt: string;
  requiresPassword: boolean;
}

export interface AcceptInvitationResult {
  token: string;
  expiresIn: string;
  organizationId: string;
  organizationName: string;
  role: OrganizationRole;
}

export interface EmailLoginResult {
  token: string;
  expiresIn: string;
  email: string;
}

export interface OrgDocument {
  id: string;
  walletAddress: string;
  isPublic: boolean;
  tags: string[];
  size: number;
  chunkCount: number;
  createdAt: string;
  // Present on GET /orgs/:orgId/rag/documents (not on the generic
  // /rag/documents listing) so a member's client can decrypt-on-view via
  // the existing community/encrypt-derived community key -- see
  // routes/orgs.ts.
  encryptedData: string;
  iv: string;
  salt: string;
}
