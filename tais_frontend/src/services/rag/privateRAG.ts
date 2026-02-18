import type { Document, Chunk, RAGQuery, RAGResult, IngestionProgress, DocumentMetadata } from '../../types/rag';
import { chunkText, generateEmbeddings, findSimilarChunks, rerankWithMMR } from './embeddings';

const DB_NAME = 'TAIS_PrivateRAG';
const DB_VERSION = 1;
const DOCUMENTS_STORE = 'documents';
const CHUNKS_STORE = 'chunks';

export class PrivateRAGService {
  private db: IDBDatabase | null = null;
  private maxStorageBytes: number = 50 * 1024 * 1024; // 50MB default
  private maxDocuments: number = 1000;

  constructor(options?: { maxStorageBytes?: number; maxDocuments?: number }) {
    if (options?.maxStorageBytes) this.maxStorageBytes = options.maxStorageBytes;
    if (options?.maxDocuments) this.maxDocuments = options.maxDocuments;
  }

  /**
   * Initialize the IndexedDB database
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Documents store
        if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
          const docStore = db.createObjectStore(DOCUMENTS_STORE, { keyPath: 'id' });
          docStore.createIndex('createdAt', 'createdAt', { unique: false });
          docStore.createIndex('type', 'metadata.type', { unique: false });
          docStore.createIndex('tags', 'metadata.tags', { unique: false, multiEntry: true });
        }

        // Chunks store
        if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
          const chunkStore = db.createObjectStore(CHUNKS_STORE, { keyPath: 'id' });
          chunkStore.createIndex('documentId', 'documentId', { unique: false });
        }
      };
    });
  }

  /**
   * Add a document to the RAG
   */
  async addDocument(
    content: string,
    metadata: Partial<DocumentMetadata>,
    onProgress?: (progress: IngestionProgress) => void
  ): Promise<Document> {
    if (!this.db) await this.initialize();

    const docId = crypto.randomUUID();
    const now = Date.now();

    // Check storage limits
    const stats = await this.getStats();
    if (stats.documentCount >= this.maxDocuments) {
      throw new Error(`Maximum document limit (${this.maxDocuments}) reached`);
    }

    // Create document
    const document: Document = {
      id: docId,
      content,
      metadata: {
        title: metadata.title || 'Untitled',
        type: metadata.type || 'txt',
        source: metadata.source,
        author: metadata.author,
        tags: metadata.tags || [],
        size: content.length,
        ...metadata
      },
      createdAt: now,
      updatedAt: now,
      chunkCount: 0
    };

    // Report initial progress
    onProgress?.({
      documentId: docId,
      status: 'processing',
      progress: 0,
      chunksProcessed: 0,
      totalChunks: 0
    });

    // Chunk the document
    onProgress?.({
      documentId: docId,
      status: 'chunking',
      progress: 10,
      chunksProcessed: 0,
      totalChunks: 0
    });

    const chunks = chunkText(content, 500, 50);
    const totalChunks = chunks.length;

    // Generate embeddings
    onProgress?.({
      documentId: docId,
      status: 'embedding',
      progress: 20,
      chunksProcessed: 0,
      totalChunks
    });

    const embeddings = await generateEmbeddings(chunks);

    // Create chunk objects
    const chunkObjects: Chunk[] = chunks.map((content, index) => ({
      id: `${docId}_chunk_${index}`,
      documentId: docId,
      content,
      embedding: embeddings[index],
      metadata: {
        startIndex: index * 450, // Approximate
        endIndex: index * 450 + content.length,
        section: `chunk_${index}`
      },
      index
    }));

    document.chunkCount = totalChunks;

    // Store in IndexedDB
    await this.storeDocument(document);
    await this.storeChunks(chunkObjects);

    onProgress?.({
      documentId: docId,
      status: 'complete',
      progress: 100,
      chunksProcessed: totalChunks,
      totalChunks
    });

    return document;
  }

  /**
   * Store document in IndexedDB
   */
  private async storeDocument(document: Document): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DOCUMENTS_STORE], 'readwrite');
      const store = transaction.objectStore(DOCUMENTS_STORE);
      const request = store.put(document);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store chunks in IndexedDB
   */
  private async storeChunks(chunks: Chunk[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CHUNKS_STORE], 'readwrite');
      const store = transaction.objectStore(CHUNKS_STORE);

      let completed = 0;
      const total = chunks.length;

      for (const chunk of chunks) {
        const request = store.put(chunk);
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };
        request.onerror = () => reject(request.error);
      }

      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Search for relevant chunks
   */
  async search(query: string, topK: number = 5): Promise<RAGResult[]> {
    if (!this.db) await this.initialize();

    const startTime = performance.now();

    // Generate query embedding
    const queryEmbeddings = await generateEmbeddings([query]);
    const queryEmbedding = queryEmbeddings[0];

    // Get all chunks (in production, you'd want to filter first)
    const allChunks = await this.getAllChunks();

    // Find similar chunks
    const similarChunks = findSimilarChunks(
      queryEmbedding,
      allChunks,
      topK * 2, // Get more for re-ranking
      0.3 // Lower threshold for private RAG
    );

    // Re-rank with MMR for diversity
    const rankedChunks = rerankWithMMR(similarChunks, 0.7, topK);

    // Build results
    const results: RAGResult[] = await Promise.all(
      rankedChunks.map(async (chunk) => {
        const document = await this.getDocument(chunk.metadata.documentId);
        return {
          chunk: {
            id: chunk.id,
            documentId: chunk.metadata.documentId,
            content: chunk.content,
            embedding: [], // Don't include embedding in result
            metadata: chunk.metadata,
            index: 0
          },
          score: chunk.score,
          source: 'private',
          document: document!,
          context: this.buildContext(chunk.content, document?.content || '')
        };
      })
    );

    const latency = performance.now() - startTime;

    return results.filter(r => r.document !== null);
  }

  /**
   * Get all chunks from IndexedDB
   */
  private async getAllChunks(): Promise<Array<{ id: string; embedding: number[]; content: string; metadata: any }>> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CHUNKS_STORE], 'readonly');
      const store = transaction.objectStore(CHUNKS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const chunks = request.result.map((chunk: Chunk) => ({
          id: chunk.id,
          embedding: chunk.embedding,
          content: chunk.content,
          metadata: { ...chunk.metadata, documentId: chunk.documentId }
        }));
        resolve(chunks);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get document by ID
   */
  private async getDocument(id: string): Promise<Document | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DOCUMENTS_STORE], 'readonly');
      const store = transaction.objectStore(DOCUMENTS_STORE);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove a document and its chunks
   */
  async removeDocument(id: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DOCUMENTS_STORE, CHUNKS_STORE], 'readwrite');
      const docStore = transaction.objectStore(DOCUMENTS_STORE);
      const chunkStore = transaction.objectStore(CHUNKS_STORE);

      // Delete document
      docStore.delete(id);

      // Delete associated chunks
      const index = chunkStore.index('documentId');
      const request = index.getAll(id);

      request.onsuccess = () => {
        const chunks = request.result;
        for (const chunk of chunks) {
          chunkStore.delete(chunk.id);
        }
        resolve();
      };

      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * List all documents
   */
  async listDocuments(): Promise<Document[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DOCUMENTS_STORE], 'readonly');
      const store = transaction.objectStore(DOCUMENTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get storage stats
   */
  async getStats(): Promise<{ documentCount: number; chunkCount: number; storageUsed: number }> {
    const documents = await this.listDocuments();
    const chunks = await this.getAllChunks();

    const storageUsed = new Blob([JSON.stringify(documents), JSON.stringify(chunks)]).size;

    return {
      documentCount: documents.length,
      chunkCount: chunks.length,
      storageUsed
    };
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DOCUMENTS_STORE, CHUNKS_STORE], 'readwrite');
      transaction.objectStore(DOCUMENTS_STORE).clear();
      transaction.objectStore(CHUNKS_STORE).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Build context around a chunk
   */
  private buildContext(chunk: string, fullDocument: string): string {
    // For now, return the chunk with document info
    return chunk;
  }
}

// Singleton instance
let privateRAGInstance: PrivateRAGService | null = null;

export function getPrivateRAG(): PrivateRAGService {
  if (!privateRAGInstance) {
    privateRAGInstance = new PrivateRAGService();
  }
  return privateRAGInstance;
}
