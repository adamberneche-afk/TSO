// Guided Discovery Documentation

import React from 'react';
import { ArrowLeft, CheckCircle2, Sparkles, Target, Users, MessageSquare, BookOpen, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

interface DocPageProps {
  onBack: () => void;
}

export function GuidedDiscoveryDoc({ onBack }: DocPageProps) {
  const steps = [
    {
      icon: Target,
      title: 'Function',
      description: 'What does your agent do?',
      questions: [
        'Primary function - The core purpose in one sentence',
        'Use cases - Customer support, sales, content creation, etc.',
        'Problem solved - The specific pain point addressed'
      ]
    },
    {
      icon: Users,
      title: 'Audience',
      description: 'Who does it help?',
      questions: [
        'Target audience description',
        'Technical proficiency level',
        'Goals and success metrics'
      ]
    },
    {
      icon: Sparkles,
      title: 'Differentiation',
      description: 'What makes it unique?',
      questions: [
        'Unique value proposition',
        'Brand voice and tone',
        'Topics to avoid'
      ]
    },
    {
      icon: MessageSquare,
      title: 'Communication',
      description: 'How should it respond?',
      questions: [
        'Response length preference',
        'Communication style',
        'Output format preferences'
      ]
    },
    {
      icon: BookOpen,
      title: 'Knowledge',
      description: 'What should it know?',
      questions: [
        'Relevant knowledge domains',
        'Data sources to access',
        'Handling unknown questions'
      ]
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
            <Sparkles className="w-5 h-5 text-[#3B82F6]" />
            <span className="font-bold">Guided Discovery</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Build Agents That Actually Work</h1>
          <p className="text-xl text-[#888888] max-w-2xl mx-auto">
            Our guided discovery process replaces templates with 15 progressive questions 
            that help you define exactly what your agent needs to do.
          </p>
        </section>

        {/* Why It Works */}
        <section className="bg-[#141415] border border-[#262626] rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-6">Why Guided Discovery?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#4ADE80] mt-0.5" />
                <div>
                  <h3 className="font-semibold">Preserves Human Agency</h3>
                  <p className="text-sm text-[#888888]">Every agent is unique because every answer is unique. No cookie-cutter templates.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#4ADE80] mt-0.5" />
                <div>
                  <h3 className="font-semibold">Progressive Complexity</h3>
                  <p className="text-sm text-[#888888]">Questions build on each other. Start simple, add nuance as you go.</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#4ADE80] mt-0.5" />
                <div>
                  <h3 className="font-semibold">Personality Extraction</h3>
                  <p className="text-sm text-[#888888]">Your answers generate a markdown personality that shapes how the AI behaves.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#4ADE80] mt-0.5" />
                <div>
                  <h3 className="font-semibold">Production-Ready</h3>
                  <p className="text-sm text-[#888888]">The output is a complete, executable JSON config ready to deploy.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The 5 Categories */}
        <section>
          <h2 className="text-2xl font-bold mb-8">The 5 Categories</h2>
          <div className="space-y-4">
            {steps.map((step, i) => (
              <Card key={i} className="bg-[#141415] border-[#262626]">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-[#3B82F6]/10 rounded-lg">
                      <step.icon className="w-6 h-6 text-[#3B82F6]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        {step.title}
                        <span className="text-xs text-[#888888] font-normal">- {step.description}</span>
                      </h3>
                      <ul className="mt-2 space-y-1">
                        {step.questions.map((q, j) => (
                          <li key={j} className="text-sm text-[#888888] flex items-center gap-2">
                            <ChevronRight className="w-3 h-3 text-[#3B82F6]" />
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Technical Output */}
        <section className="bg-[#141415] border border-[#262626] rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-4">What You Get</h2>
          <p className="text-[#888888] mb-6">
            After completing the 15 questions, you receive a complete agent configuration:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-[#0A0A0B] rounded-lg p-4">
              <h4 className="font-semibold mb-2">JSON Configuration</h4>
              <p className="text-sm text-[#888888]">Complete config with LLM settings, knowledge domains, communication preferences, and constraints.</p>
            </div>
            <div className="bg-[#0A0A0B] rounded-lg p-4">
              <h4 className="font-semibold mb-2">Personality Markdown</h4>
              <p className="text-sm text-[#888888]">AI-readable personality document that defines tone, style, and behavioral guidelines.</p>
            </div>
            <div className="bg-[#0A0A0B] rounded-lg p-4">
              <h4 className="font-semibold mb-2">Version History</h4>
              <p className="text-sm text-[#888888]">Every change is automatically versioned. Roll back anytime.</p>
            </div>
            <div className="bg-[#0A0A0B] rounded-lg p-4">
              <h4 className="font-semibold mb-2">Portable</h4>
              <p className="text-sm text-[#888888]">Export as JSON and run anywhere. Not locked into any platform.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <Button onClick={onBack} className="bg-white text-black hover:bg-white/90 px-8">
            Start Building Your Agent
          </Button>
        </section>
      </div>
    </div>
  );
}
