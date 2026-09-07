// Regression tests for wiring the real YARA-backed scanner into the skill
// publish path (POST /api/v1/skills), and for the dead req.nftService check
// it replaced.
//
// 1. skills.ts used to check `req.nftService` and call
//    `req.nftService.verifyPublisherOwnership(...)` a second time, even
//    though publisher NFT ownership is already verified upstream by
//    publisherNftMiddleware. Nothing anywhere in the app ever assigns
//    req.nftService, so that check was always `undefined` and 500'd
//    unconditionally for every real publish attempt.
// 2. A skill's packageCid (its uploaded package, stored on IPFS) was never
//    fetched or scanned at all -- yaraScanner.ts existed but nothing on the
//    publish path called it. It's now fetched via the IPFS client and run
//    through the real scanner; a "malicious" verdict blocks the publish.

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

jest.mock('ipfs-http-client', () => ({
  create: jest.fn(),
}));

import { create as mockCreateIPFSClient } from 'ipfs-http-client';
import { NFTService } from '../../services/nftVerification';
import app from '../../index';

const PUBLISHER_WALLET = '0x3333333333333333333333333333333333333333';

function authToken(walletAddress: string): string {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ walletAddress: walletAddress.toLowerCase() }, secret, {
    expiresIn: '1h',
    issuer: 'tais-platform',
    audience: 'tais-api',
  });
}

function fakeCid(seed: number): string {
  const base58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let s = '';
  let i = seed;
  while (s.length < 44) {
    s += base58[i % base58.length];
    i = i * 7 + 13;
  }
  return `Qm${s.slice(0, 44)}`;
}

function fakeIpfsContent(buffer: Buffer) {
  return {
    cat: async function* (): AsyncGenerator<Uint8Array> {
      yield new Uint8Array(buffer);
    },
  };
}

describe('POST /api/v1/skills security scanning', () => {
  const prisma = (global as any).prismaTest;
  const originalIpfsEnabled = process.env.IPFS_ENABLED;
  let nftSpy: jest.SpyInstance;

  beforeAll(() => {
    nftSpy = jest.spyOn(NFTService.prototype, 'verifyPublisherOwnership').mockResolvedValue(true);
  });

  afterAll(() => {
    nftSpy.mockRestore();
    process.env.IPFS_ENABLED = originalIpfsEnabled;
  });

  afterEach(async () => {
    await prisma.skill.deleteMany({ where: { author: PUBLISHER_WALLET.toLowerCase() } });
  });

  it('does not 500 on the previously-broken req.nftService dead check for a real authenticated publisher', async () => {
    process.env.IPFS_ENABLED = 'false';
    const skillHash = fakeCid(1);

    const response = await request(app)
      .post('/api/v1/skills')
      .set('Authorization', `Bearer ${authToken(PUBLISHER_WALLET)}`)
      .send({
        skillHash,
        name: 'clean-skill',
        version: '1.0.0',
        author: PUBLISHER_WALLET,
        manifestCid: fakeCid(2),
      });

    expect(response.status).toBe(201);
  });

  it('publishes a skill whose IPFS package content scans clean', async () => {
    process.env.IPFS_ENABLED = 'true';
    (mockCreateIPFSClient as jest.Mock).mockReturnValue(
      fakeIpfsContent(Buffer.from('function run() { return "hello world"; }'))
    );

    const skillHash = fakeCid(3);
    const response = await request(app)
      .post('/api/v1/skills')
      .set('Authorization', `Bearer ${authToken(PUBLISHER_WALLET)}`)
      .send({
        skillHash,
        name: `clean-package-${randomUUID().replace(/-/g, '').slice(0, 8)}`,
        version: '1.0.0',
        author: PUBLISHER_WALLET,
        manifestCid: fakeCid(4),
        packageCid: fakeCid(5),
      });

    expect(response.status).toBe(201);

    const created = await prisma.skill.findUnique({ where: { skillHash } });
    expect(created).not.toBeNull();
  });

  it('rejects a skill whose IPFS package content is flagged malicious, and does not persist it', async () => {
    process.env.IPFS_ENABLED = 'true';
    (mockCreateIPFSClient as jest.Mock).mockReturnValue(
      fakeIpfsContent(Buffer.from('const apiKey = "NOT-A-REAL-SECRET-PLACEHOLDER-VALUE";'))
    );

    const skillHash = fakeCid(6);
    const response = await request(app)
      .post('/api/v1/skills')
      .set('Authorization', `Bearer ${authToken(PUBLISHER_WALLET)}`)
      .send({
        skillHash,
        name: `malicious-package-${randomUUID().replace(/-/g, '').slice(0, 8)}`,
        version: '1.0.0',
        author: PUBLISHER_WALLET,
        manifestCid: fakeCid(7),
        packageCid: fakeCid(8),
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Security scan failed');

    const created = await prisma.skill.findUnique({ where: { skillHash } });
    expect(created).toBeNull();
  });
});
