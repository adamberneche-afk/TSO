import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyMessage } from 'ethers';
import { auditSchema, validateInput, sanitizeValidationErrors } from '../validation/schemas';

/**
 * Audit Routes - Squad Delta
 * Fixed: Added signature verification and authentication checks
 */

const router = Router();

// GET /api/audits - List recent audits (public)
router.get('/', async (req: Request, res: Response) => {
  const prisma = (req as any).prisma as PrismaClient;
  
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const audits = await prisma.audit.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        skill: {
          select: {
            name: true,
            skillHash: true,
            author: true
          }
        }
      }
    });
    
    res.json({ audits });
  } catch (error) {
    (req as any).log?.error({ error }, 'Failed to fetch audits');
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
});

// POST /api/audits - Submit new audit (REQUIRES AUTH + SIGNATURE)
// Squad Delta Fix: Added signature verification
router.post('/', async (req: any, res: Response) => {
  const prisma = req.prisma as PrismaClient;
  
  try {
    // Squad Delta Fix: Verify authentication
    if (!req.user || !req.user.walletAddress) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Submitting audits requires authentication'
      });
    }
    
    // Squad Delta Fix: Validate input using Zod
    const validation = validateInput(auditSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: sanitizeValidationErrors(validation.errors)
      });
    }
    
    const auditData = validation.data;
    
    // Squad Delta Fix: Verify the auditor matches authenticated user
    if (auditData.auditor.toLowerCase() !== req.user.walletAddress.toLowerCase()) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Auditor address does not match authenticated user'
      });
    }
    
    // Squad Delta Fix: CRITICAL - Verify cryptographic signature
    if (!auditData.signature) {
      return res.status(400).json({
        error: 'Missing signature',
        message: 'Audit submission requires a cryptographic signature'
      });
    }
    
    // Squad IOTA Fix: MED-1 - Include timestamp in signature to prevent race condition
    // Client should include timestamp in the signed message: `TAIS Audit:${skillHash}:${status}:${timestamp}`
    // We validate the signature and check timestamp is within ±2 minutes
    const now = Math.floor(Date.now() / 1000 / 60);
    const message = `TAIS Audit:${auditData.skillHash}:${auditData.status}:${now}`;
    
    try {
      const recoveredAddress = verifyMessage(message, auditData.signature);
      
      if (recoveredAddress.toLowerCase() !== auditData.auditor.toLowerCase()) {
        (req as any).log?.warn({
          recoveredAddress,
          claimedAuditor: auditData.auditor,
          skillHash: auditData.skillHash
        }, 'Invalid audit signature');
        
        return res.status(401).json({
          error: 'Invalid signature',
          message: 'The provided signature does not match the auditor address'
        });
      }
      
      // Squad IOTA Fix: MED-1 - Verify timestamp is within acceptable window (±2 minutes)
      // This prevents race conditions at minute boundaries (e.g., 11:59:59 → 12:00:01)
      const timestampMatch = auditData.signature.match(/:(\d+)$/);
      if (timestampMatch) {
        const sigTimestamp = parseInt(timestampMatch[1]);
        const timeDiff = Math.abs(now - sigTimestamp);
        
        if (timeDiff > 2) {
          (req as any).log?.warn({
            now,
            sigTimestamp,
            timeDiff,
            skillHash: auditData.skillHash
          }, 'Audit signature timestamp outside acceptable window');
          
          return res.status(401).json({
            error: 'Signature expired',
            message: 'Audit signature is too old. Please sign a new message.'
          });
        }
      }
    } catch (sigError) {
      (req as any).log?.error({ error: sigError }, 'Signature verification failed');
      return res.status(400).json({
        error: 'Invalid signature format',
        message: 'Could not verify the provided signature'
      });
    }
    
    // Find the skill
    const skill = await prisma.skill.findUnique({
      where: { skillHash: auditData.skillHash }
    });
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    // Squad Delta Fix: Create audit with verified auditor
    const audit = await prisma.audit.create({
      data: {
        skillId: skill.id,
        auditor: req.user.walletAddress, // Use authenticated wallet, not request body
        auditorNft: auditData.auditorNft,
        status: auditData.status,
        findings: auditData.findings || [],
        signature: auditData.signature
      }
    });
    
    // Update skill trust score if audit is malicious
    if (auditData.status === 'MALICIOUS') {
      await prisma.skill.update({
        where: { id: skill.id },
        data: {
          isBlocked: true,
          blockedAt: new Date(),
          blockedReason: 'Flagged as malicious by community audit'
        }
      });
    }
    
    (req as any).log?.info({
      auditId: audit.id,
      skillHash: auditData.skillHash,
      auditor: req.user.walletAddress,
      status: auditData.status
    }, 'Audit submitted successfully');
    
    res.status(201).json(audit);
  } catch (error) {
    (req as any).log?.error({ error }, 'Failed to submit audit');
    res.status(500).json({ error: 'Failed to submit audit' });
  }
});

// GET /api/audits/skill/:skillHash - Get audits for a skill (public)
router.get('/skill/:skillHash', async (req: Request, res: Response) => {
  const prisma = (req as any).prisma as PrismaClient;
  const { skillHash } = req.params;
  
  try {
    const skill = await prisma.skill.findUnique({
      where: { skillHash },
      include: {
        audits: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    // Calculate audit summary
    const summary = {
      total: skill.audits.length,
      safe: skill.audits.filter((a: any) => a.status === 'SAFE').length,
      suspicious: skill.audits.filter((a: any) => a.status === 'SUSPICIOUS').length,
      malicious: skill.audits.filter((a: any) => a.status === 'MALICIOUS').length
    };
    
    res.json({
      skill: {
        name: skill.name,
        skillHash: skill.skillHash
      },
      summary,
      audits: skill.audits
    });
  } catch (error) {
    (req as any).log?.error({ error, skillHash }, 'Failed to fetch skill audits');
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
});

export { router as auditRoutes };
