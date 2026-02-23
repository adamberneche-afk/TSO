// Skills Registry Documentation

import React from 'react';
import { ArrowLeft, CheckCircle2, Shield, Star, Users, Award, Search, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

interface DocPageProps {
  onBack: () => void;
}

export function SkillsRegistryDoc({ onBack }: DocPageProps) {
  const features = [
    {
      icon: Shield,
      title: 'Verified Publishers',
      description: 'Skills are signed by known publishers. You know who built what.',
      detail: 'Each skill includes publisher address and cryptographic signature.'
    },
    {
      icon: Star,
      title: 'Trust Scores',
      description: 'Community ratings and usage metrics help you assess quality.',
      detail: 'Scores based on ratings, usage volume, and audit status.'
    },
    {
      icon: Users,
      title: 'Community Audited',
      description: 'Verified users can audit skills for safety and accuracy.',
      detail: 'Audit results are published on-chain for transparency.'
    },
    {
      icon: Award,
      title: 'Staking Requirements',
      description: 'Publishers stake tokens to publish. Misbehavior gets penalized.',
      detail: 'Slashing mechanism ensures publishers maintain quality.'
    }
  ];

  const categories = [
    'Customer Support',
    'Sales & CRM',
    'Data Analysis',
    'Content Generation',
    'Code Assistance',
    'Legal & Compliance',
    'Finance & Accounting',
    'HR & Recruiting'
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
            <Award className="w-5 h-5 text-[#FFD700]" />
            <span className="font-bold">Skills Registry</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Verified Skills You Can Trust</h1>
          <p className="text-xl text-[#888888] max-w-2xl mx-auto">
            Browse a curated registry of agent capabilities. Every skill is verified, 
            rated, and backed by stake.
          </p>
        </section>

        {/* Why Verified? */}
        <section className="bg-[#141415] border border-[#262626] rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-6">Why Verified Skills?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="flex gap-4">
                <div className="p-3 bg-[#FFD700]/10 rounded-lg h-fit">
                  <feature.icon className="w-6 h-6 text-[#FFD700]" />
                </div>
                <div>
                  <h3 className="font-bold">{feature.title}</h3>
                  <p className="text-sm text-[#888888] mt-1">{feature.description}</p>
                  <p className="text-xs text-[#666666] mt-2 border-t border-[#262626] pt-2">
                    {feature.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map((cat, i) => (
              <div key={i} className="bg-[#141415] border border-[#262626] rounded-lg p-4 text-center hover:border-[#FFD700]/50 transition-colors cursor-pointer">
                <span className="text-sm">{cat}</span>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-[#141415] border border-[#262626] rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-6">For Users</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-[#FFD700] flex items-center justify-center font-bold text-black text-sm">1</div>
              <div>
                <h3 className="font-bold">Browse Skills</h3>
                <p className="text-sm text-[#888888]">Search by category, trust score, or publisher.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-[#FFD700] flex items-center justify-center font-bold text-black text-sm">2</div>
              <div>
                <h3 className="font-bold">Review Details</h3>
                <p className="text-sm text-[#888888]">Check ratings, audit status, and documentation.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-[#FFD700] flex items-center justify-center font-bold text-black text-sm">3</div>
              <div>
                <h3 className="font-bold">Add to Agent</h3>
                <p className="text-sm text-[#888888]">One-click integration into your configuration.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-[#FFD700] flex items-center justify-center font-bold text-black text-sm">4</div>
              <div>
                <h3 className="font-bold">Provide Feedback</h3>
                <p className="text-sm text-[#888888]">Rate your experience to help the community.</p>
              </div>
            </div>
          </div>
        </section>

        {/* For Publishers */}
        <section className="bg-[#141415] border border-[#262626] rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-6">For Publishers</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#4ADE80] mt-0.5" />
              <div>
                <h3 className="font-bold">Stake to Publish</h3>
                <p className="text-sm text-[#888888]">Lock tokens to publish skills. Slashed for violations.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#4ADE80] mt-0.5" />
              <div>
                <h3 className="font-bold">Version Control</h3>
                <p className="text-sm text-[#888888]">Update skills without breaking existing integrations.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#4ADE80] mt-0.5" />
              <div>
                <h3 className="font-bold">Earn Revenue</h3>
                <p className="text-sm text-[#888888]">Premium skills can charge for access (future).</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#4ADE80] mt-0.5" />
              <div>
                <h3 className="font-bold">Build Reputation</h3>
                <p className="text-sm text-[#888888]">High ratings attract more users to your skills.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Score Explanation */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Trust Score</h2>
          <div className="bg-[#141415] border border-[#262626] rounded-xl p-6">
            <p className="text-[#888888] mb-4">
              Each skill receives a trust score (0-100) based on:
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-[#0A0A0B] rounded-lg p-4">
                <h4 className="font-bold text-[#FFD700] mb-2">Ratings (40%)</h4>
                <p className="text-sm text-[#888888]">Average user rating (1-5 stars)</p>
              </div>
              <div className="bg-[#0A0A0B] rounded-lg p-4">
                <h4 className="font-bold text-[#FFD700] mb-2">Usage (30%)</h4>
                <p className="text-sm text-[#888888]">Number of active integrations</p>
              </div>
              <div className="bg-[#0A0A0B] rounded-lg p-4">
                <h4 className="font-bold text-[#FFD700] mb-2">Audits (30%)</h4>
                <p className="text-sm text-[#888888]">Number of successful audits</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <Button onClick={onBack} className="bg-white text-black hover:bg-white/90 px-8">
            Explore Skills
          </Button>
        </section>
      </div>
    </div>
  );
}
