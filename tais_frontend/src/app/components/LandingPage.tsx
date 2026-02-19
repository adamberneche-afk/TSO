// TAIS Platform - Landing Page Component

import React from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ArrowRight, Zap, Shield, Code, Users, CheckCircle, Upload, ClipboardCheck, ExternalLink, Sparkles } from 'lucide-react';

interface LandingPageProps {
  onStartInterview: () => void;
  onViewDashboard: () => void;
  onPublishSkill?: () => void;
  onAuditSkill?: () => void;
  onViewPublicRAG?: () => void;
  onViewPrivateRAG?: () => void;
  onViewConversation?: () => void;
  onViewLLMSettings?: () => void;
}

export function LandingPage({ 
  onStartInterview, 
  onViewDashboard, 
  onPublishSkill, 
  onAuditSkill,
  onViewPublicRAG,
  onViewPrivateRAG,
  onViewConversation,
  onViewLLMSettings
}: LandingPageProps) {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-[#333333] bg-[#111111]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">TAIS</h1>
          <nav className="flex items-center gap-6">
            <a href="#features" className="text-[#888888] hover:text-white transition-colors">
              Features
            </a>
            <a href="#rag" className="text-[#888888] hover:text-white transition-colors">
              RAG
            </a>
            <Button
              variant="ghost"
              onClick={onViewDashboard}
              className="text-[#888888] hover:text-white"
            >
              My Agents
            </Button>
            <Button
              onClick={onStartInterview}
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
            >
              Build Agent
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <h1 className="text-6xl md:text-7xl font-bold leading-tight">
            Build Your AI Agent
            <br />
            <span className="text-[#3B82F6]">In Minutes</span>
          </h1>
          <p className="text-xl text-[#888888] max-w-2xl mx-auto">
            Interview-driven agent builder that creates executable AI configurations.
            No coding required. Just answer questions and deploy.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={onStartInterview}
              size="lg"
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white text-lg px-8 py-6"
            >
              Start Building
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-[#333333] text-white hover:bg-[#1a1a1a] text-lg px-8 py-6"
            >
              View Demo
            </Button>
          </div>
          <div className="flex items-center justify-center gap-8 text-sm text-[#888888]">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#10B981]" />
              No coding required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#10B981]" />
              7-step interview
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#10B981]" />
              Deploy anywhere
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-[#111111]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Why Choose TAIS?</h2>
            <p className="text-[#888888] text-lg">
              The fastest way to create, configure, and deploy AI agents
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Zap className="w-8 h-8 text-[#3B82F6]" />}
              title="Interview-Driven"
              description="Simple questions guide you through the entire configuration process"
            />
            <FeatureCard
              icon={<Code className="w-8 h-8 text-[#3B82F6]" />}
              title="JSON Configuration"
              description="Generates clean, executable JSON configs that work anywhere"
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-[#3B82F6]" />}
              title="Skill Registry"
              description="Access verified skills with trust scores and community ratings"
            />
            <FeatureCard
              icon={<Users className="w-8 h-8 text-[#3B82F6]" />}
              title="Blockchain Ownership"
              description="Own your agents as NFTs and access premium features"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-[#888888] text-lg">
              From interview to deployment in 7 simple steps
            </p>
          </div>

          <div className="space-y-8">
            {STEPS.map((step, index) => (
              <StepCard key={index} {...step} stepNumber={index + 1} />
            ))}
          </div>

          <div className="text-center mt-12">
            <Button
              onClick={onStartInterview}
              size="lg"
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white text-lg px-8 py-6"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* RAG & AI Features Section */}
      <section id="rag" className="py-20 px-6 bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">RAG & AI Features</h2>
            <p className="text-[#888888] text-lg">
              Privacy-first knowledge management with end-to-end encryption
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-[#111111] border-[#333333] p-6 hover:border-[#3B82F6] transition-colors cursor-pointer"
                  onClick={onViewPublicRAG}>
              <div className="flex items-center gap-3 mb-4">
                <Upload className="w-6 h-6 text-[#3B82F6]" />
                <h3 className="text-xl font-bold">Public RAG</h3>
              </div>
              <p className="text-[#888888] mb-4">
                End-to-end encrypted document sharing with the community. Server never sees your plaintext.
              </p>
              <Button variant="outline" className="w-full border-[#333333] hover:bg-[#1a1a1a]">
                Access Public RAG
              </Button>
            </Card>

            <Card className="bg-[#111111] border-[#333333] p-6 hover:border-[#3B82F6] transition-colors cursor-pointer"
                  onClick={onViewPrivateRAG}>
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-[#10B981]" />
                <h3 className="text-xl font-bold">Private RAG</h3>
              </div>
              <p className="text-[#888888] mb-4">
                100% local knowledge base. Documents never leave your device. Complete privacy.
              </p>
              <Button variant="outline" className="w-full border-[#333333] hover:bg-[#1a1a1a]">
                Open Private RAG
              </Button>
            </Card>

            <Card className="bg-[#111111] border-[#333333] p-6 hover:border-[#3B82F6] transition-colors cursor-pointer"
                  onClick={onViewConversation}>
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-6 h-6 text-[#8B5CF6]" />
                <h3 className="text-xl font-bold">AI Interview</h3>
              </div>
              <p className="text-[#888888] mb-4">
                Conversational interview with LLM integration. AI-powered question generation.
              </p>
              <Button variant="outline" className="w-full border-[#333333] hover:bg-[#1a1a1a]">
                Start AI Interview
              </Button>
            </Card>

            <Card className="bg-[#111111] border-[#333333] p-6 hover:border-[#3B82F6] transition-colors cursor-pointer"
                  onClick={onViewLLMSettings}>
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-6 h-6 text-[#F59E0B]" />
                <h3 className="text-xl font-bold">LLM Settings</h3>
              </div>
              <p className="text-[#888888] mb-4">
                Configure OpenAI, Anthropic, or local models. Wallet-encrypted API keys.
              </p>
              <Button variant="outline" className="w-full border-[#333333] hover:bg-[#1a1a1a]">
                Configure LLM
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* THINK Agent Bundle Collection CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-[#1a1a1a] via-[#2a1a3a] to-[#1a1a1a]">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3B82F6]/20 border border-[#3B82F6]/30">
            <Sparkles className="w-4 h-4 text-[#3B82F6]" />
            <span className="text-sm text-[#3B82F6]">Live on OpenSea</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold">
            Own a Piece of the
            <br />
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
              THINK Agent Bundle
            </span>
          </h2>
          <p className="text-xl text-[#888888] max-w-2xl mx-auto">
            Digital Souls NFT holders get exclusive access to the TAIS platform, including early access to premium skills, 
            governance rights, and participation in the skill marketplace economy.
          </p>
          <div className="flex items-center justify-center gap-6">
            <a
              href="https://opensea.io/collection/think-agent-bundle"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:from-[#2563EB] hover:to-[#7C3AED] text-white text-lg px-8 py-6"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                View on OpenSea
              </Button>
            </a>
            <Button
              variant="outline"
              size="lg"
              onClick={onStartInterview}
              className="border-[#333333] text-white hover:bg-[#1a1a1a] text-lg px-8 py-6"
            >
              Learn Benefits
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8">
            <GenesisBenefit
              value="2,022"
              label="Total Supply"
            />
            <GenesisBenefit
              value="0.0298 ETH"
              label="Floor Price"
            />
            <GenesisBenefit
              value="192.15 ETH"
              label="Total Volume"
            />
            <GenesisBenefit
              value="759"
              label="Unique Owners"
            />
          </div>
        </div>
      </section>

      {/* Token Holder Features Section */}
      <section className="py-20 px-6 bg-[#111111]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">For Token Holders</h2>
            <p className="text-[#888888] text-lg max-w-2xl mx-auto">
              $THINK token holders and Genesis Pass owners can participate in the ecosystem 
              by publishing and auditing skills in the registry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <TokenHolderCard
              icon={<Upload className="w-12 h-12 text-[#3B82F6]" />}
              title="Publish Skills"
              description="Create and publish new skills to the registry. Set your own pricing, earn fees when agents use your skills, and build your reputation as a skill developer."
              benefits={[
                "Earn 70% of skill usage fees",
                "Build developer reputation",
                "Access to developer tools",
                "Priority support"
              ]}
              ctaText="Publish a Skill"
              onCtaClick={onPublishSkill}
              badge="Staking Required"
            />
            <TokenHolderCard
              icon={<ClipboardCheck className="w-12 h-12 text-[#10B981]" />}
              title="Audit Skills"
              description="Review and verify skills submitted by other developers. Help maintain quality standards, identify security issues, and earn rewards for thorough audits."
              benefits={[
                "Earn audit rewards in $THINK",
                "Reputation as security expert",
                "Early access to new skills",
                "Governance voting power"
              ]}
              ctaText="Start Auditing"
              onCtaClick={onAuditSkill}
              badge="Level 2+ Required"
            />
          </div>

          <div className="mt-12 p-6 bg-[#1a1a1a] border border-[#333333] rounded-lg">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-[#3B82F6]/10 rounded-lg">
                <Shield className="w-6 h-6 text-[#3B82F6]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Quality Assurance</h3>
                <p className="text-[#888888] mb-4">
                  All skills in the registry undergo rigorous auditing by the community. 
                  Multi-signature approvals, automated testing, and reputation-weighted voting 
                  ensure only high-quality, secure skills are available.
                </p>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#10B981]" />
                    <span className="text-[#888888]">Automated Security Scans</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#10B981]" />
                    <span className="text-[#888888]">Community Audits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#10B981]" />
                    <span className="text-[#888888]">Content Verification</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#333333] py-8 px-6 bg-[#111111]">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-[#888888]">
          <p>© 2026 TAIS Platform. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">
              Documentation
            </a>
            <a href="#" className="hover:text-white transition-colors">
              GitHub
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="bg-[#1a1a1a] border-[#333333] hover:border-[#3B82F6] transition-all p-6">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-[#888888]">{description}</p>
    </Card>
  );
}

interface StepCardProps {
  stepNumber: number;
  title: string;
  description: string;
  duration: string;
}

function StepCard({ stepNumber, title, description, duration }: StepCardProps) {
  return (
    <div className="flex items-start gap-6">
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#3B82F6] flex items-center justify-center text-white font-bold text-lg">
        {stepNumber}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <span className="text-sm text-[#888888]">{duration}</span>
        </div>
        <p className="text-[#888888]">{description}</p>
      </div>
    </div>
  );
}

interface GenesisBenefitProps {
  value: string;
  label: string;
}

function GenesisBenefit({ value, label }: GenesisBenefitProps) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-[#888888]">{label}</div>
    </div>
  );
}

interface TokenHolderCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  benefits: string[];
  ctaText: string;
  onCtaClick?: () => void;
  badge: string;
}

function TokenHolderCard({
  icon,
  title,
  description,
  benefits,
  ctaText,
  onCtaClick,
  badge
}: TokenHolderCardProps) {
  return (
    <Card className="bg-[#1a1a1a] border-[#333333] p-8 flex flex-col h-full">
      <div className="flex items-start justify-between mb-6">
        <div className="p-3 bg-[#1a1a1a] border border-[#333333] rounded-lg">
          {icon}
        </div>
        <span className="px-3 py-1 text-xs font-medium bg-[#3B82F6]/20 text-[#3B82F6] rounded-full border border-[#3B82F6]/30">
          {badge}
        </span>
      </div>
      <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
      <p className="text-[#888888] mb-6 flex-grow">{description}</p>
      <ul className="space-y-3 mb-8">
        {benefits.map((benefit, index) => (
          <li key={index} className="flex items-center gap-3 text-sm text-[#888888]">
            <CheckCircle className="w-4 h-4 text-[#10B981] flex-shrink-0" />
            {benefit}
          </li>
        ))}
      </ul>
      <Button
        onClick={onCtaClick}
        className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white"
        disabled={!onCtaClick}
      >
        {ctaText}
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </Card>
  );
}

const STEPS = [
  {
    title: 'Define Goals',
    description:
      'Select what your agent will help you with - work, learning, creativity, or more.',
    duration: '2 min',
  },
  {
    title: 'Select Skills',
    description:
      'Choose verified skills from the registry to give your agent specific capabilities.',
    duration: '2 min',
  },
  {
    title: 'Configure Behavior',
    description:
      'Set communication style, detail level, and autonomy preferences with intuitive sliders.',
    duration: '2 min',
  },
  {
    title: 'Privacy & Constraints',
    description:
      'Define security boundaries, budget limits, and allowed capabilities.',
    duration: '1 min',
  },
  {
    title: 'Name & Ownership',
    description:
      'Give your agent a name and optionally connect your wallet to claim ownership.',
    duration: '1 min',
  },
  {
    title: 'Review Configuration',
    description:
      'Preview the generated JSON configuration and make any final adjustments.',
    duration: '2 min',
  },
  {
    title: 'Deploy',
    description:
      'Choose your deployment method - web, desktop, API, or export the configuration.',
    duration: '1 min',
  },
];