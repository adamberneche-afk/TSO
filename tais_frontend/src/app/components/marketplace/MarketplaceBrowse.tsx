// Agent Marketplace: public browse (docs/AGENT_MARKETPLACE_DATA_MODEL.md).
// Only ever shows APPROVED listings (enforced server-side, not just
// hidden client-side) -- browsing itself needs no wallet; installing
// does, since installing creates a new AgentConfiguration, which
// requires THINK NFT ownership like any other configuration.

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Search, Download, Sparkles } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { agentMarketplaceApi } from '@/services/agentMarketplaceApi';
import type { AgentListing } from '@/types/agentMarketplace';
import { inputClass, Card } from './formPrimitives';

export function MarketplaceBrowse() {
  const { address, isConnected, isConnecting, connect } = useWallet();
  const [listings, setListings] = useState<AgentListing[] | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [installingId, setInstallingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await agentMarketplaceApi.browse({
        query: query || undefined,
        category: category || undefined,
      });
      setListings(result.listings);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load the marketplace');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category]);

  useEffect(() => {
    const timeout = setTimeout(load, 250); // debounce search/category changes
    return () => clearTimeout(timeout);
  }, [load]);

  const handleInstall = async (listing: AgentListing) => {
    if (!isConnected || !address) {
      await connect();
      return;
    }
    setInstallingId(listing.id);
    try {
      await agentMarketplaceApi.install(listing.id);
      toast.success(`${listing.name} installed`, { description: 'Find it in your saved agents on the dashboard.' });
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to install this agent');
    } finally {
      setInstallingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#717171] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agents..."
            className={`${inputClass()} pl-11`}
          />
        </div>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Filter by category (optional)"
          className={`${inputClass()} md:w-64`}
        />
      </div>

      {listings === null ? (
        <p className="text-[#717171] text-sm text-center py-12">Loading...</p>
      ) : listings.length === 0 ? (
        <div className="text-center py-16">
          <Sparkles className="w-8 h-8 text-[#717171] mx-auto mb-4" />
          <p className="text-[#A1A1A1] text-sm">No agents found. Be the first to publish one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <Card key={listing.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold tracking-tightest">{listing.name}</h3>
                {listing.category && (
                  <span className="text-[10px] uppercase tracking-widest text-[#717171] border border-[#262626] rounded px-2 py-1 shrink-0">
                    {listing.category}
                  </span>
                )}
              </div>
              <p className="text-[#A1A1A1] text-sm leading-relaxed flex-1 mb-4">{listing.description || 'No description provided.'}</p>
              <div className="flex items-center justify-between text-xs text-[#717171] mb-4">
                <span>{listing.installCount} install{listing.installCount === 1 ? '' : 's'}</span>
                <span className="font-mono truncate max-w-[8rem]" title={listing.walletAddress}>
                  {listing.walletAddress.slice(0, 6)}...{listing.walletAddress.slice(-4)}
                </span>
              </div>
              <button
                onClick={() => handleInstall(listing)}
                disabled={installingId === listing.id || isConnecting}
                className="flex items-center justify-center gap-2 bg-white text-black font-bold text-xs uppercase tracking-widest py-3 rounded-md hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {!isConnected ? 'Connect to Install' : installingId === listing.id ? 'Installing...' : 'Install'}
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default MarketplaceBrowse;
