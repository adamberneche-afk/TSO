// TAIS Platform Types - Agent Configuration

export interface SkillReference {
  id: string;
  source: 'registry' | 'local' | 'url';
  version: string;
  hash?: string;
  permissions: string[];
  trustScore: number;
}

export interface Personality {
  tone: 'direct' | 'balanced' | 'conversational';
  verbosity: 'brief' | 'balanced' | 'detailed';
  formality: 'casual' | 'balanced' | 'professional';
}

export interface Autonomy {
  level: 'confirm' | 'suggest' | 'independent';
  requireConfirmationFor?: string[];
}

export interface Constraints {
  privacy: 'local' | 'balanced' | 'cloud';
  maxCostPerAction: number;
  allowedDomains?: string[];
  blockedModules?: string[];
  maxFileSize?: number;
}

export interface Owner {
  walletAddress?: string;
  email?: string;
}

export interface AgentConfig {
  agent: {
    name: string;
    version: string;
    description?: string;
    goals: string[];
    skills: SkillReference[];
    personality: Personality;
    autonomy: Autonomy;
    constraints: Constraints;
    createdAt?: string;
    updatedAt?: string;
  };
}

// Ownership metadata stored separately for privacy
export interface ConfigOwnership {
  agentId: string;  // Unique identifier for the agent config
  walletAddress: string;
  signature: string;
  tier: 'free' | 'bronze' | 'silver' | 'gold';
  createdAt: string;
  updatedAt: string;
}

// Combined structure for internal use
export interface StoredAgentConfig {
  config: AgentConfig;
  ownership: ConfigOwnership;
}

export interface InterviewAnswers {
  goals: string[];
  description?: string;
  skills: SelectedSkill[];
  personality: {
    tone: number;
    verbosity: number;
    formality: number;
  };
  autonomy: 'confirm' | 'suggest' | 'independent';
  privacy: 'local' | 'balanced' | 'cloud';
  maxCost: number;
  permissions: string[];
  name: string;
  walletAddress?: string;
}

export interface SelectedSkill {
  id: string;
  name: string;
  version: string;
  description?: string;
  skillHash?: string;
  trustScore: number;
  permissions?: Record<string, boolean>;
  categories?: { name: string }[];
  downloadCount?: number;
}

export type DeploymentType = 'web' | 'desktop' | 'api' | 'export';

export interface InterviewState {
  currentStep: number;
  totalSteps: number;
  answers: Partial<InterviewAnswers>;
  config: AgentConfig | null;
  isGenerating: boolean;
  deploymentOption?: DeploymentType;
}
