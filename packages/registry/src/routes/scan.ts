import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { YaraScanner, SecurityScanResult } from '../services/yaraScanner';

// Extend Express Request type to include our custom properties
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

// Shared scanner instance so YARA rules/backend are only initialized once,
// mirroring how yaraScanner.ts is meant to be used (initialize() is
// idempotent and memoizes on `this.initialized`).
const scanner = new YaraScanner();

function summarizeResult(result: SecurityScanResult) {
  return {
    scanId: `scan-${result.skillHash.slice(0, 16)}-${result.timestamp.getTime()}`,
    status: result.severity === 'malicious' ? 'blocked' : 'completed',
    result: result.severity,
    findings: result.findings.map(f => ({
      rule: f.rule,
      severity: f.meta?.severity,
      category: f.meta?.category,
    })),
    summary: result.summary,
    scanDuration: result.scanDuration,
    scannedBytes: result.scannedBytes,
  };
}

// POST /api/scan - Scan submitted content for malware/vulnerability patterns
//
// This used to be a placeholder that ignored the request body entirely and
// always returned a hardcoded { result: 'clean' } -- it never called
// yaraScanner (or securityScannerService) at all, and the router wasn't even
// mounted in index.ts, so none of it was reachable. It's now backed by the
// real YaraScanner, and is mounted (authenticated) at /api/v1/scan.
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { content, encoding, filename } = req.body || {};

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'content (string) is required' });
    }

    if (encoding !== undefined && encoding !== 'utf8' && encoding !== 'base64') {
      return res.status(400).json({ error: "encoding must be 'utf8' or 'base64' if provided" });
    }

    const buffer = Buffer.from(content, encoding === 'base64' ? 'base64' : 'utf8');
    const skillHash = crypto.createHash('sha256').update(buffer).digest('hex');

    const result = await scanner.scanBuffer(buffer, skillHash, filename || 'upload');
    const body = summarizeResult(result);

    req.log?.info(
      { wallet: req.user?.walletAddress, severity: result.severity, matched: result.summary.matchedRules },
      'Content security scan completed'
    );

    res.status(result.severity === 'malicious' ? 403 : 200).json({
      success: result.severity !== 'malicious',
      ...body,
    });
  } catch (error) {
    req.log?.error({ error }, 'Error in scan endpoint');
    next(error);
  }
});

export { router as scanRoutes, scanner as skillScanner };
