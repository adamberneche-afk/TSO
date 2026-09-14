// Agent Marketplace: admin moderation queue (docs/AGENT_MARKETPLACE_DATA_MODEL.md).
// Like CreateOrganizationForm.tsx and PublishSkillForm.tsx before it,
// this doesn't pre-check admin status client-side -- it lets the real
// server 403 surface for a connected-but-non-admin wallet.

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, Check, X, PauseCircle } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { agentMarketplaceApi } from '@/services/agentMarketplaceApi';
import type { AgentListing, AgentListingStatus } from '@/types/agentMarketplace';
import { Field, inputClass, PrimaryButton, Card, StatusBadge } from './formPrimitives';

const TABS: AgentListingStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];

export function ListingModerationPanel() {
  const { address, isConnected, isConnecting, connect } = useWallet();
  const [tab, setTab] = useState<AgentListingStatus>('PENDING');
  const [listings, setListings] = useState<AgentListing[] | null>(null);
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await agentMarketplaceApi.adminQueue(tab);
      setListings(result.listings);
    } catch (err: any) {
      // A non-admin wallet gets a real 403 here -- shown as an empty,
      // explained state rather than a raw error toast on every load.
      setListings([]);
      if (err?.message && !/forbidden|admin/i.test(err.message)) {
        toast.error(err.message);
      }
    }
  }, [tab]);

  useEffect(() => {
    if (isConnected) load();
  }, [isConnected, load]);

  const act = async (id: string, action: 'approve' | 'reject' | 'suspend') => {
    const reason = reasonById[id]?.trim();
    if (!reason) {
      toast.error('A reason is required');
      return;
    }
    setBusyId(id);
    try {
      await agentMarketplaceApi[action](id, reason);
      toast.success(`Listing ${action}d`);
      load();
    } catch (err: any) {
      toast.error(err?.message || `Failed to ${action} listing`);
    } finally {
      setBusyId(null);
    }
  };

  if (!isConnected || !address) {
    return (
      <Card className="text-center max-w-md mx-auto">
        <div className="w-14 h-14 bg-[#0A0A0B] border border-[#262626] rounded-xl flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-7 h-7 text-[#3B82F6]" />
        </div>
        <p className="text-[#A1A1A1] text-sm mb-6">Moderation requires a connected admin wallet.</p>
        <PrimaryButton onClick={() => connect()} type="button" disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Connect Admin Wallet'}
        </PrimaryButton>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-[10px] uppercase tracking-widest font-bold px-3 py-2 rounded-md border transition-colors ${
              tab === t ? 'bg-white text-black border-white' : 'border-[#262626] text-[#717171] hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {listings === null ? (
        <p className="text-[#717171] text-sm">Loading...</p>
      ) : listings.length === 0 ? (
        <p className="text-[#717171] text-sm">
          Nothing here. If you're not seeing anything you expect, your wallet may not be an admin.
        </p>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => (
            <Card key={listing.id}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold">{listing.name}</p>
                    <StatusBadge status={listing.status} />
                  </div>
                  <p className="text-xs text-[#A1A1A1] mb-1">{listing.description || 'No description'}</p>
                  <p className="text-[10px] font-mono text-[#717171]">{listing.walletAddress}</p>
                </div>
              </div>

              <Field label="Reason (required for any action)">
                <input
                  type="text"
                  value={reasonById[listing.id] ?? ''}
                  onChange={(e) => setReasonById((prev) => ({ ...prev, [listing.id]: e.target.value }))}
                  placeholder="Why?"
                  className={inputClass()}
                />
              </Field>

              <div className="flex gap-2 mt-3">
                {listing.status !== 'APPROVED' && (
                  <button
                    onClick={() => act(listing.id, 'approve')}
                    disabled={busyId === listing.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#10B981] text-black font-bold text-xs uppercase tracking-widest py-2.5 rounded-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve
                  </button>
                )}
                {listing.status !== 'REJECTED' && (
                  <button
                    onClick={() => act(listing.id, 'reject')}
                    disabled={busyId === listing.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#EF4444] text-black font-bold text-xs uppercase tracking-widest py-2.5 rounded-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>
                )}
                {listing.status === 'APPROVED' && (
                  <button
                    onClick={() => act(listing.id, 'suspend')}
                    disabled={busyId === listing.id}
                    className="flex-1 flex items-center justify-center gap-2 border border-[#262626] text-[#A1A1A1] font-bold text-xs uppercase tracking-widest py-2.5 rounded-md hover:text-white transition-all active:scale-95 disabled:opacity-50"
                  >
                    <PauseCircle className="w-3.5 h-3.5" />
                    Suspend
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default ListingModerationPanel;
