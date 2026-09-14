// Enterprise RAG organization client (docs/ENTERPRISE_RAG_IDENTITY.md,
// docs/ENTERPRISE_RAG_DATA_MODEL.md). Mirrors the real routes/orgs.ts and
// routes/rag.ts endpoints -- every call here passes its body straight to
// `api.post`/`api.patch` (whose second argument *is* the request body),
// not wrapped in `{ data: ... }` (see enterpriseAuthApi.ts's note on why
// that matters).
//
// Document upload/view deliberately does NOT go through
// services/rag/publicRAGClient.ts: that client requires a connected
// wallet just to initialize (it derives its encryption key and API key
// from a wallet signature), which an email/password org member never
// has. Org documents were designed to use the server-held community key
// instead (docs/ENTERPRISE_RAG_DATA_MODEL.md's resolved option (a)), so
// this calls the existing POST /rag/community/encrypt|decrypt endpoints
// directly -- no wallet, no client-side key derivation, needed.

import { api } from '@/api/client';
import type {
  MyOrganization,
  OrganizationDetail,
  OrganizationMember,
  OrganizationRole,
  InvitationPreview,
  AcceptInvitationResult,
  OrgDocument,
} from '@/types/enterprise';

interface CommunityEncryptResult {
  encrypted: string;
  iv: string;
  salt: string;
}

export const orgsApi = {
  async listMyOrganizations(): Promise<MyOrganization[]> {
    return api.get<MyOrganization[]>('/api/v1/orgs');
  },

  /** Admin-only (requires an admin wallet's own JWT, not an email session). */
  async createOrganization(input: { name: string; slug: string; description?: string; ownerEmail: string }): Promise<
    OrganizationDetail & { inviteToken?: string }
  > {
    return api.post('/api/v1/orgs', input);
  },

  async getOrganization(orgId: string): Promise<OrganizationDetail> {
    return api.get<OrganizationDetail>(`/api/v1/orgs/${orgId}`);
  },

  async deleteOrganization(orgId: string): Promise<void> {
    await api.delete(`/api/v1/orgs/${orgId}`);
  },

  async listMembers(orgId: string): Promise<OrganizationMember[]> {
    return api.get<OrganizationMember[]>(`/api/v1/orgs/${orgId}/members`);
  },

  async changeMemberRole(orgId: string, memberId: string, role: OrganizationRole): Promise<OrganizationMember> {
    return api.patch<OrganizationMember>(`/api/v1/orgs/${orgId}/members/${memberId}`, { role });
  },

  async removeMember(orgId: string, memberId: string): Promise<void> {
    await api.delete(`/api/v1/orgs/${orgId}/members/${memberId}`);
  },

  async createInvitation(
    orgId: string,
    email: string,
    role: OrganizationRole
  ): Promise<{ email: string; role: OrganizationRole; expiresAt: string; emailSent: boolean; inviteToken?: string }> {
    return api.post(`/api/v1/orgs/${orgId}/invitations`, { email, role });
  },

  async previewInvitation(token: string): Promise<InvitationPreview> {
    return api.get<InvitationPreview>(`/api/v1/orgs/invitations/${token}`, { useAuth: false });
  },

  async acceptInvitation(token: string, password?: string): Promise<AcceptInvitationResult> {
    const result = await api.post<AcceptInvitationResult>(
      `/api/v1/orgs/invitations/${token}/accept`,
      password ? { password } : {},
      { useAuth: false }
    );
    // Log the accepting member straight in, same session shape a plain
    // email login produces.
    localStorage.setItem('auth_token', result.token);
    localStorage.setItem('wallet_address', decodeWalletAddress(result.token) || '');
    localStorage.setItem('auth_identity_kind', 'email');
    return result;
  },

  async listOrgDocuments(orgId: string): Promise<OrgDocument[]> {
    return api.get<OrgDocument[]>(`/api/v1/orgs/${orgId}/rag/documents`);
  },

  /** Encrypts `{title, tags, content}` as a single community-key ciphertext and uploads it, shared with `orgId`. */
  async uploadOrgDocument(orgId: string, input: { title: string; content: string; tags: string[]; isPublic?: boolean }): Promise<OrgDocument> {
    const plaintext = JSON.stringify({ title: input.title, content: input.content });
    // One single encryption call -> one genuinely fresh iv/salt pair.
    // RAGDocument has only one iv/salt column shared by encryptedData and
    // encryptedMetadata, so encryptedMetadata is set to the identical
    // ciphertext here rather than a second, independently-encrypted value
    // under the same iv (AES-GCM nonce reuse across two different
    // plaintexts, which is what packages/registry's data model would
    // otherwise silently invite here).
    const encrypted = await api.post<CommunityEncryptResult>('/api/v1/rag/community/encrypt', { data: plaintext });

    return api.post<OrgDocument>('/api/v1/rag/documents', {
      encryptedData: encrypted.encrypted,
      encryptedMetadata: encrypted.encrypted,
      iv: encrypted.iv,
      salt: encrypted.salt,
      ownerPublicKey: 'community', // unused for community-key documents; the column is non-nullable
      tags: input.tags,
      isPublic: input.isPublic ?? false,
      organizationId: orgId,
    });
  },

  async deleteDocument(documentId: string): Promise<void> {
    await api.delete(`/api/v1/rag/documents/${documentId}`);
  },

  /** Decrypts an org document listed by listOrgDocuments back to `{title, content}`. */
  async decryptOrgDocument(doc: Pick<OrgDocument, 'encryptedData' | 'iv' | 'salt'>): Promise<{ title: string; content: string }> {
    const result = await api.post<{ data: string }>('/api/v1/rag/community/decrypt', {
      encrypted: doc.encryptedData,
      iv: doc.iv,
      salt: doc.salt,
    });
    return JSON.parse(result.data);
  },
};

function decodeWalletAddress(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.walletAddress || null;
  } catch {
    return null;
  }
}

export default orgsApi;
