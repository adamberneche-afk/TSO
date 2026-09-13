// Enterprise RAG: admin-only org provisioning (docs/ENTERPRISE_RAG_IDENTITY.md).
// Org creation is a platform-admin action (POST /api/v1/orgs requires an
// ADMIN_WALLET_ADDRESSES wallet), not something an org's own members do
// -- so this is the one screen in the Enterprise RAG UI that genuinely
// uses the existing wallet-connect flow, same as PublishSkillForm.tsx
// does for NFT-gated actions. It doesn't try to check admin status up
// front; like PublishSkillForm, it lets the real server error (403 for a
// connected-but-non-admin wallet) surface instead.

import React, { useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { orgsApi } from '@/services/orgsApi';
import { Field, inputClass, PrimaryButton, Card } from './formPrimitives';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function CreateOrganizationForm() {
  const { address, isConnected, isConnecting, connect } = useWallet();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState<{ name: string; inviteToken?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const org = await orgsApi.createOrganization({
        name,
        slug: slug || slugify(name),
        description: description || undefined,
        ownerEmail,
      });
      setCreated({ name: org.name, inviteToken: (org as any).inviteToken });
      toast.success(`${org.name} created`, { description: `Invitation sent to ${ownerEmail}` });
      setName('');
      setSlug('');
      setDescription('');
      setOwnerEmail('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !address) {
    return (
      <Card className="text-center">
        <div className="w-14 h-14 bg-[#0A0A0B] border border-[#262626] rounded-xl flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-7 h-7 text-[#3B82F6]" />
        </div>
        <h3 className="text-lg font-bold tracking-tightest mb-2">Platform Admin</h3>
        <p className="text-[#A1A1A1] text-sm leading-relaxed mb-6">
          Provisioning a new organization requires a connected admin wallet.
        </p>
        <button
          onClick={() => connect()}
          disabled={isConnecting}
          className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-3 rounded-md hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50"
        >
          {isConnecting ? 'Connecting...' : 'Connect Admin Wallet'}
        </button>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-sm font-bold uppercase tracking-widest text-[#A1A1A1] mb-4">Provision New Organization</h3>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Organization name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Corp"
            className={inputClass()}
            required
          />
        </Field>
        <Field label="Slug (optional -- derived from name if left blank)">
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={name ? slugify(name) : 'acme-corp'}
            className={`${inputClass()} font-mono`}
          />
        </Field>
        <Field label="Description (optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={inputClass()}
          />
        </Field>
        <Field label="Owner's email">
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="owner@company.com"
            className={inputClass()}
            required
          />
        </Field>
        <p className="text-[10px] text-[#717171]">
          The owner's email is sent an invitation immediately. They don't need a wallet -- they'll set a password
          when they accept.
        </p>
        <PrimaryButton disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Organization'}</PrimaryButton>
      </form>

      {created && (
        <div className="flex items-start gap-3 mt-6 pt-6 border-t border-[#262626]">
          <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold">{created.name} created</p>
            <p className="text-xs text-[#A1A1A1] mt-1">
              {created.inviteToken
                ? 'Development mode: no email provider configured, so here is the invite link to share manually.'
                : 'An invitation email was sent to the owner.'}
            </p>
            {created.inviteToken && (
              <code className="text-[10px] bg-[#0A0A0B] p-1.5 rounded border border-[#262626] mt-2 inline-block break-all text-[#3B82F6]">
                {window.location.origin}/orgs/invitations/{created.inviteToken}
              </code>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default CreateOrganizationForm;
