import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { YaraScanner, SecurityScanResult } from '../services/yaraScanner';

interface AuthenticatedRequest extends Request {
  prisma: PrismaClient;
  file?: Express.Multer.File;
  log?: {
    info: (message: any, ...optional: any[]) => void;
    error: (message: any, ...optional: any[]) => void;
    warn: (message: any, ...optional: any[]) => void;
  };
}

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Initialize YARA scanner
const yaraScanner = new YaraScanner();

// GET /api/scan/rules - List available YARA rules
router.get('/rules', async (req: Request, res: Response) => {
  try {
    const rulesDir = yaraScanner.getRulesDirectory();
    
    if (!fs.existsSync(rulesDir)) {
      return res.json({ rules: [] });
    }

    const ruleFiles = fs.readdirSync(rulesDir)
      .filter(f => f.endsWith('.yar'))
      .map(f => ({
        name: f.replace('.yar', ''),
        filename: f,
        path: path.join(rulesDir, f),
      }));

    res.json({
      rules: ruleFiles,
      total: ruleFiles.length,
      scannerInitialized: yaraScanner.isInitialized(),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to list rules', message: error.message });
  }
});

// POST /api/scan - Scan uploaded skill package
router.post('/', upload.single('package'), async (req: Request, res: Response) => {
  const prisma = req.prisma;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No package file uploaded' });
    }

    const skillHash = req.body.skillHash || 'unknown';
    const filePath = req.file.path;

    // Initialize scanner if needed
    if (!yaraScanner.isInitialized()) {
      await yaraScanner.initialize();
    }

    // Scan the file
    const result = await yaraScanner.scanFile(filePath, skillHash);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

// Store scan result in database
await storeScanResult(req.prisma as PrismaClient, result);

    res.json(result);
  } catch (error: any) {
    // Clean up on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Scan failed', 
      message: error.message 
    });
  }
});

// POST /api/scan/directory - Scan skill directory
router.post('/directory', async (req: Request, res: Response) => {
  try {
    const { directoryPath, skillHash } = req.body;

    if (!directoryPath || !fs.existsSync(directoryPath)) {
      return res.status(400).json({ error: 'Invalid directory path' });
    }

    // Initialize scanner if needed
    if (!yaraScanner.isInitialized()) {
      await yaraScanner.initialize();
    }

    const result = await yaraScanner.scanDirectory(directoryPath, skillHash);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Directory scan failed', 
      message: error.message 
    });
  }
});

// GET /api/scan/:skillHash - Get scan results for a skill
router.get('/:skillHash', async (req: AuthenticatedRequest, res: Response) => {
  const { skillHash } = req.params;

  try {
     // Get scan results from database
      const scanResults = await req.prisma.securityScan.findMany({
      where: { skillHash },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (scanResults.length === 0) {
      return res.status(404).json({ 
        error: 'No scan results found',
        skillHash 
      });
    }

    res.json({
      skillHash,
      totalScans: scanResults.length,
      latestScan: scanResults[0],
      scanHistory: scanResults,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch scan results' });
  }
});

// POST /api/scan/:skillHash/scan - Trigger scan for existing skill
router.post('/:skillHash/scan', async (req: AuthenticatedRequest, res: Response) => {
  const { skillHash } = req.params;

  try {
     // Get skill from database
     const skill = await (req.prisma as PrismaClient).skill.findUnique({
      where: { skillHash },
    });

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    // Check if skill has a local path (for scanning)
    const skillDir = path.join(process.cwd(), '.tais', 'skills', skill.name);
    
    if (!fs.existsSync(skillDir)) {
      return res.status(400).json({ 
        error: 'Skill not available locally for scanning' 
      });
    }

    // Initialize scanner if needed
    if (!yaraScanner.isInitialized()) {
      await yaraScanner.initialize();
    }

    // Scan the skill directory
    const result = await yaraScanner.scanDirectory(skillDir, skillHash);

     // Store scan result
     await storeScanResult(req.prisma as PrismaClient, result);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Scan failed', 
      message: error.message 
    });
  }
});

// GET /api/scan/:skillHash/report - Get detailed security report
router.get('/:skillHash/report', async (req: AuthenticatedRequest, res: Response) => {
  const { skillHash } = req.params;

  try {
     const latestScan = await (req.prisma as PrismaClient).securityScan.findFirst({
      where: { skillHash },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestScan) {
      return res.status(404).json({ error: 'No scan results found' });
    }

    // Generate detailed report
    const report = generateSecurityReport(latestScan);

    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

    // Helper function to store scan result
    async function storeScanResult(prisma: PrismaClient, result: SecurityScanResult) {
      try {
        await prisma.securityScan.create({
          data: {
            skillHash: result.skillHash,
            severity: result.severity,
            findings: result.findings,
            summary: result.summary,
            scanDuration: result.scanDuration,
            scannedFiles: result.scannedFiles,
            scannedBytes: result.scannedBytes,
          },
        });
      } catch (error) {
        req.log?.error({ error }, 'Failed to store scan result');
        // Don't throw - scanning should still succeed even if storage fails
      }
    }

// Helper function to generate security report
function generateSecurityReport(scan: any) {
  const findings = scan.findings || [];
  
  // Group findings by severity
  const bySeverity = {
    critical: findings.filter((f: any) => f.meta?.severity === 'critical'),
    high: findings.filter((f: any) => f.meta?.severity === 'high'),
    medium: findings.filter((f: any) => f.meta?.severity === 'medium'),
    low: findings.filter((f: any) => f.meta?.severity === 'low'),
  };

  // Group findings by category
  const byCategory: Record<string, any[]> = {};
  findings.forEach((f: any) => {
    const category = f.meta?.category || 'unknown';
    if (!byCategory[category]) byCategory[category] = [];
    byCategory[category].push(f);
  });

  return {
    skillHash: scan.skillHash,
    scanDate: scan.createdAt,
    overallSeverity: scan.severity,
    summary: scan.summary,
    findings: {
      bySeverity,
      byCategory,
      total: findings.length,
    },
    recommendations: generateRecommendations(bySeverity),
  };
}

// Generate recommendations based on findings
function generateRecommendations(bySeverity: any) {
  const recommendations: string[] = [];

  if (bySeverity.critical.length > 0) {
    recommendations.push('🔴 CRITICAL: Remove or block this skill immediately');
    recommendations.push('Review all critical findings and fix security issues');
  }

  if (bySeverity.high.length > 0) {
    recommendations.push('🟠 HIGH: Security issues must be addressed before approval');
    recommendations.push('Audit all network requests and file access patterns');
  }

  if (bySeverity.medium.length > 0) {
    recommendations.push('🟡 MEDIUM: Review suspicious patterns and code practices');
    recommendations.push('Consider requiring additional code review');
  }

  if (bySeverity.low.length > 0) {
    recommendations.push('🟢 LOW: Minor issues that should be noted but not blocking');
  }

  if (Object.values(bySeverity).every((arr: any) => arr.length === 0)) {
    recommendations.push('✅ No security issues detected');
    recommendations.push('Skill passed security scan');
  }

  return recommendations;
}

export { router as scanRoutes };