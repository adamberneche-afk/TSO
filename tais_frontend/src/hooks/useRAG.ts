import { useState, useCallback, useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RAGContext, RAGSource, Document, RAGStats } from '../types/rag';
import { RAGRouter, createDefaultRAGRouter } from '../services/rag/ragRouter';
import { getPrivateRAG } from '../services/rag/privateRAG';

interface RAGState {
  router: RAGRouter | null;
  sources: RAGSource[];
  lastContext: RAGContext | null;
  isInitialized: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  queryRAG: (query: string) => Promise<RAGContext | null>;
  setSourceEnabled: (sourceId: string, enabled: boolean) => void;
  setSourceWeight: (sourceId: string, weight: number) => void;
  refreshSources: () => Promise<void>;
}

export const useRAGStore = create<RAGState>()(
  persist(
    (set, get) => ({
      router: null,
      sources: [],
      lastContext: null,
      isInitialized: false,

      initialize: async () => {
        if (get().isInitialized) return;

        try {
          // Initialize Private RAG
          const privateRAG = getPrivateRAG();
          await privateRAG.initialize();

          // Create router
          const router = createDefaultRAGRouter();

          // Get initial stats
          const privateStats = await privateRAG.getStats();

           // Fetch public RAG stats from API
           let publicDocumentCount = 0;
           try {
             const publicRAGResponse = await fetch(`${import.meta.env.VITE_REGISTRY_URL || 'https://tso.onrender.com'}/api/v1/rag/stats`);
             if (publicRAGResponse.ok) {
               const publicStats = await publicRAGResponse.json();
               publicDocumentCount = publicStats.documentCount || 0;
             }
           } catch (error) {
             console.warn('Failed to fetch public RAG stats:', error);
           }
           
           // Update sources with stats
           const sources: RAGSource[] = [
             {
               id: 'private',
               tier: 'private',
               name: 'Private Knowledge Base',
               description: 'Your personal documents and notes stored locally',
               enabled: true,
               documentCount: privateStats.documentCount,
               lastUpdated: Date.now(),
               config: { tier: 'private' }
             },
             {
               id: 'public',
               tier: 'public',
               name: 'Community Knowledge',
               description: 'Public knowledge base shared by the TAIS community',
               enabled: true,
               documentCount: publicDocumentCount,
               lastUpdated: Date.now(),
               config: { tier: 'public', encryptDocuments: true, sharePublicly: false } as any
             }
           ];

          set({
            router,
            sources,
            isInitialized: true
          });
        } catch (error) {
          console.error('Failed to initialize RAG:', error);
        }
      },

      queryRAG: async (query: string) => {
        const { router } = get();
        if (!router) return null;

        const context = await router.query({
          query,
          topK: 5
        });

        set({ lastContext: context });
        return context;
      },

      setSourceEnabled: (sourceId: string, enabled: boolean) => {
        const { router, sources } = get();
        if (router) {
          router.setSourceEnabled(sourceId, enabled);
        }
        
        set({
          sources: sources.map(s => 
            s.id === sourceId ? { ...s, enabled } : s
          )
        });
      },

      setSourceWeight: (sourceId: string, weight: number) => {
        const { router, sources } = get();
        if (router) {
          router.setSourceWeight(sourceId, weight);
        }

        // Store weight in source config
        set({
          sources: sources.map(s =>
            s.id === sourceId 
              ? { ...s, config: { ...s.config, weight } }
              : s
          )
        });
      },

      refreshSources: async () => {
        try {
          const privateRAG = getPrivateRAG();
          const stats = await privateRAG.getStats();

          set((state) => ({
            sources: state.sources.map(s =>
              s.id === 'private'
                ? { ...s, documentCount: stats.documentCount, lastUpdated: Date.now() }
                : s
            )
          }));
        } catch (error) {
          console.error('Failed to refresh sources:', error);
        }
      }
    }),
    {
      name: 'rag-store',
      partialize: (state) => ({
        sources: state.sources.filter(s => s.id !== 'private') // Don't persist private doc count
      })
    }
  )
);

/**
 * Hook for RAG operations
 */
export function useRAG() {
  const store = useRAGStore();
  const [isQuerying, setIsQuerying] = useState(false);

  useEffect(() => {
    if (!store.isInitialized) {
      store.initialize();
    }
  }, [store]);

  const queryWithContext = useCallback(async (userQuery: string) => {
    setIsQuerying(true);
    try {
      const context = await store.queryRAG(userQuery);
      return context;
    } finally {
      setIsQuerying(false);
    }
  }, [store]);

  const getContextString = useCallback((maxLength?: number) => {
    if (!store.lastContext) return '';
    return store.router?.buildContextString(store.lastContext, maxLength) || '';
  }, [store.lastContext, store.router]);

  const getCitations = useCallback(() => {
    if (!store.lastContext) return [];
    return store.router?.getCitations(store.lastContext) || [];
  }, [store.lastContext, store.router]);

  return {
    sources: store.sources,
    isInitialized: store.isInitialized,
    isQuerying,
    lastContext: store.lastContext,
    queryWithContext,
    getContextString,
    getCitations,
    setSourceEnabled: store.setSourceEnabled,
    setSourceWeight: store.setSourceWeight,
    refreshSources: store.refreshSources
  };
}

/**
 * Hook for Private RAG document management
 */
export function usePrivateRAG() {
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<{ documentCount: number; chunkCount: number; storageUsed: number } | null>(null);
  const privateRAG = getPrivateRAG();

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await privateRAG.listDocuments();
      const stats = await privateRAG.getStats();
      setDocuments(docs);
      setStats(stats);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  }, []);

  const uploadDocument = useCallback(async (
    file: File,
    onProgress?: (progress: { status: string; progress: number }) => void
  ) => {
    setIsUploading(true);
    try {
      // Read file content
      const content = await file.text();
      
      // Determine type from extension
      const extension = file.name.split('.').pop()?.toLowerCase();
      const type = extension === 'pdf' ? 'pdf' : 
                   extension === 'md' ? 'md' : 
                   extension === 'json' ? 'json' :
                   'txt';

      const doc = await privateRAG.addDocument(
        content,
        {
          title: file.name,
          type,
          size: file.size,
          source: 'upload',
          tags: [type]
        },
        (progress) => {
          onProgress?.({
            status: progress.status,
            progress: progress.progress
          });
        }
      );

      await loadDocuments();
      return doc;
    } finally {
      setIsUploading(false);
    }
  }, [loadDocuments]);

  const deleteDocument = useCallback(async (id: string) => {
    await privateRAG.removeDocument(id);
    await loadDocuments();
  }, [loadDocuments]);

  const clearAll = useCallback(async () => {
    if (confirm('Are you sure you want to delete all documents?')) {
      await privateRAG.clear();
      await loadDocuments();
    }
  }, [loadDocuments]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  return {
    documents,
    stats,
    isUploading,
    uploadDocument,
    deleteDocument,
    clearAll,
    refresh: loadDocuments
  };
}
