import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { adminActionSchema, validateInput, sanitizeValidationErrors } from '../validation/schemas';
import { requireAdmin } from '../middleware/admin';

interface AuthenticatedRequest extends Request {
  user?: {
    walletAddress: string;
  };
  prisma?: PrismaClient;
  log?: {
    info: (message: any, ...optional: any[]) => void;
    error: (message: any, ...optional: any[]) => void;
    warn: (message: any, ...optional: any[]) => void;
  };
}

const router = Router();

// GET /api/admin/stats - Get platform statistics (admin only)
router.get('/stats', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Squad ETA Fix: Add structured logging
    req.log?.info({
      admin: req.user?.walletAddress,
      action: 'view_stats'
    }, 'Admin viewing platform statistics');
    
    const [
      totalSkills,
      pendingSkills,
      blockedSkills,
      totalAudits,
      maliciousAudits
    ] = await Promise.all([
      req.prisma?.skill.count(),
      req.prisma?.skill.count({ where: { status: 'PENDING' } }),
      req.prisma?.skill.count({ where: { isBlocked: true } }),
      req.prisma?.audit.count(),
      req.prisma?.audit.count({ where: { status: 'MALICIOUS' } })
    ]);
    
    res.json({
      skills: {
        total: totalSkills,
        pending: pendingSkills,
        blocked: blockedSkills
      },
      audits: {
        total: totalAudits,
        malicious: maliciousAudits
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    req.log?.error({
      error,
      admin: req.user?.walletAddress,
      action: 'view_stats'
    }, 'Failed to fetch admin stats');
    
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// POST /api/admin/skills/:id/block - Block a skill (admin only)
// Squad ETA Fix: CRIT-1 - Input validation
router.post('/skills/:id/block', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  
  try {
    // Squad ETA Fix: CRIT-1 - Validate input
    const validation = validateInput(adminActionSchema, {
      skillId: id,
      action: 'block',
      ...req.body
    });
    
    if (!validation.success) {
      req.log?.warn({
        admin: req.user?.walletAddress,
        skillId: id,
        errors: validation.errors
      }, 'Invalid admin block request');
      
      return res.status(400).json({
        error: 'Validation failed',
        details: sanitizeValidationErrors(validation.errors)
      });
    }
    
    const { reason } = validation.data;
    
    // Squad ETA Fix: Validate skill exists
    const skill = await req.prisma?.skill.findUnique({
      where: { id }
    });
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    // Squad ETA Fix: Check if already blocked
    if (skill.isBlocked) {
      return res.status(409).json({ error: 'Skill is already blocked' });
    }
    
    // Block the skill
    const updatedSkill = await req.prisma?.skill.update({
      where: { id },
      data: {
        isBlocked: true,
        blockedAt: new Date(),
        blockedReason: reason // Now validated and safe
      }
    });
    
    // Squad ETA Fix: Structured logging
    req.log?.info({
      admin: req.user?.walletAddress,
      skillId: id,
      skillName: skill?.name,
      reason
    }, 'Skill blocked by admin');
    
    res.json({
      message: 'Skill blocked successfully',
      skill: updatedSkill
    });
  } catch (error) {
    // Squad ETA Fix: MED-2 - Structured error logging
    req.log?.error({
      error,
      admin: req.user?.walletAddress,
      action: 'block_skill',
      skillId: id
    }, 'Failed to block skill');
    
    next(error);
  }
});

// POST /api/admin/skills/:id/unblock - Unblock a skill (admin only)
// Squad ETA Fix: CRIT-1 - Input validation
router.post('/skills/:id/unblock', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  
  try {
    // Squad ETA Fix: CRIT-1 - Validate input
    const validation = validateInput(adminActionSchema, {
      skillId: id,
      action: 'unblock',
      ...req.body
    });
    
    if (!validation.success) {
      req.log?.warn({
        admin: req.user?.walletAddress,
        skillId: id,
        errors: validation.errors
      }, 'Invalid admin unblock request');
      
      return res.status(400).json({
        error: 'Validation failed',
        details: sanitizeValidationErrors(validation.errors)
      });
    }
    
    const { reason } = validation.data;
    
    const skill = await req.prisma?.skill.findUnique({
      where: { id }
    });
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    if (!skill.isBlocked) {
      return res.status(409).json({ error: 'Skill is not blocked' });
    }
    
    const updatedSkill = await req.prisma?.skill.update({
      where: { id },
      data: {
        isBlocked: false,
        blockedAt: null,
        blockedReason: null
      }
    });
    
    req.log?.info({
      admin: req.user?.walletAddress,
      skillId: id,
      skillName: skill?.name,
      reason
    }, 'Skill unblocked by admin');
    
    res.json({
      message: 'Skill unblocked successfully',
      skill: updatedSkill
    });
  } catch (error) {
    req.log?.error({
      error,
      admin: req.user?.walletAddress,
      action: 'unblock_skill',
      skillId: id
    }, 'Failed to unblock skill');
    
    next(error);
  }
});

// POST /api/admin/skills/:id/verify - Manually verify a skill (admin only)
// Squad ETA Fix: CRIT-1 - Input validation
router.post('/skills/:id/verify', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  
  try {
    // Squad ETA Fix: CRIT-1 - Validate input
    const validation = validateInput(adminActionSchema, {
      skillId: id,
      action: 'verify',
      ...req.body
    });
    
    if (!validation.success) {
      req.log?.warn({
        admin: req.user?.walletAddress,
        skillId: id,
        errors: validation.errors
      }, 'Invalid admin verify request');
      
      return res.status(400).json({
        error: 'Validation failed',
        details: sanitizeValidationErrors(validation.errors)
      });
    }
    
    const { reason } = validation.data;
    
    const skill = await req.prisma?.skill.findUnique({
      where: { id }
    });
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    if (skill.status === 'APPROVED') {
      return res.status(409).json({ error: 'Skill is already verified' });
    }
    
    const updatedSkill = await req.prisma?.skill.update({
      where: { id },
      data: {
        status: 'APPROVED',
        blockedReason: reason
      }
    });
    
    req.log?.info({
      admin: req.user?.walletAddress,
      skillId: id,
      skillName: skill?.name,
      reason
    }, 'Skill verified by admin');
    
    res.json({
      message: 'Skill verified successfully',
      skill: updatedSkill
    });
  } catch (error) {
    req.log?.error({
      error,
      admin: req.user?.walletAddress,
      action: 'verify_skill',
      skillId: id
    }, 'Failed to verify skill');
    
    next(error);
  }
});

// GET /api/admin/memory-reports/aggregates - Get anonymized memory report aggregates
router.get('/memory-reports/aggregates', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    req.log?.info({
      admin: req.user?.walletAddress,
      action: 'view_memory_aggregates'
    }, 'Admin viewing memory report aggregates');
    
    const limit = parseInt(req.query.limit as string) || 12;
    
    const aggregates = await req.prisma?.memoryReportAggregate.findMany({
      orderBy: { periodStart: 'desc' },
      take: limit,
    });
    
    res.json({
      aggregates,
      count: aggregates?.length ?? 0
    });
  } catch (error) {
    req.log?.error({
      error,
      admin: req.user?.walletAddress,
      action: 'view_memory_aggregates'
    }, 'Failed to fetch memory report aggregates');
    
    next(error);
  }
});

// GET /api/admin/memory-reports/flagged - Get flagged user accounts
router.get('/memory-reports/flagged', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    req.log?.info({
      admin: req.user?.walletAddress,
      action: 'view_flagged_users'
    }, 'Admin viewing flagged memory reports');
    
    const limit = parseInt(req.query.limit as string) || 50;
    const severity = req.query.severity as string;
    
    const where: any = { isFlagged: true };
    if (severity) {
      where.flagSeverity = severity;
    }
    
    const flagged = await req.prisma?.memoryReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        walletAddress: true,
        alignmentIndex: true,
        driftScore: true,
        driftTrend: true,
        flagReason: true,
        flagSeverity: true,
        createdAt: true,
        periodStart: true,
        periodEnd: true,
      }
    });
    
    res.json({
      flagged,
      count: flagged?.length ?? 0,
      summary: {
        high: flagged?.filter(f => f.flagSeverity === 'high').length ?? 0,
        medium: flagged?.filter(f => f.flagSeverity === 'medium').length ?? 0,
        low: flagged?.filter(f => f.flagSeverity === 'low').length ?? 0
      }
    });
  } catch (error) {
    req.log?.error({
      error,
      admin: req.user?.walletAddress,
      action: 'view_flagged_users'
    }, 'Failed to fetch flagged reports');
    
    next(error);
  }
});

// ============================================
// Agent Marketplace moderation (docs/DOCS_VS_CODEBASE.md row 22,
// docs/AGENT_MARKETPLACE_DATA_MODEL.md) -- mirrors the Skill
// block/unblock/verify pattern above: same adminActionSchema (a reason
// is required for every action, approve included), same
// validate -> fetch -> guard-against-redundant-transition -> update ->
// log shape.
// ============================================

// GET /api/admin/agent-listings?status=PENDING -- the moderation queue.
// Neither Skill nor AgentListing had a "browse by status for review"
// admin endpoint before this (GET /skills and GET /agent-listings both
// hardcode status: 'APPROVED' for the public browse case) -- added here
// once building the moderation UI made the gap concrete: without it,
// there is no way to discover what's waiting on a decision except
// already knowing a listing's id.
router.get('/agent-listings', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : 'PENDING';
    if (!['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }

    const listings = await req.prisma?.agentListing.findMany({
      where: { status: status as any },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ listings, count: listings?.length ?? 0 });
  } catch (error) {
    req.log?.error({ error, admin: req.user?.walletAddress, action: 'list_agent_listings' }, 'Failed to list agent listings for moderation');
    next(error);
  }
});

router.post('/agent-listings/:id/approve', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const validation = validateInput(adminActionSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: sanitizeValidationErrors(validation.errors) });
    }
    const { reason } = validation.data;

    const listing = await req.prisma?.agentListing.findUnique({ where: { id } });
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (listing.status === 'APPROVED') {
      return res.status(409).json({ error: 'Listing is already approved' });
    }

    const updated = await req.prisma?.agentListing.update({
      where: { id },
      data: { status: 'APPROVED' }
    });

    req.log?.info({ admin: req.user?.walletAddress, listingId: id, reason }, 'Agent listing approved by admin');
    res.json({ message: 'Listing approved successfully', listing: updated });
  } catch (error) {
    req.log?.error({ error, admin: req.user?.walletAddress, action: 'approve_agent_listing', listingId: id }, 'Failed to approve agent listing');
    next(error);
  }
});

router.post('/agent-listings/:id/reject', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const validation = validateInput(adminActionSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: sanitizeValidationErrors(validation.errors) });
    }
    const { reason } = validation.data;

    const listing = await req.prisma?.agentListing.findUnique({ where: { id } });
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (listing.status === 'REJECTED') {
      return res.status(409).json({ error: 'Listing is already rejected' });
    }

    const updated = await req.prisma?.agentListing.update({
      where: { id },
      data: { status: 'REJECTED' }
    });

    req.log?.info({ admin: req.user?.walletAddress, listingId: id, reason }, 'Agent listing rejected by admin');
    res.json({ message: 'Listing rejected successfully', listing: updated });
  } catch (error) {
    req.log?.error({ error, admin: req.user?.walletAddress, action: 'reject_agent_listing', listingId: id }, 'Failed to reject agent listing');
    next(error);
  }
});

// Suspend: unlike reject (a moderation verdict on a PENDING submission),
// this is for pulling a previously-APPROVED listing back out of the
// public browse list -- e.g. a later report against an agent that had
// already passed review. Only makes sense starting from APPROVED.
router.post('/agent-listings/:id/suspend', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const validation = validateInput(adminActionSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: sanitizeValidationErrors(validation.errors) });
    }
    const { reason } = validation.data;

    const listing = await req.prisma?.agentListing.findUnique({ where: { id } });
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (listing.status !== 'APPROVED') {
      return res.status(409).json({ error: 'Only an approved listing can be suspended' });
    }

    const updated = await req.prisma?.agentListing.update({
      where: { id },
      data: { status: 'SUSPENDED' }
    });

    req.log?.info({ admin: req.user?.walletAddress, listingId: id, reason }, 'Agent listing suspended by admin');
    res.json({ message: 'Listing suspended successfully', listing: updated });
  } catch (error) {
    req.log?.error({ error, admin: req.user?.walletAddress, action: 'suspend_agent_listing', listingId: id }, 'Failed to suspend agent listing');
    next(error);
  }
});

export { router as adminRoutes };