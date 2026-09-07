// Shared helper for e2e tests that need a real wallet signature --
// routes/oauth.ts's /register-app and /approve endpoints verify an actual
// ECDSA signature over a deterministic challenge string (see
// utils/signature.ts's verifySignature), so a placeholder string like
// '0xsignature' no longer passes once that verification is correctly
// wired up (real message/signature argument order, and actually checking
// `.valid`).

import { ethers } from 'ethers';

export function createTestWallet(): ethers.Wallet {
  return ethers.Wallet.createRandom() as unknown as ethers.Wallet;
}

// Mirrors the exact challenge string routes/oauth.ts's /register-app
// handler reconstructs server-side.
export async function signRegisterAppChallenge(
  wallet: ethers.Wallet,
  params: { appId: string; name: string }
): Promise<{ signature: string; timestamp: number }> {
  const timestamp = Date.now();
  const challenge = `TAIS App Registration\n\nApp ID: ${params.appId}\nApp Name: ${params.name}\nWallet: ${wallet.address}\nTimestamp: ${timestamp}`;
  const signature = await wallet.signMessage(challenge);
  return { signature, timestamp };
}

// Mirrors the exact challenge string routes/oauth.ts's /approve handler
// reconstructs server-side from the stored oAuthPendingAuthorization
// record (appId, scopes joined with ', ', wallet, and the authorizationId
// nonce). The stored walletAddress is always lowercased (see /authorize),
// so the challenge has to use the lowercased address too, or it diverges
// from what the server reconstructs.
export async function signApproveChallenge(
  wallet: ethers.Wallet,
  params: { appId: string; scopes: string[]; authorizationId: string }
): Promise<string> {
  const challenge = `TAIS OAuth Authorization\n\nApp: ${params.appId}\nScopes: ${params.scopes.join(', ')}\nWallet: ${wallet.address.toLowerCase()}\nNonce: ${params.authorizationId}`;
  return wallet.signMessage(challenge);
}

// Mirrors the exact challenge string services/ragSession.ts's POST /start
// handler reconstructs server-side (and the string rag-sdk's
// startRAGSession() actually signs).
export async function signRagSessionChallenge(
  wallet: ethers.Wallet
): Promise<{ signature: string; timestamp: number }> {
  const timestamp = Date.now();
  const challenge = `TAIS RAG Session Authorization\n\nWallet: ${wallet.address}\nTimestamp: ${timestamp}\n\nAuthorize this session for encrypted document uploads.\n\nSession will be valid for 1 hour.`;
  const signature = await wallet.signMessage(challenge);
  return { signature, timestamp };
}
