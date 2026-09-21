// @vitest-environment jsdom
//
// Regression test for the "rejected MetaMask popup destroys the
// encryption keypair" bug.
//
// initialize() used to be: try to load+decrypt the stored key pair; if
// that came back null for ANY reason -- no key ever existed, OR a key
// exists but the user rejected the unlock signature, OR the wrong
// wallet account is connected, OR the entry is genuinely corrupt -- fall
// through to generateKeyPair(), which unconditionally overwrites
// localStorage with a brand-new key pair. A user who simply declined one
// signature prompt (or had switched accounts) would silently lose access
// to every document previously encrypted under their real key, replaced
// by a new one with no warning and no way back.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { E2EEEncryptionService } from '../e2eeEncryption';

const STORAGE_KEY = 'public_rag_keypair_v2';

describe('E2EEEncryptionService.initialize', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('generates a new key pair when nothing is stored yet', async () => {
    const service = new E2EEEncryptionService();
    const generateKeyPair = vi.spyOn(service, 'generateKeyPair').mockResolvedValue({
      publicKey: 'pub',
      privateKey: '[encrypted]',
      createdAt: Date.now(),
    });

    const fakeSigner = {} as any;
    await service.initialize(fakeSigner);

    expect(generateKeyPair).toHaveBeenCalledWith(fakeSigner);
  });

  it('does not overwrite an existing key pair it merely failed to unlock', async () => {
    // A stored entry exists (garbage is enough -- it fails at JSON.parse,
    // exactly like a real entry would fail if the unlock signature were
    // rejected or the wrong account were connected: loadStoredKeyPair
    // catches the failure and returns null either way).
    const existingStoredValue = 'not-valid-json-and-definitely-not-a-real-keypair';
    localStorage.setItem(STORAGE_KEY, existingStoredValue);

    const service = new E2EEEncryptionService();
    const generateKeyPair = vi.spyOn(service, 'generateKeyPair').mockResolvedValue({
      publicKey: 'pub',
      privateKey: '[encrypted]',
      createdAt: Date.now(),
    });

    const fakeSigner = {} as any;
    await expect(service.initialize(fakeSigner)).rejects.toThrow(/unlock/i);

    // The real regression check: the original entry must still be there,
    // byte for byte -- never silently replaced.
    expect(localStorage.getItem(STORAGE_KEY)).toBe(existingStoredValue);
    expect(generateKeyPair).not.toHaveBeenCalled();
  });
});
