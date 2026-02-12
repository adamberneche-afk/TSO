/**
 * Agent Configuration Types
 * 
 * TypeScript interfaces for agent configuration and interview state
 */

// Skill reference in agent config
export interface SkillReference {
  id: string;
  source: 'registry' | 'local' | 'url';
  version: string;
  hash?: string; // IPFS hash or content hash
  permissions: string[];
  trustScore: number;
}

// Personality configuration
export interface PersonalityConfig {
  tone: 'direct' | 'balanced' | 'conversational';
  verbosity: 'brief' | 'balanced' | 'detailed';
  formality: 'casual' | 'balanced' | 'professional';
}

// Autonomy settings
export interface AutonomyConfig {
  level: 'confirm' | 'suggest' | 'independent';
  requireConfirmationFor?: string[]; // High-risk actions
}

// Privacy and constraints
export interface ConstraintsConfig {
  privacy: 'local' | 'balanced' | 'cloud';
  maxCostPerAction: number;
  allowedDomains?: string[];
  blockedModules?: string[];
  maxFileSize?: number; // in bytes
}

// Owner information
export interface OwnerConfig {
  walletAddress?: string;
  email?: string;
}

// Complete agent configuration
export interface AgentConfig {
  agent: {
    name: string;
    version: string;
    description?: string;
    goals: string[];
    skills: SkillReference[];
    personality: PersonalityConfig;
    autonomy: AutonomyConfig;
    constraints: ConstraintsConfig;
    owner?: OwnerConfig;
    createdAt?: string;
    updatedAt?: string;
  };
}

// Deployment options
export type DeploymentType = 'web' | 'desktop' | 'api' | 'export';

export interface DeploymentOption {
  type: DeploymentType;
  label: string;
  description: string;
  features: string[];
  icon?: string;
}

// Interview answers (raw user input)
export interface InterviewAnswers {
  // Step 1: Goals
  goals: string[];
  description?: string;
  
  // Step 2: Skills
  skills: SelectedSkill[];
  
  // Step 3: Behavior
  personality: {
    tone: number;        // 0-100 slider
    verbosity: number;   // 0-100 slider
    formality: number;   // 0-100 slider
  };
  autonomy: 'confirm' | 'suggest' | 'independent';
  
  // Step 4: Privacy & Constraints
  privacy: 'local' | 'balanced' | 'cloud';
  maxCost: number;
  permissions: string[];
  
  // Step 5: Identity
  name: string;
  walletAddress?: string;
}

// Selected skill in interview
export interface SelectedSkill {
  id: string;
  name: string;
  version: string;
  skillHash: string;
  description?: string;
  permissions?: Record<string, unknown>;
  trustScore: number;
  categories?: { name: string }[];
}

// Interview state
export interface InterviewState {
  currentStep: number;
  totalSteps: number;
  answers: InterviewAnswers;
  config: AgentConfig | null;
  isGenerating: boolean;
  deploymentOption?: DeploymentType;
}

// Goal options for Step 1
export const GOAL_OPTIONS = [
  {
    id: 'work',
    label: 'Work / Professional',
    description: 'Boost productivity, automate tasks, manage projects',
    icon: 'briefcase',
  },
  {
    id: 'learning',
    label: 'Learning / Education',
    description: 'Study assistant, research, knowledge management',
    icon: 'book',
  },
  {
    id: 'creative',
    label: 'Creative Projects',
    description: 'Writing, design, content creation, brainstorming',
    icon: 'sparkles',
  },
  {
    id: 'organization',
    label: 'Personal Organization',
    description: 'Calendar, tasks, reminders, life management',
    icon: 'calendar',
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    description: 'Games, recommendations, conversation',
    icon: 'gamepad',
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Something else entirely',
    icon: 'more-horizontal',
  },
] as const;

// Permission options for Step 4
export const PERMISSION_OPTIONS = [
  {
    id: 'network',
    label: 'Network requests',
    description: 'Access external APIs and websites',
    risk: 'medium',
  },
  {
    id: 'filesystem',
    label: 'File system access',
    description: 'Read and write files on your device',
    risk: 'high',
  },
  {
    id: 'external-apis',
    label: 'External API calls',
    description: 'Connect to third-party services',
    risk: 'medium',
  },
  {
    id: 'code-execution',
    label: 'Code execution',
    description: 'Run code and scripts',
    risk: 'critical',
  },
] as const;

// Deployment options for Step 7
export const DEPLOYMENT_OPTIONS: DeploymentOption[] = [
  {
    type: 'web',
    label: 'Web Agent',
    description: 'Run in your browser',
    features: ['Chat interface', 'Instant access', 'No installation'],
    icon: 'globe',
  },
  {
    type: 'desktop',
    label: 'Desktop App',
    description: 'Download for Windows/Mac/Linux',
    features: ['Local execution', 'Offline capable', 'Full filesystem access'],
    icon: 'monitor',
  },
  {
    type: 'api',
    label: 'API Endpoint',
    description: 'Access via HTTP API',
    features: ['Integrate into apps', 'Programmatic access', 'Scalable'],
    icon: 'code',
  },
  {
    type: 'export',
    label: 'Export Config',
    description: 'Download raw JSON',
    features: ['Self-host anywhere', 'Full control', 'Portable'],
    icon: 'download',
  },
];

// Interview step definitions
export interface InterviewStep {
  number: number;
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
}

export const INTERVIEW_STEPS: InterviewStep[] = [
  {
    number: 1,
    id: 'goals',
    title: 'Welcome & Goals',
    description: 'What will your agent help you with?',
    estimatedTime: '2 min',
  },
  {
    number: 2,
    id: 'skills',
    title: 'Skill Selection',
    description: 'Choose capabilities for your agent',
    estimatedTime: '2 min',
  },
  {
    number: 3,
    id: 'behavior',
    title: 'Behavior Configuration',
    description: 'How should your agent act?',
    estimatedTime: '2 min',
  },
  {
    number: 4,
    id: 'privacy',
    title: 'Privacy & Constraints',
    description: 'Set boundaries and limits',
    estimatedTime: '1 min',
  },
  {
    number: 5,
    id: 'identity',
    title: 'Identity & Naming',
    description: 'Name your agent',
    estimatedTime: '1 min',
  },
  {
    number: 6,
    id: 'review',
    title: 'Review Configuration',
    description: 'Preview and edit your agent',
    estimatedTime: '2 min',
  },
  {
    number: 7,
    id: 'deploy',
    title: 'Deployment Options',
    description: 'Choose how to run your agent',
    estimatedTime: '1 min',
  },
  {
    number: 8,
    id: 'success',
    title: 'Success',
    description: 'Your agent is ready!',
    estimatedTime: '30 sec',
  },
];
