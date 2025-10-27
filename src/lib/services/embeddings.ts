// Embeddings Service - Create and cache embeddings for wardrobe items
import { openai } from './openai';
import type { WardrobeItem, WardrobeItemWithEmbedding } from '$lib/types';

// Simple in-memory cache with TTL
interface CacheEntry {
  embedding: number[];
  timestamp: number;
}

const embeddingsCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Create embedding text from wardrobe item
 */
function createEmbeddingText(item: WardrobeItem): string {
  return `
    Category: ${item.category}
    Type: ${item.subcategory}
    Description: ${item.desc}
    Colors: ${item.color}
    ${item.occasion ? `Suitable for: ${item.occasion}` : ''}
    ${item.fit ? `Fit style: ${item.fit}` : ''}
    ${item.brand ? `Brand: ${item.brand}` : ''}
  `.trim();
}

/**
 * Create embedding for a single item
 */
async function createItemEmbedding(item: WardrobeItem): Promise<{
  embedding: number[];
  tokens: number;
}> {
  const text = createEmbeddingText(item);

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  });

  return {
    embedding: response.data[0].embedding,
    tokens: response.usage.total_tokens
  };
}

/**
 * Get embedding from cache or create new one
 */
async function getCachedEmbedding(item: WardrobeItem): Promise<{
  embedding: number[];
  tokens: number;
  fromCache: boolean;
}> {
  const cacheKey = `${item.id}-${item.desc.substring(0, 50)}`;
  const cached = embeddingsCache.get(cacheKey);

  // Check if cache is valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return {
      embedding: cached.embedding,
      tokens: 0, // No new tokens used
      fromCache: true
    };
  }

  // Create new embedding
  const result = await createItemEmbedding(item);

  // Store in cache
  embeddingsCache.set(cacheKey, {
    embedding: result.embedding,
    timestamp: Date.now()
  });

  return {
    ...result,
    fromCache: false
  };
}

/**
 * Create embeddings for all items in wardrobe
 */
export async function createWardrobeEmbeddings(
  items: WardrobeItem[]
): Promise<{
  itemsWithEmbeddings: WardrobeItemWithEmbedding[];
  totalTokens: number;
}> {
  let totalTokens = 0;

  const itemsWithEmbeddings = await Promise.all(
    items.map(async (item) => {
      const { embedding, tokens } = await getCachedEmbedding(item);
      totalTokens += tokens;

      return {
        ...item,
        embedding
      };
    })
  );

  return {
    itemsWithEmbeddings,
    totalTokens
  };
}

/**
 * Create embedding for user query
 */
export async function createQueryEmbedding(
  occasion: string,
  note?: string
): Promise<{
  embedding: number[];
  tokens: number;
}> {
  const queryText = `${occasion} outfit ${note || ''}`.trim();

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: queryText
  });

  return {
    embedding: response.data[0].embedding,
    tokens: response.usage.total_tokens
  };
}

/**
 * Clear embeddings cache (useful for testing)
 */
export function clearEmbeddingsCache(): void {
  embeddingsCache.clear();
}
