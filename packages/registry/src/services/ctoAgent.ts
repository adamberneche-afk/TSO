/**
 * CTO Agent Service
 * Full app development partner with chat interface
 * User provides their own LLM API key with spend caps
 */

import { PrismaClient } from '@prisma/client';
import { AnalyticsService } from './analytics';

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
}

export class CTOAgentService {
  private prisma: PrismaClient;
  private analytics: AnalyticsService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.analytics = new AnalyticsService(prisma);
  }

  // Service info methods
  getAvailablePhases(): CTOPhase[] {
    return ['planning', 'architecture', 'development', 'testing', 'launch'];
  }

  getPhasePrompt(phase: CTOPhase): string {
    const prompts: Record<CTOPhase, string> = {
      planning: 'You are a strategic planning expert helping define project scope, requirements, and roadmap.',
      architecture: 'You are a software architect helping design system architecture, technology stack, and infrastructure.',
      development: 'You are a senior developer helping write code, debug issues, and implement features.',
      testing: 'You are a QA engineer helping create test plans, identify bugs, and ensure quality.',
      launch: 'You are a product launch expert helping with deployment, marketing, and post-launch activities.'
    };
    return prompts[phase];
  }

  getAreasOfExpertise(): string[] {
    return [
      'Full-stack web development',
      'Mobile app development',
      'DevOps and infrastructure',
      'Database design and optimization',
      'API design and integration',
      'UI/UX design',
      'Security and compliance',
      'Performance optimization',
      'Testing and quality assurance',
      'Project management and agile methodologies'
    ];
  }

  // Project management methods
  async createProject(walletAddress: string, name: string, description?: string): Promise<CTOProject> {
    try {
      const project = await this.prisma.cTOProject.create({
        data: {
          walletAddress: walletAddress.toLowerCase(),
          name,
          description,
          currentPhase: 'planning'
        }
      });

      // Track event
      await this.analytics.trackEvent({
        eventType: 'mvp_launched',
        source: 'cto_agent',
        walletAddress: walletAddress,
        metadata: { projectId: project.id, projectName: name }
      });

      return {
        id: project.id,
        walletAddress: project.walletAddress,
        name: project.name,
        description: project.description,
        currentPhase: project.currentPhase as CTOPhase
      };
    } catch (error) {
      console.error('[CTO Agent] Failed to create project:', error);
      throw error;
    }
  }

  async getUserProjects(walletAddress: string): Promise<CTOProject[]> {
    try {
      const projects = await this.prisma.cTOProject.findMany({
        where: {
          walletAddress: walletAddress.toLowerCase()
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return projects.map(p => ({
        id: p.id,
        walletAddress: p.walletAddress,
        name: p.name,
        description: p.description,
        currentPhase: p.currentPhase as CTOPhase
      }));
    } catch (error) {
      console.error('[CTO Agent] Failed to get user projects:', error);
      throw error;
    }
  }

  async getProjectDetails(id: string): Promise<CTOProject | null> {
    try {
      const project = await this.prisma.cTOProject.findUnique({
        where: { id }
      });

      if (!project) {
        return null;
      }

      return {
        id: project.id,
        walletAddress: project.walletAddress,
        name: project.name,
        description: project.description,
        currentPhase: project.currentPhase as CTOPhase
      };
    } catch (error) {
      console.error('[CTO Agent] Failed to get project details:', error);
      throw error;
    }
  }

  async updateProjectPhase(id: string, phase: CTOPhase): Promise<CTOProject | null> {
    try {
      const project = await this.prisma.cTOProject.update({
        where: { id },
        data: {
          currentPhase: phase
        }
      });

      return {
        id: project.id,
        walletAddress: project.walletAddress,
        name: project.name,
        description: project.description,
        currentPhase: project.currentPhase as CTOPhase
      };
    } catch (error) {
      console.error('[CTO Agent] Failed to update project phase:', error);
      throw error;
    }
  }

  // Pain point methods
  async addPainPoint(projectId: string, area: string, description: string): Promise<PainPoint | null> {
    try {
      const painPoint = await this.prisma.painPoint.create({
        data: {
          projectId,
          area,
          description,
          resolved: false
        }
      });

      return {
        area: painPoint.area,
        description: painPoint.description,
        resolved: painPoint.resolved,
        createdAt: painPoint.createdAt.toISOString()
      };
    } catch (error) {
      console.error('[CTO Agent] Failed to add pain point:', error);
      throw error;
    }
  }

  async resolvePainPoint(projectId: string, painPointId: string): Promise<PainPoint | null> {
    try {
      const painPoint = await this.prisma.painPoint.update({
        where: { id: painPointId, projectId },
        data: {
          resolved: true
        }
      });

      return {
        area: painPoint.area,
        description: painPoint.description,
        resolved: painPoint.resolved,
        createdAt: painPoint.createdAt.toISOString()
      };
    } catch (error) {
      console.error('[CTO Agent] Failed to resolve pain point:', error);
      throw error;
    }
  }

  // Blocker methods
  async addBlocker(projectId: string, description: string): Promise<Blocker | null> {
    try {
      const blocker = await this.prisma.blocker.create({
        data: {
          projectId,
          description,
          resolved: false
        }
      });

      return {
        description: blocker.description,
        resolved: blocker.resolved,
        createdAt: blocker.createdAt.toISOString()
      };
    } catch (error) {
      console.error('[CTO Agent] Failed to add blocker:', error);
      throw error;
    }
  }

  async resolveBlocker(projectId: string, blockerId: string): Promise<Blocker | null> {
    try {
      const blocker = await this.prisma.blocker.update({
        where: { id: blockerId, projectId },
        data: {
          resolved: true
        }
      });

      return {
        description: blocker.description,
        resolved: blocker.resolved,
        createdAt: blocker.createdAt.toISOString()
      };
    } catch (error) {
      console.error('[CTO Agent] Failed to resolve blocker:', error);
      throw error;
    }
  }
}