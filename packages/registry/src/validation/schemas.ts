import { z } from 'zod';

/**
 * Input Validation Schemas
 * Squad Beta - HIGH-3: Comprehensive input validation using Zod
 */

/**
 * Skill Schema - Validates skill creation and updates
 */
export const skillSchema = z.object({
  skillHash: z.string()
    .min(46, 'Skill hash must be at least 46 characters')
    .max(64, 'Skill hash must be at most 64 characters')
    .regex(/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/, 'Invalid IPFS hash format (must be CIDv0)'),
  
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Name can only contain letters, numbers, hyphens, and underscores'),
  
  version: z.string()
    .regex(/^\d+\.\d+\.\d+$/, 'Version must follow semantic versioning (e.g., 1.0.0)'),
  
  author: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Author must be a valid Ethereum address'),
  
  description: z.string()
    .max(1000, 'Description must be at most 1000 characters')
    .optional(),
  
  permissions: z.record(z.boolean())
    .optional(),
  
  manifestCid: z.string()
    .regex(/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/, 'Invalid manifest CID format'),
  
  packageCid: z.string()
    .regex(/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/, 'Invalid package CID format')
    .optional(),
  
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'])
    .optional(),
  
  isBlocked: z.boolean()
    .optional(),
  
  configData: z.record(z.unknown())
    .optional(),
  
  personalityMd: z.string()
    .optional(),
  
  personalityVersion: z.number()
    .int()
    .min(1)
    .optional(),
    
  // Category IDs for linking
  categoryIds: z.array(z.string()).optional()
});

export type SkillInput = z.infer<typeof skillSchema>;

/**
 * Audit Schema - Validates audit submission
 */
export const auditSchema = z.object({
  skillHash: z.string()
    .min(46)
    .max(64)
    .regex(/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/),
  
  auditor: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Auditor must be a valid Ethereum address'),
  
  auditorNft: z.string().optional(),
  
  status: z.enum(['SAFE', 'SUSPICIOUS', 'MALICIOUS']),
  
  signature: z.string()
    .min(130, 'Signature must be at least 130 characters')
    .regex(/^0x[a-fA-F0-9]{130}$/, 'Invalid signature format'),
  
  findings: z.array(z.object({
    rule: z.string(),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']),
    message: z.string().max(500),
    line: z.number().optional(),
    column: z.number().optional()
  })).optional(),
  
  summary: z.string()
    .max(2000, 'Summary must be at most 2000 characters')
    .optional()
});

export type AuditInput = z.infer<typeof auditSchema>;

/**
 * Search Schema - Validates search parameters
 */
export const searchSchema = z.object({
  q: z.string()
    .min(1, 'Search query is required')
    .max(100, 'Search query must be at most 100 characters')
    .optional(),
  
  category: z.string()
    .max(50)
    .optional(),
  
  minTrustScore: z.coerce
    .number()
    .min(0)
    .max(1)
    .optional(),
  
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED'])
    .optional(),
  
  limit: z.coerce
    .number()
    .min(1)
    .max(100)
    .default(20),
  
  offset: z.coerce
    .number()
    .min(0)
    .default(0)
});

export type SearchInput = z.infer<typeof searchSchema>;

/**
 * Auth Login Schema - Validates login request
 */
export const authLoginSchema = z.object({
  walletAddress: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  
  signature: z.string()
    .min(132, 'Signature must be at least 132 characters')
    .max(150, 'Signature must be at most 150 characters')
    .regex(/^0x[a-fA-F0-9]{130}$/, 'Invalid signature format'),
  
  nonce: z.string()
    .min(32, 'Nonce is required')
    .max(128, 'Nonce is too long')
});

export type AuthLoginInput = z.infer<typeof authLoginSchema>;

/**
 * API Key Generation Schema
 */
export const apiKeySchema = z.object({
  permissions: z.array(z.string())
    .min(1, 'At least one permission is required')
    .max(10, 'Maximum 10 permissions allowed'),
  
  expiresInDays: z.coerce
    .number()
    .min(1)
    .max(365)
    .optional(),
  
  name: z.string()
    .min(1)
    .max(50)
    .optional()
});

export type ApiKeyInput = z.infer<typeof apiKeySchema>;

/**
 * Admin Action Schema
 */
export const adminActionSchema = z.object({
  reason: z.string()
    .min(1, 'Reason is required')
    .max(500, 'Reason must be at most 500 characters')
});

export type AdminActionInput = z.infer<typeof adminActionSchema>;

/**
 * Validation helper function
 * Returns { success: true, data } or { success: false, errors }
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): 
  | { success: true; data: T }
  | { success: false; errors: z.ZodError } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Sanitize error messages for production
 */
export function sanitizeValidationErrors(error: z.ZodError): Array<{
  field: string;
  message: string;
}> {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));
}

export default {
  skillSchema,
  auditSchema,
  searchSchema,
  authLoginSchema,
  apiKeySchema,
  adminActionSchema,
  validateInput,
  sanitizeValidationErrors
};
