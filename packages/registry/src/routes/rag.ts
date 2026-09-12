import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { validateInput, sanitizeValidationErrors } from '../validation/schemas';
import { z } from 'zod';
import { encryptCommunityData, decryptCommunityData, isCommunityEncrypted } from '../services/communityCrypto';

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

// Validation schemas

// A single E2EE-encrypted chunk. Each chunk is encrypted client-side with
// its own independently-generated salt (see e2eeEncryption.ts's encrypt()),
// not the parent document's salt -- it must be persisted per chunk or the
// chunk can never be decrypted again.
const uploadChunkSchema = z.object({
  index: z.number().int().nonnegative(),
  encryptedContent: z.string(),
  iv: z.string(),
  salt: z.string(),
  embeddingHash: z.string()
});

// The client (PublicRAGClient.uploadDocument) encrypts the document and its
// metadata (title/type/tags/author) end-to-end before this ever reaches the
// server -- the server never sees plaintext content, title, or per-document
// metadata, only ciphertext plus the salts/IVs needed to derive the keys
// that produced it.
const uploadDocumentSchema = z.object({
  encryptedData: z.string(),
  encryptedMetadata: z.string(),
  iv: z.string(),
  salt: z.string(),
  ownerPublicKey: z.string(),
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(false),
  chunks: z.array(uploadChunkSchema).default([])
});

const searchSchema = z.object({
  query: z.string().min(1),
  topK: z.number().int().positive().default(10),
  filters: z.record(z.any()).optional()
});

const shareDocumentSchema = z.object({
  recipientPublicKey: z.string()
});

const getDocumentChunksSchema = z.object({});

const getDocumentSchema = z.object({});

const getStatsSchema = z.object({});

const router = Router();

// Helper to handle errors
const handleError = (res: Response, error: any, defaultMessage: string = 'Operation failed') => {
  console.error('RAG API error:', error);
  // Check if it's a database connection issue
  if (error instanceof Error && 
      (error.message.includes('connection') || 
       error.message.includes('database') || 
       error.message.includes('SUSPENDED') ||
       error.message.includes('timeout'))) {
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'The RAG storage service is temporarily unavailable. Please try again later.'
    });
  } else {
    res.status(500).json({
      error: defaultMessage,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Check database connection helper
const checkDatabaseConnection = async (prisma: PrismaClient): Promise<boolean> => {
  try {
    // Simple query to check if database is responsive
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    return false;
  }
};

// POST /api/v1/rag/users/api-key
// Get or create API key for the user
router.post('/users/api-key', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { walletAddress, signature } = req.body;
    
    if (!walletAddress || !signature) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Wallet address and signature are required'
      });
    }
    
    // In a real implementation, this would verify the signature and create/store an API key
    // For now, we'll return a placeholder
    const apiKey = `tais_rag_${walletAddress.substring(2, 10)}_${Date.now()}`;
    
    res.json({ apiKey });
  } catch (error) {
    handleError(res, error, 'Failed to get or create API key');
  }
});

// POST /api/v1/rag/users/public-key
// Register user's public key with the platform
router.post('/users/public-key', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { walletAddress, publicKey } = req.body;
    
    if (!walletAddress || !publicKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Wallet address and public key are required'
      });
    }
    
    // In a real implementation, this would store the public key associated with the wallet
    // For now, we'll just acknowledge
    res.status(204).send();
  } catch (error) {
    handleError(res, error, 'Failed to register public key');
  }
});

// POST /api/v1/rag/documents
// Upload a document to Public RAG
router.post('/documents', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.prisma) {
      return res.status(500).json({
        error: 'Database connection not available'
      });
    }
    
    // Check database connection
    const isConnected = await checkDatabaseConnection(req.prisma as PrismaClient);
    if (!isConnected) {
      return handleError(res, new Error('Database connection failed'), 'Database connection unavailable');
    }
    
    const validation = validateInput(uploadDocumentSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: sanitizeValidationErrors(validation.errors)
      });
    }
    
    // Get wallet address from authenticated user
    let walletAddress = req.user?.walletAddress;
    
    // If not in user object, try to extract from token manually
    if (!walletAddress) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          // Decode JWT to get wallet address (without verification)
          const payload = JSON.parse(atob(token.split('.')[1]));
          walletAddress = payload.walletAddress;
        } catch (e) {
          // If we can't decode the token, fall back to body
        }
      }
    }
    
    // For document upload, we also accept wallet in body as fallback
    if (!walletAddress) {
      walletAddress = req.body.wallet;
    }
    
    if (!walletAddress) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Wallet address is required'
      });
    }
    
    const { encryptedData, encryptedMetadata, iv, salt, ownerPublicKey, tags, isPublic, chunks = [] } = validation.data;

    // The server never sees plaintext title -- it's inside encryptedMetadata,
    // which only the owner (or, for public docs, anyone holding the shared
    // community key) can decrypt. title stays null; the size recorded here
    // is the size of the stored ciphertext, since that's all the server has.
    const document = await req.prisma.rAGDocument.create({
      data: {
        walletAddress: walletAddress.toLowerCase(),
        ownerPublicKey,
        encryptedData,
        encryptedMetadata,
        iv,
        salt,
        title: null,
        isPublic,
        tags,
        size: Buffer.byteLength(encryptedData, 'utf8'),
        chunkCount: chunks.length
      }
    });

    if (chunks.length > 0) {
      await req.prisma.rAGChunk.createMany({
        data: chunks.map((chunk) => ({
          documentId: document.id,
          encryptedContent: chunk.encryptedContent,
          iv: chunk.iv,
          salt: chunk.salt,
          index: chunk.index,
          embeddingHash: chunk.embeddingHash,
          size: Buffer.byteLength(chunk.encryptedContent, 'utf8')
        }))
      });
    }

    res.status(201).json({
      id: document.id,
      walletAddress: document.walletAddress,
      title: document.title,
      isPublic: document.isPublic,
      tags: document.tags,
      size: document.size,
      chunkCount: document.chunkCount,
      createdAt: document.createdAt
    });
  } catch (error) {
    handleError(res, error, 'Failed to upload document');
  }
});

// POST /api/v1/rag/search
// Search Public RAG
router.post('/search', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.prisma) {
      return res.status(500).json({
        error: 'Database connection not available'
      });
    }
    
    const validation = validateInput(searchSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: sanitizeValidationErrors(validation.errors)
      });
    }
    
    const { walletAddress } = req.user || {};
    if (!walletAddress) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Wallet address is required'
      });
    }
    
    const { query, topK, filters } = validation.data;
    
    // Simple text search for now
    const documents = await req.prisma.rAGDocument.findMany({
      where: {
        isPublic: true,
        OR: [
          { title: { contains: query } },
          { tags: { hasSome: [query] } }
        ]
      },
      take: Number(topK) || 10,
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json(documents);
  } catch (error) {
    handleError(res, error, 'Failed to search documents');
  }
});

// GET /api/v1/rag/documents/{documentId}
// Get document by ID
router.get('/documents/:documentId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.prisma) {
      return res.status(500).json({
        error: 'Database connection not available'
      });
    }
    
    // Check database connection
    const isConnected = await checkDatabaseConnection(req.prisma as PrismaClient);
    if (!isConnected) {
      return handleError(res, new Error('Database connection failed'), 'Database connection unavailable');
    }
    
    const { documentId } = req.params;
    // Get wallet address from user (authenticated) or query params
    let walletAddress = req.user?.walletAddress;
    if (!walletAddress) {
      walletAddress = req.query.wallet as string | undefined;
    }
    
    if (!walletAddress) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Wallet address is required'
      });
    }
    
    const document = await req.prisma.rAGDocument.findUnique({
      where: { id: documentId }
    });
    
    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: 'The requested document does not exist'
      });
    }
    
    // Check if user has access to this document
    const isOwner = document.walletAddress?.toLowerCase() === walletAddress.toLowerCase();
    const isPublic = document.isPublic;
    
    if (!isOwner && !isPublic) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this document'
      });
    }
    
    // Return document data (simplified - no decryption for now)
    res.json({
      id: document.id,
      walletAddress: document.walletAddress,
      title: document.title,
      isPublic: document.isPublic,
      tags: document.tags,
      size: document.size,
      encryptedData: document.encryptedData,
      encryptedMetadata: document.encryptedMetadata,
      iv: document.iv,
      salt: document.salt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    });
  } catch (error) {
    handleError(res, error, 'Failed to get document');
  }
});

// GET /api/v1/rag/documents/{documentId}/chunks
// Get document chunks
router.get('/documents/:documentId/chunks', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.prisma) {
      return res.status(500).json({
        error: 'Database connection not available'
      });
    }
    
    const { documentId } = req.params;
    const { walletAddress } = req.user || {};
    
    if (!walletAddress) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Wallet address is required'
      });
    }
    
    // Verify document exists and user has access
    const document = await req.prisma.rAGDocument.findUnique({
      where: { id: documentId }
    });
    
    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: 'The requested document does not exist'
      });
    }
    
    const isOwner = document.walletAddress?.toLowerCase() === walletAddress.toLowerCase();
    const isPublic = document.isPublic;
    
    if (!isOwner && !isPublic) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this document'
      });
    }
    
    // Get chunks
    const chunks = await req.prisma.rAGChunk.findMany({
      where: { documentId: documentId },
      orderBy: { index: 'asc' }
    });
    
    res.json(chunks);
  } catch (error) {
    handleError(res, error, 'Failed to get document chunks');
  }
});

// POST /api/v1/rag/documents/{documentId}/share
// Share document with another user
router.post('/documents/:documentId/share', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.prisma) {
      return res.status(500).json({
        error: 'Database connection not available'
      });
    }
    
    const validation = validateInput(shareDocumentSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: sanitizeValidationErrors(validation.errors)
      });
    }
    
    const { documentId } = req.params;
    const { walletAddress } = req.user || {};
    const { recipientPublicKey } = validation.data;
    
    if (!walletAddress) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Wallet address is required'
      });
    }
    
    const document = await req.prisma.rAGDocument.findUnique({
      where: { id: documentId }
    });
    
    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: 'The requested document does not exist'
      });
    }
    
    // Check if user owns the document
    if (document.walletAddress?.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to share this document'
      });
    }
    
    // In a real implementation, we would add the recipient's public key to allowedViewers
    // For now, just acknowledge
    res.status(204).send();
  } catch (error) {
    handleError(res, error, 'Failed to share document');
  }
});

// GET /api/v1/rag/community
// Get community documents (public/shared)
router.get('/community', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.prisma) {
      return res.status(500).json({
        error: 'Database connection not available'
      });
    }
    
    // Community endpoint doesn't require authentication for public docs
    
    const { limit = 20, offset = 0 } = req.query;
    
    const take = Math.min(parseInt(limit as string) || 20, 100);
    const skip = parseInt(offset as string) || 0;
    
    // Get public documents
    const documents = await req.prisma.rAGDocument.findMany({
      where: {
        isPublic: true
      },
      take: take,
      skip: skip,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        walletAddress: true,
        title: true,
        tags: true,
        size: true,
        createdAt: true,
        downloadCount: true
      }
    });
    
    res.json(documents);
  } catch (error) {
    handleError(res, error, 'Failed to get community documents');
  }
});

// GET /api/v1/rag/documents
// Get my documents
router.get('/documents', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.prisma) {
      return res.status(500).json({
        error: 'Database connection not available'
      });
    }
    
    const { walletAddress } = req.user || {};
    
    if (!walletAddress) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Wallet address is required'
      });
    }
    
    const documents = await req.prisma.rAGDocument.findMany({
      where: {
        walletAddress: walletAddress.toLowerCase()
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        walletAddress: true,
        title: true,
        tags: true,
        isPublic: true,
        size: true,
        createdAt: true,
        updatedAt: true,
        downloadCount: true
      }
    });
    
    res.json(documents);
  } catch (error) {
    handleError(res, error, 'Failed to get user documents');
  }
});

// DELETE /api/v1/rag/documents/{documentId}
// Delete document
router.delete('/documents/:documentId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.prisma) {
      return res.status(500).json({
        error: 'Database connection not available'
      });
    }
    
    const { documentId } = req.params;
    const { walletAddress } = req.user || {};
    
    if (!walletAddress) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Wallet address is required'
      });
    }
    
    const document = await req.prisma.rAGDocument.findUnique({
      where: { id: documentId }
    });
    
    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: 'The requested document does not exist'
      });
    }
    
    // Check if user owns the document
    if (document.walletAddress?.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to delete this document'
      });
    }
    
    // Delete chunks first (due to foreign key constraint)
    await req.prisma.rAGChunk.deleteMany({
      where: { documentId: documentId }
    });
    
    // Delete document
    await req.prisma.rAGDocument.delete({
      where: { id: documentId }
    });
    
    res.status(204).send();
  } catch (error) {
    handleError(res, error, 'Failed to delete document');
  }
});

// GET /api/v1/rag/stats
// Get Public RAG stats
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.prisma) {
      return res.status(500).json({
        error: 'Database connection not available'
      });
    }
    
    const { walletAddress } = req.user || {};
    if (!walletAddress) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Wallet address is required'
      });
    }
    
    const [totalDocuments, publicDocuments, totalSize] = await Promise.all([
      req.prisma.rAGDocument.count({
        where: {
          walletAddress: walletAddress.toLowerCase()
        }
      }),
      req.prisma.rAGDocument.count({
        where: {
          walletAddress: walletAddress.toLowerCase(),
          isPublic: true
        }
      }),
      req.prisma.rAGDocument.aggregate({
        where: {
          walletAddress: walletAddress.toLowerCase()
        },
        _sum: {
          size: true
        }
      })
    ]);
    
    res.json({
      totalDocuments,
      publicDocuments,
      totalSize: totalSize._sum.size || 0,
      storageUsed: `${((totalSize._sum.size || 0) / (1024 * 1024)).toFixed(2)} MB`
    });
  } catch (error) {
    handleError(res, error, 'Failed to get stats');
  }
});

// ============================================
// Community/public-tier encryption
// ============================================
//
// This used to be a client-side scheme keyed by a string constant
// ('TAIS-RAG-COMMUNITY-SHARED-KEY-v1') compiled directly into the
// public frontend bundle, used as both the PBKDF2 password and salt.
// Since the JS bundle is downloadable by anyone -- no login required --
// that "encryption" provided zero real confidentiality: any anonymous
// visitor could extract the constant and decrypt every community
// document themselves.
//
// The actual cryptography now lives here, server-side, behind
// authMiddleware (this whole router is mounted with
// `apiV1Router.use('/rag', authMiddleware, ...)` in index.ts) -- so
// decrypting a community document now genuinely requires a valid,
// authenticated TAIS platform account (there is no separate concept of
// distinct "communities"/groups anywhere in this schema; "the
// community" is the platform's authenticated user base), not just
// possession of the public JS bundle.
//
// The actual PBKDF2/AES-GCM logic now lives in services/communityCrypto.ts
// -- extracted so routes/agent.ts's App RAG read path (GET /agent/rag)
// can decrypt a wallet's community documents on an authorized app's
// behalf using this exact same, already-tested code, instead of
// duplicating it.
router.post('/community/encrypt', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.walletAddress) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data } = req.body;
    if (typeof data !== 'string' || data.length === 0) {
      return res.status(400).json({ error: 'data is required' });
    }
    if (Buffer.byteLength(data, 'utf8') > 1_000_000) {
      return res.status(400).json({ error: 'data too large (max 1MB)' });
    }

    res.json(encryptCommunityData(data));
  } catch (error) {
    handleError(res, error, 'Failed to encrypt community data');
  }
});

router.post('/community/decrypt', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.walletAddress) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { encrypted, iv, salt } = req.body;
    if (!encrypted || !iv || !salt) {
      return res.status(400).json({ error: 'encrypted, iv, and salt are required' });
    }

    if (!isCommunityEncrypted(salt)) {
      return res.status(400).json({ error: 'Invalid salt for community document' });
    }

    res.json({ data: decryptCommunityData(encrypted, iv, salt) });
  } catch (error) {
    handleError(res, error, 'Failed to decrypt community data');
  }
});

export { router as ragRoutes };