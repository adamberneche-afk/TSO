export type RAGTier = 'private' | 'public' | 'app' | 'enterprise';

export interface Document {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  createdAt: number;
  updatedAt: number;
  chunkCount: number;
}

export interface DocumentMetadata {
  title: string;
  type: 'pdf' | 'txt' | 'md' | 'json' | 'code';
  source?: string;
  author?: string;
  tags: string[];
  size: number;
  [key: string]: any;
}

export interface Chunk {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  metadata: ChunkMetadata;
  index: number;
}

export interface ChunkMetadata {
  startIndex: number;
  endIndex: number;
  section?: string;
  context?: string;
}

export interface RAGQuery {
  query: string;
  topK?: number;
  filters?: QueryFilters;
  sources?: RAGTier[];
}

export interface QueryFilters {
  documentTypes?: string[];
  tags?: string[];
  dateRange?: {
    start: number;
    end: number;
  };
  metadata?: Record<string, any>;
}

export interface RAGResult {
  chunk: Chunk;
  score: number;
  source: RAGTier;
  document: Document;
  context: string;
}

export interface RAGContext {
  results: RAGResult[];
  totalChunks: number;
  query: string;
  sources: RAGTier[];
  latency: number;
}

export interface RAGConfig {
  tier: RAGTier;
  maxChunks?: number;
  similarityThreshold?: number;
  chunkSize?: number;
  chunkOverlap?: number;
  embeddingModel?: string;
}

export interface PrivateRAGConfig extends RAGConfig {
  tier: 'private';
  storageLimit?: number; // bytes
  maxDocuments?: number;
}

export interface PublicRAGConfig extends RAGConfig {
  tier: 'public';
  encryptDocuments: boolean;
  sharePublicly: boolean;
  allowedViewers?: string[]; // wallet addresses
}

export interface AppRAGConfig extends RAGConfig {
  tier: 'app';
  appId: string;
  storageBackend: 'local' | 'api' | 'custom';
  customStorage?: any;
  embeddingProvider: 'tensorflow' | 'openai' | 'custom';
}

export interface EnterpriseRAGConfig extends RAGConfig {
  tier: 'enterprise';
  organizationId: string;
  rbacEnabled: boolean;
  auditLogging: boolean;
  ssoProvider?: string;
  vectorDatabase: 'postgresql' | 'pinecone' | 'weaviate' | 'custom';
}

export interface RAGSource {
  id: string;
  tier: RAGTier;
  name: string;
  description: string;
  enabled: boolean;
  documentCount: number;
  lastUpdated: number;
  config: RAGConfig;
}

export interface RAGStats {
  totalDocuments: number;
  totalChunks: number;
  storageUsed: number;
  lastQuery: number;
  queryCount: number;
  sources: Record<RAGTier, SourceStats>;
}

export interface SourceStats {
  documentCount: number;
  chunkCount: number;
  storageUsed: number;
  avgQueryTime: number;
}

export interface IngestionProgress {
  documentId: string;
  status: 'pending' | 'processing' | 'chunking' | 'embedding' | 'complete' | 'error';
  progress: number;
  chunksProcessed: number;
  totalChunks: number;
  error?: string;
}

export interface Citation {
  text: string;
  source: RAGTier;
  documentTitle: string;
  documentId: string;
  chunkIndex: number;
  relevanceScore: number;
}
