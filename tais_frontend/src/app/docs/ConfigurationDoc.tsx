// Configuration Documentation

import React from 'react';
import { ArrowLeft, CheckCircle2, Code, Settings, FileJson, RefreshCw, Download, Upload, Clock, Shield, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

interface DocPageProps {
  onBack: () => void;
}

export function ConfigurationDoc({ onBack }: DocPageProps) {
  const configSections = [
    {
      title: 'Agent Definition',
      key: 'agent',
      fields: [
        'name - Display name',
        'role - Primary function',
        'goal - What it achieves',
        'description - Detailed description'
      ]
    },
    {
      title: 'Skills & Capabilities',
      key: 'agent.skills',
      fields: [
        'name - Skill identifier',
        'version - Skill version',
        'config - Skill-specific settings'
      ]
    },
    {
      title: 'Knowledge & RAG',
      key: 'agent.knowledge',
      fields: [
        'enabled - Enable knowledge retrieval',
        'sources - Data sources (public/private RAG)',
        'domains - Knowledge areas',
        'topK - Number of chunks to retrieve'
      ]
    },
    {
      title: 'Communication',
      key: 'agent.communication',
      fields: [
        'style - Tone (formal/casual/empathetic)',
        'format - Output formats',
        'length - Response verbosity'
      ]
    },
    {
      title: 'LLM Settings',
      key: 'llm',
      fields: [
        'provider - openai/anthropic/local',
        'model - Model identifier',
        'temperature - Creativity vs precision',
        'maxTokens - Response length limit'
      ]
    }
  ];

  const benefits = [
    {
      icon: FileJson,
      title: 'Universal Format',
      description: 'JSON is the universal language of software. Export your config and use it anywhere.',
      example: 'OpenAI, Anthropic, local LLMs, custom servers'
    },
    {
      icon: Code,
      title: 'Version Controlled',
      description: 'Every change is tracked. See history, compare versions, roll back when needed.',
      example: 'Bronze: 7 days/10 versions → Gold: 90 days/100 versions'
    },
    {
      icon: Shield,
      title: 'Portable Security',
      description: 'Your API keys stay local. Configs reference them without exposing secrets.',
      example: 'Use environment variables or local key management'
    },
    {
      icon: RefreshCw,
      title: 'Swap Providers',
      description: 'Change LLM providers without rewriting. Same config, different model.',
      example: 'gpt-4 → claude-3 → llama-3'
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
            <Code className="w-5 h-5 text-[#3B82F6]" />
            <span className="font-bold">Portable Configs</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Configs That Go Anywhere</h1>
          <p className="text-xl text-[#888888] max-w-2xl mx-auto">
            Your agent configuration is a JSON file. Export it, version it, 
            and run it wherever you want. No lock-in, no dependencies.
          </p>
        </section>

        {/* Benefits */}
        <section className="bg-[#141415] border border-[#262626] rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-6">Why Portable Configs?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4">
                <div className="p-3 bg-[#3B82F6]/10 rounded-lg h-fit">
                  <benefit.icon className="w-6 h-6 text-[#3B82F6]" />
                </div>
                <div>
                  <h3 className="font-bold">{benefit.title}</h3>
                  <p className="text-sm text-[#888888] mt-1">{benefit.description}</p>
                  <p className="text-xs text-[#4ADE80] mt-2">{benefit.example}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Config Structure */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Configuration Structure</h2>
          <div className="space-y-4">
            {configSections.map((section, i) => (
              <Card key={i} className="bg-[#141415] border-[#262626]">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <span className="text-[#3B82F6]">{section.title}</span>
                    <code className="text-xs text-[#666666] bg-[#0A0A0B] px-2 py-0.5 rounded">
                      {section.key}
                    </code>
                  </h3>
                  <ul className="space-y-1">
                    {section.fields.map((field, j) => (
                      <li key={j} className="text-sm text-[#888888] flex items-center gap-2">
                        <ChevronRight className="w-3 h-3 text-[#3B82F6]" />
                        <code className="text-[#EDEDED]">{field}</code>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Example */}
        <section className="bg-[#141415] border border-[#262626] rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-4">Example Configuration</h2>
          <pre className="text-sm text-[#888888] bg-[#0A0A0B] p-4 rounded-lg overflow-x-auto">
{`{
  "version": "1.0",
  "agent": {
    "name": "Customer Support Bot",
    "role": "Support Agent",
    "goal": "Resolve customer issues quickly",
    "skills": [
      { "name": "zendesk", "version": "1.0" }
    ],
    "knowledge": {
      "enabled": true,
      "sources": ["public-rag:docs"],
      "domains": ["product", "pricing", "support"]
    },
    "communication": {
      "style": "Empathetic",
      "length": "Balanced"
    }
  },
  "llm": {
    "provider": "openai",
    "model": "gpt-4",
    "temperature": 0.7
  }
}`}
          </pre>
        </section>

        {/* Version History */}
        <section className="bg-[#141415] border border-[#262626] rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-4">Version History</h2>
          <div className="flex items-center gap-4 mb-4">
            <Clock className="w-5 h-5 text-[#3B82F6]" />
            <span className="text-[#888888]">Automatic snapshots on every save</span>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-[#0A0A0B] rounded-lg p-4">
              <h4 className="font-bold text-[#CD7F32]">Bronze</h4>
              <p className="text-2xl font-bold">7 days</p>
              <p className="text-xs text-[#888888]">10 versions max</p>
            </div>
            <div className="bg-[#0A0A0B] rounded-lg p-4">
              <h4 className="font-bold text-[#C0C0C0]">Silver</h4>
              <p className="text-2xl font-bold">30 days</p>
              <p className="text-xs text-[#888888]">30 versions max</p>
            </div>
            <div className="bg-[#0A0A0B] rounded-lg p-4">
              <h4 className="font-bold text-[#FFD700]">Gold</h4>
              <p className="text-2xl font-bold">90 days</p>
              <p className="text-xs text-[#888888]">100 versions max</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <Button onClick={onBack} className="bg-white text-black hover:bg-white/90 px-8">
            Start Building
          </Button>
        </section>
      </div>
    </div>
  );
}
