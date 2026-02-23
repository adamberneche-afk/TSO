// NFT Integration Documentation

import React from 'react';
import { ArrowLeft, CheckCircle2, Shield, Key, Zap, Wallet, Crown, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

interface DocPageProps {
  onBack: () => void;
}

export function NFTIntegrationDoc({ onBack }: DocPageProps) {
  const tiers = [
    {
      name: 'Genesis Holder',
      icon: Crown,
      color: 'text-[#FFD700]',
      bg: 'bg-[#FFD700]/10',
      benefits: [
        'Unlimited agent configurations',
        'Premium skills access',
        'Version history (90 days, 100 versions)',
        'CTO Agent access',
        'SDK Assistant CLI access',
        'Governance voting rights'
      ]
    },
    {
      name: 'Public Access',
      icon: Wallet,
      color: 'text-[#3B82F6]',
      bg: 'bg-[#3B82F6]/10',
      benefits: [
        'Up to 3 agent configurations',
        'Basic skills access',
        'Version history (7 days, 10 versions)',
        'Community skills only'
      ]
    }
  ];

  const features = [
    {
      icon: Key,
      title: 'Ownership Verification',
      description: 'Your agent configurations are linked to your wallet. Only you can modify them.',
      technical: 'Uses ECDSA signatures to verify wallet ownership without exposing private keys.'
    },
    {
      icon: Shield,
      title: 'Transferable Assets',
      description: 'Sell, trade, or transfer your agents like any other NFT asset.',
      technical: 'Configurations are tied to NFT token ID, enabling true ownership and transferability.'
    },
    {
      icon: Zap,
      title: 'Tiered Access',
      description: 'More NFTs = more capabilities. Scale as you grow.',
      technical: 'Smart contract verification determines tier based on token count: Gold (3+), Silver (2), Bronze (1).'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#EDEDED]">
      {/* Header */}
      <header className="border-b border-[#262626] bg-[#0F0F10] p-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-[#888888] hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="h-4 w-[1px] bg-[#262626]" />
            <Shield className="w-5 h-5 text-[#FFD700]" />
            <span className="font-bold">NFT Integration</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Own Your Agent Infrastructure</h1>
          <p className="text-xl text-[#888888] max-w-2xl mx-auto">
            Your agents are NFT-backed assets. You own them, you control them, 
            and you can transfer them like any other digital property.
          </p>
        </section>

        {/* Why NFT? */}
        <section className="bg-[#141415] border border-[#262626] rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-6">Why NFT-Backed Agents?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="space-y-3">
                <div className="p-3 bg-[#3B82F6]/10 rounded-lg w-fit">
                  <feature.icon className="w-6 h-6 text-[#3B82F6]" />
                </div>
                <h3 className="font-bold">{feature.title}</h3>
                <p className="text-sm text-[#888888]">{feature.description}</p>
                <div className="pt-2 border-t border-[#262626]">
                  <p className="text-xs text-[#666666]">{feature.technical}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Access Tiers */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Access Tiers</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {tiers.map((tier, i) => (
              <Card key={i} className={`bg-[#141415] border-[#262626] ${i === 0 ? 'border-[#FFD700]/50' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${tier.bg}`}>
                      <tier.icon className={`w-6 h-6 ${tier.color}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{tier.name}</h3>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {tier.benefits.map((benefit, j) => (
                      <li key={j} className="text-sm text-[#888888] flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#4ADE80]" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-[#141415] border border-[#262626] rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-6">How It Works</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#3B82F6] flex items-center justify-center font-bold text-sm">1</div>
              <div>
                <h3 className="font-bold">Connect Wallet</h3>
                <p className="text-sm text-[#888888]">Sign a message to verify wallet ownership. We never see your private keys.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#3B82F6] flex items-center justify-center font-bold text-sm">2</div>
              <div>
                <h3 className="font-bold">Verify NFT Ownership</h3>
                <p className="text-sm text-[#888888]">We check on-chain to count your tokens and determine your tier.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#3B82F6] flex items-center justify-center font-bold text-sm">3</div>
              <div>
                <h3 className="font-bold">Access Features</h3>
                <p className="text-sm text-[#888888]">Your tier unlocks corresponding features automatically. No manual approval needed.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#3B82F6] flex items-center justify-center font-bold text-sm">4</div>
              <div>
                <h3 className="font-bold">Transfer Ownership</h3>
                <p className="text-sm text-[#888888]">Transfer your NFT to another wallet. They inherit all your agent configurations.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Technical */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Technical Details</h2>
          <div className="bg-[#141415] border border-[#262626] rounded-xl p-6 space-y-4">
            <div>
              <h4 className="font-semibold text-[#3B82F6] mb-2">Contract Address</h4>
              <code className="text-sm text-[#888888] bg-[#0A0A0B] px-3 py-1 rounded">
                0x11B3EfbF04F0bA505F380aC20444B6952970AdA6
              </code>
            </div>
            <div>
              <h4 className="font-semibold text-[#3B82F6] mb-2">Blockchain</h4>
              <p className="text-sm text-[#888888]">Ethereum Mainnet</p>
            </div>
            <div>
              <h4 className="font-semibold text-[#3B82F6] mb-2">Standard</h4>
              <p className="text-sm text-[#888888]">ERC-721 (NFT)</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <Button onClick={onBack} className="bg-white text-black hover:bg-white/90 px-8">
            View on OpenSea
          </Button>
        </section>
      </div>
    </div>
  );
}
