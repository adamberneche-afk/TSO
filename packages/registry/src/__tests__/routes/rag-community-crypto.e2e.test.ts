// Regression test for the hardcoded, publicly-bundled "E2EE
// community/public" encryption key.
//
// The client used to derive the community AES key entirely on its own,
// from a string constant compiled straight into the public JS bundle
// ('TAIS-RAG-COMMUNITY-SHARED-KEY-v1', used as both the PBKDF2 password
// and salt). Since the bundle is downloadable by anyone -- no login
// required -- that provided zero real confidentiality: any anonymous
// visitor could read the constant out of the bundle and decrypt every
// community document themselves.
//
// The actual cryptography now lives here, at POST /rag/community/encrypt
// and /decrypt, behind the same authMiddleware every other /rag route
// already requires. This test drives the real HTTP routes against the
// real Express app to confirm: (1) an unauthenticated caller is
// rejected outright -- it can no longer perform community encryption or
// decryption at all, let alone recover the key -- and (2) round-tripping
// through an authenticated caller still works correctly.

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';

const TEST_WALLET = '0x8Ba1f109551bD432803012645Ac136ddd64DBA72';

function authToken(walletAddress: string): string {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ walletAddress: walletAddress.toLowerCase() }, secret, {
    expiresIn: '1h',
    issuer: 'tais-platform',
    audience: 'tais-api',
  });
}

describe('POST /rag/community/encrypt and /decrypt', () => {
  it('rejects an unauthenticated encrypt request outright', async () => {
    const response = await request(app)
      .post('/api/v1/rag/community/encrypt')
      .send({ data: 'some community document text' });

    expect(response.status).toBe(401);
  });

  it('rejects an unauthenticated decrypt request outright', async () => {
    const response = await request(app)
      .post('/api/v1/rag/community/decrypt')
      .send({ encrypted: 'x', iv: 'y', salt: 'z' });

    expect(response.status).toBe(401);
  });

  it('round-trips real plaintext through an authenticated caller', async () => {
    const token = authToken(TEST_WALLET);
    const plaintext = 'This is a real community document about TAIS RAG security.';

    const encryptResponse = await request(app)
      .post('/api/v1/rag/community/encrypt')
      .set('Authorization', `Bearer ${token}`)
      .send({ data: plaintext });

    expect(encryptResponse.status).toBe(200);
    expect(encryptResponse.body.encrypted).toBeTruthy();
    expect(encryptResponse.body.iv).toBeTruthy();
    expect(encryptResponse.body.salt).toBeTruthy();

    // The ciphertext must not just be the plaintext re-encoded -- prove
    // real encryption happened.
    expect(encryptResponse.body.encrypted).not.toContain(Buffer.from(plaintext).toString('base64'));

    const decryptResponse = await request(app)
      .post('/api/v1/rag/community/decrypt')
      .set('Authorization', `Bearer ${token}`)
      .send(encryptResponse.body);

    expect(decryptResponse.status).toBe(200);
    expect(decryptResponse.body.data).toBe(plaintext);
  });

  it('rejects a decrypt request whose salt does not match the community marker', async () => {
    const token = authToken(TEST_WALLET);

    const response = await request(app)
      .post('/api/v1/rag/community/decrypt')
      .set('Authorization', `Bearer ${token}`)
      .send({
        encrypted: Buffer.from('irrelevant').toString('base64'),
        iv: Buffer.from('123456789012').toString('base64'),
        salt: Buffer.from('not-the-real-community-salt').toString('base64'),
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/invalid salt/i);
  });
});
