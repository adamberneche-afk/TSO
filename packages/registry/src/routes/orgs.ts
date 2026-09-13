import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { validateInput, sanitizeValidationErrors } from '../validation/schemas';
import { AuthService } from '../services/auth';
import { EmailIdentityService } from '../services/emailIdentity';
import { requireAdmin } from '../middleware/admin';
import {
  createInvitation,
  sendInvitationEmail,
  previewInvitation,
  acceptInvitation,
} from '../services/organizationInvitations';

/**
 * Enterprise RAG organization routes (docs/ENTERPRISE_RAG_DATA_MODEL.md,
 * docs/ENTERPRISE_RAG_IDENTITY.md). Org membership is invite-only:
 * - Creating an org is an admin-only action (provisioned for a new
 *   enterprise customer), not self-serve -- see POST / below.
 * - Every other membership change flows through an invitation
 *   (createInvitation/acceptInvitation in services/organizationInvitations),
 *   never a direct "join" call.
 */

interface AuthenticatedRequest extends Request {
  user?: { walletAddress: string };
}

const createOrgSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  description: z.string().max(2000).optional(),
  ownerEmail: z.string().email(),
});

const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']).default('MEMBER'),
});

const acceptInvitationSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

const changeRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
});

type Role = 'OWNER' | 'ADMIN' | 'MEMBER';

async function getMembership(prisma: PrismaClient, organizationId: string, walletAddress: string) {
  return prisma.organizationMember.findUnique({
    where: { organizationId_walletAddress: { organizationId, walletAddress: walletAddress.toLowerCase() } },
  });
}

// ADMIN can manage MEMBER and ADMIN rows; only OWNER can manage (change
// role of / remove) another OWNER or promote someone to OWNER.
function canManageRole(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === 'OWNER') return true;
  if (actorRole === 'ADMIN') return targetRole !== 'OWNER';
  return false;
}

export function createOrgRoutes(prisma: PrismaClient, authService: AuthService, logger: any): Router {
  const router = Router();
  const emailIdentityService = new EmailIdentityService(prisma);

  // The rest of this router is mounted behind optionalAuthMiddleware
  // (see index.ts) so the public invitation-preview/accept routes below
  // stay reachable without a token; every other handler checks
  // req.user?.walletAddress itself and 401s if missing, same convention
  // routes/rcrt.ts uses. Org *creation*, below, is the one route that
  // additionally requires a real admin wallet, so it gets its own
  // requireAdmin middleware rather than a router-wide one.
  const adminWallets = process.env.ADMIN_WALLET_ADDRESSES?.split(',').map((w) => w.trim()) || [];
  const adminOnly = requireAdmin(adminWallets);

  // POST /api/v1/orgs
  // Admin-only: creates the org and sends its first (OWNER) invitation --
  // there is no other way for an org to end up with an initial member.
  router.post('/', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateInput(createOrgSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Validation failed', details: sanitizeValidationErrors(validation.errors) });
      }
      const { name, slug, description, ownerEmail } = validation.data;
      const adminWallet = req.user!.walletAddress;

      const existingSlug = await prisma.organization.findUnique({ where: { slug } });
      if (existingSlug) {
        return res.status(409).json({ error: 'Slug already in use' });
      }

      const org = await prisma.organization.create({ data: { name, slug, description } });

      const { rawToken } = await createInvitation(prisma, {
        organizationId: org.id,
        email: ownerEmail,
        role: 'OWNER',
        invitedBy: adminWallet,
      });
      await sendInvitationEmail({ email: ownerEmail, organizationName: org.name, role: 'OWNER', rawToken });

      res.status(201).json({
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        // Only outside production, and only because the invite already
        // went to ownerEmail via sendInvitationEmail above -- this saves
        // needing a real inbox in dev/test, without ever putting a live
        // token in a production response/access log.
        ...(process.env.NODE_ENV !== 'production' ? { inviteToken: rawToken } : {}),
      });
    } catch (error) {
      logger?.error?.({ error }, 'Failed to create organization');
      res.status(500).json({ error: 'Failed to create organization' });
    }
  });

  // GET /api/v1/orgs/:orgId
  router.get('/:orgId', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orgId } = req.params;
      const walletAddress = req.user?.walletAddress;
      if (!walletAddress) return res.status(401).json({ error: 'Authentication required' });

      const membership = await getMembership(prisma, orgId, walletAddress);
      if (!membership) return res.status(403).json({ error: 'Not a member of this organization' });

      const org = await prisma.organization.findUnique({ where: { id: orgId } });
      if (!org) return res.status(404).json({ error: 'Organization not found' });

      res.json({ id: org.id, name: org.name, slug: org.slug, description: org.description, yourRole: membership.role });
    } catch (error) {
      logger?.error?.({ error }, 'Failed to fetch organization');
      res.status(500).json({ error: 'Failed to fetch organization' });
    }
  });

  // DELETE /api/v1/orgs/:orgId -- OWNER only
  router.delete('/:orgId', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orgId } = req.params;
      const walletAddress = req.user?.walletAddress;
      if (!walletAddress) return res.status(401).json({ error: 'Authentication required' });

      const membership = await getMembership(prisma, orgId, walletAddress);
      if (!membership || membership.role !== 'OWNER') {
        return res.status(403).json({ error: 'Only an owner can delete the organization' });
      }

      await prisma.organization.delete({ where: { id: orgId } });
      res.status(204).send();
    } catch (error) {
      logger?.error?.({ error }, 'Failed to delete organization');
      res.status(500).json({ error: 'Failed to delete organization' });
    }
  });

  // GET /api/v1/orgs/:orgId/members
  router.get('/:orgId/members', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orgId } = req.params;
      const walletAddress = req.user?.walletAddress;
      if (!walletAddress) return res.status(401).json({ error: 'Authentication required' });

      const membership = await getMembership(prisma, orgId, walletAddress);
      if (!membership) return res.status(403).json({ error: 'Not a member of this organization' });

      const members = await prisma.organizationMember.findMany({
        where: { organizationId: orgId },
        orderBy: { joinedAt: 'asc' },
      });
      res.json(members.map((m) => ({ id: m.id, walletAddress: m.walletAddress, role: m.role, joinedAt: m.joinedAt })));
    } catch (error) {
      logger?.error?.({ error }, 'Failed to list members');
      res.status(500).json({ error: 'Failed to list members' });
    }
  });

  // PATCH /api/v1/orgs/:orgId/members/:memberId -- change role
  router.patch('/:orgId/members/:memberId', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orgId, memberId } = req.params;
      const walletAddress = req.user?.walletAddress;
      if (!walletAddress) return res.status(401).json({ error: 'Authentication required' });

      const validation = validateInput(changeRoleSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Validation failed', details: sanitizeValidationErrors(validation.errors) });
      }

      const actor = await getMembership(prisma, orgId, walletAddress);
      if (!actor || (actor.role !== 'OWNER' && actor.role !== 'ADMIN')) {
        return res.status(403).json({ error: 'Only an owner or admin can change member roles' });
      }

      const target = await prisma.organizationMember.findFirst({ where: { id: memberId, organizationId: orgId } });
      if (!target) return res.status(404).json({ error: 'Member not found' });

      if (!canManageRole(actor.role as Role, target.role as Role) || !canManageRole(actor.role as Role, validation.data.role)) {
        return res.status(403).json({ error: 'An admin cannot manage an owner-level membership' });
      }

      if (target.role === 'OWNER' && validation.data.role !== 'OWNER') {
        const ownerCount = await prisma.organizationMember.count({ where: { organizationId: orgId, role: 'OWNER' } });
        if (ownerCount <= 1) {
          return res.status(400).json({ error: 'Cannot demote the sole remaining owner' });
        }
      }

      const updated = await prisma.organizationMember.update({
        where: { id: memberId },
        data: { role: validation.data.role },
      });
      res.json({ id: updated.id, walletAddress: updated.walletAddress, role: updated.role });
    } catch (error) {
      logger?.error?.({ error }, 'Failed to change member role');
      res.status(500).json({ error: 'Failed to change member role' });
    }
  });

  // DELETE /api/v1/orgs/:orgId/members/:memberId -- remove a member
  router.delete('/:orgId/members/:memberId', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orgId, memberId } = req.params;
      const walletAddress = req.user?.walletAddress;
      if (!walletAddress) return res.status(401).json({ error: 'Authentication required' });

      const actor = await getMembership(prisma, orgId, walletAddress);
      if (!actor || (actor.role !== 'OWNER' && actor.role !== 'ADMIN')) {
        return res.status(403).json({ error: 'Only an owner or admin can remove members' });
      }

      const target = await prisma.organizationMember.findFirst({ where: { id: memberId, organizationId: orgId } });
      if (!target) return res.status(404).json({ error: 'Member not found' });

      if (!canManageRole(actor.role as Role, target.role as Role)) {
        return res.status(403).json({ error: 'An admin cannot remove an owner' });
      }

      if (target.role === 'OWNER') {
        const ownerCount = await prisma.organizationMember.count({ where: { organizationId: orgId, role: 'OWNER' } });
        if (ownerCount <= 1) {
          return res.status(400).json({ error: 'Cannot remove the sole remaining owner' });
        }
      }

      await prisma.organizationMember.delete({ where: { id: memberId } });
      res.status(204).send();
    } catch (error) {
      logger?.error?.({ error }, 'Failed to remove member');
      res.status(500).json({ error: 'Failed to remove member' });
    }
  });

  // POST /api/v1/orgs/:orgId/invitations -- OWNER/ADMIN only
  router.post('/:orgId/invitations', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orgId } = req.params;
      const walletAddress = req.user?.walletAddress;
      if (!walletAddress) return res.status(401).json({ error: 'Authentication required' });

      const validation = validateInput(createInvitationSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Validation failed', details: sanitizeValidationErrors(validation.errors) });
      }

      // zod's .default('MEMBER') makes this always defined at runtime, but
      // validateInput's generic signature loses that through the
      // ZodSchema<T> helper type -- collapse the `| undefined` explicitly
      // rather than casting past it.
      const role: Role = validation.data.role ?? 'MEMBER';

      const actor = await getMembership(prisma, orgId, walletAddress);
      if (!actor || (actor.role !== 'OWNER' && actor.role !== 'ADMIN')) {
        return res.status(403).json({ error: 'Only an owner or admin can invite members' });
      }
      if (!canManageRole(actor.role as Role, role)) {
        return res.status(403).json({ error: 'An admin cannot invite someone as owner' });
      }

      const org = await prisma.organization.findUnique({ where: { id: orgId } });
      if (!org) return res.status(404).json({ error: 'Organization not found' });

      const { rawToken, expiresAt } = await createInvitation(prisma, {
        organizationId: orgId,
        email: validation.data.email,
        role,
        invitedBy: walletAddress,
      });
      const emailResult = await sendInvitationEmail({
        email: validation.data.email,
        organizationName: org.name,
        role,
        rawToken,
      });

      res.status(201).json({
        email: validation.data.email,
        role,
        expiresAt,
        emailSent: emailResult.success,
        ...(process.env.NODE_ENV !== 'production' ? { inviteToken: rawToken } : {}),
      });
    } catch (error) {
      logger?.error?.({ error }, 'Failed to create invitation');
      res.status(500).json({ error: 'Failed to create invitation' });
    }
  });

  // GET /api/v1/orgs/invitations/:token -- public preview, no auth
  router.get('/invitations/:token', async (req: Request, res: Response) => {
    try {
      const preview = await previewInvitation(prisma, req.params.token);
      if (!preview) return res.status(404).json({ error: 'Invitation not found, expired, or already accepted' });

      const identity = await emailIdentityService.findByEmail(preview.email);
      res.json({
        organizationName: preview.organizationName,
        email: preview.email,
        role: preview.role,
        expiresAt: preview.expiresAt,
        requiresPassword: !identity,
      });
    } catch (error) {
      logger?.error?.({ error }, 'Failed to preview invitation');
      res.status(500).json({ error: 'Failed to preview invitation' });
    }
  });

  // POST /api/v1/orgs/invitations/:token/accept -- public, no auth
  router.post('/invitations/:token/accept', async (req: Request, res: Response) => {
    try {
      const validation = validateInput(acceptInvitationSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Validation failed', details: sanitizeValidationErrors(validation.errors) });
      }

      const result = await acceptInvitation(prisma, emailIdentityService, {
        rawToken: req.params.token,
        password: validation.data.password,
      });

      if (!result.ok) {
        if (result.error === 'password_required') {
          return res.status(400).json({ error: 'password_required', message: 'Set a password to accept this invitation' });
        }
        return res.status(404).json({ error: 'Invitation not found, expired, or already accepted' });
      }

      const token = authService.generateToken(result.walletAddress);
      res.json({
        token,
        expiresIn: '7d',
        organizationId: result.organizationId,
        organizationName: result.organizationName,
        role: result.role,
      });
    } catch (error) {
      logger?.error?.({ error }, 'Failed to accept invitation');
      res.status(500).json({ error: 'Failed to accept invitation' });
    }
  });

  // GET /api/v1/orgs/:orgId/rag/documents -- member-only metadata listing
  router.get('/:orgId/rag/documents', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orgId } = req.params;
      const walletAddress = req.user?.walletAddress;
      if (!walletAddress) return res.status(401).json({ error: 'Authentication required' });

      const membership = await getMembership(prisma, orgId, walletAddress);
      if (!membership) return res.status(403).json({ error: 'Not a member of this organization' });

      const documents = await prisma.rAGDocument.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          walletAddress: true,
          isPublic: true,
          tags: true,
          size: true,
          chunkCount: true,
          createdAt: true,
        },
      });
      res.json(documents);
    } catch (error) {
      logger?.error?.({ error }, 'Failed to list organization documents');
      res.status(500).json({ error: 'Failed to list organization documents' });
    }
  });

  return router;
}

export default createOrgRoutes;
