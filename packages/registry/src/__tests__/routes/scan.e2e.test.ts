// Regression test for the /api/v1/scan endpoint.
//
// scan.ts used to be a placeholder: POST / ignored the request body
// entirely and always returned a hardcoded { result: 'clean' }. It never
// called yaraScanner (or securityScannerService), and scanRoutes was never
// imported/mounted in index.ts at all, so none of it -- not even the
// placeholder -- was reachable on a running server.
//
// securityScannerService.ts used to sit unwired even after the above was
// fixed -- it's now wired in as an advisory-only PII signal (see the
// comment in scan.ts for why only its PII detector, not its cruder
// exploit/malware detectors, was worth wiring in on top of yaraScanner).

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';

const WALLET = '0x2222222222222222222222222222222222222222';

function authToken(walletAddress: string): string {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ walletAddress: walletAddress.toLowerCase() }, secret, {
    expiresIn: '1h',
    issuer: 'tais-platform',
    audience: 'tais-api',
  });
}

describe('POST /api/v1/scan', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await request(app)
      .post('/api/v1/scan')
      .send({ content: 'hello world' });

    expect(response.status).toBe(401);
  });

  it('reports safe content as clean, not the old hardcoded placeholder', async () => {
    const response = await request(app)
      .post('/api/v1/scan')
      .set('Authorization', `Bearer ${authToken(WALLET)}`)
      .send({ content: 'This is a simple test skill that says hello world.' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.result).toBe('safe');
    // The old placeholder returned this exact scanId shape unconditionally;
    // assert the response is now built from a real scan instead.
    expect(response.body.message).toBeUndefined();
    expect(response.body.summary).toBeDefined();
  });

  it('detects and blocks real malicious patterns via the YARA-backed scanner', async () => {
    const response = await request(app)
      .post('/api/v1/scan')
      .set('Authorization', `Bearer ${authToken(WALLET)}`)
      .send({ content: 'const apiKey = "NOT-A-REAL-SECRET-PLACEHOLDER-VALUE";' });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.result).toBe('malicious');
    expect(response.body.findings.length).toBeGreaterThan(0);
    expect(response.body.findings.some((f: any) => f.rule === 'Credential_Theft')).toBe(true);
  });

  it('rejects a request with no content', async () => {
    const response = await request(app)
      .post('/api/v1/scan')
      .set('Authorization', `Bearer ${authToken(WALLET)}`)
      .send({});

    expect(response.status).toBe(400);
  });

  it('surfaces PII findings as an advisory signal, without blocking the scan', async () => {
    const response = await request(app)
      .post('/api/v1/scan')
      .set('Authorization', `Bearer ${authToken(WALLET)}`)
      .send({ content: 'Contact support at not-a-real-address@example.com for help.' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.result).toBe('safe');
    expect(response.body.piiFindings).toBeDefined();
    expect(response.body.piiFindings.some((f: any) => f.type === 'pii')).toBe(true);
  });

  it('does not flag content with no PII patterns', async () => {
    const response = await request(app)
      .post('/api/v1/scan')
      .set('Authorization', `Bearer ${authToken(WALLET)}`)
      .send({ content: 'This is a simple test skill that says hello world.' });

    expect(response.status).toBe(200);
    expect(response.body.piiFindings).toEqual([]);
  });
});
