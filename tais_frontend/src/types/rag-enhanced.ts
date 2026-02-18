/**
 * Enhanced RAG Configuration based on detailed architecture review
 * Incorporates feedback on context isolation, platform detection, and data governance
 */

// Context Source Types
export type ContextSourceType = 'local' | 'platform' | 'app-scoped' | 'enterprise';

// Platform Types
export type PlatformType = 'web' | 'mobile' | 'desktop' | 'local' | 'app-integration';

// Data Classification
export type DataClassification = 'private' | 'platform' | 'app' | 'public';

// Storage Backend Types
export type StorageBackend = 'filesystem' | 'indexeddb' | 'cloud' | 'api' | 'app-native' | 'postgresql' | 'custom';

// Embedding Models
export type EmbeddingModel = 'local-embedding-model' | 'voyage-2' | 'text-embedding-3-small' | 'tensorflow-use' | 'custom';

// Encryption Schemes
export type EncryptionScheme = 'AES-256-GCM' | 'E2EE' | 'app-scoped' | 'none';

/**
 * Context Source Configuration
 * Based on feedback: each source has clear isolation, platform constraints, and access conditions
 */
export interface ContextSource {
  id: string;
  type: ContextSourceType;
  priority: number; // 1 = highest
  name: string;
  description: string;
  
  storage: {
    type: StorageBackend;
    path?: string; // For filesystem
    endpoint?: string; // For cloud/api
    provider?: string; // For app-native
    encrypted: boolean;
    encryptionKey?: 'user-managed' | 'user-held-key' | 'app-scoped' | 'platform-managed';
    encryptionScheme?: EncryptionScheme;
  };
  
  scope: DataClassification[];
  
  embeddings: {
    model: EmbeddingModel | 'inherit-from-app';
    dimensions: number;
    fallback?: EmbeddingModel;
  };
  
  accessConditions: {
    platforms: PlatformType[];
    authenticated?: boolean;
    appId?: string; // Required for app-scoped
    permissions?: string[];
  };
  
  // Runtime state (not persisted)
  enabled?: boolean;
  documentCount?: number;
  lastUpdated?: number;
  isAvailable?: boolean;
}

/**
 * RAG Configuration
 */
export interface RAGConfiguration {
  contextSources: ContextSource[];
  
  retrievalStrategy: 'hybrid' | 'sequential' | 'parallel' | 'weighted';
  maxChunks: number;
  chunkSize: number;
  chunkOverlap: number;
  similarityThreshold: number;
  reranking: boolean;
  rerankingModel?: string;
  
  // Fallback order when sources are unavailable
  fallbackOrder: string[]; // source IDs in priority order
  
  // Source weights for weighted retrieval
  sourceWeights?: Record<string, number>;
}

/**
 * Context Isolation Configuration
 * Ensures no cross-contamination between data classifications
 */
export interface ContextIsolationConfig {
  privateStaysLocal: boolean;
  noCrossContamination: boolean;
  auditLog: {
    enabled: boolean;
    trackSourceUsage: boolean;
    trackRetrieval: boolean;
    location: 'local-only' | 'platform' | 'hybrid';
    retentionDays: number;
  };
}

/**
 * Platform Detection Configuration
 */
export interface PlatformConfig {
  current: PlatformType;
  capabilities: {
    localStorage: boolean;
    indexedDB: boolean;
    fileSystem: boolean;
    encryption: 'web-crypto-api' | 'none' | string;
    secureEnclave?: boolean; // For mobile
  };
  constraints: {
    maxFileSize: number; // bytes
    maxStorageSize: number; // bytes
    supportsBackgroundSync: boolean;
  };
}

/**
 * Data Governance Configuration
 */
export interface DataGovernanceConfig {
  classificationRules: {
    private: string[]; // Patterns for private data
    platform: string[]; // Patterns for platform data
    app: string[]; // Patterns for app data
    public: string[]; // Patterns for public data
  };
  
  retentionPolicies: {
    private: 'infinite' | number; // days or 'infinite'
    platform: 'user-controlled' | number;
    app: 'app-controlled' | number;
    public: number;
  };
  
  autoClassify: boolean;
  manualOverride: boolean;
}

/**
 * Knowledge Management Configuration
 */
export interface KnowledgeConfig {
  sources: string[]; // References to contextSource IDs
  
  caching: {
    enabled: boolean;
    ttl: number; // seconds
    scope: 'session' | 'persistent';
    maxCacheSize: number; // bytes
  };
  
  synchronization: {
    enabled: boolean;
    conflicts: 'local-wins' | 'platform-wins' | 'timestamp-wins' | 'manual';
    syncInterval: number; // seconds
    backgroundSync: boolean;
  };
  
  versioning: {
    enabled: boolean;
    maxVersions: number;
    autoCleanup: boolean;
  };
}

/**
 * Skill RAG Requirements
 * Allows skills to declare their context needs
 */
export interface SkillRAGRequirements {
  skillId: string;
  requiredRAGs: string[]; // Source IDs that must be available
  optionalRAGs: string[]; // Source IDs that enhance functionality
  minContextChunks: number;
  preferredSources?: string[]; // Ordered preference
  ragAware: boolean;
}

/**
 * Complete Agent Configuration with RAG
 */
export interface AgentConfigWithRAG {
  // Existing agent config fields...
  id: string;
  name: string;
  description?: string;
  
  // RAG Integration
  contextSources: ContextSource[];
  ragConfig: RAGConfiguration;
  contextIsolation: ContextIsolationConfig;
  platform: PlatformConfig;
  dataGovernance: DataGovernanceConfig;
  knowledge: KnowledgeConfig;
  
  // Skills with RAG requirements
  skills: SkillRAGRequirements[];
  
  // Dynamic source selection function (pseudo-code reference)
  selectRAGSources?: (context: SelectionContext) => string[];
}

/**
 * Context for dynamic RAG source selection
 */
export interface SelectionContext {
  platform: PlatformType;
  appId?: string;
  userAuth: boolean;
  dataClassification: DataClassification;
  query: string;
  skillId?: string;
  timestamp: number;
}

/**
 * RAG Query with enhanced metadata
 */
export interface EnhancedRAGQuery {
  query: string;
  userIntent?: string;
  dataClassification?: DataClassification;
  preferredSources?: string[];
  excludeSources?: string[];
  minResults?: number;
  maxResults?: number;
  timeout?: number;
  
  // Context from conversation
  conversationContext?: string[];
  skillContext?: string;
}

/**
 * RAG Result with source attribution
 */
export interface EnhancedRAGResult {
  chunk: {
    id: string;
    content: string;
    metadata: {
      documentId: string;
      documentTitle: string;
      source: string; // contextSource ID
      classification: DataClassification;
      relevanceScore: number;
      timestamp: number;
    };
  };
  score: number;
  rerankedScore?: number;
  source: ContextSource;
  retrievalLatency: number;
}

/**
 * RAG Response with full context
 */
export interface EnhancedRAGResponse {
  results: EnhancedRAGResult[];
  totalResults: number;
  sourcesQueried: string[];
  sourcesSucceeded: string[];
  sourcesFailed: string[];
  totalLatency: number;
  query: EnhancedRAGQuery;
  
  // Audit info
  auditTrail: {
    timestamp: number;
    platform: PlatformType;
    userAuthenticated: boolean;
    dataAccessed: DataClassification[];
  };
}

/**
 * RAG Health Status
 */
export interface RAGHealthStatus {
  sourceId: string;
  status: 'healthy' | 'degraded' | 'unavailable' | 'error';
  documentCount: number;
  storageUsed: number;
  lastSync?: number;
  latency: number;
  error?: string;
}

/**
 * Default configurations
 */
export const DEFAULT_CONTEXT_ISOLATION: ContextIsolationConfig = {
  privateStaysLocal: true,
  noCrossContamination: true,
  auditLog: {
    enabled: true,
    trackSourceUsage: true,
    trackRetrieval: true,
    location: 'local-only',
    retentionDays: 30
  }
};

export const DEFAULT_RAG_CONFIG: RAGConfiguration = {
  contextSources: [],
  retrievalStrategy: 'hybrid',
  maxChunks: 10,
  chunkSize: 500,
  chunkOverlap: 50,
  similarityThreshold: 0.5,
  reranking: true,
  fallbackOrder: ['private-local-rag', 'tais-platform-rag', 'app-specific-rag']
};

export const DEFAULT_DATA_GOVERNANCE: DataGovernanceConfig = {
  classificationRules: {
    private: ['password', 'api-key', 'secret', 'personal', 'confidential'],
    platform: ['preference', 'config', 'setting', 'profile'],
    app: ['app-state', 'integration', 'workflow'],
    public: ['documentation', 'guide', 'tutorial']
  },
  retentionPolicies: {
    private: 'infinite',
    platform: 'user-controlled',
    app: 'app-controlled',
    public: 365
  },
  autoClassify: true,
  manualOverride: true
};

/**
 * Utility type guards
 */
export function isLocalSource(source: ContextSource): boolean {
  return source.type === 'local' || source.accessConditions.platforms.includes('local');
}

export function isEncryptedSource(source: ContextSource): boolean {
  return source.storage.encrypted === true;
}

export function canAccessOnPlatform(source: ContextSource, platform: PlatformType): boolean {
  return source.accessConditions.platforms.includes(platform);
}

export function requiresAuthentication(source: ContextSource): boolean {
  return source.accessConditions.authenticated === true;
}
