// Enterprise RAG: org dashboard (docs/ENTERPRISE_RAG_IDENTITY.md,
// docs/ENTERPRISE_RAG_DATA_MODEL.md). Works for whatever identity is
// currently authenticated (email or, in principle, a wallet) -- it only
// ever asks the real routes/orgs.ts endpoints what the caller is allowed
// to do, rather than assuming an identity type.

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Building2, UserPlus, Trash2, FileText, Upload, Eye, EyeOff, LogOut } from 'lucide-react';
import { orgsApi } from '@/services/orgsApi';
import { useEnterpriseAuth } from '@/hooks/useEnterpriseAuth';
import type { MyOrganization, OrganizationMember, OrganizationRole, OrgDocument } from '@/types/enterprise';
import { Field, inputClass, PrimaryButton, Card, RoleBadge } from './formPrimitives';

function canManage(role: OrganizationRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

export function OrgDashboard({ initialOrgId }: { initialOrgId?: string }) {
  const { logout, walletAddress } = useEnterpriseAuth();
  const [orgs, setOrgs] = useState<MyOrganization[] | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(initialOrgId ?? null);
  const [members, setMembers] = useState<OrganizationMember[] | null>(null);
  const [documents, setDocuments] = useState<OrgDocument[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadOrgs = useCallback(async () => {
    try {
      const list = await orgsApi.listMyOrganizations();
      setOrgs(list);
      if (!selectedOrgId && list.length > 0) {
        setSelectedOrgId(list[0].id);
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load your organizations');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadOrgs();
  }, [loadOrgs]);

  const loadOrgDetail = useCallback(async (orgId: string) => {
    try {
      const [memberList, docList] = await Promise.all([orgsApi.listMembers(orgId), orgsApi.listOrgDocuments(orgId)]);
      setMembers(memberList);
      setDocuments(docList);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load organization details');
    }
  }, []);

  useEffect(() => {
    if (selectedOrgId) {
      setMembers(null);
      setDocuments(null);
      loadOrgDetail(selectedOrgId);
    }
  }, [selectedOrgId, loadOrgDetail]);

  const selectedOrg = orgs?.find((o) => o.id === selectedOrgId) || null;

  if (loadError) {
    return (
      <div className="max-w-md mx-auto my-20">
        <Card>
          <p className="text-[#EF4444] text-sm">{loadError}</p>
        </Card>
      </div>
    );
  }

  if (orgs === null) {
    return <div className="max-w-md mx-auto my-20 text-center text-[#717171] text-sm">Loading...</div>;
  }

  if (orgs.length === 0) {
    return (
      <div className="max-w-md mx-auto my-20">
        <Card className="text-center">
          <div className="w-14 h-14 bg-[#0A0A0B] border border-[#262626] rounded-xl flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-7 h-7 text-[#717171]" />
          </div>
          <h2 className="text-xl font-bold tracking-tightest mb-2">No organizations yet</h2>
          <p className="text-[#A1A1A1] text-sm leading-relaxed mb-6">
            You're signed in, but not a member of any organization. Ask your organization's admin to send you an
            invitation.
          </p>
          <button onClick={logout} className="text-xs text-[#717171] hover:text-white transition-colors">
            Sign out
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {orgs.length > 1 ? (
            <select
              value={selectedOrgId ?? ''}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="bg-[#0A0A0B] border border-[#262626] rounded-md px-4 py-2 text-lg font-bold tracking-tightest outline-none focus:border-[#3B82F6]"
            >
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          ) : (
            <h1 className="text-2xl font-bold tracking-tightest">{selectedOrg?.name}</h1>
          )}
          {selectedOrg && <RoleBadge role={selectedOrg.yourRole} />}
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs text-[#717171] hover:text-white transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>

      {selectedOrg && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MembersPanel
            orgId={selectedOrg.id}
            yourRole={selectedOrg.yourRole}
            yourWallet={walletAddress}
            members={members}
            onChanged={() => loadOrgDetail(selectedOrg.id)}
          />
          <DocumentsPanel orgId={selectedOrg.id} yourRole={selectedOrg.yourRole} documents={documents} onChanged={() => loadOrgDetail(selectedOrg.id)} />
        </div>
      )}
    </div>
  );
}

function MembersPanel({
  orgId,
  yourRole,
  yourWallet,
  members,
  onChanged,
}: {
  orgId: string;
  yourRole: OrganizationRole;
  yourWallet: string | null;
  members: OrganizationMember[] | null;
  onChanged: () => void;
}) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('MEMBER');
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    try {
      const result = await orgsApi.createInvitation(orgId, inviteEmail, inviteRole);
      toast.success(`Invitation sent to ${inviteEmail}`, {
        description: result.emailSent ? undefined : 'Email delivery is not configured -- share the invite link manually.',
      });
      setInviteEmail('');
      setInviteRole('MEMBER');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: OrganizationRole) => {
    try {
      await orgsApi.changeMemberRole(orgId, memberId, role);
      toast.success('Role updated');
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to change role');
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await orgsApi.removeMember(orgId, memberId);
      toast.success('Member removed');
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove member');
    }
  };

  const manage = canManage(yourRole);

  return (
    <Card>
      <h3 className="text-sm font-bold uppercase tracking-widest text-[#A1A1A1] mb-4">Members</h3>

      {members === null ? (
        <p className="text-[#717171] text-sm">Loading...</p>
      ) : (
        <div className="space-y-2 mb-6">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between gap-3 bg-[#0A0A0B] border border-[#262626] rounded-md px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-mono truncate">{member.walletAddress}</p>
                {member.walletAddress.toLowerCase() === yourWallet?.toLowerCase() && (
                  <p className="text-[10px] text-[#3B82F6]">You</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {manage ? (
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value as OrganizationRole)}
                    className="bg-[#141415] border border-[#262626] rounded text-[10px] uppercase tracking-widest font-bold px-2 py-1 outline-none"
                  >
                    <option value="OWNER">Owner</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MEMBER">Member</option>
                  </select>
                ) : (
                  <RoleBadge role={member.role} />
                )}
                {manage && (
                  <button
                    onClick={() => handleRemove(member.id)}
                    className="text-[#717171] hover:text-[#EF4444] transition-colors"
                    title="Remove member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {manage && (
        <form onSubmit={handleInvite} className="space-y-3 border-t border-[#262626] pt-4">
          <Field label="Invite by email">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@company.com"
              className={inputClass()}
              required
            />
          </Field>
          <div className="flex gap-3">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as OrganizationRole)}
              className="flex-1 bg-[#0A0A0B] border border-[#262626] rounded-md px-4 py-3 text-sm outline-none focus:border-[#3B82F6]"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
              {yourRole === 'OWNER' && <option value="OWNER">Owner</option>}
            </select>
            <button
              type="submit"
              disabled={isInviting}
              className="flex items-center gap-2 bg-white text-black font-bold text-xs uppercase tracking-widest px-4 rounded-md hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {isInviting ? 'Sending...' : 'Invite'}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

function DocumentsPanel({
  orgId,
  yourRole,
  documents,
  onChanged,
}: {
  orgId: string;
  yourRole: OrganizationRole;
  documents: OrgDocument[] | null;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [decrypted, setDecrypted] = useState<Record<string, { title: string; content: string }>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      await orgsApi.uploadOrgDocument(orgId, {
        title,
        content,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      toast.success('Document shared with the organization');
      setTitle('');
      setContent('');
      setTags('');
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleView = async (doc: OrgDocument) => {
    if (expanded[doc.id]) {
      setExpanded((prev) => ({ ...prev, [doc.id]: false }));
      return;
    }
    if (!decrypted[doc.id]) {
      try {
        const result = await orgsApi.decryptOrgDocument(doc);
        setDecrypted((prev) => ({ ...prev, [doc.id]: result }));
      } catch (err: any) {
        toast.error(err?.message || 'Failed to decrypt document');
        return;
      }
    }
    setExpanded((prev) => ({ ...prev, [doc.id]: true }));
  };

  const handleDelete = async (documentId: string) => {
    try {
      await orgsApi.deleteDocument(documentId);
      toast.success('Document deleted');
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete document');
    }
  };

  return (
    <Card>
      <h3 className="text-sm font-bold uppercase tracking-widest text-[#A1A1A1] mb-4">Shared Documents</h3>

      {documents === null ? (
        <p className="text-[#717171] text-sm">Loading...</p>
      ) : documents.length === 0 ? (
        <p className="text-[#717171] text-sm mb-6">No documents shared with this organization yet.</p>
      ) : (
        <div className="space-y-2 mb-6">
          {documents.map((doc) => {
            const isOpen = !!expanded[doc.id];
            const canDelete = canManage(yourRole);
            return (
              <div key={doc.id} className="bg-[#0A0A0B] border border-[#262626] rounded-md p-3">
                <div className="flex items-center justify-between gap-3">
                  <button onClick={() => toggleView(doc)} className="flex items-center gap-2 min-w-0 text-left flex-1">
                    <FileText className="w-4 h-4 text-[#3B82F6] shrink-0" />
                    <span className="text-sm truncate">{decrypted[doc.id]?.title || `Document (${doc.size} bytes)`}</span>
                    {isOpen ? <EyeOff className="w-3.5 h-3.5 text-[#717171] shrink-0" /> : <Eye className="w-3.5 h-3.5 text-[#717171] shrink-0" />}
                  </button>
                  {canDelete && (
                    <button onClick={() => handleDelete(doc.id)} className="text-[#717171] hover:text-[#EF4444] transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {doc.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {doc.tags.map((tag) => (
                      <span key={tag} className="text-[10px] bg-[#141415] border border-[#262626] rounded px-1.5 py-0.5 text-[#717171]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {isOpen && decrypted[doc.id] && (
                  <p className="text-xs text-[#A1A1A1] mt-3 whitespace-pre-wrap border-t border-[#262626] pt-3">
                    {decrypted[doc.id].content}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleUpload} className="space-y-3 border-t border-[#262626] pt-4">
        <Field label="Title">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Onboarding guide" className={inputClass()} required />
        </Field>
        <Field label="Content">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste or write the document content..."
            rows={4}
            className={inputClass()}
            required
          />
        </Field>
        <Field label="Tags (comma-separated, optional)">
          <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="onboarding, hr" className={inputClass()} />
        </Field>
        <button
          type="submit"
          disabled={isUploading}
          className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold text-xs uppercase tracking-widest py-3 rounded-md hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" />
          {isUploading ? 'Sharing...' : 'Share with Organization'}
        </button>
      </form>
    </Card>
  );
}

export default OrgDashboard;
