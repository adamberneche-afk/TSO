// Agent Marketplace: a wallet's own listings (docs/AGENT_MARKETPLACE_DATA_MODEL.md).
// Publishing requires picking one of the wallet's own AgentConfigurations
// (reusing configApi.getConfigurations, the same source Dashboard.tsx
// already lists a wallet's saved agents from) -- a listing is a curated
// public summary of a configuration the wallet already owns, never a new
// concept of its own.

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Rocket, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { configApi } from '@/services/configApi';
import { agentMarketplaceApi } from '@/services/agentMarketplaceApi';
import type { AgentListing } from '@/types/agentMarketplace';
import { Field, inputClass, PrimaryButton, Card, StatusBadge } from './formPrimitives';

interface ConfigOption {
  id: string;
  name: string;
}

export function MyListingsPanel() {
  const { address, isConnected, isConnecting, connect } = useWallet();
  const [listings, setListings] = useState<AgentListing[] | null>(null);
  const [configs, setConfigs] = useState<ConfigOption[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [mine, configResponse] = await Promise.all([agentMarketplaceApi.getMine(), configApi.getConfigurations()]);
      setListings(mine);
      setConfigs(configResponse.configurations.map((c) => ({ id: c.id, name: c.name })));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load your listings');
    }
  }, []);

  useEffect(() => {
    if (isConnected) load();
  }, [isConnected, load]);

  const handleWithdraw = async (id: string) => {
    try {
      await agentMarketplaceApi.withdraw(id);
      toast.success('Listing withdrawn');
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to withdraw listing');
    }
  };

  if (!isConnected || !address) {
    return (
      <Card className="text-center max-w-md mx-auto">
        <p className="text-[#A1A1A1] text-sm mb-6">Connect your wallet to publish or manage your agent listings.</p>
        <PrimaryButton onClick={() => connect()} type="button" disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </PrimaryButton>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PublishForm configs={configs} onPublished={load} />

      <div>
        <h3 className="text-sm font-bold uppercase tracking-widest text-[#A1A1A1] mb-3">Your Listings</h3>
        {listings === null ? (
          <p className="text-[#717171] text-sm">Loading...</p>
        ) : listings.length === 0 ? (
          <p className="text-[#717171] text-sm">You haven't listed any agents yet.</p>
        ) : (
          <div className="space-y-2">
            {listings.map((listing) =>
              editingId === listing.id ? (
                <EditForm
                  key={listing.id}
                  listing={listing}
                  onDone={() => {
                    setEditingId(null);
                    load();
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <Card key={listing.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold truncate">{listing.name}</p>
                        <StatusBadge status={listing.status} />
                      </div>
                      <p className="text-xs text-[#A1A1A1]">{listing.installCount} installs</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setEditingId(listing.id)} className="text-[#717171] hover:text-white transition-colors" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleWithdraw(listing.id)} className="text-[#717171] hover:text-[#EF4444] transition-colors" title="Withdraw">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PublishForm({ configs, onPublished }: { configs: ConfigOption[] | null; onPublished: () => void }) {
  const [configurationId, setConfigurationId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configurationId) return;
    setIsSubmitting(true);
    try {
      await agentMarketplaceApi.create({ configurationId, name, description: description || undefined, category: category || undefined });
      toast.success('Listing submitted for review');
      setConfigurationId('');
      setName('');
      setDescription('');
      setCategory('');
      onPublished();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to publish listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (configs !== null && configs.length === 0) {
    return (
      <Card className="text-center">
        <Rocket className="w-6 h-6 text-[#717171] mx-auto mb-3" />
        <p className="text-[#A1A1A1] text-sm">Save an agent configuration first, then come back to list it here.</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-sm font-bold uppercase tracking-widest text-[#A1A1A1] mb-4">Publish an Agent</h3>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Which of your agents?">
          <select value={configurationId} onChange={(e) => setConfigurationId(e.target.value)} className={inputClass()} required>
            <option value="" disabled>
              Select a configuration
            </option>
            {(configs ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Listing name">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Research Assistant" className={inputClass()} required />
        </Field>
        <Field label="Description (optional)">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass()} />
        </Field>
        <Field label="Category (optional)">
          <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="productivity" className={inputClass()} />
        </Field>
        <p className="text-[10px] text-[#717171]">
          Your listing is a public summary only -- your configuration's full settings stay private. New listings start
          pending review.
        </p>
        <button
          type="submit"
          disabled={isSubmitting || !configurationId}
          className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold text-xs uppercase tracking-widest py-3 rounded-md hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          {isSubmitting ? 'Submitting...' : 'Submit for Review'}
        </button>
      </form>
    </Card>
  );
}

function EditForm({ listing, onDone, onCancel }: { listing: AgentListing; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState(listing.name);
  const [description, setDescription] = useState(listing.description ?? '');
  const [category, setCategory] = useState(listing.category ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await agentMarketplaceApi.update(listing.id, { name, description: description || undefined, category: category || undefined });
      toast.success('Listing updated -- back to pending review');
      onDone();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Listing name">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass()} required />
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass()} />
        </Field>
        <Field label="Category">
          <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass()} />
        </Field>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-white text-black font-bold text-xs uppercase tracking-widest py-2.5 rounded-md hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50"
          >
            Save
          </button>
          <button type="button" onClick={onCancel} className="px-4 text-xs text-[#717171] hover:text-white transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

export default MyListingsPanel;
