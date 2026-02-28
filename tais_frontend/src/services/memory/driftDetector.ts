import { CoreMemoryAPI } from './memoryAPI';
import type { CoreMemory, MetaMemory } from './types';

export type Severity = 'low' | 'medium' | 'high';
export type ChallengeStrategy = 'gentle_nudge' | 'socratic_challenge' | 'strong_challenge' | 'none';

export interface DriftAnalysis {
  hasDrift: boolean;
  severity: Severity;
  strategy: ChallengeStrategy;
  anomalies: DriftAnomaly[];
  evidence: DriftEvidence;
}

export interface DriftAnomaly {
  type: 'core_contradiction' | 'pattern_deviation';
  memory?: CoreMemory;
  pattern?: BehaviorPattern;
  severity: Severity;
  explanation: string;
}

export interface BehaviorPattern {
  description: string;
  frequency: number;
  examples: string[];
}

export interface DriftEvidence {
  contradictedMemories: Array<{
    memoryId: string;
    content: string;
    promotedAt: string;
    mutability: string;
  }>;
  recentPattern: BehaviorPattern | null;
  timeline: Array<{
    date: string;
    event: string;
  }>;
}

export interface ProposedAction {
  type: string;
  context: string;
  timestamp: Date;
}

export class DriftDetector {
  private coreAPI: CoreMemoryAPI;
  private recentBehavior: ProposedAction[] = [];

  constructor() {
    this.coreAPI = new CoreMemoryAPI();
  }

  async analyzeAction(proposedAction: ProposedAction): Promise<DriftAnalysis> {
    // Add to recent behavior
    this.recentBehavior.push(proposedAction);
    
    // Keep only last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    this.recentBehavior = this.recentBehavior.filter(
      a => a.timestamp > thirtyDaysAgo
    );

    // Load core memories
    const coreMemories = await this.coreAPI.list();
    
    if (coreMemories.length === 0) {
      return {
        hasDrift: false,
        severity: 'low',
        strategy: 'none',
        anomalies: [],
        evidence: {
          contradictedMemories: [],
          recentPattern: null,
          timeline: [],
        },
      };
    }

    const anomalies: DriftAnomaly[] = [];

    // Check each core memory for contradictions
    for (const core of coreMemories) {
      const contradiction = await this.checkContradiction(proposedAction, core);
      if (contradiction) {
        anomalies.push({
          type: 'core_contradiction',
          memory: core,
          severity: this.calculateSeverity(core),
          explanation: contradiction,
        });
      }
    }

    // Check for pattern deviation
    const pattern = this.analyzePattern();
    if (pattern && pattern.frequency > 5) {
      const deviation = await this.checkDeviation(proposedAction, pattern);
      if (deviation) {
        anomalies.push({
          type: 'pattern_deviation',
          pattern,
          severity: 'low',
          explanation: deviation,
        });
      }
    }

    // No drift detected
    if (anomalies.length === 0) {
      return {
        hasDrift: false,
        severity: 'low',
        strategy: 'none',
        anomalies: [],
        evidence: {
          contradictedMemories: [],
          recentPattern: pattern,
          timeline: this.buildTimeline(coreMemories),
        },
      };
    }

    // Determine max severity
    const severities: Record<Severity, number> = { low: 1, medium: 2, high: 3 };
    const maxSeverity = anomalies.reduce((max, a) => 
      severities[a.severity] > severities[max] ? a.severity : max
    , 'low' as Severity);

    // Select strategy
    const strategy = this.selectStrategy(maxSeverity);

    // Compile evidence
    const evidence = this.compileEvidence(anomalies, coreMemories);

    return {
      hasDrift: true,
      severity: maxSeverity,
      strategy,
      anomalies,
      evidence,
    };
  }

  private async checkContradiction(action: ProposedAction, core: CoreMemory): Promise<string | null> {
    // Simple keyword-based contradiction detection
    // In production, this would use semantic similarity
    
    const actionLower = action.type.toLowerCase() + ' ' + action.context.toLowerCase();
    const memoryContent = core.content.toLowerCase();

    // Check for explicit contradictions
    const contradictionPatterns = [
      { positive: 'prioritize enterprise', negative: 'consumer first' },
      { positive: 'mobile first', negative: 'web only' },
      { positive: 'brief responses', negative: 'detailed explanation' },
      { positive: 'no sharing', negative: 'share with team' },
      { positive: 'never send email', negative: 'send email' },
    ];

    for (const pattern of contradictionPatterns) {
      const hasPositive = memoryContent.includes(pattern.positive);
      const hasNegative = actionLower.includes(pattern.negative);
      
      if (hasPositive && hasNegative) {
        return `Action contradicts core memory: "${core.content}"`;
      }

      const hasNegative2 = actionLower.includes(pattern.positive.split(' ')[0]) && 
        !memoryContent.includes(pattern.positive);
      if (hasNegative2 && memoryContent.includes(pattern.negative)) {
        return `Action contradicts core memory: "${core.content}"`;
      }
    }

    return null;
  }

  private calculateSeverity(core: CoreMemory): Severity {
    const ageDays = (Date.now() - new Date(core.promotedAt).getTime()) / (1000 * 60 * 60 * 24);

    // Eternal → always high
    if (core.mutability === 'eternal') {
      return 'high';
    }

    // Recent + high confidence → high
    if (ageDays < 7 && core.confidence > 0.9) {
      return 'high';
    }

    // Stable or Adaptive → medium
    if (core.mutability === 'stable' || core.mutability === 'adaptive') {
      return 'medium';
    }

    // Experimental or old → low
    return 'low';
  }

  private selectStrategy(severity: Severity): ChallengeStrategy {
    switch (severity) {
      case 'high':
        return 'strong_challenge';
      case 'medium':
        return 'socratic_challenge';
      case 'low':
        return 'gentle_nudge';
      default:
        return 'none';
    }
  }

  private analyzePattern(): BehaviorPattern | null {
    if (this.recentBehavior.length < 3) {
      return null;
    }

    // Group by action type
    const typeCounts: Record<string, number> = {};
    for (const action of this.recentBehavior) {
      typeCounts[action.type] = (typeCounts[action.type] || 0) + 1;
    }

    // Find most frequent
    let maxType = '';
    let maxCount = 0;
    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxType = type;
      }
    }

    if (maxCount < 3) {
      return null;
    }

    const examples = this.recentBehavior
      .filter(a => a.type === maxType)
      .slice(-5)
      .map(a => a.context);

    return {
      description: `Frequently performs ${maxType} actions`,
      frequency: maxCount,
      examples,
    };
  }

  private async checkDeviation(action: ProposedAction, pattern: BehaviorPattern): Promise<string | null> {
    if (action.type !== pattern.examples[0]?.split(' ')[0]) {
      return `You typically ${pattern.description.toLowerCase()}, but now doing something different`;
    }
    return null;
  }

  private compileEvidence(anomalies: DriftAnomaly[], coreMemories: CoreMemory[]): DriftEvidence {
    return {
      contradictedMemories: anomalies
        .filter(a => a.type === 'core_contradiction' && a.memory)
        .map(a => ({
          memoryId: a.memory!.memoryId,
          content: a.memory!.content,
          promotedAt: a.memory!.promotedAt instanceof Date ? a.memory!.promotedAt.toISOString() : a.memory!.promotedAt,
          mutability: a.memory!.mutability,
        })),
      recentPattern: this.analyzePattern(),
      timeline: this.buildTimeline(coreMemories),
    };
  }

  private buildTimeline(coreMemories: CoreMemory[]): Array<{ date: string; event: string }> {
    return coreMemories
      .sort((a, b) => new Date(a.promotedAt).getTime() - new Date(b.promotedAt).getTime())
      .slice(-5)
      .map(m => ({
        date: new Date(m.promotedAt).toLocaleDateString(),
        event: `Promoted: ${m.content.substring(0, 50)}...`,
      }));
  }
}

export const driftDetector = new DriftDetector();
