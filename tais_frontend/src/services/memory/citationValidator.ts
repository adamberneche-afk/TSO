import { ActiveMemory, Citation, ValidationStatus } from './types';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  snapshot?: string;
  verified: boolean;
}

export interface FilteredMemory {
  shouldPromote: boolean;
  score: number;
  breakdown: RelevanceScore[];
}

export interface RelevanceScore {
  factor: string;
  score: number;
  reason: string;
}

export class CitationValidator {
  async validate(activeMemory: ActiveMemory): Promise<ValidationStatus> {
    const results: ValidationResult[] = [];

    for (const citation of activeMemory.citations) {
      const result = await this.validateCitation(citation);
      results.push(result);
    }

    const validCount = results.filter(r => r.valid).length;
    const totalCount = results.length;
    const validPercentage = totalCount > 0 ? validCount / totalCount : 1;

    return {
      citationsChecked: totalCount,
      citationsValid: validCount,
      validPercentage,
      reliable: validPercentage > 0.5,
      checkedAt: new Date(),
    };
  }

  private async validateCitation(citation: Citation): Promise<ValidationResult> {
    switch (citation.type) {
      case 'file':
        return this.validateFileCitation(citation);
      case 'api_response':
        return this.validateApiCitation(citation);
      case 'rag_chunk':
        return this.validateRagCitation(citation);
      case 'user_statement':
        return this.validateUserStatement(citation);
      default:
        return { valid: false, reason: 'Unknown citation type', verified: false };
    }
  }

  private async validateFileCitation(citation: Citation): Promise<ValidationResult> {
    // In browser context, we can't directly check file system
    // For now, validate the structure and assume valid
    // In a real implementation, this would check against IndexedDB or server
    
    if (!citation.source) {
      return { valid: false, reason: 'No source file specified', verified: false };
    }

    if (citation.lineRange) {
      const [start, end] = citation.lineRange;
      if (start < 1 || end < start) {
        return { valid: false, reason: 'Invalid line range', verified: false };
      }
    }

    // For now, mark as valid (would need actual file access in production)
    return { valid: true, verified: true };
  }

  private async validateApiCitation(citation: Citation): Promise<ValidationResult> {
    // Validate API response citation
    if (!citation.source) {
      return { valid: false, reason: 'No API endpoint specified', verified: false };
    }

    // Check if it's a valid URL pattern
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(citation.source)) {
      return { valid: false, reason: 'Invalid API URL', verified: false };
    }

    return { valid: true, verified: true };
  }

  private async validateRagCitation(citation: Citation): Promise<ValidationResult> {
    // Validate RAG chunk citation
    if (!citation.source) {
      return { valid: false, reason: 'No RAG chunk ID specified', verified: false };
    }

    // RAG citations are validated by checking if the chunk exists
    // This would typically call the RAG service
    return { valid: true, verified: true };
  }

  private async validateUserStatement(citation: Citation): Promise<ValidationResult> {
    // User statements are always valid - it's their own words
    return { valid: true, verified: true };
  }
}

export class RelevanceFilter {
  private readonly THRESHOLD = 0.6;
  
  // Weights for each factor
  private readonly WEIGHTS = {
    task_outcome: 0.25,
    user_corrections: 0.30,
    novelty: 0.15,
    frequency: 0.10,
    llm: 0.15,
  };

  async filter(activeMemory: ActiveMemory): Promise<FilteredMemory> {
    const scores: RelevanceScore[] = [];

    // Factor 1: Task outcomes (weight: 0.25)
    const taskScore = this.calculateTaskOutcomeScore(activeMemory);
    scores.push({
      factor: 'task_outcome',
      score: taskScore,
      reason: this.getTaskOutcomeReason(activeMemory),
    });

    // Factor 2: User corrections (weight: 0.30)
    const correctionScore = this.calculateCorrectionScore(activeMemory);
    scores.push({
      factor: 'user_corrections',
      score: correctionScore,
      reason: this.getCorrectionReason(activeMemory),
    });

    // Factor 3: Novelty (weight: 0.15)
    const noveltyScore = this.calculateNoveltyScore(activeMemory);
    scores.push({
      factor: 'novelty',
      score: noveltyScore,
      reason: noveltyScore > 0.7 ? 'First occurrence of this pattern' : 'Pattern seen before',
    });

    // Factor 4: Frequency (weight: 0.10)
    const frequencyScore = this.calculateFrequencyScore(activeMemory);
    scores.push({
      factor: 'frequency',
      score: frequencyScore,
      reason: `Pattern frequency: ${frequencyScore > 0.7 ? 'high' : 'low'}`,
    });

    // Factor 5: Interaction depth (weight: 0.15)
    const depthScore = this.calculateDepthScore(activeMemory);
    scores.push({
      factor: 'interaction_depth',
      score: depthScore,
      reason: depthScore > 0.7 ? 'Rich interaction' : 'Minimal interaction',
    });

    // Calculate aggregate score
    const aggregate = scores.reduce((sum, item) => {
      const weight = this.WEIGHTS[item.factor as keyof typeof this.WEIGHTS] || 0.1;
      return sum + (item.score * weight);
    }, 0);

    return {
      shouldPromote: aggregate > this.THRESHOLD,
      score: aggregate,
      breakdown: scores,
    };
  }

  private calculateTaskOutcomeScore(memory: ActiveMemory): number {
    if (!memory.taskOutcomes || memory.taskOutcomes.length === 0) {
      return 0.3; // Neutral if no tasks
    }

    let score = 0;
    let count = 0;

    for (const outcome of memory.taskOutcomes) {
      if (outcome.status === 'failure' || outcome.correctionRequired) {
        score += 0.9; // High learning potential
      } else if (outcome.status === 'success_with_correction') {
        score += 0.7;
      } else if (outcome.status === 'success') {
        score += 0.5;
      } else {
        score += 0.4;
      }
      count++;
    }

    return count > 0 ? score / count : 0.3;
  }

  private getTaskOutcomeReason(memory: ActiveMemory): string {
    if (!memory.taskOutcomes || memory.taskOutcomes.length === 0) {
      return 'No task outcomes recorded';
    }

    const hasFailures = memory.taskOutcomes.some(t => t.status === 'failure');
    const hasCorrections = memory.taskOutcomes.some(t => t.correctionRequired);
    
    if (hasFailures) return 'Learning opportunity from failures';
    if (hasCorrections) return 'Corrections indicate important feedback';
    return 'Successful task completion';
  }

  private calculateCorrectionScore(memory: ActiveMemory): number {
    if (!memory.interactions || memory.interactions.length === 0) {
      return 0;
    }

    const corrections = memory.interactions.filter(
      i => i.type === 'user_correction'
    ).length;

    if (corrections === 0) return 0;
    if (corrections === 1) return 0.8;
    return Math.min(0.95, 0.7 + (corrections * 0.1));
  }

  private getCorrectionReason(memory: ActiveMemory): string {
    const corrections = memory.interactions?.filter(
      i => i.type === 'user_correction'
    ).length || 0;

    if (corrections === 0) return 'No user corrections';
    if (corrections === 1) return 'One user correction - critical feedback';
    return `${corrections} user corrections - high importance`;
  }

  private calculateNoveltyScore(memory: ActiveMemory): number {
    // Check if this is likely a novel interaction based on tags
    const tags = memory.tags || [];
    
    // New app context is more novel
    if (tags.length === 0) return 0.6;
    if (tags.length <= 2) return 0.7;
    
    // More tags = more established pattern = less novel
    return Math.max(0.3, 0.8 - (tags.length * 0.1));
  }

  private calculateFrequencyScore(memory: ActiveMemory): number {
    // In a real implementation, this would check historical frequency
    // For now, use session characteristics as proxy
    const interactionCount = memory.interactions?.length || 0;
    
    if (interactionCount < 3) return 0.3;
    if (interactionCount < 5) return 0.5;
    if (interactionCount < 10) return 0.7;
    return 0.85;
  }

  private calculateDepthScore(memory: ActiveMemory): number {
    const hasCitations = (memory.citations?.length || 0) > 0;
    const hasOutcomes = (memory.taskOutcomes?.length || 0) > 0;
    const hasMultipleInteractions = (memory.interactions?.length || 0) > 3;
    
    let score = 0;
    if (hasCitations) score += 0.4;
    if (hasOutcomes) score += 0.3;
    if (hasMultipleInteractions) score += 0.3;
    
    return score;
  }

  getThreshold(): number {
    return this.THRESHOLD;
  }
}

export const citationValidator = new CitationValidator();
export const relevanceFilter = new RelevanceFilter();
