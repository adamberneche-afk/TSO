import axios, { AxiosInstance } from 'axios';
import type {
  TAISAgentConfig,
  AgentContext,
  OAuthTokens,
  ChatOptions,
  ChatResponse,
  UpdateMemoryOptions,
  Session,
  AuthorizationUrlOptions,
  AuthorizationResponse,
  AppRegistration,
  RegisteredApp,
  AppInfo,
  PermissionInfo,
} from './types.js';

const DEFAULT_BASE_URL = 'https://tso.onrender.com';

export class TAISAgent {
  private readonly client: AxiosInstance;
  private readonly config: TAISAgentConfig;
  private tokens: OAuthTokens | null = null;

  constructor(config: TAISAgentConfig) {
    this.config = {
      baseUrl: DEFAULT_BASE_URL,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  setTokens(tokens: OAuthTokens): void {
    this.tokens = tokens;
  }

  getTokens(): OAuthTokens | null {
    return this.tokens;
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.tokens?.accessToken) {
      throw new Error('Not authenticated. Please authenticate first.');
    }
    return {
      Authorization: `Bearer ${this.tokens.accessToken}`,
      'X-App-Id': this.config.appId,
    };
  }

  async getAuthorizationUrl(options: AuthorizationUrlOptions): Promise<string> {
    const params = new URLSearchParams({
      app_id: this.config.appId,
      redirect_uri: this.config.redirectUri,
      wallet: '',
      scopes: options.scopes.join(','),
    });

    if (options.state) {
      params.append('state', options.state);
    }

    return `${this.config.baseUrl}/api/v1/oauth/authorize?${params.toString()}`;
  }

  async initiateAuthorization(scopes: string[], state?: string): Promise<AuthorizationResponse> {
    const wallet = (state || '').split(':')[0] || '';
    
    const response = await this.client.get('/api/v1/oauth/authorize', {
      params: {
        app_id: this.config.appId,
        redirect_uri: this.config.redirectUri,
        scopes: scopes.join(','),
        state: state || '',
        wallet,
      },
    });

    return response.data;
  }

  async approveAuthorization(authorizationId: string, wallet: string, signature: string): Promise<{ redirectUri: string }> {
    const response = await this.client.post('/api/v1/oauth/approve', {
      authorizationId,
      signature,
      wallet,
    });

    return response.data;
  }

  async exchangeCode(code: string): Promise<OAuthTokens> {
    const response = await this.client.post('/api/v1/oauth/token', {
      grant_type: 'authorization_code',
      code,
      app_id: this.config.appId,
      app_secret: this.config.appSecret,
    });

    const tokens: OAuthTokens = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      tokenType: response.data.token_type,
      expiresIn: response.data.expires_in,
      walletAddress: response.data.walletAddress,
      scopes: response.data.scopes,
    };

    this.setTokens(tokens);
    return tokens;
  }

  async refreshToken(): Promise<OAuthTokens> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.client.post('/api/v1/oauth/token', {
      grant_type: 'refresh_token',
      refresh_token: this.tokens.refreshToken,
      app_id: this.config.appId,
      app_secret: this.config.appSecret,
    });

    const tokens: OAuthTokens = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      tokenType: response.data.token_type,
      expiresIn: response.data.expires_in,
      walletAddress: response.data.walletAddress,
      scopes: response.data.scopes,
    };

    this.setTokens(tokens);
    return tokens;
  }

  async getContext(walletAddress?: string): Promise<AgentContext> {
    const response = await this.client.get('/api/v1/agent/context', {
      headers: this.getAuthHeaders(),
      params: walletAddress ? { wallet: walletAddress } : undefined,
    });

    return response.data;
  }

  async getMemory(type?: string, limit: number = 50): Promise<{ memories: any[] }> {
    const response = await this.client.get('/api/v1/agent/memory', {
      headers: this.getAuthHeaders(),
      params: { type, limit },
    });

    return response.data;
  }

  async updateMemory(options: UpdateMemoryOptions): Promise<{ success: boolean; entry: any }> {
    const response = await this.client.post('/api/v1/agent/memory', {
      type: options.update.type.toUpperCase(),
      summary: options.update.summary,
      details: options.update.details,
    }, {
      headers: this.getAuthHeaders(),
    });

    return response.data;
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    const response = await this.client.post('/api/v1/agent/chat', {
      messages: options.messages,
      appContext: options.appContext,
      parentSession: options.parentSession,
      maxInheritedMessages: options.maxInheritedMessages || 10,
    }, {
      headers: {
        ...this.getAuthHeaders(),
        'X-App-Id': this.config.appId,
      },
    });

    return response.data;
  }

  async getSessions(limit: number = 20): Promise<{ sessions: Session[] }> {
    const response = await this.client.get('/api/v1/agent/sessions', {
      headers: this.getAuthHeaders(),
      params: { limit },
    });

    return response.data;
  }

  async registerApp(registration: Omit<AppRegistration, 'appId' | 'appSecret'>): Promise<RegisteredApp> {
    const response = await this.client.post('/api/v1/oauth/register-app', {
      ...registration,
      appId: this.config.appId,
      app_secret: this.config.appSecret,
    });

    return response.data.app;
  }

  async listApps(): Promise<{ apps: AppInfo[] }> {
    const response = await this.client.get('/api/v1/oauth/apps', {
      params: { wallet: this.tokens?.walletAddress },
    });

    return response.data;
  }

  async listPermissions(wallet: string, appId?: string): Promise<{ permissions: PermissionInfo[] }> {
    const response = await this.client.get('/api/v1/oauth/permissions', {
      params: { wallet, app_id: appId },
    });

    return response.data;
  }

  async revokeAccess(wallet: string): Promise<{ success: boolean }> {
    if (!this.tokens?.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await this.client.post('/api/v1/oauth/revoke', {
      access_token: this.tokens.accessToken,
      wallet,
      app_id: this.config.appId,
    });

    this.tokens = null;
    return response.data;
  }

  isAuthenticated(): boolean {
    return !!this.tokens?.accessToken;
  }

  getAppName(): string {
    return this.config.appName;
  }

  getAppId(): string {
    return this.config.appId;
  }
}

export default TAISAgent;
