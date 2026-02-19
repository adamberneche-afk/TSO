import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';

let model: use.UniversalSentenceEncoder | null = null;
let isLoading = false;
let isBackendReady = false;

async function ensureBackend(): Promise<void> {
  if (isBackendReady) return;
  
  try {
    await tf.setBackend('webgl');
    await tf.ready();
    isBackendReady = true;
    console.log('TensorFlow.js backend initialized:', tf.getBackend());
  } catch (error) {
    console.warn('WebGL backend failed, trying CPU:', error);
    try {
      await tf.setBackend('cpu');
      await tf.ready();
      isBackendReady = true;
      console.log('TensorFlow.js using CPU backend');
    } catch (cpuError) {
      console.error('Failed to initialize any TensorFlow backend:', cpuError);
      throw new Error('No TensorFlow backend available');
    }
  }
}

export interface EmbeddingResult {
  embedding: number[];
  text: string;
}

export interface SimilarityResult {
  similarity: number;
  text1: string;
  text2: string;
}

export async function loadUSEModel(): Promise<use.UniversalSentenceEncoder> {
  if (model) return model;
  if (isLoading) {
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (model) return model;
  }

  isLoading = true;
  try {
    await ensureBackend();
    model = await use.load();
    console.log('Universal Sentence Encoder loaded successfully');
    return model;
  } catch (error) {
    console.error('Failed to load USE model:', error);
    throw error;
  } finally {
    isLoading = false;
  }
}

export async function getEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  const loadedModel = await loadUSEModel();
  const embeddings = await loadedModel.embed(texts);
  const embeddingArrays = await embeddings.array();
  
  return texts.map((text, index) => ({
    text,
    embedding: embeddingArrays[index]
  }));
}

export async function calculateSimilarity(text1: string, text2: string): Promise<number> {
  const embeddings = await getEmbeddings([text1, text2]);
  return cosineSimilarity(embeddings[0].embedding, embeddings[1].embedding);
}

export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

export async function findMostSimilar(
  query: string,
  candidates: string[]
): Promise<{ text: string; similarity: number; index: number } | null> {
  if (candidates.length === 0) return null;

  const queryEmbedding = await getEmbeddings([query]);
  const candidateEmbeddings = await getEmbeddings(candidates);

  let maxSimilarity = -1;
  let bestMatch: { text: string; similarity: number; index: number } | null = null;

  candidateEmbeddings.forEach((candidate, index) => {
    const similarity = cosineSimilarity(queryEmbedding[0].embedding, candidate.embedding);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      bestMatch = { text: candidate.text, similarity, index };
    }
  });

  return bestMatch;
}

export async function batchSimilarity(
  query: string,
  candidates: string[]
): Promise<Array<{ text: string; similarity: number; index: number }>> {
  const queryEmbedding = await getEmbeddings([query]);
  const candidateEmbeddings = await getEmbeddings(candidates);

  return candidateEmbeddings.map((candidate, index) => ({
    text: candidate.text,
    similarity: cosineSimilarity(queryEmbedding[0].embedding, candidate.embedding),
    index
  })).sort((a, b) => b.similarity - a.similarity);
}

// Intent classification using USE embeddings
export async function classifyIntent(
  text: string,
  intentDefinitions: Record<string, string[]>
): Promise<{ intent: string; confidence: number } | null> {
  const intents = Object.keys(intentDefinitions);
  const allPhrases: string[] = [];
  const phraseToIntent: string[] = [];

  intents.forEach(intent => {
    intentDefinitions[intent].forEach(phrase => {
      allPhrases.push(phrase);
      phraseToIntent.push(intent);
    });
  });

  const similarities = await batchSimilarity(text, allPhrases);
  
  if (similarities.length === 0) return null;

  // Group by intent and find best match
  const intentScores: Record<string, { bestScore: number; count: number }> = {};
  
  similarities.forEach(({ similarity }, idx) => {
    const intent = phraseToIntent[idx];
    if (!intentScores[intent]) {
      intentScores[intent] = { bestScore: similarity, count: 0 };
    }
    if (similarity > intentScores[intent].bestScore) {
      intentScores[intent].bestScore = similarity;
    }
    intentScores[intent].count++;
  });

  let bestIntent: string | null = null;
  let bestScore = -1;

  Object.entries(intentScores).forEach(([intent, scores]) => {
    // Weight by both best score and number of matches
    const weightedScore = scores.bestScore * (1 + scores.count * 0.1);
    if (weightedScore > bestScore) {
      bestScore = weightedScore;
      bestIntent = intent;
    }
  });

  return bestIntent ? { intent: bestIntent, confidence: bestScore } : null;
}
