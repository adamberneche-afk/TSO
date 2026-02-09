import { z } from 'zod';

export const PrimaryActivitySchema = z.enum(['building', 'trading', 'investing', 'learning']);
export const ThemeSchema = z.enum(['dark', 'light', 'auto']);
export const RiskToleranceSchema = z.enum(['conservative', 'moderate', 'moderate_aggressive', 'aggressive']);

const IdentitySchema = z.object({
  primary_activity: PrimaryActivitySchema,
  secondary_activities: z.array(z.string()).optional(),
  project_types: z.array(z.string()),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
});

const TechnicalSchema = z.object({
  preferred_chains: z.array(z.string()),
  wallets: z.array(z.string()),
  dev_tools: z.array(z.string()),
  programming_languages: z.array(z.string()).optional(),
});

const WorkPatternsSchema = z.object({
  active_hours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string(),
  }),
  work_style: z.enum(['focused_sprints', 'continuous', 'flexible']),
  productivity_peak: z.enum(['morning', 'afternoon', 'evening', 'late_night']),
});

const MetadataSchema = z.object({
  device_id: z.string(),
  interview_duration_seconds: z.number(),
  questions_answered: z.number(),
  confidence_score: z.number().min(0).max(1),
  genesis_nft_verified: z.boolean(),
  last_updated_by: z.string(),
  telemetry_opt_in: z.boolean().default(false),
});

export const UserProfileSchema = z.object({
  version: z.literal("1.0"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  identity: IdentitySchema,
  technical: TechnicalSchema,
  work_patterns: WorkPatternsSchema,
  notifications: z.object({
    enabled: z.boolean(),
    urgency_threshold: z.enum(['low', 'medium', 'high', 'critical_only']),
    quiet_hours: z.object({
      enabled: z.boolean(),
      start: z.string(),
      end: z.string(),
    }).optional(),
    channels: z.object({
      push: z.boolean(),
      email: z.boolean(),
      discord: z.boolean(),
      telegram: z.boolean(),
    }),
  }),
  finance: z.object({
    risk_tolerance: RiskToleranceSchema,
    portfolio_size_tier: z.enum(['small', 'medium', 'large', 'whale']),
    investment_horizon: z.enum(['short_term', 'medium_term', 'long_term']),
  }),
  communication: z.object({
    tone: z.enum(['casual', 'professional', 'technical']),
    verbosity: z.enum(['concise', 'balanced', 'detailed']),
  }),
  preferences: z.object({
    theme: ThemeSchema,
    default_currency: z.enum(['USD', 'EUR', 'ETH', 'BTC']),
    gas_price_alert_threshold: z.number().optional(),
  }),
  metadata: MetadataSchema,
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export type LLMProviderType = 'anthropic' | 'local';

export interface InterviewConfig {
  providerType: LLMProviderType;
  anthropicApiKey?: string;
  anthropicModel?: string;
  localProviderUrl?: string;
  localModel?: string;
}

export const FilesystemPermissionSchema = z.object({
  read: z.array(z.string()).default([]),
  write: z.array(z.string()).default([]),
});

export const NetworkPermissionSchema = z.object({
  domains: z.array(z.string()).default([]),
  allowed_methods: z.array(z.enum(['GET', 'POST', 'PUT', 'DELETE'])).default(['GET', 'POST']),
});

export const PermissionSchema = z.object({
  filesystem: FilesystemPermissionSchema.optional(),
  network: NetworkPermissionSchema.optional(),
  env_vars: z.array(z.string()).default([]),
  modules: z.array(z.string()).default([]),
});

export const YARAFindingSchema = z.object({
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  rule_name: z.string(),
  evidence: z.string().optional(),
  line_number: z.number().optional(),
});

export const AuditReportSchema = z.object({
  skill_hash: z.string(),
  auditor: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  status: z.enum(['safe', 'suspicious', 'malicious']),
  findings: z.array(YARAFindingSchema),
  signature: z.string(),
  timestamp: z.string().datetime(),
  audit_method: z.enum(['yara_scan', 'manual_review', 'static_analysis']),
});

export type AuditReport = z.infer<typeof AuditReportSchema>;
export type YARAFinding = z.infer<typeof YARAFindingSchema>;

export const IsnadLinkSchema = z.object({
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  role: z.enum(['author', 'auditor', 'voucher']),
  signature: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.object({
    audit_report_url: z.string().optional(),
    yara_scan_hash: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
});

export const SkillProvenanceSchema = z.object({
  author_signature: z.string(),
  auditors: z.array(IsnadLinkSchema),
  isnad_chain: z.array(z.string()),
  trust_score: z.number().min(0).max(1),
});

export const SkillManifestSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  skill_hash: z.string(),
  permissions: PermissionSchema,
  provenance: SkillProvenanceSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type SkillManifest = z.infer<typeof SkillManifestSchema>;
export type IsnadLink = z.infer<typeof IsnadLinkSchema>;
export type Permission = z.infer<typeof PermissionSchema>;

export const TokenType = z.enum(['ERC20', 'ERC721', 'ERC1155']);
export type TokenType = z.infer<typeof TokenType>;

export const TokenBalanceSchema = z.object({
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tokenType: TokenType,
  balance: z.string(),
  decimals: z.number().optional(),
  symbol: z.string().optional(),
});

export const TokenHoldingSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  holdings: z.array(TokenBalanceSchema),
  totalUsdValue: z.number().optional(),
});

export type TokenBalance = z.infer<typeof TokenBalanceSchema>;
export type TokenHolding = z.infer<typeof TokenHoldingSchema>;
