// TAIS Platform - Guided Discovery Wizard
// 5 limitation-focused questions for agent creation

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Download,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AgentConfig } from '../../../types/agent';
import { configApi } from '../../../services/configApi';

interface GuidedDiscoveryWizardProps {
  onComplete: (config: AgentConfig) => void;
  onCancel: () => void;
}

interface Question {
  id: string;
  question: string;
  description: string;
  type: 'choice' | 'text' | 'multi' | 'scale';
  options?: string[];
  placeholder?: string;
  required: boolean;
  order: number;
  category: string;
}

const QUESTIONS: Question[] = [
  // FUNCTION
  {
    id: 'primary_function',
    question: 'What does your AI agent do?',
    description: 'Describe the primary purpose in one sentence.',
    type: 'text',
    placeholder: 'e.g., Helps customers troubleshoot technical issues',
    required: true,
    order: 1,
    category: 'function',
  },
  {
    id: 'use_cases',
    question: 'What are the main use cases?',
    description: 'Select all that apply.',
    type: 'multi',
    options: [
      'Customer Support', 'Sales & Lead Qualification', 'Content Creation',
      'Data Analysis & Reporting', 'Education & Training', 'Internal Operations',
      'Product Recommendations', 'Scheduling & Calendar', 'Other'
    ],
    required: true,
    order: 2,
    category: 'function',
  },
  {
    id: 'problem_solved',
    question: 'What specific problem does it solve?',
    description: 'What pain point does your agent address?',
    type: 'text',
    placeholder: 'e.g., Reduces support ticket response time by 80%',
    required: true,
    order: 3,
    category: 'function',
  },
  // AUDIENCE
  {
    id: 'target_audience',
    question: 'Who is your target audience?',
    description: 'Describe the people who will use this agent.',
    type: 'text',
    placeholder: 'e.g., Tech-savvy professionals aged 25-45',
    required: true,
    order: 4,
    category: 'audience',
  },
  {
    id: 'audience_expertise',
    question: 'How technically proficient is your audience?',
    description: 'This helps calibrate how your agent communicates.',
    type: 'choice',
    options: [
      'Non-technical (needs simple language)',
      'Moderately technical (can follow instructions)',
      'Highly technical (expects detailed explanations)',
      'Varying levels (needs flexibility)',
    ],
    required: true,
    order: 5,
    category: 'audience',
  },
  {
    id: 'audience_goals',
    question: 'What are your users trying to achieve?',
    description: 'What success looks like for them.',
    type: 'text',
    placeholder: 'e.g., Get quick answers to product questions',
    required: true,
    order: 6,
    category: 'audience',
  },
  // DIFFERENTIATION
  {
    id: 'unique_value',
    question: "What makes your agent's response unique?",
    description: "What differentiates it from generic AI? Your secret sauce.",
    type: 'text',
    placeholder: "e.g., Knows our exact product catalog and return policy",
    required: true,
    order: 7,
    category: 'differentiation',
  },
  {
    id: 'brand_voice',
    question: 'How should the agent sound?',
    description: 'Describe your brand voice in 3 words.',
    type: 'text',
    placeholder: 'e.g., Friendly, knowledgeable, efficient',
    required: true,
    order: 8,
    category: 'differentiation',
  },
  {
    id: 'must_avoid',
    question: 'What should the agent absolutely avoid?',
    description: 'Topics, phrases, or approaches that would damage trust.',
    type: 'text',
    placeholder: 'e.g., Never suggest competitor products, avoid jargon',
    required: false,
    order: 9,
    category: 'differentiation',
  },
  // COMMUNICATION
  {
    id: 'response_length',
    question: 'How detailed should responses be?',
    description: 'Adjust based on your audience preferences.',
    type: 'choice',
    options: [
      'Concise (quick answers)',
      'Balanced (thorough but not overwhelming)',
      'Detailed (comprehensive explanations)',
      'Context-dependent (vary based on question)',
    ],
    required: true,
    order: 10,
    category: 'communication',
  },
  {
    id: 'communication_style',
    question: 'What communication style works best?',
    description: 'Select the primary tone.',
    type: 'choice',
    options: [
      'Professional & Formal', 'Casual & Friendly', 'Empathetic & Supportive',
      'Direct & Action-oriented', 'Educational & Informative', 'Humorous & Engaging'
    ],
    required: true,
    order: 11,
    category: 'communication',
  },
  {
    id: 'format_preference',
    question: 'How should the agent present information?',
    description: 'Preferred output formats.',
    type: 'multi',
    options: [
      'Plain text', 'Structured lists', 'Step-by-step guides',
      'Tables and comparisons', 'Code snippets', 'Visual elements'
    ],
    required: false,
    order: 12,
    category: 'communication',
  },
  // KNOWLEDGE
  {
    id: 'knowledge_domains',
    question: 'What knowledge domains are relevant?',
    description: 'What topics should the agent be knowledgeable about?',
    type: 'multi',
    options: [
      'Product/Service details', 'Company policies', 'Industry terminology',
      'Technical documentation', 'Best practices', 'Troubleshooting guides',
      'Pricing and billing', 'Account management', 'Other'
    ],
    required: true,
    order: 13,
    category: 'knowledge',
  },
  {
    id: 'data_sources',
    question: 'What data sources should it access?',
    description: 'Where does the agent get information from?',
    type: 'multi',
    options: [
      'Uploaded documents (RAG)', 'Knowledge base articles', 'API integrations',
      'Database queries', 'Real-time data feeds', 'User-provided context'
    ],
    required: false,
    order: 14,
    category: 'knowledge',
  },
  {
    id: 'knowledge_gaps',
    question: 'What happens when the agent doesn\'t know something?',
    description: 'How should it handle unknown questions?',
    type: 'choice',
    options: [
      'Acknowledge limitation and suggest next steps',
      'Escalate to human support',
      'Provide best guess with disclaimer',
      'Redirect to alternative resources',
    ],
    required: true,
    order: 15,
    category: 'knowledge',
  },
];

const CATEGORIES = {
  function: { label: 'Function', color: 'bg-blue-500' },
  audience: { label: 'Audience', color: 'bg-purple-500' },
  differentiation: { label: 'Differentiation', color: 'bg-pink-500' },
  communication: { label: 'Communication', color: 'bg-orange-500' },
  knowledge: { label: 'Knowledge', color: 'bg-green-500' },
};

export function GuidedDiscoveryWizard({ onComplete, onCancel }: GuidedDiscoveryWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [agentName, setAgentName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<AgentConfig | null>(null);
  const [saveStatus, setSaveStatus] = useState<{
    allowed: boolean;
    isHolder: boolean;
    limit: number;
    currentCount: number;
  } | null>(null);

  const totalSteps = QUESTIONS.length + 1; // +1 for review step
  const isReviewStep = currentStep === QUESTIONS.length;
  const question = isReviewStep ? null : QUESTIONS[currentStep];
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const category = question ? CATEGORIES[question.category as keyof typeof CATEGORIES] : null;

   const canProceed = () => {
     if (isReviewStep) return true;
     if (!question) return false;
     if (question.required) {
       const val = responses[question.id];
       if (question.type === 'multi') return val && (val as string[]).length > 0;
       if (question.type === 'text') return val && (val as string).trim().length > 0;
       return !!val;
     }
     return true;
   };

  // Check save eligibility when entering review step
  useEffect(() => {
    if (isReviewStep && !saveStatus) {
      checkSaveEligibility();
    }
  }, [isReviewStep]);

  const checkSaveEligibility = async () => {
    try {
      const status = await configApi.getStatus();
      setSaveStatus({
        allowed: status.allowed,
        isHolder: status.tokenCount > 0,
        limit: status.limit,
        currentCount: status.currentCount
      });
    } catch (error) {
      console.error('Failed to check eligibility:', error);
    }
  };

   const handleNext = () => {
     if (!question) return;
     if (currentStep < QUESTIONS.length - 1) {
       setCurrentStep(currentStep + 1);
     } else if (currentStep === QUESTIONS.length - 1) {
       // Generate config and go to review step
       const config = generateConfig();
       setGeneratedConfig(config);
       setCurrentStep(currentStep + 1);
     }
   };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleResponse = (value: any) => {
    if (question) {
      setResponses({ ...responses, [question.id]: value });
    }
  };

  const handleDownload = () => {
    if (!generatedConfig) return;
    const json = JSON.stringify(generatedConfig, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedConfig.agent.name}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (!generatedConfig) return;
    
    const name = generatedConfig.agent.name;
    
    setIsSaving(true);
    try {
      await configApi.saveConfiguration(
        name,
        generatedConfig,
        `Created via Guided Discovery`
      );
      toast.success('Agent created successfully!');
      onComplete(generatedConfig);
    } catch (err) {
      console.error('Failed to save config:', err);
      toast.error('Failed to save agent. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const generateConfig = (): AgentConfig => {
    const r = responses;
    
     // Generate agent name from primary function if not set
     const name = agentName || (r.primary_function ? String(r.primary_function || '').split(' ').slice(0, 4).join(' ') : null) || 'My Agent';
    
    // Map responses to config
    const personalityMd = generatePersonalityMarkdown(r);
    
    const config: any = {
      version: '1.0',
      agent: {
        name,
        description: r.primary_function || '',
        goals: r.problem_solved ? [r.problem_solved] : [],
        skills: [],
        personality: {
          tone: 'balanced',
          verbosity: 'balanced',
          formality: 'professional'
        },
        personalityMd,
        autonomy: {
          level: r.response_length === 'Concise (quick answers)' ? 'confirm' : 
                 r.response_length === 'Detailed (comprehensive explanations)' ? 'independent' : 'suggest'
        },
        constraints: {
          privacy: 'balanced',
          maxCostPerAction: 0.1
        },
        knowledge: {
          sources: [],
          retrievalConfig: {
            topK: 5,
            similarityThreshold: 0.7,
            reranking: false,
            citationStyle: 'inline'
          }
        }
      },
      llm: {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2048,
      },
    };

    return config;
  };

  const generatePersonalityMarkdown = (r: Record<string, any>): string => {
    const lines = [
      '# Agent Personality',
      '',
      `## Purpose`,
      r.primary_function || '',
      '',
      `## Problem Solved`,
      r.problem_solved || '',
      '',
      `## Target Audience`,
      r.target_audience || '',
      `- Expertise Level: ${r.audience_expertise || 'Not specified'}`,
      `- Goals: ${r.audience_goals || 'Not specified'}`,
      '',
      `## Communication Style`,
      `- Tone: ${r.communication_style || 'Professional'}`,
      `- Length: ${r.response_length || 'Balanced'}`,
      r.format_preference?.length ? `- Formats: ${r.format_preference.join(', ')}` : '',
      '',
      `## Brand Voice`,
      r.brand_voice || '',
      '',
      `## Unique Value`,
      r.unique_value || '',
      '',
    ];

    if (r.must_avoid) {
      lines.push('## Must Avoid');
      lines.push(r.must_avoid);
      lines.push('');
    }

    if (r.use_cases?.length) {
      lines.push('## Use Cases');
      r.use_cases.forEach((uc: string) => lines.push(`- ${uc}`));
      lines.push('');
    }

    if (r.knowledge_domains?.length) {
      lines.push('## Knowledge Domains');
      r.knowledge_domains.forEach((d: string) => lines.push(`- ${d}`));
      lines.push('');
    }

    lines.push(`## Unknown Question Handling`);
    lines.push(r.knowledge_gaps || 'Acknowledge and suggest next steps');

    return lines.filter(Boolean).join('\n');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#EDEDED]">
      {/* Header */}
      <header className="border-b border-[#262626] bg-[#0F0F10] p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#3B82F6]" />
            <span className="font-bold">Guided Discovery</span>
          </div>
          <button onClick={onCancel} className="text-sm text-[#888888] hover:text-white">
            Cancel
          </button>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-[#0F0F10] border-b border-[#262626] px-4 py-3">
        <div className="max-w-3xl mx-auto">
           <div className="flex items-center justify-between mb-2">
             <span className="text-xs text-[#888888] uppercase tracking-wider">
               {isReviewStep ? 'Review' : question ? `Question ${currentStep + 1} of ${QUESTIONS.length}` : 'Question'}
             </span>
             {!isReviewStep && category && question && (
               <Badge className={`${category.color} text-white text-[10px]`}>
                 {category.label}
               </Badge>
             )}
           </div>
          <div className="h-1 bg-[#262626] rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-[#3B82F6]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

       {/* Agent Name (first question only) */}
     {/* Agent Name (first question only) */}
     {currentStep === 0 && (
       <div className="max-w-3xl mx-auto px-4 py-6">
         <Label className="text-xs text-[#888888] uppercase tracking-wider mb-2 block">
           Name your agent (optional)
         </Label>
         <Input
           value={agentName}
           onChange={(e) => setAgentName(e.target.value)}
           placeholder="e.g., Customer Support Bot"
           className="bg-[#141415] border-[#262626] text-white"
         />
       </div>
     )}

      {/* Question or Review Step */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {isReviewStep && generatedConfig ? (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-2xl font-bold mb-2">Review Your Agent</h2>
              <p className="text-[#888888]">Review your agent configuration before saving</p>
            </div>

            {/* Wallet Eligibility */}
            <div className="bg-[#141415] border border-[#262626] rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Wallet className="w-5 h-5 text-[#3B82F6]" />
                <span className="font-bold">Save Eligibility</span>
              </div>
              {saveStatus ? (
                saveStatus.isHolder ? (
                  <div className="text-sm">
                    <p className="text-[#4ADE80] mb-1">✓ THINK Agent Bundle holder</p>
               <p className="text-[#888888]">
                 You can save {saveStatus.limit - saveStatus.currentCount} more configurations ({saveStatus.currentCount}/{saveStatus.limit} used)
               </p>
                  </div>
                ) : (
                  <div className="text-sm">
                    <p className="text-[#F59E0B] mb-1">⚠ No THINK Agent Bundle detected</p>
                    <p className="text-[#888888]">
                      Save locally or export as JSON to use later
                    </p>
                  </div>
                )
              ) : (
                <p className="text-sm text-[#888888]">Checking eligibility...</p>
              )}
            </div>

            {/* Config Preview */}
            <div className="bg-[#141415] border border-[#262626] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold">Agent Configuration</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="text-[#3B82F6] hover:text-white"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download JSON
                </Button>
              </div>
              <pre className="text-xs text-[#888888] overflow-auto max-h-64 bg-[#0A0A0B] p-3 rounded">
                {JSON.stringify(generatedConfig, null, 2)}
              </pre>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={question.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
            <div>
              <h2 className="text-2xl font-bold mb-2">{question.question}</h2>
              <p className="text-[#888888]">{question.description}</p>
            </div>

             {/* Text Input */}
             {question && question.type === 'text' && (
               <Textarea
                 value={responses[question.id] || ''}
                 onChange={(e) => handleResponse(e.target.value)}
                 placeholder={question.placeholder}
                 className="bg-[#141415] border-[#262626] text-white min-h-[120px]"
               />
             )}

             {/* Choice Input */}
             {question && question.type === 'choice' && (
               <RadioGroup
                 value={responses[question.id] || ''}
                 onValueChange={handleResponse}
                 className="space-y-3"
               >
                 {question.options?.map((opt) => (
                   <div key={opt} className="flex items-center space-x-3">
                     <RadioGroupItem 
                       value={opt} 
                       id={opt}
                       className="border-[#262626] data-[state=checked]:border-[#3B82F6] data-[state=checked]:bg-[#3B82F6]"
                     />
                     <Label htmlFor={opt} className="text-[#EDEDED] cursor-pointer">
                       {opt}
                     </Label>
                   </div>
                 ))}
               </RadioGroup>
             )}

             {/* Multi-select */}
             {question && question.type === 'multi' && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 {question.options?.map((opt) => {
                   const selected = (responses[question.id] as string[] || []).includes(opt);
                   return (
                     <div
                       key={opt}
                       onClick={() => {
                         const current = responses[question.id] as string[] || [];
                         const updated = selected 
                           ? current.filter((v) => v !== opt)
                           : [...current, opt];
                         handleResponse(updated);
                       }}
                       className={`p-4 rounded-lg border cursor-pointer transition-all ${
                         selected 
                           ? 'border-[#3B82F6] bg-[#3B82F6]/10' 
                           : 'border-[#262626] hover:border-[#3B82F6]/50'
                       }`}
                     >
                       <div className="flex items-center gap-3">
                         <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                           selected ? 'bg-[#3B82F6] border-[#3B82F6]' : 'border-[#555555]'
                         }`}>
                           {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                         </div>
                         <span className="text-sm">{opt}</span>
                       </div>
                     </div>
                   );
                 })}
               </div>
             )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0F0F10] border-t border-[#262626] p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="text-[#888888] hover:text-white"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          <div className="flex gap-2">
            {(QUESTIONS || []).slice(0, 5).map((q, i) => (
              <div 
                key={q.id}
                className={`w-2 h-2 rounded-full ${
                  i === currentStep ? 'bg-[#3B82F6]' :
                  responses[q.id] ? 'bg-[#4ADE80]' :
                  'bg-[#262626]'
                }`}
              />
            ))}
            <div 
              className={`w-2 h-2 rounded-full ${
                isReviewStep ? 'bg-[#3B82F6]' :
                'bg-[#262626]'
              }`}
            />
          </div>

          <Button
            onClick={isReviewStep ? handleSave : handleNext}
            disabled={!canProceed() || isSaving}
            className="bg-white text-black hover:bg-white/90"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Saving...
              </>
            ) : isReviewStep ? (
              saveStatus?.allowed ? (
                <>
                  Save Agent
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  Export JSON
                  <Download className="w-4 h-4 ml-1" />
                </>
              )
            ) : currentStep === QUESTIONS.length - 1 ? (
              <>
                Review
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
