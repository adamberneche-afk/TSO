// Shared helper for e2e tests that need a real wallet signature --
// routes/oauth.ts's /register-app and /approve endpoints verify an actual
// ECDSA signature over a deterministic challenge string (see
// utils/signature.ts's verifySignature), so a placeholder string like
// '0xsignature' no longer passes once that verification is correctly
// wired up (real message/signature argument order, and actually checking
// `.valid`).

import { ethers } from 'ethers';
import request from 'supertest';

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

/**
 * Drives the real authorize -> approve -> token-exchange round trip
 * (routes/oauth.ts) end to end and returns a genuinely issued access
 * token -- the same three real HTTP calls
 * oauth-token-lifecycle.e2e.test.ts already made inline. Factored out
 * here so every e2e suite that needs a real /agent/* or /oauth/*
 * access token (not a placeholder string an app never actually issued)
 * can get one without duplicating the flow. Throws with the failing
 * step's response body if any step doesn't return 200, so a broken
 * step fails loudly at test setup instead of producing a confusing
 * downstream 401.
 */
export async function completeOAuthFlow(
  app: import('express').Express,
  wallet: ethers.Wallet,
  params: { appId: string; appSecret: string; scopes: string[]; redirectUri: string }
): Promise<{ accessToken: string; refreshToken: string }> {
  const authorizeResponse = await request(app)
    .get('/api/v1/oauth/authorize')
    .query({
      app_id: params.appId,
      scopes: params.scopes.join(','),
      redirect_uri: params.redirectUri,
      wallet: wallet.address,
    });
  if (authorizeResponse.status !== 200) {
    throw new Error(`completeOAuthFlow: /authorize failed (${authorizeResponse.status}): ${JSON.stringify(authorizeResponse.body)}`);
  }
  const authorizationId = authorizeResponse.body.authorizationId;

  const signature = await signApproveChallenge(wallet, { appId: params.appId, scopes: params.scopes, authorizationId });
  const approveResponse = await request(app)
    .post('/api/v1/oauth/approve')
    .send({ authorizationId, wallet: wallet.address, signature });
  if (approveResponse.status !== 200) {
    throw new Error(`completeOAuthFlow: /approve failed (${approveResponse.status}): ${JSON.stringify(approveResponse.body)}`);
  }
  const code = new URL(approveResponse.body.redirectUri).searchParams.get('code');
  if (!code) {
    throw new Error('completeOAuthFlow: /approve did not return a code in redirectUri');
  }

  const tokenResponse = await request(app)
    .post('/api/v1/oauth/token')
    .send({
      grant_type: 'authorization_code',
      code,
      app_id: params.appId,
      app_secret: params.appSecret,
    });
  if (tokenResponse.status !== 200) {
    throw new Error(`completeOAuthFlow: /token failed (${tokenResponse.status}): ${JSON.stringify(tokenResponse.body)}`);
  }

  return { accessToken: tokenResponse.body.access_token, refreshToken: tokenResponse.body.refresh_token };
}
