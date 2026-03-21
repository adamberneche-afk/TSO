import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { validateInput, sanitizeValidationErrors } from '../validation/schemas';
import { z } from 'zod';

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
const uploadDocumentSchema = z.object({
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(false),
  metadata: z.object({
    type: z.string().default('text/plain')
  }).default({})
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
    
    const { title, content, tags, isPublic, metadata } = validation.data;
    
    // Create document record (simplified - no encryption for now)
    const document = await req.prisma.rAGDocument.create({
      data: {
        walletAddress: walletAddress.toLowerCase(),
        ownerPublicKey: '',
        encryptedData: Buffer.from(content).toString('base64'), // Simple base64 encoding for now
        encryptedMetadata: Buffer.from(JSON.stringify({ title, ...metadata })).toString('base64'),
        iv: '',
        salt: '',
        title: title,
        isPublic: isPublic,
        tags: tags,
        size: Buffer.byteLength(content, 'utf8'),
        chunkCount: 1 // Simplified
      }
    });
    
    res.status(201).json({
      id: document.id,
      walletAddress: document.walletAddress,
      title: document.title,
      isPublic: document.isPublic,
      tags: document.tags,
      size: document.size,
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

export { router as ragRoutes };