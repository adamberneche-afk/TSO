export interface TAISAgentConfig {
  appId: string;
  appSecret: string;
  appName: string;
  redirectUri: string;
  baseUrl?: string;
}

export interface AgentContext {
  agentId: string | null;
  walletAddress: string;
  tier: 'free' | 'bronze' | 'silver' | 'gold';
  config: {
    name?: string;
    description?: string;
    soul: string | null;
    profile: string | null;
    memory: string | null;
  };
  permissions: {
    scopes: string[];
    expiresAt: string | null;
    grantedAt: string | null;
  };
  capabilities: {
    canExecuteCode: boolean;
    canAccessInternet: boolean;
    canReadFiles: boolean;
    canWriteFiles: boolean;
    availableTools: string[];
  };
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  walletAddress: string;
  scopes: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  context: AgentContext;
  messages: ChatMessage[];
  appContext?: Record<string, any>;
  parentSession?: string;
  maxInheritedMessages?: number;
}

export interface ChatResponse {
  sessionId: string;
  session: {
    sessionId: string;
    startedAt: string;
    parentSessionId: string | null;
  };
  systemPrompt: string;
  message?: string;
}

export interface MemoryEntry {
  id: string;
  type: 'PREFERENCE' | 'ACTION' | 'FACT' | 'CONVERSATION';
  summary: string;
  details: Record<string, any>;
  appId: string;
  createdAt: string;
}

export interface UpdateMemoryOptions {
  context: AgentContext;
  update: {
    type: 'preference' | 'action' | 'fact' | 'conversation';
    summary: string;
    details?: Record<string, any>;
  };
}

export interface Session {
  sessionId: string;
  appId: string;
  appName: string;
  messageCount: number;
  startedAt: string;
  lastActiveAt: string;
  endedAt: string | null;
}

export interface AuthorizationUrlOptions {
  scopes: string[];
  state?: string;
}

export interface AuthorizationResponse {
  authorizationId: string;
  app: {
    name: string;
    description?: string;
    iconUrl?: string;
    requestedScopes: string[];
    walletAddress: string;
  };
  message: string;
}

export interface AppRegistration {
  appId: string;
  name: string;
  description?: string;
  redirectUris: string[];
  websiteUrl?: string;
  developerEmail?: string;
  developerName?: string;
  wallet: string;
  signature: string;
}

export interface RegisteredApp {
  appId: string;
  name: string;
  appSecret: string;
  tier: 'BASIC' | 'VERIFIED' | 'CERTIFIED';
  redirectUris: string[];
}

export interface AppInfo {
  appId: string;
  name: string;
  description?: string;
  iconUrl?: string;
  websiteUrl?: string;
  tier: string;
  createdAt: string;
}

export interface PermissionInfo {
  appId: string;
  appName: string;
  scopes: string[];
  grantedAt: string;
  expiresAt: string;
}

export const VALID_SCOPES = [
  'agent:identity:read',
  'agent:identity:soul:read',
  'agent:identity:profile:read',
  'agent:memory:read',
  'agent:memory:write',
  'agent:config:read',
] as const;

export type ValidScope = typeof VALID_SCOPES[number];
