/**
 * Configuration Schema Validation
 * 
 * Zod schemas for validating agent configurations
 * Ensures type safety and data integrity
 */

import { z } from 'zod';

// Skill reference schema
export const SkillReferenceSchema = z.object({
  id: z.string().min(1, 'Skill ID is required'),
  source: z.enum(['registry', 'local', 'url'], {
    errorMap: () => ({ message: 'Source must be registry, local, or url' }),
  }),
  version: z.string().min(1, 'Version is required'),
  hash: z.string().optional(), // IPFS hash or content hash
  permissions: z.array(z.string()).default([]),
  trustScore: z.number().min(0).max(1).default(0.5),
});

// Personality configuration schema
export const PersonalitySchema = z.object({
  tone: z.enum(['direct', 'balanced', 'conversational'], {
    errorMap: () => ({ message: 'Tone must be direct, balanced, or conversational' }),
  }),
  verbosity: z.enum(['brief', 'balanced', 'detailed'], {
    errorMap: () => ({ message: 'Verbosity must be brief, balanced, or detailed' }),
  }),
  formality: z.enum(['casual', 'balanced', 'professional'], {
    errorMap: () => ({ message: 'Formality must be casual, balanced, or professional' }),
  }),
});

// Autonomy settings schema
export const AutonomySchema = z.object({
  level: z.enum(['confirm', 'suggest', 'independent'], {
    errorMap: () => ({ message: 'Autonomy level must be confirm, suggest, or independent' }),
  }),
  requireConfirmationFor: z.array(z.string()).optional(),
});

// Privacy and constraints schema
export const ConstraintsSchema = z.object({
  privacy: z.enum(['local', 'balanced', 'cloud'], {
    errorMap: () => ({ message: 'Privacy must be local, balanced, or cloud' }),
  }),
  maxCostPerAction: z.number().min(0).default(0.1),
  allowedDomains: z.array(z.string()).optional(),
  blockedModules: z.array(z.string()).default(['child_process']),
  maxFileSize: z.number().default(1048576), // 1MB
});

// Owner information schema
export const OwnerSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
    .optional(),
  email: z.string().email('Invalid email address').optional(),
});

// Complete agent configuration schema
export const AgentConfigSchema = z.object({
  agent: z.object({
    name: z
      .string()
      .min(1, 'Agent name is required')
      .max(50, 'Agent name must be 50 characters or less')
      .regex(
        /^[a-zA-Z0-9-_]+$/,
        'Agent name can only contain letters, numbers, hyphens, and underscores'
      ),
    version: z.string().default('1.0.0'),
    description: z.string().optional(),
    goals: z.array(z.string()).min(1, 'At least one goal is required'),
    skills: z.array(SkillReferenceSchema),
    personality: PersonalitySchema,
    autonomy: AutonomySchema,
    constraints: ConstraintsSchema,
    owner: OwnerSchema.optional(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
  }),
});

// Interview answers schema (for validation during interview)
export const InterviewAnswersSchema = z.object({
  goals: z.array(z.string()).min(1, 'Select at least one goal'),
  description: z.string().optional(),
  skills: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      version: z.string(),
      skillHash: z.string(),
      description: z.string().optional(),
      permissions: z.record(z.unknown()).optional(),
      trustScore: z.number(),
      categories: z.array(z.object({ name: z.string() })).optional(),
    })
  ),
  personality: z.object({
    tone: z.number().min(0).max(100),
    verbosity: z.number().min(0).max(100),
    formality: z.number().min(0).max(100),
  }),
  autonomy: z.enum(['confirm', 'suggest', 'independent']),
  privacy: z.enum(['local', 'balanced', 'cloud']),
  maxCost: z.number().min(0).max(1),
  permissions: z.array(z.string()),
  name: z
    .string()
    .min(1, 'Agent name is required')
    .max(50)
    .regex(/^[a-zA-Z0-9-_]+$/),
  walletAddress: z.string().optional(),
});

// Type exports
type InferType<T extends z.ZodType> = z.infer<T>;

export type SkillReference = InferType<typeof SkillReferenceSchema>;
export type PersonalityConfig = InferType<typeof PersonalitySchema>;
export type AutonomyConfig = InferType<typeof AutonomySchema>;
export type ConstraintsConfig = InferType<typeof ConstraintsSchema>;
export type OwnerConfig = InferType<typeof OwnerSchema>;
export type AgentConfig = InferType<typeof AgentConfigSchema>;
export type InterviewAnswers = InferType<typeof InterviewAnswersSchema>;

/**
 * Helper function to map slider values (0-100) to personality enums
 */
export function mapSliderToTone(value: number): PersonalityConfig['tone'] {
  if (value < 33) return 'direct';
  if (value < 66) return 'balanced';
  return 'conversational';
}

export function mapSliderToVerbosity(value: number): PersonalityConfig['verbosity'] {
  if (value < 33) return 'brief';
  if (value < 66) return 'balanced';
  return 'detailed';
}

export function mapSliderToFormality(value: number): PersonalityConfig['formality'] {
  if (value < 33) return 'casual';
  if (value < 66) return 'balanced';
  return 'professional';
}

/**
 * Generate agent config from interview answers
 */
export function generateAgentConfig(
  answers: InterviewAnswers
): AgentConfig {
  const config: AgentConfig = {
    agent: {
      name: answers.name,
      version: '1.0.0',
      description: answers.description,
      goals: answers.goals,
      skills: answers.skills.map((skill) => ({
        id: skill.id,
        source: 'registry',
        version: skill.version,
        hash: skill.skillHash,
        permissions: Object.keys(skill.permissions || {}),
        trustScore: skill.trustScore,
      })),
      personality: {
        tone: mapSliderToTone(answers.personality.tone),
        verbosity: mapSliderToVerbosity(answers.personality.verbosity),
        formality: mapSliderToFormality(answers.personality.formality),
      },
      autonomy: {
        level: answers.autonomy,
      },
      constraints: {
        privacy: answers.privacy,
        maxCostPerAction: answers.maxCost,
        permissions: answers.permissions,
      },
      owner: answers.walletAddress
        ? { walletAddress: answers.walletAddress }
        : undefined,
      createdAt: new Date().toISOString(),
    },
  };

  // Validate the generated config
  return AgentConfigSchema.parse(config);
}

/**
 * Validate partial interview answers (for step-by-step validation)
 */
export function validateStep(
  step: number,
  answers: Partial<InterviewAnswers>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (step) {
    case 1: // Goals
      if (!answers.goals || answers.goals.length === 0) {
        errors.push('Please select at least one goal');
      }
      break;

    case 2: // Skills
      // Skills are optional, but we might want at least one
      break;

    case 3: // Behavior
      if (answers.personality) {
        if (typeof answers.personality.tone !== 'number') {
          errors.push('Communication style is required');
        }
        if (typeof answers.personality.verbosity !== 'number') {
          errors.push('Detail level is required');
        }
        if (typeof answers.personality.formality !== 'number') {
          errors.push('Formality level is required');
        }
      }
      if (!answers.autonomy) {
        errors.push('Autonomy level is required');
      }
      break;

    case 4: // Privacy
      if (!answers.privacy) {
        errors.push('Privacy preference is required');
      }
      if (typeof answers.maxCost !== 'number') {
        errors.push('Budget per action is required');
      }
      break;

    case 5: // Identity
      if (!answers.name || answers.name.trim() === '') {
        errors.push('Agent name is required');
      } else if (!/^[a-zA-Z0-9-_]+$/.test(answers.name)) {
        errors.push(
          'Agent name can only contain letters, numbers, hyphens, and underscores'
        );
      }
      break;

    default:
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format agent config as JSON string for display/export
 */
export function formatAgentConfig(config: AgentConfig): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Download agent config as JSON file
 */
export function downloadAgentConfig(config: AgentConfig, filename?: string): void {
  const json = formatAgentConfig(config);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${config.agent.name}-config.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
