/**
 * Types for App RAG Authentication and Integration
 */

export interface AppConfig {
  appId: string;
  name: string;
  logo?: string;
  description?: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint?: string;
  ragEndpoint: string;
  requestedPermissions: string[];
  privacyPolicyUrl?: string;
}

export interface EncryptedTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
}

export interface AuthContext {
  userId: string;
  permissions: string[];
  appId: string;
}

export interface AppRAGQuery {
  query: string;
  maxResults?: number;
  filters?: Record<string, any>;
}

export interface AppRAGResult {
  id: string;
  content: string;
  score: number;
  metadata: {
    documentId?: string;
    title?: string;
    source?: string;
    [key: string]: any;
  };
}

export interface AppConnection {
  appId: string;
  name: string;
  connectedAt: string;
  permissions: string[];
  lastUsed?: string;
}

export interface RAGAccessLog {
  timestamp: string;
  appId: string;
  queryHash: string;
  resultCount: number;
  platform: string;
}

export interface AppAuthorizationRequest {
  appId: string;
  name: string;
  logo?: string;
  requestedPermissions: string[];
  privacyPolicyUrl?: string;
}

export interface AppRevocationRequest {
  appId: string;
  reason?: string;
}
