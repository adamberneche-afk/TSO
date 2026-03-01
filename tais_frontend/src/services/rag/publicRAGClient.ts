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

    const provider = new ethers.providers.Web3Provider(window.ethereum);
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
      },
      body: JSON.stringify({
        wallet: this.walletAddress,
        publicKey,
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
    if (!this.walletAddress) {
      throw new Error('Not authenticated');
    }

    const chunks = chunkText(request.content, 500, 50);
    const embeddings = await generateEmbeddings(chunks);
    
    // Use community encryption for public documents, wallet encryption for private
    const encryptionResult = request.isPublic 
      ? await this.encryptionService.encryptForCommunity(request.content)
      : await this.encryptionService.encrypt(request.content);
    
    const metadataStr = JSON.stringify({
      title: request.title,
      type: request.metadata.type,
      tags: request.tags,
      author: this.walletAddress,
    });
    const encryptedMetadata = request.isPublic
      ? await this.encryptionService.encryptForCommunity(metadataStr)
      : await this.encryptionService.encrypt(metadataStr);

    const encryptedChunks = await Promise.all(
      chunks.map(async (chunk, index) => {
        const encrypted = request.isPublic
          ? await this.encryptionService.encryptForCommunity(chunk)
          : await this.encryptionService.encrypt(chunk);
        const embeddingHash = await this.hashEmbedding(embeddings[index]);
        
        return {
          index,
          encryptedContent: encrypted.encrypted,
          iv: encrypted.iv,
          embeddingHash,
        };
      })
    );

    const publicKey = this.encryptionService.getPublicKey();
    if (!publicKey) {
      throw new Error('Public key not available');
    }

    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wallet: this.walletAddress,
        encryptedData: encryptionResult.encrypted,
        encryptedMetadata: encryptedMetadata.encrypted,
        iv: encryptionResult.iv,
        salt: encryptionResult.salt,
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

    const response = await fetch(`${API_BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wallet: this.walletAddress,
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
    const isCommunityDoc = this.encryptionService.isCommunitySalt(result.salt);

    // Decrypt content - use community decryption for public docs
    const content = isCommunityDoc
      ? await this.encryptionService.decryptCommunity(result.encryptedContent, result.iv, result.salt)
      : await this.encryptionService.decrypt(result.encryptedContent, result.iv, result.salt);

    // Parse metadata (it's also encrypted but returned as part of search result)
    const metadata = JSON.parse(content); // Content contains both text and metadata

    return { content, metadata };
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string): Promise<PublicDocument> {
    if (!this.walletAddress) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/documents/${documentId}?wallet=${this.walletAddress}`);

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

    // Check if document has encrypted data
    if (!doc.encryptedData || !doc.iv || !doc.salt) {
      throw new Error('Document is not available or not properly encrypted');
    }

    // Check if user is the document owner
    const isOwner = doc.walletAddress?.toLowerCase() === this.walletAddress?.toLowerCase();
    const isPublicDoc = doc.isPublic;

    let content: string;
    let metadataStr: string;

    // For PUBLIC docs: ALWAYS use community key (even for owner, since that's what was used to encrypt)
    // For PRIVATE docs: use wallet key
    if (isPublicDoc) {
      console.log('[DEBUG] encryptedData sample:', doc.encryptedData?.slice(0, 50));
      console.log('[DEBUG] iv sample:', doc.iv?.slice(0, 30));
      console.log('[DEBUG] salt sample:', doc.salt);
      // Try community decryption first for public docs
      try {
        console.log('[DEBUG] Attempting community decrypt for public doc, salt:', doc.salt?.slice(0, 20));
        content = await this.encryptionService.decryptCommunity(doc.encryptedData, doc.iv, doc.salt);
        console.log('[DEBUG] Community decrypt SUCCESS');
      } catch (e: any) {
        console.log('[DEBUG] Community decrypt failed:', e.message);
        // Fallback to wallet key for old public docs
        try {
          console.log('[DEBUG] Attempting wallet decrypt for public doc');
          content = await this.encryptionService.decrypt(doc.encryptedData, doc.iv, doc.salt);
          console.log('[DEBUG] Wallet decrypt SUCCESS');
        } catch (e2: any) {
          console.log('[DEBUG] Wallet decrypt also failed:', e2.message);
          throw new Error('This document was uploaded with old encryption and cannot be decrypted by others. Please re-upload it as a new public document.');
        }
      }
      try {
        metadataStr = await this.encryptionService.decryptCommunity(doc.encryptedMetadata, doc.iv, doc.salt);
      } catch {
        try {
          metadataStr = await this.encryptionService.decrypt(doc.encryptedMetadata, doc.iv, doc.salt);
        } catch {
          metadataStr = '{}';
        }
      }
    } else if (isOwner) {
      // Owner can always decrypt with their wallet key
      content = await this.encryptionService.decrypt(doc.encryptedData, doc.iv, doc.salt);
      metadataStr = await this.encryptionService.decrypt(doc.encryptedMetadata, doc.iv, doc.salt);
    } else {
      // Private/shared docs - use wallet decryption
      content = await this.encryptionService.decrypt(doc.encryptedData, doc.iv, doc.salt);
      metadataStr = await this.encryptionService.decrypt(doc.encryptedMetadata, doc.iv, doc.salt);
    }

    const metadata = JSON.parse(metadataStr);

    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/chunks?wallet=${this.walletAddress}`);

    const encryptedChunks = await response.json();
    
    const chunks = await Promise.all(
      encryptedChunks.map(async (chunk: any) => {
        // For public docs: always try community key first (even for owner)
        if (isPublicDoc) {
          try {
            return await this.encryptionService.decryptCommunity(chunk.encryptedContent, chunk.iv, doc.salt);
          } catch {
            try {
              return await this.encryptionService.decrypt(chunk.encryptedContent, chunk.iv, doc.salt);
            } catch {
              return '[Decryption failed]';
            }
          }
        }
        // For private docs
        if (isOwner) {
          return await this.encryptionService.decrypt(chunk.encryptedContent, chunk.iv, doc.salt);
        }
        return await this.encryptionService.decrypt(chunk.encryptedContent, chunk.iv, doc.salt);
      })
    );

    return { content, metadata, chunks };
  }

  /**
   * Share document with another user
   */
  async shareDocument(documentId: string, recipientPublicKey: string): Promise<void> {
    if (!this.walletAddress) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wallet: this.walletAddress,
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
    const response = await fetch(
      `${API_BASE_URL}/community?limit=${limit}&offset=${offset}`
    );

    if (!response.ok) {
      throw new Error('Failed to get community documents');
    }

    const data = await response.json();
    return data.documents || [];
  }

  /**
   * Get my documents
   */
  async getMyDocuments(): Promise<PublicDocument[]> {
    if (!this.walletAddress) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/documents?wallet=${this.walletAddress}`);

    if (!response.ok) {
      throw new Error('Failed to get documents');
    }

    const data = await response.json();
    return data.documents || [];
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string): Promise<void> {
    if (!this.walletAddress) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wallet: this.walletAddress,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete document');
    }
  }

  /**
   * Get Public RAG stats
   */
  async getStats(): Promise<PublicRAGStats> {
    if (!this.walletAddress) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/stats?wallet=${this.walletAddress}`);

    if (!response.ok) {
      throw new Error('Failed to get stats');
    }

    const data = await response.json();
    return {
      ...data,
      documentCount: data.myDocuments || 0,
      storageUsedFormatted: formatBytes(data.storageUsed || 0),
      storageLimitFormatted: '10 MB',
    };
  }
}

// Singleton instance
let publicRAGClientInstance: PublicRAGClient | null = null;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getPublicRAGClient(): PublicRAGClient {
  if (!publicRAGClientInstance) {
    publicRAGClientInstance = new PublicRAGClient();
  }
  return publicRAGClientInstance;
}

export default PublicRAGClient;
