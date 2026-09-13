// Enterprise RAG: invitation-accept landing page (docs/ENTERPRISE_RAG_IDENTITY.md).
// Reached at /orgs/invitations/:token -- the link an org admin's invite
// email points at. Previews the invite (org name, role) before asking
// for anything, then either sets a password (brand-new email) or just
// confirms (an email that already has an account, e.g. invited to a
// second org) -- matching routes/orgs.ts's preview/accept split.

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Building2, CheckCircle2 } from 'lucide-react';
import { orgsApi } from '@/services/orgsApi';
import type { InvitationPreview } from '@/types/enterprise';
import { Field, inputClass, PrimaryButton, Card } from './formPrimitives';

export function InvitationAccept({ token, onAccepted }: { token: string; onAccepted: (organizationId: string) => void }) {
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    orgsApi
      .previewInvitation(token)
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch(() => {
        if (!cancelled) setLoadError('This invitation link is invalid, expired, or has already been used.');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (preview?.requiresPassword) {
      if (password.length < 8) {
        setFormError('Password must be at least 8 characters');
        return;
      }
      if (password !== confirm) {
        setFormError('Passwords do not match');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const result = await orgsApi.acceptInvitation(token, preview?.requiresPassword ? password : undefined);
      setAccepted(true);
      toast.success(`Welcome to ${result.organizationName}`);
      onAccepted(result.organizationId);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to accept invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="max-w-md mx-auto my-20">
        <Card>
          <p className="text-[#EF4444] text-sm">{loadError}</p>
        </Card>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="max-w-md mx-auto my-20 text-center text-[#717171] text-sm">Loading invitation...</div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-20 animate-in fade-in slide-in-from-bottom-4">
      <Card>
        <div className="w-14 h-14 bg-[#0A0A0B] border border-[#262626] rounded-xl flex items-center justify-center mb-6">
          {accepted ? <CheckCircle2 className="w-7 h-7 text-[#10B981]" /> : <Building2 className="w-7 h-7 text-[#3B82F6]" />}
        </div>
        <h2 className="text-2xl font-bold tracking-tightest mb-2">
          {accepted ? 'You\'re in' : `Join ${preview.organizationName}`}
        </h2>
        <p className="text-[#A1A1A1] text-sm leading-relaxed mb-8">
          {accepted
            ? `Redirecting to ${preview.organizationName}...`
            : `You've been invited to join as ${preview.role.toLowerCase()}, using ${preview.email}.`}
        </p>

        {!accepted && (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {preview.requiresPassword ? (
              <>
                <Field label="Set a password" error={formError || undefined}>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className={inputClass(!!formError)}
                    required
                  />
                </Field>
                <Field label="Confirm password">
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={inputClass()}
                    required
                  />
                </Field>
              </>
            ) : (
              formError && <p className="text-[#EF4444] text-xs">{formError}</p>
            )}

            <div className="pt-2">
              <PrimaryButton disabled={isSubmitting}>
                {isSubmitting ? 'Joining...' : preview.requiresPassword ? 'Create Account & Join' : `Join ${preview.organizationName}`}
              </PrimaryButton>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

export default InvitationAccept;
