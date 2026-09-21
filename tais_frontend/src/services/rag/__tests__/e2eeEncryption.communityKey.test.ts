// @vitest-environment jsdom
//
// Regression test for the hardcoded, publicly-bundled "E2EE
// community/public" encryption key.
//
// encryptForCommunity/decryptCommunity used to derive the AES key
// entirely client-side from a string constant compiled into this JS
// bundle -- readable by anyone who ever loads the page, no login
// required. They now call the registry's authenticated
// /rag/community/encrypt and /decrypt endpoints instead of doing any
// crypto locally.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { E2EEEncryptionService } from '../e2eeEncryption';

const originalFetch = global.fetch;

describe('E2EEEncryptionService community encryption', () => {
  let service: E2EEEncryptionService;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('tais_token', 'a-real-jwt-would-go-here');
    service = new E2EEEncryptionService();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('encryptForCommunity calls the authenticated server endpoint, not local crypto', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ encrypted: 'server-ciphertext', iv: 'server-iv', salt: 'server-salt' }),
    });
    global.fetch = fetchMock as any;

    const result = await service.encryptForCommunity('some community text');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/rag/community/encrypt');
    expect(options.method).toBe('POST');
    // The token must be attached -- this is what makes the endpoint
    // actually require a real, authenticated platform account instead
    // of being open to anyone.
    expect(options.headers.Authorization).toBe('Bearer a-real-jwt-would-go-here');
    expect(JSON.parse(options.body)).toEqual({ data: 'some community text' });

    // The result must be whatever the server computed -- not a value
    // this client derived on its own.
    expect(result).toEqual({ encrypted: 'server-ciphertext', iv: 'server-iv', salt: 'server-salt' });
  });

  it('decryptCommunity calls the authenticated server endpoint and returns its plaintext', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'decrypted by the server' }),
    });
    global.fetch = fetchMock as any;

    const result = await service.decryptCommunity('ciphertext', 'iv', 'salt');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/rag/community/decrypt');
    expect(JSON.parse(options.body)).toEqual({ encrypted: 'ciphertext', iv: 'iv', salt: 'salt' });
    expect(result).toBe('decrypted by the server');
  });

  it('surfaces a real error when the server rejects the request (e.g. unauthenticated)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Authentication required' }),
    });
    global.fetch = fetchMock as any;

    await expect(service.encryptForCommunity('text')).rejects.toThrow(/authentication required/i);
  });
});
