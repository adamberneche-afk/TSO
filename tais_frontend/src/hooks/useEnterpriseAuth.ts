// Enterprise RAG: email/password session hook (docs/ENTERPRISE_RAG_IDENTITY.md).
// Deliberate counterpart to useWallet.ts that never touches
// window.ethereum -- restoring a session here is just "is there a
// non-expired token", not "is MetaMask still connected to this account".

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { authApi } from '@/services/authApi';
import { enterpriseAuthApi } from '@/services/enterpriseAuthApi';

interface UseEnterpriseAuthReturn {
  isAuthenticated: boolean;
  email: string | null;
  walletAddress: string | null;
  isLoggingIn: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export function useEnterpriseAuth(): UseEnterpriseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restore = useCallback(() => {
    if (enterpriseAuthApi.isEmailSession() && authApi.hasValidSession()) {
      setIsAuthenticated(true);
      setEmail(enterpriseAuthApi.getStoredEmail());
      setWalletAddress(authApi.getWalletFromToken());
    } else {
      setIsAuthenticated(false);
      setEmail(null);
      setWalletAddress(null);
    }
  }, []);

  useEffect(() => {
    restore();
  }, [restore]);

  const login = useCallback(async (loginEmail: string, password: string): Promise<boolean> => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const result = await enterpriseAuthApi.login(loginEmail, password);
      setIsAuthenticated(true);
      setEmail(result.email);
      setWalletAddress(authApi.getWalletFromToken());
      return true;
    } catch (err: any) {
      const message = err?.message || 'Login failed';
      setError(message);
      toast.error('Login failed', { description: message });
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const logout = useCallback(() => {
    enterpriseAuthApi.logout();
    setIsAuthenticated(false);
    setEmail(null);
    setWalletAddress(null);
    toast.info('Logged out');
  }, []);

  return { isAuthenticated, email, walletAddress, isLoggingIn, error, login, logout };
}
