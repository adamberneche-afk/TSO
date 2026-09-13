import { ethers } from 'ethers';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

/**
 * Enterprise RAG: email/password identity, with no blockchain
 * infrastructure anywhere in the picture -- see
 * docs/ENTERPRISE_RAG_IDENTITY.md for the full design writeup.
 *
 * The rest of this codebase keys every table (OrganizationMember,
 * RAGDocument, ApiKey, ...) and the entire auth middleware/JWT pipeline
 * off a single `walletAddress` string. Rather than introduce a second,
 * parallel identity concept that every one of those call sites would need
 * to be taught about, an email account is given a deterministic,
 * *non-signable* pseudo-address: it satisfies `ethers.isAddress()` and
 * every existing `walletAddress` column, but no private key backing it is
 * ever generated, held, or exists anywhere. Authentication for these
 * accounts is a plain password check (see routes/emailAuth.ts), not a
 * wallet signature -- deriveWalletAddressForEmail is used only to obtain
 * a stable identity string, never for signing or verification.
 */

const PSEUDO_ADDRESS_DOMAIN_PREFIX = 'TAIS-EMAIL-IDENTITY-v1:';

/**
 * Deterministically derives an address-shaped (but unsigned, unsignable)
 * identity string from a lowercased email. Domain-separated with a fixed
 * prefix so this can never collide with a real address-derivation scheme
 * (keccak256(publicKey)) even in principle, and is trivially
 * distinguishable in a debugger/log from a real derivation if anyone ever
 * needs to check. Collisions between two different emails are as
 * astronomically unlikely as two distinct real wallets colliding (same
 * 160-bit output space), so no uniqueness check beyond the DB's own
 * `@unique` constraint is needed.
 */
export function deriveWalletAddressForEmail(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  const hash = crypto
    .createHash('sha256')
    .update(PSEUDO_ADDRESS_DOMAIN_PREFIX + normalizedEmail)
    .digest('hex');
  // Ethereum addresses are the last 20 bytes (40 hex chars) of a hash;
  // mirror that shape purely for format compatibility with every
  // existing walletAddress column and validator.
  const last20Bytes = hash.slice(-40);
  // ethers.getAddress both validates the format (throws if malformed) and
  // checksum-encodes it; immediately lowercase the result anyway, since
  // every walletAddress column and the JWT payload itself (AuthService.
  // generateToken) are compared in lowercase throughout this codebase --
  // a checksummed address here would silently fail every membership
  // lookup keyed on the lowercased identity from a real login.
  return ethers.getAddress('0x' + last20Bytes).toLowerCase();
}

const BCRYPT_ROUNDS = 12;

export interface EmailIdentityRecord {
  id: string;
  email: string;
  walletAddress: string;
}

export class EmailIdentityService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Creates a new email identity, or returns the existing one for this
   * email unchanged (idempotent) -- used by invitation acceptance, where
   * an already-registered email accepting a second org's invite should
   * not be asked to set a new password.
   */
  async findOrCreate(email: string, password: string): Promise<EmailIdentityRecord> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.prisma.emailIdentity.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return { id: existing.id, email: existing.email, walletAddress: existing.walletAddress };
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const walletAddress = deriveWalletAddressForEmail(normalizedEmail);

    const created = await this.prisma.emailIdentity.create({
      data: { email: normalizedEmail, passwordHash, walletAddress },
    });
    return { id: created.id, email: created.email, walletAddress: created.walletAddress };
  }

  async findByEmail(email: string) {
    return this.prisma.emailIdentity.findUnique({ where: { email: email.trim().toLowerCase() } });
  }

  /**
   * Verifies a login attempt. Returns the identity on success, null on any
   * failure (unknown email or wrong password) -- deliberately not
   * distinguishing the two in the return value so callers don't leak
   * which emails are registered via response shape; a login handler
   * should still take the same amount of time either way where possible.
   */
  async verifyPassword(email: string, password: string): Promise<EmailIdentityRecord | null> {
    const identity = await this.findByEmail(email);
    if (!identity) {
      // Still do a bcrypt compare against a dummy hash so a wrong-email
      // response isn't measurably faster than a wrong-password one.
      await bcrypt.compare(password, '$2b$12$' + 'x'.repeat(53));
      return null;
    }

    const valid = await bcrypt.compare(password, identity.passwordHash);
    if (!valid) return null;

    await this.prisma.emailIdentity.update({
      where: { id: identity.id },
      data: { lastLoginAt: new Date() },
    });

    return { id: identity.id, email: identity.email, walletAddress: identity.walletAddress };
  }

  async setPassword(email: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.emailIdentity.update({
      where: { email: email.trim().toLowerCase() },
      data: { passwordHash },
    });
  }
}

export default EmailIdentityService;
