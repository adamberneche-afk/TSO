import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuditReportSchema } from '@think/types';
import { validateInput, sanitizeValidationErrors } from '../validation/schemas';
import { verifySignature } from '../utils/signature';
import { recomputeTrustScore } from '../services/trustScore';

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
};

const router = Router();

// POST /api/v1/audits - Submit a community audit report
// Mounted behind rate limit -> authMiddleware -> auditorNftMiddleware
// (see index.ts), so req.user is always populated and already verified
// to hold an Auditor NFT by the time a request reaches here.
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = validateInput(AuditReportSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: sanitizeValidationErrors(validation.errors),
      });
    }

    const report = validation.data;
    const auditorWallet = report.auditor.toLowerCase();

    // An authenticated Auditor-NFT holder could still try to submit a
    // report attributed to someone else's wallet -- the claimed auditor
    // must match the authenticated session, same class of fix as the
    // /rcrt/audit forgeable-ownerId issue.
    if (!req.user || req.user.walletAddress.toLowerCase() !== auditorWallet) {
      return res.status(403).json({
        error: 'Auditor mismatch',
        message: 'The report\'s auditor must match the authenticated wallet',
      });
    }

    // The signature must actually tie this report's content to the
    // claimed auditor -- mirrors the exact payload format
    // packages/cli/src/commands/audit.ts signs
    // (skill_hash:auditor:status:JSON(findings):timestamp). Deliberately
    // uses req.body.findings (raw, as JSON-parsed from the request) here
    // rather than validation.data.findings: zod rebuilds a parsed object
    // with keys in the *schema's* declaration order, not the order the
    // client's own JSON had them in, so JSON.stringify on the validated
    // copy would silently produce a different string than the one the
    // CLI actually signed for any report with a non-empty findings
    // array -- and every real submission would 401 as "forged."
    const payload = `${report.skill_hash}:${auditorWallet}:${report.status}:${JSON.stringify(req.body.findings)}:${report.timestamp}`;
    const sigCheck = verifySignature(payload, report.signature, auditorWallet);
    if (!sigCheck.valid) {
      return res.status(401).json({
        error: 'Invalid signature',
        message: sigCheck.error || 'Audit report signature does not match the claimed auditor',
      });
    }

    const skill = await req.prisma?.skill.findUnique({
      where: { skillHash: report.skill_hash },
      select: { id: true },
    });
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found', skillHash: report.skill_hash });
    }

    const statusMap: Record<typeof report.status, 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS'> = {
      safe: 'SAFE',
      suspicious: 'SUSPICIOUS',
      malicious: 'MALICIOUS',
    };

    const audit = await req.prisma!.audit.create({
      data: {
        skillId: skill.id,
        auditor: auditorWallet,
        status: statusMap[report.status],
        findings: report.findings,
        signature: report.signature,
      },
    });

    const { trustScore, isBlocked } = await recomputeTrustScore(req.prisma as PrismaClient, skill.id);

    res.status(201).json({
      success: true,
      auditId: audit.id,
      skillHash: report.skill_hash,
      trustScore,
      isBlocked,
    });
  } catch (error) {
    req.log?.error({ error }, 'Failed to submit audit');
    res.status(500).json({ error: 'Failed to submit audit' });
  }
});

// GET /api/audits - List recent audits (public)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const [audits, total] = await Promise.all([
      req.prisma?.audit.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          skill: {
            select: {
              id: true,
              name: true,
              skillHash: true,
              author: true,
            }
          }
        }
      }) ?? [],
      req.prisma?.audit.count() ?? 0
    ]);

    res.json({
      audits: audits.map(audit => ({
        id: audit.id,
        skill: {
          id: audit.skill.id,
          name: audit.skill.name,
          skillHash: audit.skill.skillHash,
          author: audit.skill.author,
        },
        action: audit.status, // Using status as action since there's no separate action field
        status: audit.status,
        reporter: audit.auditor,
        timestamp: audit.createdAt,
        details: audit.findings,
      })),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    req.log?.error({ error }, 'Failed to fetch audits');
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
});

// GET /api/audits/:skillHash - Get audits for a specific skill
router.get('/:skillHash', async (req: AuthenticatedRequest, res: Response) => {
  const { skillHash } = req.params;
  try {
    const skill = await req.prisma?.skill.findUnique({
      where: { skillHash },
      select: {
        id: true,
        name: true,
        skillHash: true,
        author: true,
        trustScore: true,
        isBlocked: true,
        audits: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            id: true,
            status: true,
            auditor: true,
            createdAt: true,
            findings: true,
          }
        }
      }
    });

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    res.json({
      skill: {
        id: skill.id,
        name: skill.name,
        skillHash: skill.skillHash,
        author: skill.author,
        trustScore: skill.trustScore,
        isBlocked: skill.isBlocked,
      },
      audits: skill.audits.map(audit => ({
        id: audit.id,
        action: audit.status, // Using status as action since there's no separate action field
        status: audit.status,
        reporter: audit.auditor,
        timestamp: audit.createdAt,
        details: audit.findings,
      })),
    });
  } catch (error) {
    req.log?.error({ error, skillHash }, 'Failed to fetch skill audits');
    res.status(500).json({ error: 'Failed to fetch skill audits' });
  }
});

export { router as auditRoutes };