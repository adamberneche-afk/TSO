/**
 * Types for Public RAG (E2EE Platform Storage)
 */

import type { DocumentMetadata } from './rag';

export interface PublicDocument {
  id: string;
  title?: string;
  encryptedData?: string;
  encryptedMetadata?: string;
  iv?: string;
  salt?: string;
  ownerPublicKey?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
  chunkCount?: number;
  size?: number;
  isPublic?: boolean;
  allowedViewers?: string[];
  tags?: string[];
  popularity?: number;
  downloadCount?: number;
}

export interface EncryptedChunk {
  id: string;
  documentId: string;
  encryptedContent: string;
  iv: string;
  index: number;
  embeddingHash: string; // Hash of embedding for search (not the actual embedding)
}

export interface PublicRAGUploadRequest {
  title: string;
  content: string;
  metadata: DocumentMetadata;
  isPublic: boolean;
  tags: string[];
}

export interface PublicRAGUploadResponse {
  documentId: string;
  uploadUrl: string;
  chunksUploaded: number;
}

export interface PublicRAGSearchRequest {
  query: string;
  topK?: number;
  filters?: {
    tags?: string[];
    owner?: string;
    dateRange?: { start: number; end: number };
  };
}

export interface PublicRAGSearchResult {
  documentId: string;
  encryptedContent: string;
  iv: string;
  salt: string;
  score: number;
  ownerPublicKey: string;
  metadata: {
    title: string;
    type: string;
    tags: string[];
  };
}

export interface PublicRAGShareRequest {
  documentId: string;
  recipientPublicKey: string;
  permissions: 'read' | 'write';
}

export interface PublicRAGKeyPair {
  publicKey: string;
  privateKey: string;
  createdAt: number;
}

export interface PublicRAGStats {
  totalDocuments: number;
  totalChunks: number;
  publicDocuments: number;
  myDocuments: number;
  storageUsed: number;
}

export interface CommunityDocument {
  id: string;
  title?: string;
  author?: string;
  tags?: string[];
  downloadCount?: number;
  createdAt?: string | number;
  isPublic?: boolean;
  canAccess?: boolean;
}

export interface PublicRAGConfig {
  apiEndpoint: string;
  encryptionEnabled: boolean;
  maxFileSize: number;
  maxStoragePerUser: number;
  chunkSize: number;
  chunkOverlap: number;
}
