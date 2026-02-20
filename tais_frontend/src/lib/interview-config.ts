// TAIS Platform - Interview to Config Mapping

import { AgentConfig, InterviewAnswers, Personality } from '../types/agent';
import { AgentConfigSchema } from './config-schema';
import { generateDefaultPersonality } from '../services/personalityCompiler';

// Helper functions to map slider values (0-100) to enums
function mapSliderToTone(value: number): Personality['tone'] {
  if (value < 33) return 'direct';
  if (value < 66) return 'balanced';
  return 'conversational';
}

function mapSliderToVerbosity(value: number): Personality['verbosity'] {
  if (value < 33) return 'brief';
  if (value < 66) return 'balanced';
  return 'detailed';
}

function mapSliderToFormality(value: number): Personality['formality'] {
  if (value < 33) return 'casual';
  if (value < 66) return 'balanced';
  return 'professional';
}

export function generateAgentConfig(answers: InterviewAnswers): AgentConfig {
  const personality: Personality = {
    tone: mapSliderToTone(answers.personality.tone),
    verbosity: mapSliderToVerbosity(answers.personality.verbosity),
    formality: mapSliderToFormality(answers.personality.formality),
  };

  const personalityMd = answers.usePersonalityMd && answers.personalityMd
    ? answers.personalityMd
    : generateDefaultPersonality(answers.name, personality, answers.goals);

  const config: AgentConfig = {
    agent: {
      name: answers.name,
      version: '1.0.0',
      description: answers.description,
      goals: answers.goals,
      skills: answers.skills.map(skill => ({
        id: skill.id,
        source: 'registry' as const,
        version: skill.version,
        hash: skill.skillHash,
        permissions: Object.keys(skill.permissions || {}),
        trustScore: skill.trustScore,
      })),
      personality,
      personalityMd,
      personalityVersion: 1,
      autonomy: {
        level: answers.autonomy,
      },
      constraints: {
        privacy: answers.privacy,
        maxCostPerAction: answers.maxCost,
        blockedModules: ['child_process'],
        maxFileSize: 1048576,
      },
      knowledge: answers.knowledge,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  // Validate the config
  try {
    return AgentConfigSchema.parse(config);
  } catch (error) {
    console.error('Config validation error:', error);
    return config;
  }
}

export function validateAgentName(name: string): { valid: boolean; error?: string } {
  if (!name || name.length === 0) {
    return { valid: false, error: 'Agent name is required' };
  }
  if (name.length > 50) {
    return { valid: false, error: 'Agent name must be 50 characters or less' };
  }
  if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
    return { valid: false, error: 'Agent name can only contain letters, numbers, hyphens, and underscores' };
  }
  return { valid: true };
}
