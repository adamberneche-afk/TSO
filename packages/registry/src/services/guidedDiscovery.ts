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
   category: 'function' | 'audience' | 'differentiation' | 'communication' | 'knowledge' | 'guardrails';
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
   {
     id: 'guardrails_confirmation',
     question: 'Do you agree to enable the required safety and compliance settings?',
     description: 'These settings are mandatory for all agents: malicious skill detection, rate limiting, and Genesis NFT verification.',
     type: 'choice',
     options: [
       'I agree',
     ],
     required: true,
     order: 1,
     category: 'guardrails',
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
