export interface TAISRAGConfig {
  baseUrl?: string;
  apiKey?: string;
  walletAddress?: string;
  timeout?: number;
}

export interface AuthChallenge {
  challenge: string;
  expiresAt: string;
  instructions: string;
}

export interface AuthResult {
  success: boolean;
  apiKey: string;
  walletAddress: string;
  tier: string;
  nftCount: number;
  expiresAt: string;
  createdAt: string;
  requestCount: number;
  rateLimit: number;
  rateLimitPeriod: string;
  features: {
    storage: string;
    embeddings: string;
    queries: string;
    apps: string;
  };
}

export interface RAGSession {
  success: boolean;
  sessionId: string;
  walletAddress: string;
  tier: string;
  expiresAt: string;
  expiresIn: number;
  maxDocuments: number;
  maxStorage: number;
}

export interface RAGSessionStatus {
  valid: boolean;
  walletAddress: string;
  tier: string;
  createdAt: string;
  expiresAt: string;
  expiresIn: number;
  documentCount: number;
  bytesUploaded: number;
  lastActivityAt: string;
}

export interface DocumentUploadOptions {
  title?: string;
  tags?: string[];
  isPublic?: boolean;
  chunks?: DocumentChunk[];
}

export interface DocumentChunk {
  encryptedContent: string;
  iv: string;
  embeddingHash: string;
}

export interface UploadedDocument {
  documentId: string;
  size: number;
  chunkCount: number;
  message: string;
  sessionRemaining?: number | null;
}

export interface Document {
  id: string;
  title: string;
  isPublic: boolean;
  tags: string[];
  size: number;
  chunkCount: number;
  downloadCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface DocumentDetail {
  id: string;
  encryptedData: string;
  encryptedMetadata?: string;
  iv: string;
  salt: string;
  ownerPublicKey?: string;
  isPublic: boolean;
  tags: string[];
  size: number;
  chunkCount: number;
  chunks: Array<{
    id: string;
    index: number;
    embeddingHash: string;
  }>;
  createdAt: string;
}

export interface SearchResult {
  documentId: string;
  chunkId: string;
  encryptedContent: string;
  iv: string;
  salt: string;
  embeddingHash: string;
  score: number;
  ownerPublicKey?: string;
  metadata?: string;
}

export interface SearchOptions {
  topK?: number;
}

export interface QuotaStatus {
  tier: string;
  storage: {
    used: number;
    quota: number;
    percentage: number;
  };
  embeddings: {
    used: number;
    limit: number;
    remaining: number;
  };
  queries: {
    used: number;
    limit: number;
    remaining: number;
  };
}

export interface RAGStats {
  totalDocuments: number;
  myDocuments: number;
  publicDocuments: number;
  storageUsed: number;
}

export interface CommunityDocument {
  id: string;
  title: string;
  tags: string[];
  downloadCount: number;
  createdAt: string;
  author: string;
  canAccess: boolean;
}

export class TAISClient {
  private baseUrl: string;
  private apiKey?: string;
  private walletAddress?: string;
  private timeout: number;
  private sessionToken?: string;

  constructor(config: TAISRAGConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://tso.onrender.com';
    this.apiKey = config.apiKey;
    this.walletAddress = config.walletAddress;
    this.timeout = config.timeout || 30000;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any,
    params?: Record<string, string>,
    useSessionToken: boolean = true
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    if (useSessionToken && this.sessionToken) {
      headers['X-Session-Token'] = this.sessionToken;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' })) as Record<string, any>;
        throw new TAISAPIError(
          errorData.error || `HTTP ${response.status}`,
          response.status,
          errorData
        );
      }

      return response.json() as Promise<T>;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof TAISAPIError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TAISAPIError('Request timeout', 408, {});
      }
      throw error;
    }
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  setWalletAddress(walletAddress: string): void {
    this.walletAddress = walletAddress;
  }

  async getAuthChallenge(): Promise<AuthChallenge> {
    if (!this.walletAddress) {
      throw new TAISAPIError('Wallet address required', 400, {});
    }
    return this.request<AuthChallenge>('GET', '/api/v1/sdk/auth/challenge', undefined, { wallet: this.walletAddress });
  }

  async authenticateWithSignature(signMessage: (message: string) => Promise<string>): Promise<AuthResult> {
    if (!this.walletAddress) {
      throw new TAISAPIError('Wallet address required', 400, {});
    }

    const challenge = await this.getAuthChallenge();
    const signature = await signMessage(challenge.challenge);
    
    const result = await this.request<AuthResult>('POST', '/api/v1/sdk/auth/authenticate', {
      wallet: this.walletAddress,
      signature,
    });

    if (result.success && result.apiKey) {
      this.apiKey = result.apiKey;
    }

    return result;
  }

  async verifyApiKey(): Promise<{ valid: boolean; walletAddress: string; tier: string; expiresAt: string }> {
    return this.request<{ valid: boolean; walletAddress: string; tier: string; expiresAt: string }>('GET', '/api/v1/sdk/auth/verify');
  }

  async revokeApiKey(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('DELETE', '/api/v1/sdk/auth/revoke');
  }

  // ============ RAG Session Methods ============

  setSessionToken(token: string): void {
    this.sessionToken = token;
  }

  getSessionToken(): string | undefined {
    return this.sessionToken;
  }

  clearSession(): void {
    this.sessionToken = undefined;
  }

  async startRAGSession(signMessage: (message: string) => Promise<string>): Promise<RAGSession> {
    if (!this.walletAddress) {
      throw new TAISAPIError('Wallet address required', 400, {});
    }

    const challengeMessage = `TAIS RAG Session Authorization\n\nWallet: ${this.walletAddress}\nTimestamp: ${Date.now()}\n\nAuthorize this session for encrypted document uploads.\n\nSession will be valid for 1 hour.`;
    const signature = await signMessage(challengeMessage);

    const result = await this.request<RAGSession>('POST', '/api/v1/rag/session/start', {
      wallet: this.walletAddress,
      signature,
    }, undefined, false);

    if (result.success && result.sessionId) {
      this.sessionToken = result.sessionId;
    }

    return result;
  }

  async getSessionStatus(): Promise<RAGSessionStatus> {
    return this.request<RAGSessionStatus>('GET', '/api/v1/rag/session/status', undefined, undefined, true);
  }

  async endRAGSession(): Promise<{ success: boolean }> {
    const result = await this.request<{ success: boolean }>('DELETE', '/api/v1/rag/session/end', undefined, undefined, true);
    this.sessionToken = undefined;
    return result;
  }

  async uploadDocument(
    encryptedData: string,
    options: DocumentUploadOptions = {}
  ): Promise<UploadedDocument> {
    const body: any = {
      wallet: this.walletAddress,
      encryptedData,
      ...options,
    };

    return this.request<UploadedDocument>('POST', '/api/v1/rag/documents', body);
  }

  async getDocuments(): Promise<Document[]> {
    if (!this.walletAddress) {
      throw new TAISAPIError('Wallet address required', 400, {});
    }

    const result = await this.request<{ documents: Document[] }>(
      'GET',
      '/api/v1/rag/documents',
      undefined,
      { wallet: this.walletAddress }
    );

    return result.documents;
  }

  async getDocument(documentId: string): Promise<DocumentDetail> {
    const params = this.walletAddress ? { wallet: this.walletAddress } : undefined;
    return this.request<DocumentDetail>('GET', `/api/v1/rag/documents/${documentId}`, undefined, params);
  }

  async deleteDocument(documentId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('DELETE', `/api/v1/rag/documents/${documentId}`, {
      wallet: this.walletAddress,
    });
  }

  async search(
    queryHash: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const body = {
      wallet: this.walletAddress,
      queryHash,
      topK: options.topK || 10,
    };

    const result = await this.request<{ results: SearchResult[] }>(
      'POST',
      '/api/v1/rag/search',
      body
    );

    return result.results;
  }

  async shareDocument(
    documentId: string,
    recipientPublicKey: string
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      'POST',
      `/api/v1/rag/documents/${documentId}/share`,
      {
        wallet: this.walletAddress,
        recipientPublicKey,
      }
    );
  }

  async registerPublicKey(publicKey: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      'POST',
      '/api/v1/rag/users/public-key',
      {
        wallet: this.walletAddress,
        publicKey,
      }
    );
  }

  async getPublicKey(walletAddress: string): Promise<{ publicKey: string }> {
    return this.request<{ publicKey: string }>(
      'GET',
      '/api/v1/rag/users/public-key',
      undefined,
      { wallet: walletAddress }
    );
  }

  async getCommunityDocuments(
    limit: number = 20,
    offset: number = 0
  ): Promise<CommunityDocument[]> {
    const result = await this.request<{ documents: CommunityDocument[] }>(
      'GET',
      '/api/v1/rag/community',
      undefined,
      { limit: String(limit), offset: String(offset) }
    );

    return result.documents;
  }

  async getQuota(): Promise<QuotaStatus> {
    if (!this.walletAddress) {
      throw new TAISAPIError('Wallet address required', 400, {});
    }

    return this.request<QuotaStatus>(
      'GET',
      '/api/v1/rag/quota',
      undefined,
      { wallet: this.walletAddress }
    );
  }

  async getStats(): Promise<RAGStats> {
    const params = this.walletAddress ? { wallet: this.walletAddress } : undefined;
    return this.request<RAGStats>('GET', '/api/v1/rag/stats', undefined, params);
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('GET', '/health');
  }
}

export class TAISAPIError extends Error {
  public readonly statusCode: number;
  public readonly details: Record<string, any>;

  constructor(message: string, statusCode: number, details: Record<string, any>) {
    super(message);
    this.name = 'TAISAPIError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export * from './crypto';
export default TAISClient;
