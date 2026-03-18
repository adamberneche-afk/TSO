import { api } from '@/api/client';

// Base URL for public RAG endpoints
const PUBLIC_RAG_BASE_URL = import.meta.env.VITE_PUBLIC_RAG_API_URL || 'https://tso.onrender.com/api/v1/rag';

// Helper to prepend base URL
function endpoint(path: string): string {
  return `${PUBLIC_RAG_BASE_URL}${path}`;
}

export const ragApi = {
  /**
   * Register or get API key for the user
   */
  async getOrCreateAPIKey(walletAddress: string, signature: string): Promise<string> {
    const result = await api.post<{ apiKey: string }>(endpoint('/users/api-key'), {
      data: { walletAddress, signature }
    });
    return result.apiKey;
  },

  /**
   * Register user's public key with the platform
   */
  async registerPublicKey(walletAddress: string, publicKey: string): Promise<void> {
    await api.post(endpoint('/users/public-key'), {
      data: { walletAddress, publicKey }
    });
  },

  /**
   * Upload a document to Public RAG (E2EE)
   */
  async uploadDocument(data: {
    wallet: string;
    encryptedData: string;
    encryptedMetadata: string;
    iv: string;
    salt: string;
    ownerPublicKey: string;
    isPublic: boolean;
    tags: string[];
    chunks: Array<{
      index: number;
      encryptedContent: string;
      iv: string;
      embeddingHash: string;
    }>;
  }): Promise<any> {
    return api.post<any>(endpoint('/documents'), { data });
  },

  /**
   * Search Public RAG
   */
  async search(data: {
    wallet: string;
    queryHash: string;
    topK?: number;
    filters?: Record<string, any>;
  }): Promise<any[]> {
    const result = await api.post<any[]>(endpoint('/search'), { data });
    return result;
  },

  /**
   * Get document by ID
   */
  async getDocument(walletAddress: string, documentId: string): Promise<any> {
    return api.get<any>(endpoint(`/documents/${documentId}`), {
      params: { wallet: walletAddress }
    });
  },

  /**
   * Download and decrypt document (returns encrypted data for client decryption)
   */
  async downloadDocument(walletAddress: string, documentId: string): Promise<any> {
    return api.get<any>(endpoint(`/documents/${documentId}`), {
      params: { wallet: walletAddress }
    });
  },

  /**
   * Get document chunks
   */
  async getDocumentChunks(walletAddress: string, documentId: string): Promise<any[]> {
    const result = await api.get<any[]>(endpoint(`/documents/${documentId}/chunks`), {
      params: { wallet: walletAddress }
    });
    return result;
  },

  /**
   * Share document with another user
   */
  async shareDocument(data: {
    wallet: string;
    documentId: string;
    recipientPublicKey: string;
  }): Promise<void> {
    await api.post(endpoint(`/documents/${data.documentId}/share`), {
      data: {
        wallet: data.wallet,
        recipientPublicKey: data.recipientPublicKey
      }
    });
  },

  /**
   * Get community documents (public/shared)
   */
  async getCommunityDocuments(params: { limit?: number; offset?: number }): Promise<any[]> {
    const result = await api.get<any[]>(endpoint('/community'), { params });
    return result;
  },

  /**
   * Get my documents
   */
  async getMyDocuments(walletAddress: string): Promise<any[]> {
    const result = await api.get<any[]>(endpoint('/documents'), {
      params: { wallet: walletAddress }
    });
    return result;
  },

  /**
   * Delete document
   */
  async deleteDocument(walletAddress: string, documentId: string): Promise<void> {
    await api.delete(endpoint(`/documents/${documentId}`), {
      params: { wallet: walletAddress }
    });
  },

  /**
   * Get Public RAG stats
   */
  async getStats(walletAddress: string): Promise<any> {
    return api.get<any>(endpoint('/stats'), {
      params: { wallet: walletAddress }
    });
  }
};