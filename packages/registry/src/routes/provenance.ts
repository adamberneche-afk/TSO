import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { VouchRequestSchema } from '@think/types';
import { validateInput, sanitizeValidationErrors } from '../validation/schemas';
import { verifySignature } from '../utils/signature';
import { addProvenanceLink } from '../services/provenance';

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

// POST /api/v1/provenance/:skillHash/vouch - Add a community voucher
// link to a skill's provenance chain (docs/DOCS_VS_CODEBASE.md row 6).
// Mounted behind rate limit -> authMiddleware only (see index.ts) -- no
// NFT gate, unlike /audits: a voucher is deliberately the lightest-
// weight, open-to-anyone endorsement tier, the same way
// IsnadService.addLink (packages/core) never NFT-gates the 'voucher'
// role the way it does 'author'/'auditor'.
router.post('/:skillHash/vouch', async (req: AuthenticatedRequest, res: Response) => {
  const { skillHash } = req.params;
  try {
    const validation = validateInput(VouchRequestSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: sanitizeValidationErrors(validation.errors),
      });
    }

    const voucher = validation.data;
    const voucherWallet = voucher.wallet.toLowerCase();

    // Same class of fix as /audits: an authenticated wallet could still
    // try to submit a voucher link attributed to someone else's wallet.
    if (!req.user || req.user.walletAddress.toLowerCase() !== voucherWallet) {
      return res.status(403).json({
        error: 'Wallet mismatch',
        message: 'The voucher wallet must match the authenticated wallet',
      });
    }

    // Mirrors AuditReportSchema's payload convention and the local
    // isnad-chain signature format IsnadService.addLink already uses --
    // `${skillHash}:${wallet}:${role}:${timestamp}`, role lowercase to
    // match @think/types's IsnadLinkSchema.role enum values.
    const payload = `${skillHash}:${voucherWallet}:voucher:${voucher.timestamp}`;
    const sigCheck = verifySignature(payload, voucher.signature, voucherWallet);
    if (!sigCheck.valid) {
      return res.status(401).json({
        error: 'Invalid signature',
        message: sigCheck.error || 'Voucher signature does not match the claimed wallet',
      });
    }

    const skill = await req.prisma?.skill.findUnique({
      where: { skillHash },
      select: { id: true },
    });
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found', skillHash });
    }

    // One voucher link per wallet per skill -- otherwise a single wallet
    // could vouch repeatedly to inflate provenanceScore on its own.
    // Enforced here rather than a DB constraint since AUDITOR links
    // (which share this table) are legitimately one-per-audit, not
    // one-per-wallet -- see the schema comment on ProvenanceLink.
    const existing = await req.prisma!.provenanceLink.findFirst({
      where: { skillId: skill.id, wallet: voucherWallet, role: 'VOUCHER' },
      select: { id: true },
    });
    if (existing) {
      return res.status(409).json({
        error: 'Already vouched',
        message: 'This wallet has already vouched for this skill',
      });
    }

    const { provenanceScore } = await addProvenanceLink(req.prisma as PrismaClient, {
      skillId: skill.id,
      wallet: voucherWallet,
      role: 'VOUCHER',
      signature: voucher.signature,
      notes: voucher.notes,
    });

    res.status(201).json({
      success: true,
      skillHash,
      provenanceScore,
    });
  } catch (error) {
    req.log?.error({ error, skillHash }, 'Failed to submit voucher link');
    res.status(500).json({ error: 'Failed to submit voucher link' });
  }
});

export { router as provenanceRoutes };
