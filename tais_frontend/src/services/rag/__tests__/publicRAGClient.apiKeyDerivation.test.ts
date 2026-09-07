// @vitest-environment jsdom
//
// Regression test for the phishable, deterministic RAG API-key
// derivation bug.
//
// getOrCreateAPIKey signed a fixed string ('TAIS RAG API Key Creation')
// with no nonce. personal_sign is deterministic (RFC 6979) for a given
// wallet + message, so any unrelated site that got a user to sign that
// exact text -- disguised as some other, unrelated action -- could
// compute the exact same signature, and therefore the exact same
// derived API key, without ever touching the wallet's private key.
//
// getOrCreateAPIKey is private; called directly via `as any` (bypassing
// the need to mock window.ethereum / ethers.providers.Web3Provider,
// which initializeWithWallet would otherwise require) with a real
// ethers.Wallet standing in for the injected browser signer -- it has
// the same async signMessage(message): Promise<string> shape the real
// code calls.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ethers } from 'ethers';

vi.mock('../e2eeEncryption', () => ({
  getE2EEEncryptionService: () => ({
    initialize: vi.fn(),
    getPublicKey: () => null,
  }),
}));

vi.mock('../ragApi', () => ({
  ragApi: {
    registerPublicKey: vi.fn().mockResolvedValue(undefined),
  },
}));

import { PublicRAGClient } from '../publicRAGClient';

describe('PublicRAGClient.getOrCreateAPIKey', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('signs a different message (and derives a different key) each time, not a fixed nonce-less string', async () => {
    const wallet = ethers.Wallet.createRandom();
    const client = new PublicRAGClient();

    const key1 = await (client as any).getOrCreateAPIKey(wallet);
    localStorage.clear(); // force a fresh derivation, as if this were a second, independent phishing attempt
    const key2 = await (client as any).getOrCreateAPIKey(wallet);

    // Real regression check: the same wallet signing "again" must not
    // reproduce the same API key -- that reproducibility is exactly what
    // let a phishing site precompute the real key from a phished
    // signature of the old fixed string.
    expect(key1).not.toBe(key2);
  });

  it('embeds a random nonce in the signed message rather than a fixed string', async () => {
    const wallet = ethers.Wallet.createRandom();
    const signMessageSpy = vi.spyOn(wallet, 'signMessage');
    const client = new PublicRAGClient();

    await (client as any).getOrCreateAPIKey(wallet);
    const [signedMessage] = signMessageSpy.mock.calls[0];

    expect(signedMessage).toMatch(/^TAIS RAG API Key Creation\n\nNonce: .+/);

    localStorage.clear();
    await (client as any).getOrCreateAPIKey(wallet);
    const [secondSignedMessage] = signMessageSpy.mock.calls[1];

    // Two derivations must sign genuinely different messages.
    expect(secondSignedMessage).not.toBe(signedMessage);
  });

  it('still returns a cached key from localStorage without re-signing', async () => {
    const wallet = ethers.Wallet.createRandom();
    const signMessageSpy = vi.spyOn(wallet, 'signMessage');
    const client = new PublicRAGClient();

    const first = await (client as any).getOrCreateAPIKey(wallet);
    const second = await (client as any).getOrCreateAPIKey(wallet);

    expect(second).toBe(first);
    expect(signMessageSpy).toHaveBeenCalledTimes(1);
  });
});
