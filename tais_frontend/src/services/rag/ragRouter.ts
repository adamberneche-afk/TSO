import type { RAGQuery, RAGContext, RAGResult, RAGSource } from '../../types/rag';
import { PrivateRAGService, getPrivateRAG } from './privateRAG';

export interface RAGRouterConfig {
  sources: RAGSource[];
  weights?: Record<string, number>;
  maxTotalResults?: number;
  deduplicate?: boolean;
}

/**
 * RAG Router - Aggregates results from multiple RAG sources
 */
export class RAGRouter {
  private sources: Map<string, RAGSource> = new Map();
  private weights: Map<string, number> = new Map();
  private privateRAG: PrivateRAGService;
  private maxTotalResults: number;
  private deduplicate: boolean;

  constructor(config: RAGRouterConfig) {
    this.maxTotalResults = config.maxTotalResults || 10;
    this.deduplicate = config.deduplicate ?? true;
    
    // Initialize sources
    for (const source of config.sources) {
      if (source.enabled) {
        this.sources.set(source.id, source);
        this.weights.set(source.id, config.weights?.[source.id] || 1.0);
      }
    }

    // Initialize Private RAG
    this.privateRAG = getPrivateRAG();
  }

  /**
   * Query all enabled RAG sources and aggregate results
   */
  async query(query: RAGQuery): Promise<RAGContext> {
    const startTime = performance.now();
    const results: RAGResult[] = [];

    // Query each source
    const sourcePromises = Array.from(this.sources.values()).map(async (source) => {
      try {
        const sourceResults = await this.querySource(source, query);
        return sourceResults;
      } catch (error) {
        console.error(`Error querying RAG source ${source.id}:`, error);
        return [];
      }
    });

    const sourceResults = await Promise.all(sourcePromises);

    // Aggregate results
    for (let i = 0; i < sourceResults.length; i++) {
      const sourceId = Array.from(this.sources.keys())[i];
      const weight = this.weights.get(sourceId) || 1.0;
      
      for (const result of sourceResults[i]) {
        results.push({
          ...result,
          score: result.score * weight // Apply source weight
        });
      }
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    // Deduplicate if enabled
    const finalResults = this.deduplicate 
      ? this.deduplicateResults(results)
      : results;

    // Limit total results
    const limitedResults = finalResults.slice(0, this.maxTotalResults);

    const latency = performance.now() - startTime;

    return {
      results: limitedResults,
      totalChunks: limitedResults.length,
      query: query.query,
      sources: query.sources || Array.from(this.sources.values()).map(s => s.tier),
      latency
    };
  }

  /**
   * Query a specific RAG source
   */
  private async querySource(source: RAGSource, query: RAGQuery): Promise<RAGResult[]> {
    switch (source.tier) {
      case 'private':
        return this.queryPrivateRAG(query);
      case 'public':
        return this.queryPublicRAG(query);
      case 'app':
        return this.queryAppRAG(source, query);
      case 'enterprise':
        return this.queryEnterpriseRAG(source, query);
      default:
        return [];
    }
  }

  /**
   * Query Private RAG
   */
  private async queryPrivateRAG(query: RAGQuery): Promise<RAGResult[]> {
    try {
      return await this.privateRAG.search(query.query, query.topK || 5);
    } catch (error) {
      console.error('Private RAG query error:', error);
      return [];
    }
  }

   /**
    * Query Public RAG (E2EE implementation)
    */
   private async queryPublicRAG(query: RAGQuery): Promise<RAGResult[]> {
     try {
       // In a real implementation, this would:
       // 1. Call the public RAG API to search encrypted index
       // 2. Download encrypted chunks from storage (S3/R2)
       // 3. Decrypt chunks client-side using user's key
       // 4. Compute similarity and rank results
       
       // For now, we'll simulate by calling an API endpoint
       const response = await fetch(`${import.meta.env.VITE_REGISTRY_URL || 'https://tso.onrender.com'}/api/v1/rag/public/search`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           query: query.query,
           topK: query.topK || 5,
         })
       });
       
       if (!response.ok) {
         // If public RAG endpoint is not available, return empty results
         console.warn('Public RAG endpoint not available');
         return [];
       }
       
       const data = await response.json();
       return data.results || [];
     } catch (error) {
       console.error('Public RAG query error:', error);
       return [];
     }
   }

   /**
    * Query App RAG (SDK implementation)
    */
   private async queryAppRAG(source: RAGSource, query: RAGQuery): Promise<RAGResult[]> {
     try {
       // App RAG would use a provided RAG client instance from the source config
       const appRagClient = source.config?.appRagClient;
       if (!appRagClient) {
         console.warn('App RAG client not provided in source config');
         return [];
       }
       
       // Query the app-specific RAG instance
       return await appRagClient.search(query.query, query.topK || 5);
     } catch (error) {
       console.error('App RAG query error:', error);
       return [];
     }
   }

   /**
    * Query Enterprise RAG (enterprise implementation)
    */
   private async queryEnterpriseRAG(source: RAGSource, query: RAGQuery): Promise<RAGResult[]> {
     try {
       // Enterprise RAG would call an authenticated enterprise API endpoint
       const enterpriseApiUrl = source.config?.enterpriseApiUrl;
       const apiKey = source.config?.apiKey;
       
       if (!enterpriseApiUrl || !apiKey) {
         console.warn('Enterprise RAG configuration missing');
         return [];
       }
       
       const response = await fetch(`${enterpriseApiUrl}/search`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${apiKey}`,
         },
         body: JSON.stringify({
           query: query.query,
           topK: query.topK || 5,
         })
       });
       
       if (!response.ok) {
         console.warn('Enterprise RAG request failed:', response.status);
         return [];
       }
       
       const data = await response.json();
       return data.results || [];
     } catch (error) {
       console.error('Enterprise RAG query error:', error);
       return [];
     }
   }

  /**
   * Deduplicate results based on content similarity
   */
  private deduplicateResults(results: RAGResult[]): RAGResult[] {
    const unique: RAGResult[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      // Create a hash of the content (first 100 chars)
      const contentHash = result.chunk.content.slice(0, 100).toLowerCase().trim();
      
      // Check if we've seen similar content
      let isDuplicate = false;
      for (const existing of unique) {
        const similarity = this.calculateSimilarity(
          result.chunk.content,
          existing.chunk.content
        );
        if (similarity > 0.9) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        unique.push(result);
        seen.add(contentHash);
      }
    }

    return unique;
  }

  /**
   * Calculate simple text similarity
   */
  private calculateSimilarity(a: string, b: string): number {
    const aWords = new Set(a.toLowerCase().split(/\s+/));
    const bWords = new Set(b.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...aWords].filter(x => bWords.has(x)));
    const union = new Set([...aWords, ...bWords]);
    
    return intersection.size / union.size;
  }

  /**
   * Enable/disable a source
   */
  setSourceEnabled(sourceId: string, enabled: boolean): void {
    const source = this.sources.get(sourceId);
    if (source) {
      source.enabled = enabled;
    }
  }

  /**
   * Update source weight
   */
  setSourceWeight(sourceId: string, weight: number): void {
    this.weights.set(sourceId, weight);
  }

  /**
   * Get context string for LLM injection
   */
  buildContextString(context: RAGContext, maxLength: number = 4000): string {
    let contextString = 'Relevant context from knowledge base:\n\n';
    let currentLength = contextString.length;

    for (let i = 0; i < context.results.length; i++) {
      const result = context.results[i];
      const citation = `[${i + 1}] From ${result.document.metadata.title} (relevance: ${(result.score * 100).toFixed(1)}%)\n${result.chunk.content}\n\n`;
      
      if (currentLength + citation.length > maxLength) {
        break;
      }
      
      contextString += citation;
      currentLength += citation.length;
    }

    return contextString;
  }

  /**
   * Get citations for response
   */
  getCitations(context: RAGContext): Array<{ id: number; title: string; source: string; relevance: number }> {
    return context.results.map((result, index) => ({
      id: index + 1,
      title: result.document.metadata.title,
      source: result.source,
      relevance: result.score
    }));
  }
}

/**
 * Create default RAG router with all sources
 */
export function createDefaultRAGRouter(): RAGRouter {
  const sources: RAGSource[] = [
    {
      id: 'private',
      tier: 'private',
      name: 'Private Knowledge Base',
      description: 'Your personal documents and notes stored locally',
      enabled: true,
      documentCount: 0,
      lastUpdated: Date.now(),
      config: { tier: 'private' }
    },
    {
      id: 'public',
      tier: 'public',
      name: 'Community Knowledge',
      description: 'Public knowledge base shared by the TAIS community',
      enabled: true,
      documentCount: 0,
      lastUpdated: Date.now(),
      config: { tier: 'public', encryptDocuments: true, sharePublicly: false } as any
    }
  ];

  return new RAGRouter({
    sources,
    weights: { private: 1.5, public: 1.0 }, // Weight private higher
    maxTotalResults: 10,
    deduplicate: true
  });
}
