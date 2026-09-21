// TAIS Platform - Skill Publishing (docs/DOCS_VS_CODEBASE.md row 22)
//
// Real form wired to the real, already-scanning `POST /api/v1/skills`
// route (row 5). Before this component existed, "publish a skill" was a
// toast telling the user to connect their wallet -- with no form behind
// it anywhere, and the one API-client method that *did* call the real
// endpoint (`registryClient.publishSkill`) was never imported by anything
// and had never actually been exercised end-to-end: it sent a
// double-wrapped request body and a DTO missing two fields the server's
// Zod schema requires (`author`, `manifestCid`), so every real call would
// have failed validation regardless of a UI existing. Both are fixed
// alongside this component (see registry-client.ts, types/registry.ts).

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Upload, CheckCircle2 } from 'lucide-react';
import { useWallet } from '../../../hooks/useWallet';
import { registryClient } from '../../../lib/registry-client';
import type { CreateSkillDTO, Skill } from '../../../types/registry';

const NAME_RE = /^[a-zA-Z0-9-_]+$/;
const VERSION_RE = /^\d+\.\d+\.\d+$/;
// CIDv0 -- matches the server's skillSchema exactly (packages/registry/src/validation).
const CID_RE = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;

interface FormState {
  name: string;
  version: string;
  description: string;
  skillHash: string;
  manifestCid: string;
  packageCid: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  version: '1.0.0',
  description: '',
  skillHash: '',
  manifestCid: '',
  packageCid: '',
};

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.name) errors.name = 'Name is required';
  else if (!NAME_RE.test(form.name)) errors.name = 'Letters, numbers, hyphens and underscores only';

  if (!VERSION_RE.test(form.version)) errors.version = 'Must be a semantic version, e.g. 1.0.0';

  if (form.description.length > 1000) errors.description = 'Must be at most 1000 characters';

  if (!CID_RE.test(form.skillHash)) errors.skillHash = 'Must be a valid IPFS CIDv0 (starts with Qm)';
  if (!CID_RE.test(form.manifestCid)) errors.manifestCid = 'Must be a valid IPFS CIDv0 (starts with Qm)';
  if (form.packageCid && !CID_RE.test(form.packageCid)) {
    errors.packageCid = 'Must be a valid IPFS CIDv0 (starts with Qm)';
  }

  return errors;
}

function inputClass(hasError: boolean) {
  return `w-full bg-[#0A0A0B] border ${hasError ? 'border-[#EF4444]' : 'border-[#262626]'} rounded-md px-4 py-3 text-sm focus:border-[#3B82F6] outline-none transition-colors`;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-[#717171] font-bold mb-2">
        {label}
      </label>
      {children}
      {error && <p className="text-[#EF4444] text-xs mt-1">{error}</p>}
    </div>
  );
}

export const PublishSkillForm: React.FC = () => {
  const { address, isConnected, isConnecting, connect } = useWallet();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [published, setPublished] = useState<Skill | null>(null);

  const update = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const dto: CreateSkillDTO = {
        name: form.name,
        version: form.version,
        description: form.description || undefined,
        skillHash: form.skillHash,
        manifestCid: form.manifestCid,
        packageCid: form.packageCid || undefined,
        author: address,
      };
      const skill = await registryClient.publishSkill(dto);
      setPublished(skill);
      setForm(EMPTY_FORM);
      setErrors({});
      toast.success('Skill published', {
        description: `${skill.name}@${skill.version} is now in the registry, pending review.`,
      });
    } catch (error) {
      // The server's real error message (e.g. "Publishing skills requires
      // a THINK Genesis NFT or Publisher NFT", or a specific validation
      // failure) now reaches here instead of being swallowed into a
      // silent `null`.
      const message = error instanceof Error ? error.message : 'Failed to publish skill';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !address) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-[#141415] border border-[#262626] rounded-lg text-center animate-in fade-in slide-in-from-bottom-4">
        <div className="w-16 h-16 bg-[#0A0A0B] border border-[#262626] rounded-xl flex items-center justify-center mx-auto mb-6">
          <Upload className="w-8 h-8 text-[#3B82F6]" />
        </div>
        <h2 className="text-2xl font-bold tracking-tightest mb-3">Connect to Publish</h2>
        <p className="text-[#A1A1A1] text-sm leading-relaxed mb-8">
          Publishing a skill requires a connected wallet holding a Publisher or Genesis NFT.
        </p>
        <button
          onClick={() => connect()}
          disabled={isConnecting}
          className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-md hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50"
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      <div className="bg-[#141415] border border-[#262626] p-6 rounded-lg">
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tightest mb-1">Publish a Skill</h2>
          <p className="text-[#A1A1A1] text-sm leading-relaxed">
            Requires a Publisher or Genesis NFT. The manifest (and, optionally, a package) must
            already be pinned to IPFS -- paste their content identifiers below. Every submission
            is scanned for known-malicious patterns before it's accepted.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field label="Name" error={errors.name}>
            <input
              type="text"
              value={form.name}
              onChange={update('name')}
              placeholder="my-skill-name"
              className={inputClass(!!errors.name)}
            />
          </Field>

          <Field label="Version" error={errors.version}>
            <input
              type="text"
              value={form.version}
              onChange={update('version')}
              placeholder="1.0.0"
              className={`${inputClass(!!errors.version)} font-mono`}
            />
          </Field>

          <Field label="Description (optional)" error={errors.description}>
            <textarea
              value={form.description}
              onChange={update('description')}
              placeholder="What does this skill do?"
              rows={3}
              className={inputClass(!!errors.description)}
            />
          </Field>

          <Field label="Skill Hash (IPFS CIDv0)" error={errors.skillHash}>
            <input
              type="text"
              value={form.skillHash}
              onChange={update('skillHash')}
              placeholder="Qm..."
              className={`${inputClass(!!errors.skillHash)} font-mono`}
            />
          </Field>

          <Field label="Manifest CID (IPFS CIDv0)" error={errors.manifestCid}>
            <input
              type="text"
              value={form.manifestCid}
              onChange={update('manifestCid')}
              placeholder="Qm..."
              className={`${inputClass(!!errors.manifestCid)} font-mono`}
            />
          </Field>

          <Field label="Package CID (optional, IPFS CIDv0)" error={errors.packageCid}>
            <input
              type="text"
              value={form.packageCid}
              onChange={update('packageCid')}
              placeholder="Qm... (optional)"
              className={`${inputClass(!!errors.packageCid)} font-mono`}
            />
          </Field>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-md hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Publishing...' : 'Publish Skill'}
            </button>
          </div>
        </form>
      </div>

      {published && (
        <div className="bg-[#141415] border border-[#262626] p-6 rounded-lg flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-6 h-6 text-[#10B981] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">
              {published.name}@{published.version} published
            </p>
            <p className="text-[#A1A1A1] text-sm mt-1">
              Status: pending review. Its trust score builds from community audits from here.
            </p>
            <code className="text-[10px] bg-[#0A0A0B] p-1.5 rounded border border-[#262626] mt-2 inline-block text-[#3B82F6]">
              {published.skillHash}
            </code>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublishSkillForm;
