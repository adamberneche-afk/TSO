// Regression tests for RegistryClient -- the CLI previously had no
// registry HTTP client at all (docs/DOCS_VS_CODEBASE.md row 9: "audit/
// verify never call any registry HTTP endpoint"). These pin down the
// actual request/response shapes against the real routes it talks to
// (packages/registry/src/routes/auth.ts, routes/audits.ts).

import { ethers } from 'ethers';
import { RegistryClient } from '../RegistryClient';

function mockFetchOnce(status: number, body: unknown) {
  return jest.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

describe('RegistryClient', () => {
  const BASE_URL = 'https://registry.example.test';
  let fetchSpy: jest.SpyInstance;

  afterEach(() => {
    fetchSpy?.mockRestore();
  });

  describe('loginWithWallet', () => {
    it('performs nonce -> sign -> login and returns the JWT', async () => {
      const wallet = ethers.Wallet.createRandom();
      const client = new RegistryClient(BASE_URL);

      const calls: any[] = [];
      fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (url: any, init: any) => {
        calls.push({ url, init });
        if (String(url).endsWith('/api/v1/auth/nonce')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ message: 'TAIS Platform Authentication\n\nNonce: abc123', nonce: 'abc123' }),
            text: async () => '',
          } as any;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ token: 'jwt-token-value' }),
          text: async () => '',
        } as any;
      });

      const token = await client.loginWithWallet(wallet);

      expect(token).toBe('jwt-token-value');
      expect(calls).toHaveLength(2);
      expect(calls[0].url).toBe(`${BASE_URL}/api/v1/auth/nonce`);
      expect(JSON.parse(calls[0].init.body)).toEqual({ walletAddress: wallet.address });

      const loginBody = JSON.parse(calls[1].init.body);
      expect(loginBody.walletAddress).toBe(wallet.address);
      expect(loginBody.nonce).toBe('abc123');
      // Signature must actually verify against the message the "server"
      // returned, not just be some opaque string.
      expect(ethers.verifyMessage('TAIS Platform Authentication\n\nNonce: abc123', loginBody.signature))
        .toBe(wallet.address);
    });

    it('throws with the response body when the nonce request fails', async () => {
      const wallet = ethers.Wallet.createRandom();
      const client = new RegistryClient(BASE_URL);
      fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(mockFetchOnce(500, {}) as any);

      await expect(client.loginWithWallet(wallet)).rejects.toThrow(/Failed to get auth nonce/);
    });
  });

  describe('submitAudit', () => {
    it('returns success with the server-computed trust score', async () => {
      const client = new RegistryClient(BASE_URL);
      fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(
        mockFetchOnce(201, { success: true, auditId: 'audit-1', trustScore: 0.8, isBlocked: false }) as any
      );

      const result = await client.submitAudit(
        {
          skill_hash: 'a'.repeat(64),
          auditor: '0x' + '1'.repeat(40),
          status: 'safe',
          findings: [],
          signature: '0x' + '0'.repeat(130),
          timestamp: new Date().toISOString(),
          audit_method: 'manual_review',
        },
        'jwt-token-value'
      );

      expect(result).toEqual({ success: true, auditId: 'audit-1', trustScore: 0.8, isBlocked: false });
      const [, init] = (fetchSpy.mock.calls[0] as any[]);
      expect(init.headers.Authorization).toBe('Bearer jwt-token-value');
    });

    it('surfaces the server error message on rejection', async () => {
      const client = new RegistryClient(BASE_URL);
      fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(
        mockFetchOnce(401, { error: 'Invalid signature', message: 'bad sig' }) as any
      );

      const result = await client.submitAudit(
        {
          skill_hash: 'a'.repeat(64),
          auditor: '0x' + '1'.repeat(40),
          status: 'malicious',
          findings: [],
          signature: '0x' + '0'.repeat(130),
          timestamp: new Date().toISOString(),
          audit_method: 'manual_review',
        },
        'jwt-token-value'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('bad sig');
    });
  });

  describe('getSkillAudits', () => {
    it('returns null for a skill the registry has never heard of', async () => {
      const client = new RegistryClient(BASE_URL);
      fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(mockFetchOnce(404, { error: 'Skill not found' }) as any);

      const result = await client.getSkillAudits('a'.repeat(64));
      expect(result).toBeNull();
    });

    it('maps the real trust score and audit count out of a found skill', async () => {
      const client = new RegistryClient(BASE_URL);
      fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(
        mockFetchOnce(200, {
          skill: { id: 's1', name: 'x', skillHash: 'a'.repeat(64), author: '0x1', trustScore: 0.9, isBlocked: false, provenanceScore: 0.5 },
          audits: [{ reporter: '0xAAA' }, { reporter: '0xBBB' }],
          provenanceChain: [{ wallet: '0x1', role: 'author', timestamp: '2026-01-01T00:00:00.000Z' }],
        }) as any
      );

      const result = await client.getSkillAudits('a'.repeat(64));
      expect(result).toEqual({
        trustScore: 0.9,
        isBlocked: false,
        auditCount: 2,
        auditors: ['0xAAA', '0xBBB'],
        provenanceScore: 0.5,
        provenanceChain: [{ wallet: '0x1', role: 'author', timestamp: '2026-01-01T00:00:00.000Z' }],
      });
    });
  });

  describe('submitVouch', () => {
    it('returns success with the server-computed provenance score', async () => {
      const client = new RegistryClient(BASE_URL);
      fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(
        mockFetchOnce(201, { success: true, skillHash: 'a'.repeat(64), provenanceScore: 0.2 }) as any
      );

      const result = await client.submitVouch(
        'a'.repeat(64),
        {
          wallet: '0x' + '1'.repeat(40),
          signature: '0x' + '0'.repeat(130),
          timestamp: new Date().toISOString(),
        },
        'jwt-token-value'
      );

      expect(result).toEqual({ success: true, provenanceScore: 0.2 });
      const [url, init] = (fetchSpy.mock.calls[0] as any[]);
      expect(url).toBe(`${BASE_URL}/api/v1/provenance/${'a'.repeat(64)}/vouch`);
      expect(init.headers.Authorization).toBe('Bearer jwt-token-value');
    });

    it('surfaces the server error message on rejection', async () => {
      const client = new RegistryClient(BASE_URL);
      fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(
        mockFetchOnce(409, { error: 'Already vouched', message: 'This wallet has already vouched for this skill' }) as any
      );

      const result = await client.submitVouch(
        'a'.repeat(64),
        {
          wallet: '0x' + '1'.repeat(40),
          signature: '0x' + '0'.repeat(130),
          timestamp: new Date().toISOString(),
        },
        'jwt-token-value'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('This wallet has already vouched for this skill');
    });
  });
});
