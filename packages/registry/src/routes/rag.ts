/**
 * RAG API Routes
 * End-to-end encrypted document storage and retrieval
 * Tier-based access control per staking document
 * Supports session-based authentication for streamlined uploads
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifySignature } from '../utils/signature';
import RAGAccessControl from '../services/ragAccessControl';
import { createRAGStorageService } from '../services/ragStorage';
import { getSession, updateSessionActivity, sessionAuthMiddleware } from '../services/ragSession';

export function createRAGRoutes(
  prisma: PrismaClient,
  logger: any
): Router {
  const router = Router();
  const accessControl = new RAGAccessControl(prisma, logger);
  const storage = createRAGStorageService(logger, prisma);

  // Apply session middleware to all routes
  router.use(sessionAuthMiddleware);

  // ============ Document Management ============

  /**
   * POST /api/v1/rag/documents
   * Upload encrypted document
   * Supports session-based auth (X-Session-Token header) or wallet param
   */
  router.post('/documents', async (req: Request, res: Response) => {
    try {
      const session = (req as any).session;
      let wallet = session?.walletAddress || req.body.wallet;
      
      const { encryptedData, encryptedMetadata, iv, salt, ownerPublicKey, isPublic, tags, chunks } = req.body;

      // Verify wallet or session exists
      if (!wallet || !encryptedData) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          hint: session ? 'Session found, ensure encryptedData is provided' : 'Provide wallet or start a session with POST /api/v1/rag/session/start'
        });
      }

      wallet = wallet.toLowerCase();

      // Check storage quota
      const dataSize = Buffer.byteLength(encryptedData, 'base64');
      const quotaCheck = await accessControl.canStore(wallet, dataSize);
      
      if (!quotaCheck.allowed) {
        return res.status(403).json({
          error: 'Storage quota exceeded',
          reason: quotaCheck.reason,
          currentUsage: quotaCheck.currentUsage,
          quota: quotaCheck.quota,
          upgradeUrl: '/upgrade'
        });
      }

      // Check embedding quota
      const embeddingCheck = await accessControl.canEmbed(wallet, chunks?.length || 1);
      if (!embeddingCheck.allowed) {
        return res.status(403).json({
          error: 'Embedding quota exceeded',
          reason: embeddingCheck.reason,
        });
      }

      // Store document - store content directly in DB instead of S3 key
      const documentId = crypto.randomUUID();
      
      // Create document record with actual encrypted content
      const doc = await prisma.rAGDocument.create({
        data: {
          id: documentId,
          walletAddress: wallet.toLowerCase(),
          ownerPublicKey,
          encryptedData: encryptedData, // Store actual encrypted content in DB
          encryptedMetadata,
          iv,
          salt,
          title: tags?.[0] || 'Untitled',
          isPublic: isPublic || false,
          tags: tags || [],
          size: dataSize,
          chunkCount: chunks?.length || 0,
          storageUrl: null, // Not using S3
          allowedViewers: isPublic ? [] : [ownerPublicKey],
        },
      });

      // Create chunks
      if (chunks && chunks.length > 0) {
        await prisma.rAGChunk.createMany({
          data: chunks.map((chunk: any, index: number) => ({
            id: crypto.randomUUID(),
            documentId: doc.id,
            encryptedContent: chunk.encryptedContent,
            iv: chunk.iv,
            index,
            embeddingHash: chunk.embeddingHash,
            size: Buffer.byteLength(chunk.encryptedContent, 'base64'),
          })),
        });
      }

      // Record usage
      await accessControl.recordStorage(wallet, dataSize);
      await accessControl.recordEmbeddings(wallet, chunks?.length || 1);

      // Log audit
      await prisma.rAGAuditLog.create({
        data: {
          walletAddress: wallet.toLowerCase(),
          action: 'upload',
          documentId: doc.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || '',
          duration: Date.now() - (req as any).startTime,
        },
      });

      logger.info(`Document uploaded: ${doc.id}`, { wallet, size: dataSize, session: !!session });

      // Update session activity if using session auth
      if (session) {
        updateSessionActivity(session.sessionId, dataSize);
      }

      res.status(201).json({
        documentId: doc.id,
        size: dataSize,
        chunkCount: chunks?.length || 0,
        message: 'Document uploaded successfully',
        sessionRemaining: session ? Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)) : null,
      });
    } catch (error) {
      logger.error('Error uploading document:', error);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  });

  /**
   * GET /api/v1/rag/documents
   * List user's documents
   */
  router.get('/documents', async (req: Request, res: Response) => {
    try {
      const { wallet } = req.query;

      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'Wallet address required' });
      }

      const documents = await prisma.rAGDocument.findMany({
        where: {
          walletAddress: wallet.toLowerCase(),
        },
        select: {
          id: true,
          title: true,
          isPublic: true,
          tags: true,
          size: true,
          chunkCount: true,
          downloadCount: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json({ documents });
    } catch (error) {
      logger.error('Error listing documents:', error);
      res.status(500).json({ error: 'Failed to list documents' });
    }
  });

  /**
   * GET /api/v1/rag/documents/:id
   * Get document metadata and content
   */
  router.get('/documents/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { wallet } = req.query;

      const doc = await prisma.rAGDocument.findUnique({
        where: { id },
        include: {
          chunks: {
            select: {
              id: true,
              index: true,
              embeddingHash: true,
            },
          },
        },
      });

      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Check access
      const isOwner = doc.walletAddress === (wallet as string)?.toLowerCase();
      const isPublic = doc.isPublic;
      const isAllowedViewer = doc.allowedViewers.includes(wallet as string);

      if (!isOwner && !isPublic && !isAllowedViewer) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Content is stored directly in DB, just return it
      const chunkList = await prisma.rAGChunk.findMany({
        where: { documentId: id },
        orderBy: { index: 'asc' },
        select: {
          id: true,
          index: true,
          encryptedContent: true,
          iv: true,
        },
      });

      res.json({
        id: doc.id,
        walletAddress: doc.walletAddress,
        encryptedData: doc.encryptedData,
        encryptedMetadata: doc.encryptedMetadata,
        iv: doc.iv,
        salt: doc.salt,
        ownerPublicKey: doc.ownerPublicKey,
        isPublic: doc.isPublic,
        tags: doc.tags,
        size: doc.size,
        chunkCount: doc.chunkCount,
        chunks: chunkList,
        createdAt: doc.createdAt,
      });
    } catch (error) {
      logger.error('Error getting document:', error);
      res.status(500).json({ error: 'Failed to get document' });
    }
  });

  /**
   * GET /api/v1/rag/documents/:id/chunks
   * Get document chunks with encrypted content
   */
  router.get('/documents/:id/chunks', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { wallet } = req.query;

      const doc = await prisma.rAGDocument.findUnique({
        where: { id },
      });

      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Check access
      const isOwner = doc.walletAddress === (wallet as string)?.toLowerCase();
      const isPublic = doc.isPublic;
      const isAllowedViewer = doc.allowedViewers.includes(wallet as string);

      if (!isOwner && !isPublic && !isAllowedViewer) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get chunks with encrypted content
      const chunks = await prisma.rAGChunk.findMany({
        where: { documentId: id },
        orderBy: { index: 'asc' },
        select: {
          id: true,
          index: true,
          encryptedContent: true,
          iv: true,
        },
      });

      res.json(chunks);
    } catch (error) {
      logger.error('Error getting document chunks:', error);
      res.status(500).json({ error: 'Failed to get document chunks' });
    }
  });

  /**
   * DELETE /api/v1/rag/documents/:id
   * Delete document
   */
  router.delete('/documents/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { wallet } = req.body;

      const doc = await prisma.rAGDocument.findUnique({
        where: { id },
      });

      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Check ownership
      if (doc.walletAddress !== wallet.toLowerCase()) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Delete from storage
      const storageKey = doc.storageUrl || doc.encryptedData;
      if (storageKey) {
        await storage.deleteDocument(storageKey, id);
      }

      // Delete from database (cascade will delete chunks)
      await prisma.rAGDocument.delete({
        where: { id },
      });

      // Log audit
      await prisma.rAGAuditLog.create({
        data: {
          walletAddress: wallet.toLowerCase(),
          action: 'delete',
          documentId: id,
          duration: 0,
          ipAddress: req.ip,
        },
      });

      res.json({ message: 'Document deleted' });
    } catch (error) {
      logger.error('Error deleting document:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  });

  // ============ Search ============

  /**
   * POST /api/v1/rag/search
   * Search documents by embedding hash
   */
  router.post('/search', async (req: Request, res: Response) => {
    try {
      const { wallet, queryHash, topK = 10 } = req.body;

      // Check query quota
      const quotaCheck = await accessControl.canQuery(wallet);
      if (!quotaCheck.allowed) {
        return res.status(429).json({
          error: 'Query limit exceeded',
          reason: quotaCheck.reason,
          currentUsage: quotaCheck.currentUsage,
          quota: quotaCheck.quota,
        });
      }

      // Find matching chunks by embedding hash (privacy-preserving)
      // In production, use LSH or vector similarity
      const chunks = await prisma.rAGChunk.findMany({
        where: {
          embeddingHash: {
            startsWith: queryHash.substring(0, 8), // Simplified matching
          },
        },
        include: {
          document: {
            select: {
              id: true,
              encryptedMetadata: true,
              iv: true,
              salt: true,
              ownerPublicKey: true,
              isPublic: true,
              allowedViewers: true,
            },
          },
        },
        take: topK * 2, // Get more for filtering
      });

      // Filter by access permissions
      const accessibleChunks = chunks.filter((chunk: any) => {
        const doc = chunk.document;
        const isOwner = doc.walletAddress === wallet.toLowerCase();
        const isPublic = doc.isPublic;
        const isAllowed = doc.allowedViewers.includes(wallet);
        return isOwner || isPublic || isAllowed;
      });

      // Record query
      await accessControl.recordQuery(wallet);

      // Log audit
      await prisma.rAGAuditLog.create({
        data: {
          walletAddress: wallet.toLowerCase(),
          action: 'search',
          queryHash: queryHash.substring(0, 16), // Partial hash for privacy
          resultCount: accessibleChunks.length,
          duration: 0,
          ipAddress: req.ip,
        },
      });

      // Return encrypted results (client must decrypt)
      const results = accessibleChunks.slice(0, topK).map((chunk: any) => ({
        documentId: chunk.document.id,
        chunkId: chunk.id,
        encryptedContent: chunk.encryptedContent,
        iv: chunk.iv,
        salt: chunk.document.salt,
        embeddingHash: chunk.embeddingHash,
        score: 0.95, // Placeholder - implement proper similarity
        ownerPublicKey: chunk.document.ownerPublicKey,
        metadata: chunk.document.encryptedMetadata,
      }));

      res.json({ results });
    } catch (error) {
      logger.error('Error searching documents:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  // ============ Sharing ============

  /**
   * POST /api/v1/rag/documents/:id/share
   * Share document with another user
   */
  router.post('/documents/:id/share', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { wallet, recipientPublicKey } = req.body;

      const doc = await prisma.rAGDocument.findUnique({
        where: { id },
      });

      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Check ownership
      if (doc.walletAddress !== wallet.toLowerCase()) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Add recipient to allowed viewers
      await prisma.rAGDocument.update({
        where: { id },
        data: {
          allowedViewers: {
            push: recipientPublicKey,
          },
        },
      });

      res.json({ message: 'Document shared successfully' });
    } catch (error) {
      logger.error('Error sharing document:', error);
      res.status(500).json({ error: 'Failed to share document' });
    }
  });

  // ============ Public Keys ============

  /**
   * POST /api/v1/rag/users/public-key
   * Register user's public key
   */
  router.post('/users/public-key', async (req: Request, res: Response) => {
    try {
      const { wallet, publicKey } = req.body;

      await prisma.rAGPublicKey.upsert({
        where: { walletAddress: wallet.toLowerCase() },
        update: { publicKey },
        create: {
          walletAddress: wallet.toLowerCase(),
          publicKey,
        },
      });

      res.json({ message: 'Public key registered' });
    } catch (error) {
      logger.error('Error registering public key:', error);
      res.status(500).json({ error: 'Failed to register public key' });
    }
  });

  /**
   * GET /api/v1/rag/users/public-key
   * Get user's public key
   */
  router.get('/users/public-key', async (req: Request, res: Response) => {
    try {
      const { wallet } = req.query;

      const record = await prisma.rAGPublicKey.findUnique({
        where: { walletAddress: (wallet as string).toLowerCase() },
      });

      if (!record) {
        return res.status(404).json({ error: 'Public key not found' });
      }

      res.json({ publicKey: record.publicKey });
    } catch (error) {
      logger.error('Error getting public key:', error);
      res.status(500).json({ error: 'Failed to get public key' });
    }
  });

  // ============ Community ============

  /**
   * GET /api/v1/rag/community
   * Get public documents
   */
  router.get('/community', async (req: Request, res: Response) => {
    try {
      const { limit = 20, offset = 0 } = req.query;

      const documents = await prisma.rAGDocument.findMany({
        where: {
          isPublic: true,
        },
        select: {
          id: true,
          title: true,
          tags: true,
          downloadCount: true,
          createdAt: true,
          walletAddress: true,
        },
        orderBy: {
          popularityScore: 'desc',
        },
        take: Number(limit),
        skip: Number(offset),
      });

      // Anonymize wallet addresses
      const anonymized = documents.map((doc: any) => ({
        ...doc,
        author: `${doc.walletAddress.slice(0, 6)}...${doc.walletAddress.slice(-4)}`,
        walletAddress: undefined,
        canAccess: true,
      }));

      res.json({ documents: anonymized });
    } catch (error) {
      logger.error('Error getting community documents:', error);
      res.status(500).json({ error: 'Failed to get community documents' });
    }
  });

  // ============ Quotas ============

  /**
   * GET /api/v1/rag/quota
   * Get user's quota status
   */
  router.get('/quota', async (req: Request, res: Response) => {
    try {
      const { wallet } = req.query;

      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'Wallet address required' });
      }

      const status = await accessControl.getQuotaStatus(wallet);

      res.json(status);
    } catch (error) {
      logger.error('Error getting quota status:', error);
      res.status(500).json({ error: 'Failed to get quota status' });
    }
  });

  /**
   * GET /api/v1/rag/stats
   * Get RAG statistics
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const { wallet } = req.query;

      const [totalDocuments, myDocuments, publicDocuments] = await Promise.all([
        prisma.rAGDocument.count(),
        prisma.rAGDocument.count({
          where: { walletAddress: (wallet as string)?.toLowerCase() },
        }),
        prisma.rAGDocument.count({
          where: { isPublic: true },
        }),
      ]);

      const usage = wallet ? await prisma.rAGUserUsage.findUnique({
        where: { walletAddress: (wallet as string).toLowerCase() },
      }) : null;

      res.json({
        totalDocuments,
        myDocuments,
        publicDocuments,
        storageUsed: usage?.storageUsed || 0,
      });
    } catch (error) {
      logger.error('Error getting stats:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });

  return router;
}

export default createRAGRoutes;
