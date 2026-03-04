/**
 * CTO Agent Service
 * Full app development partner with chat interface
 * User provides their own LLM API key with spend caps
 */

import { PrismaClient } from '@prisma/client';
import AnalyticsService from './analytics';

export type CTOPhase = 'planning' | 'architecture' | 'development' | 'testing' | 'launch';

export interface PainPoint {
  area: string;
  description: string;
  resolved: boolean;
  createdAt: string;
}

export interface Blocker {
  description: string;
  resolved: boolean;
  createdAt: string;
}

export interface CTOProject {
  id: string;
  walletAddress: string;
  name: string;
  description?: string;
  currentPhase: CTOPhase;
  painPoints: PainPoint[];
  blockers: Blocker[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface CTOChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface CTOChatContext {
  project: CTOProject;
  messages: CTOChatMessage[];
}

const PHASE_PROMPTS: Record<CTOPhase, string> = {
  planning: `You are helping the user define their product. Ask about:
- Target users and their problems
- Core value proposition
- Key features needed
- Success metrics
- Timeline and budget constraints

Provide structured guidance to help them clarify their vision.`,

  architecture: `You are helping design the technical architecture. Discuss:
- Tech stack recommendations
- Scalability requirements
- Data model design
- API design patterns
- Security considerations
- Integration points

Provide specific, actionable architecture advice.`,

  development: `You are helping with development guidance. Cover:
- Implementation best practices
- Code organization
- Testing strategies
- Performance optimization
- Debugging approaches
- Common pitfalls to avoid

Provide practical, code-level guidance.`,

  testing: `You are helping with testing and QA. Address:
- Testing strategies (unit, integration, e2e)
- Test coverage goals
- Quality metrics
- User acceptance testing
- Performance testing
- Security testing

Provide testing roadmap guidance.`,

  launch: `You are helping prepare for launch. Cover:
- Deployment checklist
- Monitoring and alerting
- Incident response
- User onboarding
- Analytics setup
- Post-launch feedback loop

Provide launch readiness assessment.`,
};

const AREAS_OF_EXPERTISE = [
  'security',
  'database',
  'api-design',
  'frontend',
  'backend',
  'infrastructure',
  'testing',
  'monitoring',
  'documentation',
  'authentication',
  'payments',
  'analytics',
  'performance',
  'scalability',
  'compliance',
  'other',
];

export class CTOAgentService {
  private prisma: PrismaClient;
  private analytics: AnalyticsService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.analytics = new AnalyticsService(prisma);
  }

  async createProject(walletAddress: string, name: string, description?: string): Promise<CTOProject> {
    const project = await this.prisma.cTOAgentProject.create({
      data: {
        walletAddress: walletAddress.toLowerCase(),
        name,
        description,
        currentPhase: 'planning',
        painPoints: [],
        blockers: [],
      },
    });

    await this.trackEvent(walletAddress, 'project_created', { projectId: project.id, name });

    return this.mapProject(project);
  }

  async getProject(projectId: string, walletAddress: string): Promise<CTOProject | null> {
    const project = await this.prisma.cTOAgentProject.findFirst({
      where: {
        id: projectId,
        walletAddress: walletAddress.toLowerCase(),
      },
    });

    return project ? this.mapProject(project) : null;
  }

  async listProjects(walletAddress: string): Promise<CTOProject[]> {
    const projects = await this.prisma.cTOAgentProject.findMany({
      where: {
        walletAddress: walletAddress.toLowerCase(),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return projects.map(p => this.mapProject(p));
  }

  async updatePhase(projectId: string, walletAddress: string, phase: CTOPhase): Promise<CTOProject | null> {
    const project = await this.prisma.cTOAgentProject.findFirst({
      where: {
        id: projectId,
        walletAddress: walletAddress.toLowerCase(),
      },
    });

    if (!project) return null;

    const updated = await this.prisma.cTOAgentProject.update({
      where: { id: projectId },
      data: { currentPhase: phase },
    });

    await this.trackEvent(walletAddress, 'phase_changed', { projectId, phase });

    return this.mapProject(updated);
  }

  async addPainPoint(
    projectId: string,
    walletAddress: string,
    area: string,
    description: string
  ): Promise<PainPoint | null> {
    const project = await this.prisma.cTOAgentProject.findFirst({
      where: {
        id: projectId,
        walletAddress: walletAddress.toLowerCase(),
      },
    });

    if (!project) return null;

    const painPoints = (project.painPoints as any[]) || [];
    const newPainPoint: PainPoint = {
      area,
      description,
      resolved: false,
      createdAt: new Date().toISOString(),
    };

    painPoints.push(newPainPoint);

    await this.prisma.cTOAgentProject.update({
      where: { id: projectId },
      data: { painPoints: painPoints as any },
    });

    await this.trackEvent(walletAddress, 'pain_point_reported', {
      projectId,
      area,
      description,
    });

    return newPainPoint;
  }

  async resolvePainPoint(
    projectId: string,
    walletAddress: string,
    index: number
  ): Promise<boolean> {
    const project = await this.prisma.cTOAgentProject.findFirst({
      where: {
        id: projectId,
        walletAddress: walletAddress.toLowerCase(),
      },
    });

    if (!project) return false;

    const painPoints = (project.painPoints as any[]) || [];
    if (index >= painPoints.length) return false;

    painPoints[index].resolved = true;

    await this.prisma.cTOAgentProject.update({
      where: { id: projectId },
      data: { painPoints: painPoints as any },
    });

    return true;
  }

  async addBlocker(
    projectId: string,
    walletAddress: string,
    description: string
  ): Promise<Blocker | null> {
    const project = await this.prisma.cTOAgentProject.findFirst({
      where: {
        id: projectId,
        walletAddress: walletAddress.toLowerCase(),
      },
    });

    if (!project) return null;

    const blockers = (project.blockers as any[]) || [];
    const newBlocker: Blocker = {
      description,
      resolved: false,
      createdAt: new Date().toISOString(),
    };

    blockers.push(newBlocker);

    await this.prisma.cTOAgentProject.update({
      where: { id: projectId },
      data: { blockers: blockers as any },
    });

    await this.trackEvent(walletAddress, 'blocker_reported', { projectId, description });

    return newBlocker;
  }

  async resolveBlocker(
    projectId: string,
    walletAddress: string,
    index: number
  ): Promise<boolean> {
    const project = await this.prisma.cTOAgentProject.findFirst({
      where: {
        id: projectId,
        walletAddress: walletAddress.toLowerCase(),
      },
    });

    if (!project) return false;

    const blockers = (project.blockers as any[]) || [];
    if (index >= blockers.length) return false;

    blockers[index].resolved = true;

    await this.prisma.cTOAgentProject.update({
      where: { id: projectId },
      data: { blockers: blockers as any },
    });

    return true;
  }

  async completeProject(projectId: string, walletAddress: string): Promise<boolean> {
    const project = await this.prisma.cTOAgentProject.findFirst({
      where: {
        id: projectId,
        walletAddress: walletAddress.toLowerCase(),
      },
    });

    if (!project) return false;

    await this.prisma.cTOAgentProject.update({
      where: { id: projectId },
      data: {
        completedAt: new Date(),
        currentPhase: 'launch',
      },
    });

    await this.trackEvent(walletAddress, 'mvp_launched', { projectId });

    return true;
  }

  getPhasePrompt(phase: CTOPhase): string {
    return PHASE_PROMPTS[phase];
  }

  getAreasOfExpertise(): string[] {
    return AREAS_OF_EXPERTISE;
  }

  getAvailablePhases(): CTOPhase[] {
    return ['planning', 'architecture', 'development', 'testing', 'launch'];
  }

  private mapProject(project: any): CTOProject {
    return {
      id: project.id,
      walletAddress: project.walletAddress,
      name: project.name,
      description: project.description,
      currentPhase: project.currentPhase,
      painPoints: (project.painPoints as any[]) || [],
      blockers: (project.blockers as any[]) || [],
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      completedAt: project.completedAt,
    };
  }

  // ==================== INSIGHTS ====================

  async createInsight(data: {
    title: string;
    content: string;
    category: string;
    walletAddress?: string;
  }) {
    return this.prisma.cTOInsight.create({
      data: {
        title: data.title,
        content: data.content,
        category: data.category,
        walletAddress: data.walletAddress || null,
        status: 'draft', // Default to draft for review
      },
    });
  }

  async listInsights(status?: string) {
    const where = status ? { status } : { status: 'published' };
    return this.prisma.cTOInsight.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInsight(id: string) {
    return this.prisma.cTOInsight.findUnique({
      where: { id },
    });
  }

  async updateInsightStatus(id: string, status: string, walletAddress?: string) {
    // Only allow owner or admin to update
    const insight = await this.prisma.cTOInsight.findUnique({ where: { id } });
    if (!insight) return null;
    
    // Allow updating if: no wallet required OR owner OR status changing to published
    if (status === 'published' || insight.walletAddress === walletAddress) {
      return this.prisma.cTOInsight.update({
        where: { id },
        data: { status },
      });
    }
    return null;
  }

  async upvoteInsight(id: string) {
    return this.prisma.cTOInsight.update({
      where: { id },
      data: { upvotes: { increment: 1 } },
    });
  }

  async deleteInsight(id: string, walletAddress: string) {
    const insight = await this.prisma.cTOInsight.findUnique({ where: { id } });
    if (!insight || insight.walletAddress !== walletAddress) return false;
    
    await this.prisma.cTOInsight.delete({ where: { id } });
    return true;
  }

  private async trackEvent(walletAddress: string, eventType: string, metadata: Record<string, any>): Promise<void> {
    try {
      await this.analytics.trackEvent({
        eventType: eventType as any,
        source: 'cto_agent',
        walletAddress,
        metadata,
      });
    } catch (error) {
      console.error('[CTO Agent] Failed to track event:', error);
    }
  }
}

export default CTOAgentService;
