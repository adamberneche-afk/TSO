// TAIS Platform - Landing Page Component

import React from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ArrowRight, Zap, Shield, Code, Users, CheckCircle } from 'lucide-react';

interface LandingPageProps {
  onStartInterview: () => void;
  onViewDashboard: () => void;
}

export function LandingPage({ onStartInterview, onViewDashboard }: LandingPageProps) {
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
            <a href="#how-it-works" className="text-[#888888] hover:text-white transition-colors">
              How It Works
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