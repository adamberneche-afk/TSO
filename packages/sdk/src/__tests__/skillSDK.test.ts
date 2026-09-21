// Regression tests for the SDK's non-Electron path actually reaching
// the real registry instead of unconditionally returning a "Not in
// Electron environment" failure / hardcoded `false`, regardless of
// whether a real registry call could have succeeded (see
// docs/DOCS_VS_CODEBASE.md row 7). testEnvironment is 'node' here, so
// `window` is undefined and every call below already exercises the
// non-Electron branch with no extra setup.

import { skillSDK, configureRegistry } from '../index';

function mockFetchOnce(status: number, body: unknown) {
  return jest.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('skillSDK (non-Electron path)', () => {
  let fetchSpy: jest.SpyInstance;

  afterEach(() => {
    fetchSpy?.mockRestore();
    configureRegistry({ baseUrl: 'https://registry.tais.ai', authToken: undefined });
  });

  describe('checkMalicious', () => {
    it('reports true when the registry has the skill flagged as blocked', async () => {
      fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(
        mockFetchOnce(200, { skill: { isBlocked: true }, audits: [] }) as any
      );

      const result = await skillSDK.checkMalicious('a'.repeat(64));
      expect(result).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith('https://registry.tais.ai/api/v1/audits/' + 'a'.repeat(64));
    });

    it('reports false (not blocked) for a skill the registry has never heard of', async () => {
      fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(mockFetchOnce(404, { error: 'not found' }) as any);

      const result = await skillSDK.checkMalicious('b'.repeat(64));
      expect(result).toBe(false);
    });

    it('fails safe (false) rather than throwing when the registry is unreachable', async () => {
      fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

      const result = await skillSDK.checkMalicious('c'.repeat(64));
      expect(result).toBe(false);
    });
  });

  describe('install', () => {
    it('fails clearly (not silently) when no auth token has been configured', async () => {
      const result = await skillSDK.install({ name: 'x', skill_hash: 'a'.repeat(64) } as any, 'code');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/no registry auth token/i);
    });

    it('submits the skill code to the real scan endpoint and reports a clean result', async () => {
      configureRegistry({ authToken: 'jwt-abc' });
      fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(
        mockFetchOnce(200, { success: true, result: 'clean', findings: [] }) as any
      );

      const result = await skillSDK.install({ name: 'x', skill_hash: 'a'.repeat(64) } as any, 'function run() {}');

      expect(result.success).toBe(true);
      const [url, init] = fetchSpy.mock.calls[0] as any[];
      expect(url).toBe('https://registry.tais.ai/api/v1/scan');
      expect(init.headers.Authorization).toBe('Bearer jwt-abc');
      expect(JSON.parse(init.body)).toEqual({ content: 'function run() {}', encoding: 'utf8', filename: 'x' });
    });

    it('surfaces a malicious verdict as a failure with its findings', async () => {
      configureRegistry({ authToken: 'jwt-abc' });
      fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(
        mockFetchOnce(403, { error: 'Security scan failed', result: 'malicious', findings: [{ rule: 'exfil', severity: 'critical' }] }) as any
      );

      const result = await skillSDK.install({ name: 'x', skill_hash: 'a'.repeat(64) } as any, 'evil code');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Security scan failed');
    });
  });

  describe('submitAudit', () => {
    it('fails clearly when no auth token has been configured', async () => {
      const report = {
        skill_hash: 'a'.repeat(64),
        auditor: '0x' + '1'.repeat(40),
        status: 'safe' as const,
        findings: [],
        signature: '0x' + '0'.repeat(130),
        timestamp: new Date().toISOString(),
        audit_method: 'manual_review' as const,
      };
      const result = await skillSDK.submitAudit(report);
      expect(result.success).toBe(false);
    });

    it('posts the already-signed report to the registry with the configured token', async () => {
      configureRegistry({ authToken: 'jwt-abc' });
      fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(
        mockFetchOnce(201, { success: true, auditId: 'audit-1' }) as any
      );

      const report = {
        skill_hash: 'a'.repeat(64),
        auditor: '0x' + '1'.repeat(40),
        status: 'safe' as const,
        findings: [],
        signature: '0x' + '0'.repeat(130),
        timestamp: new Date().toISOString(),
        audit_method: 'manual_review' as const,
      };

      const result = await skillSDK.submitAudit(report);
      expect(result.success).toBe(true);
      const [url, init] = fetchSpy.mock.calls[0] as any[];
      expect(url).toBe('https://registry.tais.ai/api/v1/audits');
      expect(JSON.parse(init.body)).toEqual(report);
    });
  });
});
