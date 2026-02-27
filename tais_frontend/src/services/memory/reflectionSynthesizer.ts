import { ActiveMemory, ReflectiveMemory, Learning, Decision, Correction, Pattern, Reflection } from './types';

export interface ReflectionPrompt {
  sessionSummary: {
    appContext: string;
    durationMinutes: number;
    conversationSummary: string;
    userGoals: string[];
  };
  taskOutcomes: Array<{
    task: string;
    status: string;
    correctionRequired: boolean;
    learning?: string;
  }>;
  corrections: string[];
  userProfile?: string;
}

export class ReflectionSynthesizer {
  private llmEndpoint: string;
  private apiKey?: string;

  constructor(options?: { endpoint?: string; apiKey?: string }) {
    this.llmEndpoint = options?.endpoint || '/api/llm/generate';
    this.apiKey = options?.apiKey;
  }

  async generate(
    memory: ActiveMemory,
    userProfile?: string
  ): Promise<Reflection> {
    const prompt = this.buildPrompt({
      sessionSummary: memory.sessionSummary,
      taskOutcomes: memory.taskOutcomes.map(t => ({
        task: t.task,
        status: t.status,
        correctionRequired: t.correctionRequired,
        learning: t.learning,
      })),
      corrections: memory.interactions
        .filter(i => i.type === 'user_correction')
        .map(i => i.content),
      userProfile,
    });

    // In a real implementation, this would call an LLM
    // For now, generate a basic reflection
    const reflection = await this.generateBasicReflection(memory);

    return reflection;
  }

  private buildPrompt(data: ReflectionPrompt): string {
    return `
You are reflecting on a recent interaction session with the user.

Session Summary:
- App: ${data.sessionSummary.appContext}
- Duration: ${data.sessionSummary.durationMinutes} minutes
- Summary: ${data.sessionSummary.conversationSummary}
- User Goals: ${data.sessionSummary.userGoals.join(', ') || 'None specified'}

Task Outcomes:
${data.taskOutcomes.map(t => `- ${t.task}: ${t.status}${t.learning ? ` (Learning: ${t.learning})` : ''}`).join('\n')}

User Corrections:
${data.corrections.length > 0 ? data.corrections.map(c => `- ${c}`).join('\n') : 'None'}

${data.userProfile ? `User's Profile:\n${data.userProfile}` : ''}

Task: Extract actionable insights in JSON format:

{
  "learnings": [
    {
      "type": "preference" | "constraint" | "workflow" | "communication_style",
      "content": "Concise, actionable statement",
      "confidence": 0.0-1.0,
      "evidence": ["Evidence IDs"],
      "actionableImplication": "How this should inform future behavior",
      "applicableContexts": ["app1", "app2"]
    }
  ],
  "decisions": [
    {
      "what": "What was decided",
      "why": "The reasoning",
      "success": true | false,
      "futureImplications": "How this affects similar decisions"
    }
  ],
  "corrections": [
    {
      "whatWasWrong": "Initial approach",
      "userCorrection": "What user said",
      "rootCause": "Why the mistake happened",
      "preventionStrategy": "How to avoid in future"
    }
  ],
  "patterns": [
    {
      "pattern": "Description",
      "frequency": number,
      "recommendation": "How to leverage"
    }
  ]
}
`;
  }

  private async generateBasicReflection(memory: ActiveMemory): Promise<Reflection> {
    const learnings: Learning[] = [];
    const decisions: Decision[] = [];
    const corrections: Correction[] = [];
    const patterns: Pattern[] = [];

    // Extract learnings from task outcomes
    for (const outcome of memory.taskOutcomes || []) {
      if (outcome.learning) {
        learnings.push({
          type: 'workflow',
          content: outcome.learning,
          confidence: outcome.status === 'success' ? 0.7 : 0.85,
          evidence: [outcome.task],
          citations: [],
          actionableImplication: `Apply this learning to future ${outcome.task} tasks`,
          applicableContexts: [memory.sessionSummary.appContext],
        });
      }

      if (outcome.status === 'success' || outcome.status === 'success_with_correction') {
        decisions.push({
          what: outcome.task,
          why: 'User-requested task',
          alternativesConsidered: [],
          success: outcome.status === 'success',
          correctionsApplied: outcome.correctionRequired ? ['User provided guidance'] : [],
          futureImplications: 'Continue similar approach for comparable tasks',
        });
      }
    }

    // Extract corrections
    const userCorrections = (memory.interactions || []).filter(
      i => i.type === 'user_correction'
    );
    
    for (const correction of userCorrections) {
      corrections.push({
        whatWasWrong: 'Initial approach did not meet user expectations',
        userCorrection: correction.content,
        rootCause: 'Insufficient understanding of user preferences',
        preventionStrategy: 'Ask clarifying questions before proceeding',
      });

      learnings.push({
        type: 'preference',
        content: `User corrected: ${correction.content.substring(0, 100)}`,
        confidence: 0.9,
        evidence: [correction.timestamp.toString()],
        citations: [],
        actionableImplication: 'Consider this preference in future interactions',
        applicableContexts: [memory.sessionSummary.appContext],
      });
    }

    // Generate patterns from goals
    for (const goal of memory.sessionSummary.userGoals || []) {
      patterns.push({
        pattern: `User goal: ${goal}`,
        frequency: 1,
        confidence: 0.6,
        recommendation: `Work towards completing ${goal}`,
        examples: [memory.memoryId],
      });
    }

    // Add communication style learning if there were interactions
    if ((memory.interactions?.length || 0) > 3) {
      learnings.push({
        type: 'communication_style',
        content: 'User engaged in detailed conversation',
        confidence: 0.7,
        evidence: [`${memory.interactions.length} interactions`],
        citations: [],
        actionableImplication: 'User values thorough responses',
        applicableContexts: [memory.sessionSummary.appContext],
      });
    }

    return {
      learnings,
      decisions,
      corrections,
      patterns,
      contradictions: [],
    };
  }

  async callLLM(prompt: string): Promise<string> {
    // This would integrate with the existing LLM client
    // For now, return empty to use basic reflection
    console.log('LLM prompt (truncated):', prompt.substring(0, 500) + '...');
    return '';
  }
}

export const reflectionSynthesizer = new ReflectionSynthesizer();
