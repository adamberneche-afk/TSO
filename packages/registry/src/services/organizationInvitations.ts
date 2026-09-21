import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import sgMail from '@sendgrid/mail';
import { EmailIdentityService } from './emailIdentity';

/**
 * Enterprise RAG org membership is invite-only -- see
 * docs/ENTERPRISE_RAG_IDENTITY.md. There is no self-serve "join" or
 * "create your own org" route; an OWNER/ADMIN invites a specific email,
 * and accepting the invite is the only way an OrganizationMember row
 * gets created for that email.
 */

const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateRawToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface CreateInvitationInput {
  organizationId: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  invitedBy: string;
}

/**
 * Creates a new pending invitation, or re-issues one (fresh token,
 * pushed-out expiry, `acceptedAt` reset to null) if a prior invitation to
 * this email for this org already exists -- covers both "re-invite before
 * they accepted" and "re-invite after they were removed". Returns the raw
 * token; only its sha256 hash is ever persisted.
 */
export async function createInvitation(
  prisma: PrismaClient,
  input: CreateInvitationInput
): Promise<{ rawToken: string; expiresAt: Date }> {
  const email = input.email.trim().toLowerCase();
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS);

  await prisma.organizationInvitation.upsert({
    where: { organizationId_email: { organizationId: input.organizationId, email } },
    create: {
      organizationId: input.organizationId,
      email,
      role: input.role,
      invitedBy: input.invitedBy,
      tokenHash,
      expiresAt,
    },
    update: {
      role: input.role,
      invitedBy: input.invitedBy,
      tokenHash,
      expiresAt,
      acceptedAt: null,
    },
  });

  return { rawToken, expiresAt };
}

export async function sendInvitationEmail(params: {
  email: string;
  organizationName: string;
  role: string;
  rawToken: string;
}): Promise<{ success: boolean; message: string }> {
  const sendGridApiKey = process.env.SENDGRID_API_KEY;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const acceptUrl = `${frontendUrl}/orgs/invitations/${params.rawToken}`;

  if (!sendGridApiKey) {
    console.log(`[OrgInvitation] Would email ${params.email} an invite to "${params.organizationName}" (SendGrid not configured): ${acceptUrl}`);
    return { success: true, message: 'SendGrid not configured - logged only' };
  }

  sgMail.setApiKey(sendGridApiKey);

  const msg = {
    to: params.email,
    from: 'alerts@taisplatform.vercel.app',
    subject: `You've been invited to join ${params.organizationName} on TAIS`,
    html: `
      <p>You've been invited to join <strong>${params.organizationName}</strong> on TAIS as a <strong>${params.role}</strong>.</p>
      <p><a href="${acceptUrl}">Accept invitation</a></p>
      <p>This link expires in 7 days. If you didn't expect this invitation, you can ignore this email.</p>
    `,
  };

  try {
    await sgMail.send(msg);
    return { success: true, message: 'Email sent' };
  } catch (error: any) {
    console.error('[OrgInvitation] SendGrid error:', error.response?.body || error.message);
    return { success: false, message: error.message };
  }
}

export type InvitationPreview = {
  organizationId: string;
  organizationName: string;
  email: string;
  role: string;
  expiresAt: Date;
};

/**
 * Looks up a pending invitation by its raw token without consuming it --
 * for an "you're invited to join Acme Corp as MEMBER" landing page before
 * the recipient sets a password. Returns null for an unknown, expired, or
 * already-accepted token, without distinguishing which (same reasoning as
 * EmailIdentityService.verifyPassword: don't leak which case applies).
 */
export async function previewInvitation(
  prisma: PrismaClient,
  rawToken: string
): Promise<InvitationPreview | null> {
  const tokenHash = hashToken(rawToken);
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { tokenHash },
    include: { organization: { select: { id: true, name: true } } },
  });

  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    return null;
  }

  return {
    organizationId: invitation.organization.id,
    organizationName: invitation.organization.name,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
  };
}

export interface AcceptInvitationInput {
  rawToken: string;
  /**
   * Required only when this email has no existing EmailIdentity yet --
   * an already-registered email accepting a second org's invite doesn't
   * need to (and isn't asked to) set a new password.
   */
  password?: string;
}

export type AcceptInvitationResult =
  | { ok: true; walletAddress: string; organizationId: string; organizationName: string; role: string }
  | { ok: false; error: 'invalid_or_expired' | 'password_required' };

/**
 * Consumes a pending invitation: finds-or-creates the EmailIdentity for
 * that email, creates the OrganizationMember row, and marks the
 * invitation accepted. Not wrapped in isolation stronger than Prisma's
 * default because a double-submit race here is low-stakes (worst case,
 * the member row's `create` throws on the org+wallet unique constraint,
 * which the route below treats as an already-a-member success case).
 */
export async function acceptInvitation(
  prisma: PrismaClient,
  emailIdentityService: EmailIdentityService,
  input: AcceptInvitationInput
): Promise<AcceptInvitationResult> {
  const tokenHash = hashToken(input.rawToken);
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { tokenHash },
    include: { organization: { select: { id: true, name: true } } },
  });

  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    return { ok: false, error: 'invalid_or_expired' };
  }

  const existingIdentity = await emailIdentityService.findByEmail(invitation.email);
  if (!existingIdentity && !input.password) {
    return { ok: false, error: 'password_required' };
  }

  const identity = existingIdentity
    ? { walletAddress: existingIdentity.walletAddress }
    : await emailIdentityService.findOrCreate(invitation.email, input.password!);

  await prisma.$transaction([
    prisma.organizationMember.upsert({
      where: {
        organizationId_walletAddress: {
          organizationId: invitation.organizationId,
          walletAddress: identity.walletAddress,
        },
      },
      create: {
        organizationId: invitation.organizationId,
        walletAddress: identity.walletAddress,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
      },
      // Already a member (e.g. re-invited with a new role) -- update the role.
      update: { role: invitation.role },
    }),
    prisma.organizationInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  return {
    ok: true,
    walletAddress: identity.walletAddress,
    organizationId: invitation.organization.id,
    organizationName: invitation.organization.name,
    role: invitation.role,
  };
}
