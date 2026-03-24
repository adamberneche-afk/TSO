// Base URL for public RAG endpoints
const PUBLIC_RAG_BASE_URL = (import.meta as any).env.VITE_PUBLIC_RAG_API_URL || 'https://tso.onrender.com/api/v1/rag';

// Helper to make authenticated requests
async function authenticatedRequest<T = any>(
  endpoint: string,
  { method = 'GET', data, params, useAuth = true }: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    data?: any;
    params?: Record<string, any>;
    useAuth?: boolean;
  } = {}
): Promise<T> {
  // Build URL with query params
  let url = `${PUBLIC_RAG_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    if (searchParams.toString()) {
      url += `?${searchParams.toString()}`;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

   if (useAuth) {
     // Try multiple token keys for compatibility
     let token = localStorage.getItem('tais_token') || 
                 localStorage.getItem('auth_token') ||
                 localStorage.getItem('token');
     if (token) {
       headers['Authorization'] = `Bearer ${token}`;
     }
   }

  const options: RequestInit = {
    method,
    headers,
  };

  if (data && !(data instanceof FormData)) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    let errorMsg = `Request failed: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.message || errorData.error || errorMsg;
    } catch (e) {
      // ignore
    }
    throw new Error(errorMsg);
  }

  // Return empty body for 204
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const ragApi = {
   /**
    * Register or get API key for the user
    */
   async getOrCreateAPIKey(walletAddress: string, signature: string): Promise<string> {
     const result = await authenticatedRequest<{ apiKey: string }>('/users/api-key', {
       method: 'POST',
       data: { walletAddress, signature }
     });
     return result.apiKey;
   },

   /**
    * Register user's public key with the platform
    */
   async registerPublicKey(walletAddress: string, publicKey: string): Promise<void> {
     await authenticatedRequest<void>('/users/public-key', {
       method: 'POST',
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
     return await authenticatedRequest<any>('/documents', {
       method: 'POST',
       data: data
     });
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
     const result = await authenticatedRequest<any[]>('/search', {
       method: 'POST',
       data: data
     });
     return result;
   },

   /**
    * Get document by ID
    */
   async getDocument(walletAddress: string, documentId: string): Promise<any> {
     return await authenticatedRequest<any>(`/documents/${documentId}`, {
       method: 'GET',
       params: { wallet: walletAddress }
     });
   },

   /**
    * Download and decrypt document (returns encrypted data for client decryption)
    */
   async downloadDocument(walletAddress: string, documentId: string): Promise<any> {
     return await authenticatedRequest<any>(`/documents/${documentId}`, {
       method: 'GET',
       params: { wallet: walletAddress }
     });
   },

   /**
    * Get document chunks
    */
   async getDocumentChunks(walletAddress: string, documentId: string): Promise<any[]> {
     const result = await authenticatedRequest<any[]>(`/documents/${documentId}/chunks`, {
       method: 'GET',
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
     await authenticatedRequest<void>(`/documents/${data.documentId}/share`, {
       method: 'POST',
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
      const result = await authenticatedRequest<any[]>('/community', {
        method: 'GET',
        params: params,
        useAuth: false   // Community endpoint is public
      });
      return result;
    },

   /**
    * Get my documents
    */
   async getMyDocuments(walletAddress: string): Promise<any[]> {
     const result = await authenticatedRequest<any[]>('/documents', {
       method: 'GET',
       params: { wallet: walletAddress }
     });
     return result;
   },

   /**
    * Delete document
    */
   async deleteDocument(walletAddress: string, documentId: string): Promise<void> {
     await authenticatedRequest<void>(`/documents/${documentId}`, {
       method: 'DELETE',
       params: { wallet: walletAddress }
     });
   },

   /**
    * Get Public RAG stats
    */
   async getStats(walletAddress: string): Promise<any> {
     return await authenticatedRequest<any>('/stats', {
       method: 'GET',
       params: { wallet: walletAddress }
     });
   }
 };