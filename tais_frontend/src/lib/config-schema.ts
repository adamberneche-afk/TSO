// TAIS Platform - Agent Configuration Schema & Validation

import { z } from 'zod';

// Skill reference in agent config
export const SkillReferenceSchema = z.object({
  id: z.string(),
  source: z.enum(['registry', 'local', 'url']),
  version: z.string(),
  hash: z.string().optional(),
  permissions: z.array(z.string()),
  trustScore: z.number().min(0).max(1),
});

// Personality configuration
export const PersonalitySchema = z.object({
  tone: z.enum(['direct', 'balanced', 'conversational']),
  verbosity: z.enum(['brief', 'balanced', 'detailed']),
  formality: z.enum(['casual', 'balanced', 'professional']),
});

// Autonomy settings
export const AutonomySchema = z.object({
  level: z.enum(['confirm', 'suggest', 'independent']),
  requireConfirmationFor: z.array(z.string()).optional(),
});

// Privacy and constraints
export const ConstraintsSchema = z.object({
  privacy: z.enum(['local', 'balanced', 'cloud']),
  maxCostPerAction: z.number().min(0).default(0.1),
  allowedDomains: z.array(z.string()).optional(),
  blockedModules: z.array(z.string()).default(['child_process']),
  maxFileSize: z.number().default(1048576),
});

// Owner information
export const OwnerSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  email: z.string().email().optional(),
});

// Complete agent configuration (anonymous - no wallet info)
export const AgentConfigSchema = z.object({
  agent: z.object({
    name: z.string().min(1).max(50).regex(/^[a-zA-Z0-9-_]+$/),
    version: z.string().default('1.0.0'),
    description: z.string().optional(),
    goals: z.array(z.string()),
    skills: z.array(SkillReferenceSchema),
    personality: PersonalitySchema,
    autonomy: AutonomySchema,
    constraints: ConstraintsSchema,
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
  }),
});

// Ownership metadata (stored separately for privacy)
export const ConfigOwnershipSchema = z.object({
  agentId: z.string().uuid(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string(),
  tier: z.enum(['free', 'bronze', 'silver', 'gold']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AgentConfigType = z.infer<typeof AgentConfigSchema>;
