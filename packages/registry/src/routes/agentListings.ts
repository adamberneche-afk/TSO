import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { validateInput, sanitizeValidationErrors } from '../validation/schemas';
import { saveConfiguration } from '../services/genesisConfigLimits';

/**
 * Agent Marketplace (docs/DOCS_VS_CODEBASE.md row 22; see
 * docs/AGENT_MARKETPLACE_DATA_MODEL.md for the data model this builds
 * on). Browsing is public; creating/managing a listing requires owning
 * the underlying AgentConfiguration -- which itself already requires
 * THINK NFT ownership (see services/genesisConfigLimits.ts), so no
 * separate gating is added here for "who can list an agent": whoever
 * already cleared the bar to create the configuration has cleared the
 * bar to list it.
 *
 * Moderation (approve/reject/suspend) lives in routes/admin.ts,
 * mirroring the existing Skill block/unblock/verify pattern -- see
 * that file for POST /admin/agent-listings/:id/{approve,reject,suspend}.
 */

interface AuthenticatedRequest extends Request {
  user?: { walletAddress: string };
}

const createListingSchema = z.object({
  configurationId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
});

const updateListingSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
});

const browseQuerySchema = z.object({
  category: z.string().optional(),
  query: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

// Public shape of a listing -- deliberately excludes configurationId (an
// internal reference) and lets the caller decide whether to include the
// underlying wallet, matching how Skill listings expose `author` freely
// (there's no separate concept of a private marketplace entry).
function toPublicListing(listing: any) {
  return {
    id: listing.id,
    walletAddress: listing.walletAddress,
    name: listing.name,
    description: listing.description,
    category: listing.category,
    status: listing.status,
    installCount: listing.installCount,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  };
}

export function createAgentListingRoutes(prisma: PrismaClient, logger: any): Router {
  const router = Router();

  // GET /api/v1/agent-listings -- public browse, APPROVED only.
  router.get('/', async (req: Request, res: Response) => {
    try {
      const validation = validateInput(browseQuerySchema, req.query);
      if (!validation.success) {
        return res.status(400).json({ error: 'Validation failed', details: sanitizeValidationErrors(validation.errors) });
      }
      const { category, query, limit, offset } = validation.data;

      const where: any = { status: 'APPROVED' };
      if (category) where.category = category;
      if (query) where.name = { contains: query, mode: 'insensitive' };

      const [listings, total] = await Promise.all([
        prisma.agentListing.findMany({
          where,
          orderBy: [{ installCount: 'desc' }, { createdAt: 'desc' }],
          take: limit,
          skip: offset,
        }),
        prisma.agentListing.count({ where }),
      ]);

      res.json({ listings: listings.map(toPublicListing), total, limit, offset });
    } catch (error) {
      logger?.error?.({ error }, 'Failed to browse agent listings');
      res.status(500).json({ error: 'Failed to browse agent listings' });
    }
  });

  // GET /api/v1/agent-listings/mine -- the caller's own listings, any
  // status (not just APPROVED) -- must be registered before /:id.
  router.get('/mine', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const walletAddress = req.user?.walletAddress;
      if (!walletAddress) return res.status(401).json({ error: 'Authentication required' });

      const listings = await prisma.agentListing.findMany({
        where: { walletAddress: walletAddress.toLowerCase() },
        orderBy: { createdAt: 'desc' },
      });
      res.json(listings.map(toPublicListing));
    } catch (error) {
      logger?.error?.({ error }, 'Failed to list your agent listings');
      res.status(500).json({ error: 'Failed to list your agent listings' });
    }
  });

  // GET /api/v1/agent-listings/:id -- public if APPROVED; the owner can
  // also see their own listing regardless of status.
  router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const listing = await prisma.agentListing.findUnique({ where: { id: req.params.id } });
      if (!listing) return res.status(404).json({ error: 'Listing not found' });

      const isOwner = listing.walletAddress.toLowerCase() === req.user?.walletAddress?.toLowerCase();
      if (listing.status !== 'APPROVED' && !isOwner) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      res.json(toPublicListing(listing));
    } catch (error) {
      logger?.error?.({ error }, 'Failed to fetch agent listing');
      res.status(500).json({ error: 'Failed to fetch agent listing' });
    }
  });

  // POST /api/v1/agent-listings -- create a listing for one of the
  // caller's own configurations.
  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const walletAddress = req.user?.walletAddress;
      if (!walletAddress) return res.status(401).json({ error: 'Authentication required' });

      const validation = validateInput(createListingSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Validation failed', details: sanitizeValidationErrors(validation.errors) });
      }
      const { configurationId, name, description, category } = validation.data;

      const configuration = await prisma.agentConfiguration.findUnique({ where: { id: configurationId } });
      if (!configuration) return res.status(404).json({ error: 'Configuration not found' });
      if (configuration.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ error: 'You do not own this configuration' });
      }

      const existing = await prisma.agentListing.findUnique({ where: { configurationId } });
      if (existing) return res.status(409).json({ error: 'This configuration is already listed' });

      const listing = await prisma.agentListing.create({
        data: { configurationId, walletAddress: walletAddress.toLowerCase(), name, description, category },
      });

      res.status(201).json(toPublicListing(listing));
    } catch (error) {
      logger?.error?.({ error }, 'Failed to create agent listing');
      res.status(500).json({ error: 'Failed to create agent listing' });
    }
  });

  // PUT /api/v1/agent-listings/:id -- owner-only. Editing the curated
  // public summary sends it back to PENDING for re-review (except for an
  // already-PENDING/REJECTED listing, which just stays/becomes PENDING) --
  // an APPROVED or SUSPENDED listing shouldn't be able to change what a
  // moderator actually reviewed without a fresh look.
  router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const walletAddress = req.user?.walletAddress;
      if (!walletAddress) return res.status(401).json({ error: 'Authentication required' });

      const validation = validateInput(updateListingSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Validation failed', details: sanitizeValidationErrors(validation.errors) });
      }

      const listing = await prisma.agentListing.findUnique({ where: { id: req.params.id } });
      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      if (listing.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ error: 'You do not own this listing' });
      }

      const updated = await prisma.agentListing.update({
        where: { id: listing.id },
        data: { ...validation.data, status: 'PENDING' },
      });
      res.json(toPublicListing(updated));
    } catch (error) {
      logger?.error?.({ error }, 'Failed to update agent listing');
      res.status(500).json({ error: 'Failed to update agent listing' });
    }
  });

  // DELETE /api/v1/agent-listings/:id -- owner withdraws their listing.
  // Only removes the AgentListing row; the underlying AgentConfiguration
  // (and the wallet's private use of it) is untouched.
  router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const walletAddress = req.user?.walletAddress;
      if (!walletAddress) return res.status(401).json({ error: 'Authentication required' });

      const listing = await prisma.agentListing.findUnique({ where: { id: req.params.id } });
      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      if (listing.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ error: 'You do not own this listing' });
      }

      await prisma.agentListing.delete({ where: { id: listing.id } });
      res.status(204).send();
    } catch (error) {
      logger?.error?.({ error }, 'Failed to withdraw agent listing');
      res.status(500).json({ error: 'Failed to withdraw agent listing' });
    }
  });

  // POST /api/v1/agent-listings/:id/install -- copies an APPROVED
  // listing's configuration into a brand-new AgentConfiguration owned by
  // the caller. This is the resolution docs/AGENT_MARKETPLACE_DATA_MODEL.md
  // left open ("copying the configuration into their own
  // AgentConfiguration? A live, hosted instance?") -- deliberately the
  // narrower of the two: a live/hosted instance is entangled with row
  // 22's still-undecided web-deployment question, while a copy is a
  // self-contained data operation reusing saveConfiguration's existing,
  // already-tested NFT/tier-limit enforcement (an installer needs their
  // own NFT-backed configuration slot, same as creating any configuration
  // from scratch).
  router.post('/:id/install', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const walletAddress = req.user?.walletAddress;
      if (!walletAddress) return res.status(401).json({ error: 'Authentication required' });

      const listing = await prisma.agentListing.findUnique({
        where: { id: req.params.id },
        include: { configuration: true },
      });
      if (!listing || listing.status !== 'APPROVED') {
        return res.status(404).json({ error: 'Listing not found' });
      }

      const { config } = await saveConfiguration(
        walletAddress,
        listing.name,
        listing.configuration.configData,
        listing.description ?? undefined,
        listing.configuration.personalityMd ?? undefined
      );

      await prisma.agentListing.update({
        where: { id: listing.id },
        data: { installCount: { increment: 1 } },
      });

      res.status(201).json({ configuration: config });
    } catch (error: any) {
      // saveConfiguration throws a real, user-facing message for NFT/tier
      // limit failures (e.g. "Configuration limit reached...") -- surface
      // it rather than a generic 500.
      if (error?.message) {
        return res.status(400).json({ error: error.message });
      }
      logger?.error?.({ error }, 'Failed to install agent listing');
      res.status(500).json({ error: 'Failed to install agent listing' });
    }
  });

  return router;
}

export default createAgentListingRoutes;
