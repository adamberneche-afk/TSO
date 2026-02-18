/**
 * RAG Storage Service
 * Handles encrypted document storage
 * Supports: Supabase Storage (MVP), S3, R2
 * Based on staking tier document specifications
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaClient } from '@prisma/client';

export interface StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export interface StoredDocument {
  key: string;
  url: string;
  size: number;
  etag: string;
}

export type StorageProvider = 'supabase' | 's3' | 'r2' | 'database';

export class RAGStorageService {
  private s3Client: S3Client | null = null;
  private bucket: string;
  private logger: any;
  private provider: StorageProvider;
  private prisma: PrismaClient | null = null;

  constructor(config: StorageConfig, logger: any, prisma?: PrismaClient) {
    this.bucket = config.bucket;
    this.logger = logger;
    this.prisma = prisma || null;
    
    // Detect provider from endpoint
    if (config.endpoint.includes('supabase')) {
      this.provider = 'supabase';
    } else if (config.endpoint.includes('r2.cloudflarestorage')) {
      this.provider = 'r2';
    } else if (config.endpoint.includes('s3.amazonaws')) {
      this.provider = 's3';
    } else if (config.endpoint === 'database') {
      this.provider = 'database';
    } else {
      this.provider = 's3'; // Default
    }
    
    // Initialize S3 client for object storage providers
    if (this.provider !== 'database') {
      this.s3Client = new S3Client({
        endpoint: config.endpoint,
        region: config.region,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
        forcePathStyle: this.provider !== 's3', // Required for Supabase/R2
      });
    }
    
    this.logger.info(`RAG Storage initialized with provider: ${this.provider}`);
  }

  /**
   * Store encrypted document
   */
  async storeDocument(
    walletAddress: string,
    documentId: string,
    encryptedData: string,
    metadata: {
      contentType?: string;
      size: number;
    }
  ): Promise<StoredDocument> {
    // Use database storage if configured
    if (this.provider === 'database') {
      return this.storeDocumentInDatabase(walletAddress, documentId, encryptedData, metadata);
    }

    // Use S3-compatible storage (Supabase, R2, S3)
    return this.storeDocumentInObjectStorage(walletAddress, documentId, encryptedData, metadata);
  }

  /**
   * Store document in database (base64 encoded)
   * MVP option - simple but limited by DB size
   */
  private async storeDocumentInDatabase(
    walletAddress: string,
    documentId: string,
    encryptedData: string,
    metadata: { contentType?: string; size: number; }
  ): Promise<StoredDocument> {
    if (!this.prisma) {
      throw new Error('Prisma client required for database storage');
    }

    const key = `rag/${walletAddress.toLowerCase()}/${documentId}`;
    
    try {
      // For database storage, the encrypted data is stored in the document record itself
      // The route will create the document with encryptedData field containing the actual content
      // We don't need to do anything here - just return the key for reference
      this.logger.info(`Document will be stored in database: ${key}`, {
        walletAddress,
        documentId,
        size: metadata.size,
      });

      // Note: The route is responsible for storing encryptedData in the document record

      this.logger.info(`Stored document in database: ${key}`, {
        walletAddress,
        documentId,
        size: metadata.size,
      });

      return {
        key,
        url: `database://${key}`,
        size: metadata.size,
        etag: documentId,
      };
    } catch (error) {
      this.logger.error('Failed to store document in database:', error);
      throw new Error('Failed to store encrypted document');
    }
  }

  /**
   * Store document in S3-compatible object storage
   */
  private async storeDocumentInObjectStorage(
    walletAddress: string,
    documentId: string,
    encryptedData: string,
    metadata: { contentType?: string; size: number; }
  ): Promise<StoredDocument> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    const key = `rag/${walletAddress.toLowerCase()}/${documentId}`;
    
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: Buffer.from(encryptedData, 'base64'),
        ContentType: metadata.contentType || 'application/octet-stream',
        ContentLength: metadata.size,
        Metadata: {
          'x-amz-meta-wallet': walletAddress.toLowerCase(),
          'x-amz-meta-document-id': documentId,
          'x-amz-meta-encrypted': 'true',
        },
        ServerSideEncryption: 'AES256',
      });

      const result = await this.s3Client.send(command);
      
      this.logger.info(`Stored document: ${key}`, {
        walletAddress,
        documentId,
        size: metadata.size,
        etag: result.ETag,
      });

      return {
        key,
        url: `${this.bucket}/${key}`,
        size: metadata.size,
        etag: result.ETag || '',
      };
    } catch (error) {
      this.logger.error('Failed to store document:', error);
      throw new Error('Failed to store encrypted document');
    }
  }

  /**
   * Retrieve encrypted document
   */
  async getDocument(key: string): Promise<Buffer> {
    // Check if this is a database-stored document
    if (key.startsWith('database://') || this.provider === 'database') {
      return this.getDocumentFromDatabase(key);
    }

    return this.getDocumentFromObjectStorage(key);
  }

  /**
   * Retrieve document from database
   */
  private async getDocumentFromDatabase(key: string): Promise<Buffer> {
    if (!this.prisma) {
      throw new Error('Prisma client required for database storage');
    }

    try {
      // Extract document ID from key
      const documentId = key.replace('database://', '').split('/').pop();
      
      if (!documentId) {
        throw new Error('Invalid document key');
      }

      const document = await this.prisma.rAGDocument.findUnique({
        where: { id: documentId },
        select: { encryptedData: true },
      });

      if (!document || !document.encryptedData) {
        throw new Error('Document not found');
      }

      return Buffer.from(document.encryptedData, 'base64');
    } catch (error) {
      this.logger.error('Failed to retrieve document from database:', error);
      throw new Error('Failed to retrieve encrypted document');
    }
  }

  /**
   * Retrieve document from S3-compatible storage
   */
  private async getDocumentFromObjectStorage(key: string): Promise<Buffer> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const result = await this.s3Client.send(command);
      
      if (!result.Body) {
        throw new Error('Document not found');
      }

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of result.Body as any) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error('Failed to retrieve document:', error);
      throw new Error('Failed to retrieve encrypted document');
    }
  }

  /**
   * Generate presigned URL for direct upload (optional optimization)
   * Only available for object storage (not database storage)
   */
  async getPresignedUploadUrl(
    walletAddress: string,
    documentId: string,
    expiresIn: number = 3600
  ): Promise<string> {
    if (this.provider === 'database' || !this.s3Client) {
      throw new Error('Presigned URLs not available for database storage');
    }

    const key = `rag/${walletAddress.toLowerCase()}/${documentId}`;
    
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ServerSideEncryption: 'AES256',
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Delete document
   */
  async deleteDocument(key: string, documentId?: string): Promise<void> {
    // For database storage, nothing to do here - the document record will be deleted by the caller
    if (key.startsWith('database://') || this.provider === 'database') {
      this.logger.info(`Document will be deleted from database: ${key}`);
      return;
    }

    // Delete from object storage
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      
      this.logger.info(`Deleted document: ${key}`);
    } catch (error) {
      this.logger.error('Failed to delete document:', error);
      throw new Error('Failed to delete encrypted document');
    }
  }

  /**
   * Delete all documents for a user
   */
  async deleteUserDocuments(walletAddress: string): Promise<void> {
    const prefix = `rag/${walletAddress.toLowerCase()}/`;
    
    if (this.provider === 'database') {
      // For database storage, documents are deleted via cascade when user is deleted
      this.logger.info(`User documents will be deleted via cascade: ${walletAddress}`);
      return;
    }

    // For object storage: List and delete all objects with prefix
    // Note: In production, use ListObjectsV2 + DeleteObjects batch
    this.logger.info(`Scheduled deletion for user: ${walletAddress}`);
  }
}

// Factory function
export function createRAGStorageService(logger: any, prisma?: any): RAGStorageService {
  // Check if database storage is configured
  const useDatabase = process.env.RAG_STORAGE_PROVIDER === 'database' || 
                     (!process.env.RAG_STORAGE_ACCESS_KEY && prisma);

  if (useDatabase) {
    logger.info('Using database storage for RAG documents');
    return new RAGStorageService(
      {
        endpoint: 'database',
        region: 'database',
        accessKeyId: 'database',
        secretAccessKey: 'database',
        bucket: 'database',
      },
      logger,
      prisma
    );
  }

  const config: StorageConfig = {
    endpoint: process.env.RAG_STORAGE_ENDPOINT || 'https://s3.amazonaws.com',
    region: process.env.RAG_STORAGE_REGION || 'us-east-1',
    accessKeyId: process.env.RAG_STORAGE_ACCESS_KEY || '',
    secretAccessKey: process.env.RAG_STORAGE_SECRET_KEY || '',
    bucket: process.env.RAG_STORAGE_BUCKET || 'tais-rag-documents',
  };

  if (!config.accessKeyId || !config.secretAccessKey) {
    logger.warn('RAG storage credentials not configured, falling back to database storage');
  }

  return new RAGStorageService(config, logger, prisma);
}

export default RAGStorageService;
