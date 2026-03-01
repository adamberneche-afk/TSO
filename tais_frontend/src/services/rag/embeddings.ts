import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import { ensureBackend } from '../tensorflow';

let embeddingModel: use.UniversalSentenceEncoder | null = null;

/**
 * Load the Universal Sentence Encoder model
 */
export async function loadEmbeddingModel(): Promise<use.UniversalSentenceEncoder> {
  if (embeddingModel) return embeddingModel;
  
  try {
    // Ensure TensorFlow backend is ready first
    await ensureBackend();
    
    embeddingModel = await use.load();
    console.log('Embedding model loaded');
    return embeddingModel;
  } catch (error) {
    console.error('Failed to load embedding model:', error);
    throw new Error(`Failed to load TensorFlow.js model from tfhub.dev. This may be due to CORS or network restrictions. Error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

/**
 * Generate embeddings for text chunks
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const model = await loadEmbeddingModel();
    const embeddings = await model.embed(texts);
    return embeddings.array();
  } catch (error) {
    console.error('Failed to generate embeddings:', error);
    throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure TensorFlow.js can load the Universal Sentence Encoder model.`);
  }
}

/**
 * Generate embedding for single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const embeddings = await generateEmbeddings([text]);
  return embeddings[0];
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Split text into semantic chunks
 */
export function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50
): string[] {
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let currentChunk = '';
  let currentSize = 0;
  
  for (const sentence of sentences) {
    const sentenceSize = sentence.length;
    
    if (currentSize + sentenceSize > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      
      // Keep overlap
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + sentence;
      currentSize = overlap + sentenceSize;
    } else {
      currentChunk += sentence;
      currentSize += sentenceSize;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Find top-k most similar chunks
 */
export function findSimilarChunks(
  queryEmbedding: number[],
  chunks: Array<{ id: string; embedding: number[]; content: string; metadata: any }>,
  topK: number = 5,
  threshold: number = 0.5
): Array<{ id: string; score: number; content: string; metadata: any }> {
  const similarities = chunks.map(chunk => ({
    id: chunk.id,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
    content: chunk.content,
    metadata: chunk.metadata
  }));
  
  return similarities
    .filter(s => s.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Re-rank results using MMR (Maximal Marginal Relevance)
 * Balances relevance with diversity
 */
export function rerankWithMMR(
  results: Array<{ id: string; score: number; content: string; metadata: any }>,
  lambda: number = 0.5,
  topK: number = 5
): Array<{ id: string; score: number; content: string; metadata: any }> {
  if (results.length === 0) return [];
  
  const selected: Array<{ id: string; score: number; content: string; metadata: any }> = [];
  const remaining = [...results];
  
  // Select first result (highest relevance)
  selected.push(remaining.shift()!);
  
  while (selected.length < topK && remaining.length > 0) {
    let maxScore = -Infinity;
    let maxIndex = -1;
    
    for (let i = 0; i < remaining.length; i++) {
      const relevance = remaining[i].score;
      
      // Calculate max similarity to already selected items
      let maxSimilarity = 0;
      for (const s of selected) {
        // Simple text similarity (can be improved with embeddings)
        const similarity = calculateTextSimilarity(remaining[i].content, s.content);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
      
      const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;
      
      if (mmrScore > maxScore) {
        maxScore = mmrScore;
        maxIndex = i;
      }
    }
    
    if (maxIndex >= 0) {
      selected.push(remaining.splice(maxIndex, 1)[0]);
    }
  }
  
  return selected;
}

function calculateTextSimilarity(a: string, b: string): number {
  const aWords = new Set(a.toLowerCase().split(/\s+/));
  const bWords = new Set(b.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...aWords].filter(x => bWords.has(x)));
  const union = new Set([...aWords, ...bWords]);
  
  return intersection.size / union.size;
}
