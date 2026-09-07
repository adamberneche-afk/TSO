import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { NFTService } from '../services/nftVerification';
import { skillSchema, validateInput, sanitizeValidationErrors } from '../validation/schemas';
import { createIPFSClient } from '../services/ipfs';
import { skillScanner } from './scan';

/**
 * Skill Routes - Squad Delta
 * Fixed: Added authentication, ownership verification, and proper middleware integration
 */

interface AuthenticatedRequest extends Request {
  user?: {
    walletAddress: string;
  };
  prisma?: PrismaClient;
  nftService?: NFTService;
  log?: {
    info: (message: any, ...optional: any[]) => void;
    error: (message: any, ...optional: any[]) => void;
    warn: (message: any, ...optional: any[]) => void;
  };
}

const router = Router();

/**
 * @route GET /api/skills
 * @group Skills - Operations about skills
 * @summary List all skills (public)
 * @param {string} category.query optional - Filter by category name
 * @param {string} search.query optional - Search in name or description
 * @param {boolean} trending.query optional - If true, order by download count instead of recency
 * @param {number} limit.query optional - Max results per page (default 20, capped at 100)
 * @param {number} offset.query optional - Results to skip (default 0)
 * @returns {object} 200 - { skills, total, page, limit }
 * @returns {Error}  500 - Internal server error
 */
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {

  // Check if prisma is available
  if (!req.prisma) {
    return res.status(500).json({ error: 'Database connection not available' });
  }

  try {
    const { category, search, trending } = req.query;

    // Public, unauthenticated endpoint -- cap take like every other list
    // route in this codebase (agent.ts, audits.ts, rag.ts, rcrt.ts, search.ts
    // all use the same Math.min(..., 100) pattern), or an attacker-supplied
    // limit forces an unbounded findMany + join in one request.
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const where: any = { status: 'APPROVED', isBlocked: false };

    if (category) {
      where.categories = {
        some: {
          category: { name: category as string }
        }
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // `trending` used to be destructured and never read -- dead code, the
    // param had no effect on the response regardless of what was passed.
    // The frontend (registry-client.ts) has sent it since it was written,
    // expecting the same route to double as a "trending skills" feed.
    const [skills, total] = await Promise.all([
      req.prisma.skill.findMany({
        where,
        include: {
          categories: { include: { category: true } },
          audits: {
            orderBy: { createdAt: 'desc' },
            take: 3
          }
        },
        orderBy: trending ? { downloadCount: 'desc' } : { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      req.prisma.skill.count({ where })
    ]);

    // Every call used to return the full result set as a plain array with
    // no way to page through it. Shape matches tais_frontend's
    // `SearchResults` type (skills/total/page/limit) exactly, since that's
    // the one real consumer already parsing this response.
    res.json({
      skills,
      total,
      page: Math.floor(offset / limit) + 1,
      limit
    });
  } catch (error) {
    req.log?.error({ error }, 'Failed to fetch skills');
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

/**
 * @route GET /api/skills/:hash
 * @group Skills
 * @summary Get skill details (public)
 * @param {string} hash.path - Skill hash
 * @returns {object} 200 - Skill object
 * @returns {Error}  404 - Skill not found
 * @returns {Error}  500 - Internal server error
 */
router.get('/:hash', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check if prisma is available
  if (!req.prisma) {
    return res.status(500).json({ error: 'Database connection not available' });
  }
  
  const { hash } = req.params;
  
  try {
    const skill = await req.prisma.skill.findUnique({
      where: { skillHash: hash },
      include: {
        categories: { include: { category: true } },
        audits: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    res.json(skill);
  } catch (error) {
    req.log?.error({ error, hash }, 'Failed to fetch skill');
    res.status(500).json({ error: 'Failed to fetch skill' });
  }
});

/**
 * @route POST /api/skills
 * @group Skills
 * @summary Publish a new skill (requires publisher NFT)
 * @param {object} skill.body - Skill object
 * @returns {object} 201 - Created skill
 * @returns {Error}  400 - Invalid input
 * @returns {Error}  401 - Unauthorized
 * @returns {Error}  403 - Forbidden (no publisher NFT)
 * @returns {Error}  500 - Internal server error
 */
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check if prisma is available
  if (!req.prisma) {
    return res.status(500).json({ error: 'Database connection not available' });
  }
  
  try {
    // Squad Delta Fix: CRIT-1 - Validate input using Zod
    const validation = validateInput(skillSchema, req.body);
    
    if (!validation.success) {
      req.log?.warn({ errors: validation.errors }, 'Invalid skill creation request');
      
      return res.status(400).json({
        error: 'Validation failed',
        details: sanitizeValidationErrors(validation.errors)
      });
    }
    
    const skillData = validation.data;
    
    // Squad Delta Fix: Ensure user is authenticated
    if (!req.user || !req.user.walletAddress) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Publisher NFT ownership is already verified upstream by
    // publisherNftMiddleware (see index.ts, applied to every POST here via
    // applyMiddlewareChain) using the real, correctly-constructed
    // NFTService. This second check against req.nftService was dead code:
    // nothing anywhere in the app ever assigns req.nftService, so it was
    // always undefined and this unconditionally 500'd for every real
    // publish attempt, authenticated and NFT-holding or not.

    // At this point, we know req.user and req.user.walletAddress are defined
    const creatorWallet = req.user!.walletAddress.toLowerCase();

    // Security scan: if a package was uploaded to IPFS, fetch its content
    // and run it through the real YARA-backed scanner before persisting the
    // skill. yaraScanner.ts (and this scan) previously existed but was
    // entirely unreachable dead code -- see YARA.md.
    //
    // IPFS retrieval is optional infrastructure (gated by IPFS_ENABLED) and
    // scanning is defense-in-depth, not the only gate on publishing, so a
    // fetch/scan failure here fails open (logged, publish proceeds) rather
    // than blocking every publish on an IPFS outage -- consistent with how
    // yaraScanner itself degrades (native -> cli -> pattern) rather than
    // erroring when its preferred backend isn't available. A genuine
    // "malicious" verdict, however, always blocks the publish.
    if (skillData.packageCid) {
      const ipfsClient = await createIPFSClient();
      if (ipfsClient) {
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of ipfsClient.cat(skillData.packageCid)) {
            chunks.push(Buffer.from(chunk));
          }
          const packageBuffer = Buffer.concat(chunks);
          const scanResult = await skillScanner.scanBuffer(
            packageBuffer,
            skillData.skillHash,
            `${skillData.name}-package`
          );

          if (scanResult.severity === 'malicious') {
            req.log?.warn({
              wallet: creatorWallet,
              skillHash: skillData.skillHash,
              findings: scanResult.findings.map(f => f.rule),
            }, 'Skill package rejected by security scan');

            return res.status(403).json({
              error: 'Security scan failed',
              message: 'The uploaded skill package matched known malicious patterns and was rejected',
              findings: scanResult.findings.map(f => ({ rule: f.rule, severity: f.meta?.severity })),
            });
          }
        } catch (scanError) {
          req.log?.error({ error: scanError, skillHash: skillData.skillHash }, 'Failed to fetch/scan skill package from IPFS');
        }
      } else {
        req.log?.warn({ skillHash: skillData.skillHash }, 'IPFS disabled -- skipping package content security scan');
      }
    }

     // Create skill with category linking
       const skill = await req.prisma.skill.create({
         data: {
           name: skillData.name,
           description: skillData.description,
           version: skillData.version,
           skillHash: skillData.skillHash,
           manifestCid: skillData.manifestCid,
           packageCid: skillData.packageCid,
           author: req.user.walletAddress.toLowerCase(),
           permissions: skillData.permissions || {},
           status: skillData.status || 'PENDING',
           isBlocked: skillData.isBlocked ?? false,
            categories: {
              create: skillData.categoryIds?.map(categoryId => ({
                category: {
                  connect: { id: categoryId }
                }
              })) || []
            }
         }
       });
    
    req.log?.info({
      wallet: req.user.walletAddress,
      skillId: skill.id,
      skillName: skill.name
    }, 'Skill published successfully');
    
    res.status(201).json(skill);
  } catch (error) {
    req.log?.error({ error }, 'Skill creation failed');
    res.status(500).json({ error: 'Failed to create skill' });
  }
});

export { router as skillRoutes };