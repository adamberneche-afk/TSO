/**
 * TAIS Linear Integration
 * 
 * This example demonstrates how to integrate TAIS agents with Linear
 * for AI-powered task creation and issue management.
 * 
 * Features:
 * - Natural language task creation
 * - Issue structuring from descriptions
 * - Sprint planning assistance
 * - Priority analysis
 */

import { TAISAgent } from 'tais-agent-sdk';
import { LinearClient } from '@linear/sdk';

export interface LinearIntegrationConfig {
  agent: TAISAgent;
  apiKey: string;
  teamId?: string;
}

export interface CreateTaskOptions {
  title: string;
  description?: string;
  priority?: number;
  labels?: string[];
  projectId?: string;
  assigneeId?: string;
}

export interface GenerateTasksOptions {
  topic: string;
  requirements: string;
  count?: number;
}

export interface SprintPlanOptions {
  goal: string;
  capacity: number;
}

export class LinearIntegration {
  private agent: TAISAgent;
  private linear: LinearClient;
  private teamId?: string;

  constructor(config: LinearIntegrationConfig) {
    this.agent = config.agent;
    this.linear = new LinearClient({ apiKey: config.apiKey });
    this.teamId = config.teamId;
  }

  /**
   * Create a task from natural language description
   */
  async createTask(options: CreateTaskOptions): Promise<{
    issueId: string;
    issueIdentifier: string;
    url: string;
  }> {
    const context = await this.agent.getContext();

    let description = options.description || '';

    if (!options.description) {
      const response = await this.agent.chat({
        context,
        messages: [{
          role: 'user',
          content: `Generate a detailed description for this task: "${options.title}". Include acceptance criteria and any relevant details.`
        }]
      });
      description = response.message || '';
    }

    const priorityMap: Record<number, 'no priority' | 'urgent' | 'high' | 'medium' | 'low'> = {
      0: 'no priority',
      1: 'urgent',
      2: 'high',
      3: 'medium',
      4: 'low'
    };

    const createInput: any = {
      teamId: this.teamId || process.env.LINEAR_TEAM_ID!,
      title: options.title,
      description,
      priority: options.priority ? priorityMap[options.priority] : 'no priority'
    };

    if (options.projectId) {
      createInput.projectId = options.projectId;
    }

    if (options.assigneeId) {
      createInput.assigneeId = options.assigneeId;
    }

    const issue = await (this.linear as any).createIssue(createInput);

    if (options.labels && options.labels.length > 0) {
      for (const labelName of options.labels) {
        try {
          const label = await (this.linear as any).createLabel({
            name: labelName,
            teamId: this.teamId || process.env.LINEAR_TEAM_ID!
          });
          if (issue.issue) {
            await (this.linear as any).addIssueLabel(issue.issue.id, label.label?.id || '');
          }
        } catch {
          // Label might already exist
        }
      }
    }

    await this.agent.updateMemory({
      context,
      update: {
        type: 'action',
        summary: `Created Linear task: ${options.title}`,
        details: { issueId: issue.issue?.id, identifier: issue.issue?.identifier }
      }
    });

    return {
      issueId: issue.issue?.id || '',
      issueIdentifier: issue.issue?.identifier || '',
      url: `https://linear.app/team/issue/${issue.issue?.identifier}`
    };
  }

  /**
   * Generate multiple tasks from a topic/requirements
   */
  async generateTasks(options: GenerateTasksOptions): Promise<{
    tasks: { title: string; description: string; priority: number }[];
  }> {
    const context = await this.agent.getContext();

    const count = options.count || 5;

    const response = await this.agent.chat({
      context,
      messages: [{
        role: 'user',
        content: `Generate ${count} actionable tasks/todos from this topic and requirements:\n\nTopic: ${options.topic}\n\nRequirements:\n${options.requirements}\n\nFormat each task as: "Task title - brief description (priority: 1-4 where 1 is urgent)"\n\nProvide only the tasks, no extra explanation.`
      }]
    });

    const tasks: { title: string; description: string; priority: number }[] = [];
    const lines = (response.message || '').split('\n').filter((l: string) => l.trim());

    for (const line of lines.slice(0, count)) {
      const match = line.match(/^(.+?)(?:\s*-\s*(.+?))?\s*\(priority:\s*(\d+)\)/);
      if (match) {
        tasks.push({
          title: match[1].trim(),
          description: match[2]?.trim() || '',
          priority: parseInt(match[3]) || 3
        });
      }
    }

    return { tasks };
  }

  /**
   * Create a batch of tasks
   */
  async createBatchTasks(tasks: { title: string; description?: string; priority?: number }[]): Promise<{
    created: number;
    issues: { identifier: string; url: string }[];
  }> {
    const issues: { identifier: string; url: string }[] = [];

    for (const task of tasks) {
      const result = await this.createTask({
        title: task.title,
        description: task.description,
        priority: task.priority
      });
      issues.push({
        identifier: result.issueIdentifier,
        url: result.url
      });
    }

    return {
      created: tasks.length,
      issues
    };
  }

  /**
   * Get sprint planning suggestions
   */
  async getSprintPlan(options: SprintPlanOptions): Promise<{
    suggestedTasks: { title: string; estimate: number; priority: number }[];
    totalEstimate: number;
    recommendation: string;
  }> {
    const context = await this.agent.getContext();

    const response = await this.agent.chat({
      context,
      messages: [{
        role: 'user',
        content: `Help plan a sprint with capacity of ${options.capacity} points for this goal:\n\n"${options.goal}"\n\nSuggest tasks with story point estimates (1, 2, 3, 5, 8, 13). Prioritize based on dependencies. Respond with JSON: {"tasks": [{"title": "...", "estimate": 3, "priority": 1}], "recommendation": "..."}`
      }]
    });

    try {
      const parsed = JSON.parse(response.message || '{}');
      const tasks = parsed.tasks || [];
      const totalEstimate = tasks.reduce((sum: number, t: any) => sum + (t.estimate || 0), 0);

      return {
        suggestedTasks: tasks,
        totalEstimate,
        recommendation: parsed.recommendation || 'Start with high priority items first.'
      };
    } catch {
      return {
        suggestedTasks: [],
        totalEstimate: 0,
        recommendation: 'Unable to generate plan. Try being more specific about requirements.'
      };
    }
  }

  /**
   * Analyze issue priority based on context
   */
  async analyzePriority(title: string, description: string): Promise<{
    priority: number;
    reasoning: string;
    suggestedLabels: string[];
  }> {
    const context = await this.agent.getContext();

    const response = await this.agent.chat({
      context,
      messages: [{
        role: 'user',
        content: `Analyze this issue and determine priority:\n\nTitle: ${title}\nDescription: ${description}\n\nRespond with JSON: {"priority": 1-4 (1=urgent), "reasoning": "...", "labels": ["bug", "feature", "enhancement", etc.]}\n\nConsider: impact, urgency, effort, user value.`
      }]
    });

    try {
      const parsed = JSON.parse(response.message || '{}');
      return {
        priority: parsed.priority || 3,
        reasoning: parsed.reasoning || 'Medium priority by default',
        suggestedLabels: parsed.labels || []
      };
    } catch {
      return {
        priority: 3,
        reasoning: 'Unable to analyze, defaulting to medium',
        suggestedLabels: []
      };
    }
  }

  /**
   * Get user's assigned issues
   */
  async getMyIssues(): Promise<any[]> {
    const me = await (this.linear as any).me();
    const userId = me.user?.id;

    if (!userId) return [];

    const result = await this.linear.issues({
      filter: {
        assignee: { id: { eq: userId } },
        state: { name: { ne: 'Done' } as any }
      }
    });

    return result.nodes?.map((issue: any) => ({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      state: issue.state?.name,
      priority: issue.priority,
      createdAt: issue.createdAt
    })) || [];
  }

  /**
   * Update issue status
   */
  async updateIssueStatus(issueId: string, newStateName: string): Promise<boolean> {
    const states = await (this.linear as any).states();
    const targetState = states.nodes?.find((s: any) => 
      s.name.toLowerCase() === newStateName.toLowerCase()
    );

    if (!targetState) return false;

    await (this.linear as any).updateIssue(issueId, {
      stateId: targetState.id
    });

    return true;
  }
}

/**
 * Quick start example
 */
export async function example() {
  const agent = new TAISAgent({
    appId: process.env.TAIS_APP_ID!,
    appSecret: process.env.TAIS_APP_SECRET!,
    appName: 'Linear Bot',
    redirectUri: 'http://localhost:3000/callback'
  });

  const linear = new LinearIntegration({
    agent,
    apiKey: process.env.LINEAR_API_KEY!,
    teamId: process.env.LINEAR_TEAM_ID
  });

  // Create a task
  const task = await linear.createTask({
    title: 'Fix login bug',
    description: 'Users cannot login with OAuth',
    priority: 1
  });

  console.log('Created:', task.url);

  // Generate multiple tasks from requirements
  const { tasks } = await linear.generateTasks({
    topic: 'User Authentication',
    requirements: 'Implement OAuth, password reset, 2FA',
    count: 5
  });

  console.log('Generated tasks:', tasks);

  // Create batch
  const batch = await linear.createBatchTasks(tasks.map(t => ({
    title: t.title,
    description: t.description,
    priority: t.priority
  })));

  console.log('Created:', batch.created, 'tasks');
}
