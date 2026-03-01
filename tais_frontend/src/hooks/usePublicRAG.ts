import { useState, useCallback, useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getPublicRAGClient } from '../services/rag/publicRAGClient';
import { getE2EEEncryptionService } from '../services/rag/e2eeEncryption';
import type { PublicDocument, CommunityDocument, PublicRAGStats } from '../types/rag-public';
import { toast } from 'sonner';

interface PublicRAGState {
  isInitialized: boolean;
  isAuthenticating: boolean;
  documents: PublicDocument[];
  communityDocuments: CommunityDocument[];
  stats: PublicRAGStats | null;
  selectedDocument: PublicDocument | null;
  publicKey: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  uploadDocument: (title: string, content: string, isPublic: boolean, tags: string[]) => Promise<void>;
  search: (query: string) => Promise<any[]>;
  loadCommunity: () => Promise<void>;
  loadMyDocuments: () => Promise<void>;
  shareDocument: (documentId: string, recipientPublicKey: string) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  selectDocument: (doc: PublicDocument | null) => void;
}

export const usePublicRAGStore = create<PublicRAGState>()(
  persist(
    (set, get) => ({
      isInitialized: false,
      isAuthenticating: false,
      documents: [],
      communityDocuments: [],
      stats: null,
      selectedDocument: null,
      publicKey: null,

      initialize: async () => {
        if (get().isInitialized) return;
        
        set({ isAuthenticating: true });
        try {
          const client = getPublicRAGClient();
          await client.initializeWithWallet();
          
          const encryptionService = getE2EEEncryptionService();
          const publicKey = encryptionService.getPublicKey();
          
          set({ 
            isInitialized: true, 
            isAuthenticating: false,
            publicKey 
          });
          
          // Load initial data
          await get().loadMyDocuments();
          await get().loadCommunity();
        } catch (error) {
          console.error('Failed to initialize Public RAG:', error);
          set({ isAuthenticating: false });
          throw error;
        }
      },

      uploadDocument: async (title, content, isPublic, tags) => {
        try {
          const client = getPublicRAGClient();
          
          // Ensure client is initialized before upload
          try {
            await client.initializeWithWallet();
          } catch (initError) {
            // Already initialized or other error - continue to upload
            console.log('Init check:', initError);
          }
          
          const doc = await client.uploadDocument({
            title,
            content,
            metadata: { title, type: 'txt', tags, size: content.length },
            isPublic,
            tags,
          });
          
          set((state) => ({
            documents: [doc, ...state.documents]
          }));
          
          toast.success('Document uploaded to Public RAG');
        } catch (error) {
          console.error('Upload error:', error);
          const message = error instanceof Error ? error.message : 'Unknown error';
          toast.error(`Failed to upload document: ${message}`);
          throw error;
        }
      },

      search: async (query) => {
        try {
          const client = getPublicRAGClient();
          const results = await client.search({ query, topK: 10 });
          
          // Decrypt results
          const decryptedResults = await Promise.all(
            results.map(async (result) => {
              try {
                const decrypted = await client.decryptResult(result);
                return { ...result, decrypted };
              } catch {
                // Can't decrypt - don't have access
                return null;
              }
            })
          );
          
          return decryptedResults.filter(Boolean);
        } catch (error) {
          toast.error('Search failed');
          throw error;
        }
      },

      loadCommunity: async () => {
        try {
          const client = getPublicRAGClient();
          const docs = await client.getCommunityDocuments(20);
          set({ communityDocuments: docs });
        } catch (error) {
          console.error('Failed to load community:', error);
        }
      },

      loadMyDocuments: async () => {
        try {
          const client = getPublicRAGClient();
          const docs = await client.getMyDocuments();
          const stats = await client.getStats();
          set({ documents: docs, stats });
        } catch (error) {
          console.error('Failed to load documents:', error);
        }
      },

      shareDocument: async (documentId, recipientPublicKey) => {
        try {
          const client = getPublicRAGClient();
          await client.shareDocument(documentId, recipientPublicKey);
          toast.success('Document shared successfully');
        } catch (error) {
          toast.error('Failed to share document');
          throw error;
        }
      },

      deleteDocument: async (documentId) => {
        try {
          const client = getPublicRAGClient();
          await client.deleteDocument(documentId);
          set((state) => ({
            documents: state.documents.filter(d => d.id !== documentId)
          }));
          toast.success('Document deleted');
        } catch (error) {
          toast.error('Failed to delete document');
          throw error;
        }
      },

      selectDocument: (doc) => {
        set({ selectedDocument: doc });
      }
    }),
    {
      name: 'public-rag-store',
      partialize: (state) => ({ publicKey: state.publicKey })
    }
  )
);

/**
 * Hook for Public RAG operations
 */
export function usePublicRAG() {
  const store = usePublicRAGStore();
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (!store.isInitialized && !store.isAuthenticating) {
      store.initialize().catch(console.error);
    }
  }, []);

  const performSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    try {
      const results = await store.search(query);
      setSearchResults(results);
      return results;
    } finally {
      setIsSearching(false);
    }
  }, [store]);

  return {
    ...store,
    isSearching,
    searchResults,
    performSearch,
    refresh: () => {
      store.loadMyDocuments();
      store.loadCommunity();
    }
  };
}

/**
 * Hook for document upload with progress
 */
export function usePublicRAGUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const store = usePublicRAGStore();

  const upload = useCallback(async (
    title: string,
    content: string,
    isPublic: boolean,
    tags: string[]
  ) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate progress (actual progress would come from chunk uploads)
      const interval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      await store.uploadDocument(title, content, isPublic, tags);
      
      clearInterval(interval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 500);
    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      throw error;
    }
  }, [store]);

  return { upload, isUploading, uploadProgress };
}
