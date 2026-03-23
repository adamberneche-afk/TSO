import { api } from '@/api/client';
import { useWallet } from '@/hooks/useWallet';
import { isValidEthAddress } from '@/utils/addressValidator';

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

export const authApi = {
   /**
    * Get nonce for wallet signature
    */
   async getNonce(walletAddress: string): Promise<NonceResponse> {
     return api.post<NonceResponse>('/api/v1/auth/nonce', { 
       data: { walletAddress } 
     });
   }
  },

  /**
   * Check if current wallet matches JWT
   */
  isWalletMatch(currentWallet: string): boolean {
    const tokenWallet = this.getWalletFromToken();
    if (!tokenWallet) return false;
    return tokenWallet.toLowerCase() === currentWallet.toLowerCase();
  },

  /**
   * Check if user has valid authenticated session
   * Returns true if token exists and is not expired
   */
  hasValidSession(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      const payload = JSON.parse(atob(parts[1]));
      
      // Check expiration
      if (payload.exp) {
        const expDate = new Date(payload.exp * 1000);
        if (expDate < new Date()) {
          return false;
        }
      }
      
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get stored wallet address (checks multiple keys for compatibility)
   */
  getStoredWallet(): string | null {
    return localStorage.getItem('wallet_address') || localStorage.getItem('walletAddress') || localStorage.getItem('wallet');
  }
};