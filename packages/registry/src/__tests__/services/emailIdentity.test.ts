// Enterprise RAG's email/password identity (docs/ENTERPRISE_RAG_IDENTITY.md):
// no blockchain infrastructure anywhere in this path. deriveWalletAddressForEmail
// produces an address-shaped string with no private key ever existing behind
// it; EmailIdentityService's login is a plain password check.

import { ethers } from 'ethers';
import { deriveWalletAddressForEmail, EmailIdentityService } from '../../services/emailIdentity';

describe('deriveWalletAddressForEmail', () => {
  it('produces a valid, lowercased Ethereum-address-shaped string', () => {
    const address = deriveWalletAddressForEmail('someone@example.com');
    expect(ethers.isAddress(address)).toBe(true);
    // Lowercased, not checksummed -- matches how every walletAddress
    // column and the JWT payload itself are compared throughout this
    // codebase (see AuthService.generateToken).
    expect(address).toBe(address.toLowerCase());
  });

  it('is deterministic for the same email', () => {
    const a = deriveWalletAddressForEmail('same@example.com');
    const b = deriveWalletAddressForEmail('same@example.com');
    expect(a).toBe(b);
  });

  it('is case-insensitive on the email', () => {
    const a = deriveWalletAddressForEmail('Mixed.Case@Example.com');
    const b = deriveWalletAddressForEmail('mixed.case@example.com');
    expect(a).toBe(b);
  });

  it('produces different addresses for different emails', () => {
    const a = deriveWalletAddressForEmail('first@example.com');
    const b = deriveWalletAddressForEmail('second@example.com');
    expect(a).not.toBe(b);
  });
});

describe('EmailIdentityService', () => {
  const prisma = (global as any).prismaTest;
  const service = new EmailIdentityService(prisma);
  const emails: string[] = [];

  afterEach(async () => {
    if (emails.length) {
      await prisma.emailIdentity.deleteMany({ where: { email: { in: emails } } });
      emails.length = 0;
    }
  });

  it('creates a new identity and never stores the plaintext password', async () => {
    const email = `test-${Date.now()}@example.com`;
    emails.push(email);

    const identity = await service.findOrCreate(email, 'correct horse battery staple');
    expect(identity.email).toBe(email);
    expect(ethers.isAddress(identity.walletAddress)).toBe(true);

    const row = await prisma.emailIdentity.findUnique({ where: { email } });
    expect(row.passwordHash).not.toContain('correct horse battery staple');
    expect(row.walletAddress).toBe(deriveWalletAddressForEmail(email));
  });

  it('findOrCreate is idempotent: a second call with a different password does not change the existing identity', async () => {
    const email = `test-${Date.now()}-idempotent@example.com`;
    emails.push(email);

    const first = await service.findOrCreate(email, 'password-one');
    const second = await service.findOrCreate(email, 'password-two');
    expect(second.id).toBe(first.id);

    // The original password should still work; the second call's password was ignored.
    const verified = await service.verifyPassword(email, 'password-one');
    expect(verified).not.toBeNull();
  });

  it('verifyPassword succeeds with the right password and fails with the wrong one', async () => {
    const email = `test-${Date.now()}-verify@example.com`;
    emails.push(email);
    await service.findOrCreate(email, 'the-real-password');

    const ok = await service.verifyPassword(email, 'the-real-password');
    expect(ok).not.toBeNull();
    expect(ok!.email).toBe(email);

    const bad = await service.verifyPassword(email, 'wrong-password');
    expect(bad).toBeNull();
  });

  it('verifyPassword returns null for an unregistered email without throwing', async () => {
    const result = await service.verifyPassword('never-registered@example.com', 'anything');
    expect(result).toBeNull();
  });

  it('records lastLoginAt only on a successful verification', async () => {
    const email = `test-${Date.now()}-lastlogin@example.com`;
    emails.push(email);
    await service.findOrCreate(email, 'a-password');

    const before = await prisma.emailIdentity.findUnique({ where: { email } });
    expect(before.lastLoginAt).toBeNull();

    await service.verifyPassword(email, 'wrong');
    const afterFailure = await prisma.emailIdentity.findUnique({ where: { email } });
    expect(afterFailure.lastLoginAt).toBeNull();

    await service.verifyPassword(email, 'a-password');
    const afterSuccess = await prisma.emailIdentity.findUnique({ where: { email } });
    expect(afterSuccess.lastLoginAt).not.toBeNull();
  });

  it('setPassword changes which password verifies successfully', async () => {
    const email = `test-${Date.now()}-reset@example.com`;
    emails.push(email);
    await service.findOrCreate(email, 'old-password');

    await service.setPassword(email, 'new-password');

    expect(await service.verifyPassword(email, 'old-password')).toBeNull();
    expect(await service.verifyPassword(email, 'new-password')).not.toBeNull();
  });
});
