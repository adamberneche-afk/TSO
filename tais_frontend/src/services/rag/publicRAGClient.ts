/**
 * Public RAG API Client
 * Handles E2EE communication with TAIS platform for community knowledge sharing
 */

import { getE2EEEncryptionService } from './e2eeEncryption';
import { generateEmbeddings, chunkText } from './embeddings';
import type { 
  PublicDocument, 
  PublicRAGUploadRequest, 
  PublicRAGSearchRequest,
  PublicRAGSearchResult,
  CommunityDocument,
  PublicRAGStats 
} from '../../types/rag-public';
import type { Chunk } from '../../types/rag';
import { ethers } from 'ethers';

const API_BASE_URL = import.meta.env.VITE_PUBLIC_RAG_API_URL || 'https://tso.onrender.com/api/v1/rag';

export class PublicRAGClient {
  private apiKey: string | null = null;
  private walletAddress: string | null = null;
  private encryptionService = getE2EEEncryptionService();

  constructor(apiKey?: string) {
    if (apiKey) {
      this.apiKey = apiKey;
    }
  }

  /**
   * Initialize with wallet authentication
   */
  async initializeWithWallet(): Promise<void> {
    if (!window.ethereum) {
      throw new Error('No wallet detected');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    this.walletAddress = await signer.getAddress();

    // Initialize encryption service
    await this.encryptionService.initialize(signer);

    // Get or create API key
    this.apiKey = await this.getOrCreateAPIKey(signer);
  }

  /**
   * Get or create API key for the user
   */
  private async getOrCreateAPIKey(signer: ethers.JsonRpcSigner): Promise<string> {
    // Try to get existing key from localStorage
    const storedKey = localStorage.getItem('tais_rag_api_key');
    if (storedKey) {
      return storedKey;
    }

    // Create new API key by signing a message
    const message = 'TAIS RAG API Key Creation';
    const signature = await signer.signMessage(message);
    
    // Derive API key from signature
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(signature));
    const apiKey = btoa(String.fromCharCode(...new Uint8Array(hash))).slice(0, 32);

    // Store API key
    localStorage.setItem('tais_rag_api_key', apiKey);

    // Register API key with backend (sends public key, not private)
    const publicKey = this.encryptionService.getPublicKey();
    if (publicKey) {
      await this.registerPublicKey(publicKey);
    }

    return apiKey;
  }

  /**
   * Register user's public key with the platform
   */
  private async registerPublicKey(publicKey: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/public-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey!,
      },
      body: JSON.stringify({
        publicKey,
        walletAddress: this.walletAddress,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to register public key');
    }
  }

  /**
   * Upload a document to Public RAG (E2EE)
   */
  async uploadDocument(request: PublicRAGUploadRequest): Promise<PublicDocument> {
    if (!this.apiKey) {
      throw new Error('Not authenticated');
    }

    // Chunk the document
    const chunks = chunkText(request.content, 500, 50);
    
    // Generate embeddings (for search index)
    const embeddings = await generateEmbeddings(chunks);

    // Encrypt document content
    const encryptedContent = await this.encryptionService.encrypt(request.content);
    
    // Encrypt metadata
    const metadataStr = JSON.stringify({
      title: request.title,
      type: request.metadata.type,
      tags: request.tags,
      author: this.walletAddress,
    });
    const encryptedMetadata = await this.encryptionService.encrypt(metadataStr);

    // Encrypt chunks
    const encryptedChunks = await Promise.all(
      chunks.map(async (chunk, index) => {
        const encrypted = await this.encryptionService.encrypt(chunk);
        // Create hash of embedding for search (privacy-preserving)
        const embeddingHash = await this.hashEmbedding(embeddings[index]);
        
        return {
          index,
          encryptedContent: encrypted.encrypted,
          iv: encrypted.iv,
          embeddingHash,
        };
      })
    );

    // Get public key for sharing
    const publicKey = this.encryptionService.getPublicKey();
    if (!publicKey) {
      throw new Error('Public key not available');
    }

    // Upload to platform
    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({
        encryptedData: encryptedContent.encrypted,
        encryptedMetadata: encryptedMetadata.encrypted,
        iv: encryptedContent.iv,
        salt: encryptedContent.salt,
        ownerPublicKey: publicKey,
        isPublic: request.isPublic,
        tags: request.tags,
        chunks: encryptedChunks,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload document');
    }

    return await response.json();
  }

  /**
   * Hash embedding for privacy-preserving search index
   * We don't store actual embeddings on server, only hashes
   */
  private async hashEmbedding(embedding: number[]): Promise<string> {
    const str = embedding.map(n => n.toFixed(4)).join(',');
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(str));
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
  }

  /**
   * Search Public RAG
   * Returns encrypted results that must be decrypted client-side
   */
  async search(request: PublicRAGSearchRequest): Promise<PublicRAGSearchResult[]> {
    if (!this.apiKey) {
      throw new Error('Not authenticated');
    }

    // Generate query embedding
    const queryEmbeddings = await generateEmbeddings([request.query]);
    const queryHash = await this.hashEmbedding(queryEmbeddings[0]);

    // Search platform (returns encrypted results)
    const response = await fetch(`${API_BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({
        queryHash,
        topK: request.topK || 10,
        filters: request.filters,
      }),
    });

    if (!response.ok) {
      throw new Error('Search failed');
    }

    const results = await response.json();
    return results;
  }

  /**
   * Decrypt search result
   */
  async decryptResult(result: PublicRAGSearchResult): Promise<{
    content: string;
    metadata: any;
  }> {
    // Decrypt content
    const content = await this.encryptionService.decrypt(
      result.encryptedContent,
      result.iv,
      result.salt
    );

    // Parse metadata (it's also encrypted but returned as part of search result)
    const metadata = JSON.parse(content); // Content contains both text and metadata

    return { content, metadata };
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string): Promise<PublicDocument> {
    if (!this.apiKey) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      headers: {
        'X-API-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get document');
    }

    return await response.json();
  }

  /**
   * Download and decrypt document
   */
  async downloadDocument(documentId: string): Promise<{
    content: string;
    metadata: any;
    chunks: string[];
  }> {
    const doc = await this.getDocument(documentId);

    // Decrypt main content
    const content = await this.encryptionService.decrypt(
      doc.encryptedData,
      doc.iv,
      doc.salt
    );

    // Decrypt metadata
    const metadataStr = await this.encryptionService.decrypt(
      doc.encryptedMetadata,
      doc.iv,
      doc.salt
    );
    const metadata = JSON.parse(metadataStr);

    // Get chunks
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/chunks`, {
      headers: {
        'X-API-Key': this.apiKey!,
      },
    });

    const encryptedChunks = await response.json();
    
    // Decrypt chunks
    const chunks = await Promise.all(
      encryptedChunks.map(async (chunk: any) => {
        return await this.encryptionService.decrypt(
          chunk.encryptedContent,
          chunk.iv,
          doc.salt
        );
      })
    );

    return { content, metadata, chunks };
  }

  /**
   * Share document with another user
   */
  async shareDocument(documentId: string, recipientPublicKey: string): Promise<void> {
    if (!this.apiKey) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({
        recipientPublicKey,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to share document');
    }
  }

  /**
   * Get community documents (public/shared)
   */
  async getCommunityDocuments(limit: number = 20, offset: number = 0): Promise<CommunityDocument[]> {
    if (!this.apiKey) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${API_BASE_URL}/community?limit=${limit}&offset=${offset}`,
      {
        headers: {
          'X-API-Key': this.apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get community documents');
    }

    return await response.json();
  }

  /**
   * Get my documents
   */
  async getMyDocuments(): Promise<PublicDocument[]> {
    if (!this.apiKey) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/documents`, {
      headers: {
        'X-API-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get documents');
    }

    return await response.json();
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string): Promise<void> {
    if (!this.apiKey) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        'X-API-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete document');
    }
  }

  /**
   * Get Public RAG stats
   */
  async getStats(): Promise<PublicRAGStats> {
    if (!this.apiKey) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/stats`, {
      headers: {
        'X-API-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get stats');
    }

    return await response.json();
  }
}

// Singleton instance
let publicRAGClientInstance: PublicRAGClient | null = null;

export function getPublicRAGClient(): PublicRAGClient {
  if (!publicRAGClientInstance) {
    publicRAGClientInstance = new PublicRAGClient();
  }
  return publicRAGClientInstance;
}

export default PublicRAGClient;
