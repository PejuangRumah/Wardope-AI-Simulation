// Vector Search Service - Semantic search using cosine similarity
import type { WardrobeItemWithEmbedding, CategoryBalancedItems } from '$lib/types';

/**
 * Calculate cosine similarity between two vectors
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
 * Search items by semantic similarity to query
 */
export function searchByEmbedding(
  items: WardrobeItemWithEmbedding[],
  queryEmbedding: number[]
): WardrobeItemWithEmbedding[] {
  return items
    .map((item) => ({
      ...item,
      similarity: cosineSimilarity(queryEmbedding, item.embedding)
    }))
    .sort((a, b) => b.similarity! - a.similarity!);
}

/**
 * Balance items by category to ensure variety
 */
export function balanceByCategory(
  rankedItems: WardrobeItemWithEmbedding[]
): CategoryBalancedItems {
  const categorize = (categoryName: string) =>
    rankedItems.filter((item) => item.category.toLowerCase().includes(categoryName.toLowerCase()));

  return {
    fullBody: categorize('full body').slice(0, 5),
    tops: categorize('top').slice(0, 15),
    bottoms: categorize('bottom').slice(0, 15),
    outerwear: categorize('outerwear').slice(0, 8),
    footwear: categorize('footwear').slice(0, 8),
    accessories: categorize('accessory').slice(0, 5)
  };
}

/**
 * Flatten balanced categories into single array
 */
export function flattenBalancedItems(balanced: CategoryBalancedItems): WardrobeItemWithEmbedding[] {
  return [
    ...balanced.fullBody,
    ...balanced.tops,
    ...balanced.bottoms,
    ...balanced.outerwear,
    ...balanced.footwear,
    ...balanced.accessories
  ];
}

/**
 * Main semantic search function with category balancing
 */
export function semanticSearch(
  items: WardrobeItemWithEmbedding[],
  queryEmbedding: number[]
): {
  selectedItems: WardrobeItemWithEmbedding[];
  balancedCategories: CategoryBalancedItems;
} {
  // 1. Rank by similarity
  const rankedItems = searchByEmbedding(items, queryEmbedding);

  // 2. Balance by category
  const balancedCategories = balanceByCategory(rankedItems);

  // 3. Flatten to single array
  const selectedItems = flattenBalancedItems(balancedCategories);

  return {
    selectedItems,
    balancedCategories
  };
}
