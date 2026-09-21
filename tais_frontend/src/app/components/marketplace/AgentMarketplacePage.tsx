// Agent Marketplace (docs/DOCS_VS_CODEBASE.md row 22,
// docs/AGENT_MARKETPLACE_DATA_MODEL.md). Browse is public; My Listings
// and Moderation each individually wallet-gate themselves (the wallet
// that happens to be connected decides what those tabs can actually do
// once clicked -- this page doesn't try to guess in advance).

import React, { useState } from 'react';
import { MarketplaceBrowse } from './MarketplaceBrowse';
import { MyListingsPanel } from './MyListingsPanel';
import { ListingModerationPanel } from './ListingModerationPanel';

type Tab = 'browse' | 'mine' | 'moderation';

export function AgentMarketplacePage() {
  const [tab, setTab] = useState<Tab>('browse');

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="flex gap-6 border-b border-[#262626]">
          {(
            [
              ['browse', 'Browse'],
              ['mine', 'My Listings'],
              ['moderation', 'Moderation'],
            ] as [Tab, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`pb-3 text-sm font-bold tracking-tight transition-colors border-b-2 -mb-px ${
                tab === value ? 'border-white text-white' : 'border-transparent text-[#717171] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-6">
        {tab === 'browse' && <MarketplaceBrowse />}
        {tab === 'mine' && <MyListingsPanel />}
        {tab === 'moderation' && <ListingModerationPanel />}
      </div>
    </div>
  );
}

export default AgentMarketplacePage;
