/**
 * Guided Discovery Service
 * Interview-driven agent creation that preserves human agency
 * Replaces templates with progressive questions
 */

import { PrismaClient } from '@prisma/client';

export interface GuidedDiscoveryQuestion {
  id: string;
  question: string;
  description: string;
  type: 'choice' | 'text' | 'multi' | 'scale';
  options?: string[];
  placeholder?: string;
  required: boolean;
  order: number;
  category: 'function' | 'audience' | 'differentiation' | 'communication' | 'knowledge';
}

export interface GuidedDiscoveryResponse {
  questionId: string;
  answer: string | string[] | number;
}

export interface GuidedDiscoverySession {
  id: string;
  walletAddress: string;
  currentStep: number;
  responses: Record<string, any>;
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: Date;
  completedAt?: Date;
}

export const GUIDED_DISCOVERY_QUESTIONS: GuidedDiscoveryQuestion[] = [
  // === FUNCTION (What does the agent do?) ===
  {
    id: 'primary_function',
    question: 'What does your AI agent do?',
    description: 'Describe the primary purpose of your agent in one sentence.',
    type: 'text',
    placeholder: 'e.g., Helps customers troubleshoot technical issues',
    required: true,
    order: 1,
    category: 'function',
  },
  {
    id: 'use_cases',
    question: 'What are the main use cases?',
    description: 'Select all that apply or describe your own.',
    type: 'multi',
    options: [
      'Customer Support',
      'Sales & Lead Qualification',
      'Content Creation',
      'Data Analysis & Reporting',
      'Education & Training',
      'Internal Operations',
      'Product Recommendations',
      'Scheduling & Calendar',
      'Other',
    ],
    required: true,
    order: 2,
    category: 'function',
  },
  {
    id: 'problem_solved',
    question: 'What specific problem does it solve?',
    description: 'What pain point does your agent address for users?',
    type: 'text',
    placeholder: 'e.g., Reduces support ticket response time by 80%',
    required: true,
    order: 3,
    category: 'function',
  },

  // === AUDIENCE (Who does it help?) ===
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

  // === DIFFERENTIATION (What's unique?) ===
  {
    id: 'unique_value',
    question: "What makes your agent's response unique?",
    description: "What differentiates it from generic AI? Your secret sauce.",
    type: 'text',
    placeholder: 'e.g., Knows our exact product catalog and return policy',
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

  // === COMMUNICATION (How should it communicate?) ===
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
      'Professional & Formal',
      'Casual & Friendly',
      'Empathetic & Supportive',
      'Direct & Action-oriented',
      'Educational & Informative',
      'Humorous & Engaging',
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
      'Plain text',
      'Structured lists',
      'Step-by-step guides',
      'Tables and comparisons',
      'Code snippets',
      'Visual elements (when available)',
    ],
    required: false,
    order: 12,
    category: 'communication',
  },

  // === KNOWLEDGE (What should it know?) ===
  {
    id: 'knowledge_domains',
    question: 'What knowledge domains are relevant?',
    description: 'What topics should the agent be knowledgeable about?',
    type: 'multi',
    options: [
      'Product/Service details',
      'Company policies',
      'Industry terminology',
      'Technical documentation',
      'Best practices',
      'Troubleshooting guides',
      'Pricing and billing',
      'Account management',
      'Other',
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
      'Uploaded documents (RAG)',
      'Knowledge base articles',
      'API integrations',
      'Database queries',
      'Real-time data feeds',
      'User-provided context',
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

export class GuidedDiscoveryService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  getQuestions(): GuidedDiscoveryQuestion[] {
    return GUIDED_DISCOVERY_QUESTIONS;
  }

  getQuestionById(id: string): GuidedDiscoveryQuestion | undefined {
    return GUIDED_DISCOVERY_QUESTIONS.find(q => q.id === id);
  }

  async startSession(walletAddress: string): Promise<{ sessionId: string; firstQuestion: GuidedDiscoveryQuestion }> {
    const session = await this.prisma.guidedDiscoverySession.create({
      data: {
        walletAddress: walletAddress.toLowerCase(),
        currentStep: 1,
        responses: {},
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    const firstQuestion = GUIDED_DISCOVERY_QUESTIONS.find(q => q.order === 1)!;

    return {
      sessionId: session.id,
      firstQuestion,
    };
  }

  async getSession(sessionId: string): Promise<GuidedDiscoverySession | null> {
    return this.prisma.guidedDiscoverySession.findUnique({
      where: { id: sessionId },
    }) as Promise<GuidedDiscoverySession | null>;
  }

  async submitAnswer(
    sessionId: string,
    questionId: string,
    answer: string | string[] | number
  ): Promise<{ completed: boolean; nextQuestion?: GuidedDiscoveryQuestion; progress: number }> {
    const session = await this.prisma.guidedDiscoverySession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.status !== 'in_progress') {
      throw new Error('Invalid session');
    }

    const question = this.getQuestionById(questionId);
    if (!question) {
      throw new Error('Invalid question');
    }

    const existingResponses = session.responses as Record<string, any> || {};
    const responses = { ...existingResponses, [questionId]: answer };
    const currentOrder = question.order;
    const nextQuestion = GUIDED_DISCOVERY_QUESTIONS.find(q => q.order === currentOrder + 1);
    const totalQuestions = GUIDED_DISCOVERY_QUESTIONS.length;
    const progress = Math.round((currentOrder / totalQuestions) * 100);

    await this.prisma.guidedDiscoverySession.update({
      where: { id: sessionId },
      data: {
        responses,
        currentStep: nextQuestion ? nextQuestion.order : totalQuestions,
        completedAt: nextQuestion ? undefined : new Date(),
        status: nextQuestion ? 'in_progress' : 'completed',
      },
    });

    return {
      completed: !nextQuestion,
      nextQuestion,
      progress,
    };
  }

  async generateConfigFromSession(sessionId: string): Promise<{
    personality: string;
    systemPrompt: string;
    config: Record<string, any>;
  }> {
    const session = await this.prisma.guidedDiscoverySession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.status !== 'completed') {
      throw new Error('Session not completed');
    }

    const responses = (session.responses || {}) as Record<string, any>;

    const personality = this.buildPersonalityMarkdown(responses);
    const systemPrompt = this.buildSystemPrompt(responses);
    const config = {
      guidedDiscoveryId: sessionId,
      generatedAt: new Date().toISOString(),
      ...responses,
    };

    return { personality, systemPrompt, config };
  }

  private buildPersonalityMarkdown(responses: Record<string, any>): string {
    const sections: string[] = [];

    sections.push(`# Agent Identity\n`);
    sections.push(`**Primary Function:** ${responses.primary_function || 'Not specified'}`);
    if (responses.use_cases) {
      const cases = Array.isArray(responses.use_cases) 
        ? responses.use_cases.join(', ') 
        : responses.use_cases;
      sections.push(`**Use Cases:** ${cases}`);
    }
    sections.push(`**Problem Solved:** ${responses.problem_solved || 'Not specified'}\n`);

    sections.push(`## Target Audience\n`);
    sections.push(responses.target_audience || 'Not specified');
    sections.push(`**Expertise Level:** ${responses.audience_expertise || 'Not specified'}`);
    sections.push(`**Goals:** ${responses.audience_goals || 'Not specified'}\n`);

    sections.push(`## Brand Voice\n`);
    sections.push(`**Unique Value:** ${responses.unique_value || 'Not specified'}`);
    sections.push(`**Voice:** ${responses.brand_voice || 'Not specified'}`);
    if (responses.must_avoid) {
      sections.push(`**Avoid:** ${responses.must_avoid}`);
    }
    sections.push('');

    sections.push(`## Communication Style\n`);
    sections.push(`**Length:** ${responses.response_length || 'Balanced'}`);
    sections.push(`**Tone:** ${responses.communication_style || 'Professional'}`);
    if (responses.format_preference) {
      const formats = Array.isArray(responses.format_preference)
        ? responses.format_preference.join(', ')
        : responses.format_preference;
      sections.push(`**Format:** ${formats}`);
    }
    sections.push('');

    sections.push(`## Knowledge\n`);
    if (responses.knowledge_domains) {
      const domains = Array.isArray(responses.knowledge_domains)
        ? responses.knowledge_domains.join(', ')
        : responses.knowledge_domains;
      sections.push(`**Domains:** ${domains}`);
    }
    sections.push(`**Unknown Handling:** ${responses.knowledge_gaps || 'Acknowledge limitation'}`);

    return sections.join('\n');
  }

  private buildSystemPrompt(responses: Record<string, any>): string {
    const parts: string[] = [];

    parts.push(`You are an AI assistant with the following purpose:`);
    parts.push(`${responses.primary_function}`);
    parts.push('');

    parts.push(`Your target audience is: ${responses.target_audience}`);
    parts.push(`Their expertise level: ${responses.audience_expertise}`);
    parts.push(`What they want to achieve: ${responses.audience_goals}`);
    parts.push('');

    parts.push(`Your unique value proposition: ${responses.unique_value}`);
    parts.push(`Your brand voice: ${responses.brand_voice}`);
    if (responses.must_avoid) {
      parts.push(`Important - AVOID: ${responses.must_avoid}`);
    }
    parts.push('');

    parts.push(`Communication:`);
    parts.push(`- Detail level: ${responses.response_length}`);
    parts.push(`- Tone: ${responses.communication_style}`);
    parts.push('');

    parts.push(`When you don't know the answer: ${responses.knowledge_gaps}`);

    return parts.join('\n');
  }
}

export default GuidedDiscoveryService;
