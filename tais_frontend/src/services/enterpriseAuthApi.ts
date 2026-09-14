// Enterprise RAG: email/password login (docs/ENTERPRISE_RAG_IDENTITY.md).
// No wallet, no MetaMask, no blockchain infrastructure anywhere in this
// file -- a successful login stores a JWT under the exact same
// localStorage keys `authApi`'s wallet-signature login uses
// ('auth_token' / 'wallet_address'), because the server issues the
// identical {walletAddress} JWT shape either way (the "wallet address"
// here is a deterministic, non-signable pseudo-address derived from the
// email -- see the backend's services/emailIdentity.ts). Every existing
// `api.*` call already attaches whichever token is stored there, so
// nothing else in this app needs to know or care which kind of session
// is active.
//
// Note: unlike this file, `authApi.ts`'s own getNonce/login (and most of
// oauthApi.ts) pass their request body as `{ data: {...} }` to `api.post`,
// whose second argument *is* the body -- double-wrapping it. That's a
// separate, pre-existing bug affecting wallet/OAuth login, out of scope
// here; this file deliberately does not repeat it (see registry-client.ts's
// publishSkill, which was fixed the same way for the same reason).

import { api } from '@/api/client';
import { authApi } from '@/services/authApi';
import type { EmailLoginResult } from '@/types/enterprise';

const IDENTITY_KIND_KEY = 'auth_identity_kind';

export const enterpriseAuthApi = {
  async login(email: string, password: string): Promise<EmailLoginResult> {
    const result = await api.post<EmailLoginResult>('/api/v1/auth/email/login', { email, password });
    localStorage.setItem('auth_token', result.token);
    // The server doesn't echo the derived pseudo-address back -- decode
    // it from the JWT itself, the same way authApi already does for a
    // wallet-signature login.
    const walletAddress = authApi.getWalletFromToken();
    if (walletAddress) {
      localStorage.setItem('wallet_address', walletAddress);
    }
    localStorage.setItem(IDENTITY_KIND_KEY, 'email');
    localStorage.setItem('auth_email', result.email);
    return result;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return api.post('/api/v1/auth/email/forgot-password', { email });
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return api.post('/api/v1/auth/email/reset-password', { token, newPassword });
  },

  /** True if the currently stored session was established via email/password, not a wallet. */
  isEmailSession(): boolean {
    return localStorage.getItem(IDENTITY_KIND_KEY) === 'email';
  },

  getStoredEmail(): string | null {
    return localStorage.getItem('auth_email');
  },

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('auth_email');
    localStorage.removeItem(IDENTITY_KIND_KEY);
  },
};

export default enterpriseAuthApi;
