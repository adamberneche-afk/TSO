// tais_frontend/src/services/authApi.ts
// Authentication API for wallet-based JWT

const API_BASE_URL = import.meta.env.VITE_REGISTRY_URL || 'https://tso.onrender.com';

interface AuthResponse {
  token: string;
  walletAddress: string;
  expiresIn: string;
}

interface NonceResponse {
  nonce: string;
  message: string;
  expiresIn: string;
}

class AuthAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/v1/auth`;
  }

  /**
   * Get nonce for wallet signature
   */
  async getNonce(walletAddress: string): Promise<NonceResponse> {
    const response = await fetch(`${this.baseUrl}/nonce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get nonce');
    }

    return response.json();
  }

  /**
   * Authenticate with wallet signature
   */
  async login(walletAddress: string, signature: string, nonce: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        signature,
        nonce,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Authentication failed');
    }

    const result = await response.json();
    
    // Store token in localStorage
    localStorage.setItem('auth_token', result.token);
    
    return result;
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Clear token (logout)
   */
  logout(): void {
    localStorage.removeItem('auth_token');
  }

  /**
   * Verify token and get wallet address
   * Returns null if token is invalid
   */
  getWalletFromToken(): string | null {
    const token = this.getToken();
    if (!token) return null;
    
    try {
      // JWT structure: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      // Decode payload (base64)
      const payload = JSON.parse(atob(parts[1]));
      return payload.walletAddress || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if current wallet matches JWT
   */
  isWalletMatch(currentWallet: string): boolean {
    const tokenWallet = this.getWalletFromToken();
    if (!tokenWallet) return false;
    return tokenWallet.toLowerCase() === currentWallet.toLowerCase();
  }
}

export const authApi = new AuthAPI();
