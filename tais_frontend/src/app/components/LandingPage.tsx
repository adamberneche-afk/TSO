// TAIS Platform - Landing Page Component

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ArrowRight, Zap, Shield, Code, Users, CheckCircle, Upload, ClipboardCheck, ExternalLink, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface LandingPageProps {
  onStartInterview: () => void;
  onViewDashboard: () => void;
  onPublishSkill?: () => void;
  onAuditSkill?: () => void;
  onViewPublicRAG?: () => void;
  onViewPrivateRAG?: () => void;
  onViewConversation?: () => void;
  onViewLLMSettings?: () => void;
  onViewDoc?: (doc: string) => void;
}

export function LandingPage({ 
  onStartInterview, 
  onViewDashboard, 
  onPublishSkill, 
  onAuditSkill,
  onViewPublicRAG,
  onViewPrivateRAG,
  onViewConversation,
  onViewLLMSettings,
  onViewDoc
}: LandingPageProps) {
  const [nftStats, setNftStats] = useState({
    totalSupply: '2,022',
    floorPrice: 'Loading...',
    totalVolume: 'Loading...',
    uniqueOwners: 'Loading...'
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    async function fetchNFTStats() {
      try {
        const response = await fetch('https://api.opensea.io/api/v2/collections/think-agent-bundle/stats');
        if (response.ok) {
          const data = await response.json();
          setNftStats({
            totalSupply: data.total_supply?.toLocaleString() || '2,022',
            floorPrice: data.floor_price ? `${parseFloat(data.floor_price).toFixed(3)} ETH` : '0.01 ETH',
            totalVolume: data.total_volume ? `${parseFloat(data.total_volume).toFixed(0)} ETH` : '0 ETH',
            uniqueOwners: data.num_owners?.toLocaleString() || '0'
          });
        } else {
          // API error - use defaults
          setNftStats({
            totalSupply: '2,022',
            floorPrice: '0.01+ ETH',
            totalVolume: '200+ ETH',
            uniqueOwners: '750+'
          });
        }
      } catch (error) {
        console.log('Failed to fetch NFT stats:', error);
        setNftStats({
          totalSupply: '2,022',
          floorPrice: '0.01+ ETH',
          totalVolume: '200+ ETH',
          uniqueOwners: '750+'
        });
      } finally {
        setStatsLoading(false);
      }
    }
    fetchNFTStats();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#EDEDED] font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-[#262626] bg-[#0F0F10] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tightest">TAIS</h1>
          <nav className="flex items-center gap-8">
            <a href="#features" className="text-xs uppercase tracking-widest text-[#A1A1A1] hover:text-white transition-colors">
              Features
            </a>
            <a href="#rag" className="text-xs uppercase tracking-widest text-[#A1A1A1] hover:text-white transition-colors">
              RAG
            </a>
            <button
              onClick={onViewDashboard}
              className="text-xs uppercase tracking-widest text-[#A1A1A1] hover:text-white transition-colors"
            >
              My Agents
            </button>
            <button
              onClick={onStartInterview}
              className="bg-white text-black text-xs uppercase tracking-widest font-bold px-4 py-2 rounded-md hover:bg-white/90 transition-all active:scale-95"
            >
              Build Agent
            </button>
          </nav>
        </div>
      </header>

      <main className="animate-in fade-in slide-in-from-bottom-2 duration-700">
        {/* Hero Section */}
        <section className="py-24 px-6 border-b border-[#262626]">
          <div className="max-w-5xl mx-auto text-center space-y-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-6xl md:text-8xl font-bold leading-tight tracking-tightest mb-6">
                Build Your AI Agent
                <br />
                <span className="text-[#3B82F6]">In Minutes</span>
              </h1>
              <p className="text-xl text-[#A1A1A1] max-w-2xl mx-auto leading-relaxed">
                High-density, utility-first agent builder. Just answer questions and generate 
                executable AI configurations with zero friction.
              </p>
            </motion.div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={onStartInterview}
                className="w-full sm:w-auto bg-white text-black font-bold text-sm uppercase tracking-widest px-10 py-4 rounded-md hover:bg-white/90 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Start Building
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 text-[10px] uppercase tracking-widest text-[#717171] pt-8">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-[#3B82F6]" />
                No coding required
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-[#3B82F6]" />
                15-question discovery
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-[#3B82F6]" />
                Deploy anywhere
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 px-6 bg-[#0F0F10] border-b border-[#262626]">
          <div className="max-w-6xl mx-auto">
            <div className="mb-16">
              <label className="text-[10px] uppercase tracking-[0.3em] text-[#3B82F6] font-bold block mb-4">Why TAIS</label>
              <h2 className="text-4xl font-bold tracking-tightest">Build Agents That Actually Work</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FeatureCard
                icon={<Zap className="w-5 h-5 text-[#3B82F6]" />}
                title="Zero Friction"
                description="Answer simple questions. Get a production-ready agent in minutes. No code needed."
                onClick={() => onViewDoc?.('doc-guided-discovery')}
              />
              <FeatureCard
                icon={<Shield className="w-5 h-5 text-[#3B82F6]" />}
                title="Full Ownership"
                description="Your agents are NFTs. Trade, sell, or transfer them. You own your infrastructure."
                onClick={() => onViewDoc?.('doc-nft-integration')}
              />
              <FeatureCard
                icon={<Code className="w-5 h-5 text-[#3B82F6]" />}
                title="Portable Configs"
                description="JSON configs that run anywhere. OpenAI, Anthropic, local LLMs—your choice."
                onClick={() => onViewDoc?.('doc-configuration')}
              />
              <FeatureCard
                icon={<Users className="w-5 h-5 text-[#3B82F6]" />}
                title="Verified Skills"
                description="Access community-vetted skills with trust scores. Know what you're getting."
                onClick={() => onViewDoc?.('doc-skills-registry')}
              />
            </div>
          </div>
        </section>

        {/* RAG & AI Features Section */}
        <section id="rag" className="py-24 px-6 border-b border-[#262626]">
          <div className="max-w-6xl mx-auto">
            <div className="mb-16 text-center">
              <label className="text-[10px] uppercase tracking-[0.3em] text-[#3B82F6] font-bold block mb-4">Intelligence Layer</label>
              <h2 className="text-4xl font-bold tracking-tightest">RAG & AI Features</h2>
              <p className="text-[#A1A1A1] mt-4 max-w-2xl mx-auto">
                Privacy-first knowledge management with end-to-end encryption and local-first execution.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <RAGCard 
                onClick={onViewPublicRAG}
                icon={<Upload className="w-5 h-5 text-[#3B82F6]" />}
                title="Public RAG"
                description="E2EE document sharing with the community. Zero-knowledge."
                tag="Cloud"
              />
              <RAGCard 
                onClick={onViewPrivateRAG}
                icon={<Shield className="w-5 h-5 text-[#4ADE80]" />}
                title="Private RAG"
                description="100% local knowledge base. Zero data exposure."
                tag="Local"
              />
              <RAGCard 
                onClick={onViewConversation}
                icon={<Users className="w-5 h-5 text-[#8B5CF6]" />}
                title="Guided Design"
                description="Interactive interview that extracts exactly what your agent needs."
                tag="Conversational"
              />
              <RAGCard 
                onClick={onViewLLMSettings}
                icon={<Zap className="w-5 h-5 text-[#F59E0B]" />}
                title="LLM Settings"
                description="Encrypted API key management for any provider."
                tag="System"
              />
            </div>
          </div>
        </section>

        {/* Token Holder Section */}
        <section className="py-24 px-6 bg-[#0F0F10]">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-16 items-center">
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20">
                  <Sparkles className="w-3 h-3 text-[#3B82F6]" />
                  <span className="text-[10px] uppercase tracking-widest text-[#3B82F6] font-bold">Genesis Access</span>
                </div>
                <h2 className="text-5xl font-bold tracking-tightest leading-tight">
                  Own Your Agent <br />
                  <span className="bg-gradient-to-r from-white to-[#A1A1A1] bg-clip-text text-transparent">Infrastructure</span>
                </h2>
                <p className="text-lg text-[#A1A1A1] leading-relaxed">
                  Digital Souls NFT holders get exclusive access to the TAIS platform, including 
                  multi-config slots, premium skills, and governance rights.
                </p>
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => window.open('https://opensea.io/collection/think-agent-bundle', '_blank')}
                    className="bg-white text-black font-bold text-xs uppercase tracking-widest px-8 py-3 rounded-md hover:bg-white/90 transition-all active:scale-95 flex items-center gap-2"
                  >
                    OpenSea
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <button
                    onClick={onStartInterview}
                    className="bg-transparent text-white border border-[#262626] font-bold text-xs uppercase tracking-widest px-8 py-3 rounded-md hover:bg-white/5 transition-all active:scale-95"
                  >
                    Benefits
                  </button>
                </div>
              </div>
              
              <div className="flex-1 w-full grid grid-cols-2 gap-4">
                <StatsCard label="Total Supply" value={nftStats.totalSupply} loading={statsLoading} />
                <StatsCard label="Floor Price" value={nftStats.floorPrice} loading={statsLoading} />
                <StatsCard label="Total Volume" value={nftStats.totalVolume} loading={statsLoading} />
                <StatsCard label="Unique Owners" value={nftStats.uniqueOwners} loading={statsLoading} />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#262626] py-12 px-6 bg-[#0A0A0B]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h2 className="text-xl font-bold tracking-tightest mb-2">TAIS</h2>
            <p className="text-xs text-[#717171] uppercase tracking-widest">© 2026 Think Agent Interview System</p>
          </div>
          <div className="flex gap-12">
            <FooterLink href="#">Docs</FooterLink>
            <FooterLink href="#">GitHub</FooterLink>
            <FooterLink href="#">Support</FooterLink>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="bg-[#141415] border border-[#262626] p-6 rounded-lg group hover:border-[#3B82F6] transition-all cursor-pointer"
    >
      <div className="w-10 h-10 rounded-md bg-[#0A0A0B] border border-[#262626] flex items-center justify-center mb-6 group-hover:border-[#3B82F6]/50 transition-all">
        {icon}
      </div>
      <h3 className="text-sm font-bold uppercase tracking-widest mb-3">{title}</h3>
      <p className="text-sm text-[#A1A1A1] leading-relaxed mb-4">{description}</p>
      {onClick && (
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#3B82F6] font-bold">
          Learn more →
        </span>
      )}
    </div>
  );
}

function RAGCard({ icon, title, description, tag, onClick }: { icon: React.ReactNode; title: string; description: string; tag: string; onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="bg-[#141415] border border-[#262626] p-6 rounded-lg cursor-pointer group hover:border-[#3B82F6] transition-all flex flex-col h-full"
    >
      <div className="flex items-start justify-between mb-8">
        <div className="w-10 h-10 rounded-md bg-[#0A0A0B] border border-[#262626] flex items-center justify-center group-hover:border-[#3B82F6]/50 transition-all">
          {icon}
        </div>
        <span className="text-[9px] uppercase tracking-widest text-[#717171] font-bold border border-[#262626] px-2 py-1 rounded">
          {tag}
        </span>
      </div>
      <h3 className="text-sm font-bold uppercase tracking-widest mb-3">{title}</h3>
      <p className="text-xs text-[#A1A1A1] leading-relaxed mb-6 flex-grow">{description}</p>
      <div className="text-[10px] uppercase tracking-[0.2em] text-[#3B82F6] font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
        Enter Module →
      </div>
    </div>
  );
}

function StatsCard({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <div className="bg-[#141415] border border-[#262626] p-6 rounded-lg text-center">
      <div className="text-2xl font-bold tracking-tightest mb-1">{loading ? '...' : value}</div>
      <div className="text-[10px] uppercase tracking-widest text-[#717171]">{label}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="text-xs uppercase tracking-widest text-[#717171] hover:text-white transition-colors">
      {children}
    </a>
  );
}
