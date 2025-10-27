// TypeScript types for Wardrobe AI

export interface WardrobeItem {
  id: string;
  desc: string;
  category: string;
  subcategory: string;
  color: string;
  fit?: string;
  brand?: string;
  occasion?: string;
  image?: string;
  price?: string;
  [key: string]: any; // Allow other CSV columns
}

export interface WardrobeItemWithEmbedding extends WardrobeItem {
  embedding: number[];
  similarity?: number;
}

export interface OutfitItem {
  id: string;
  category: string;
  subcategory?: string;
  color?: string;
  reason: string;
}

export interface OutfitCombination {
  id: number;
  items: OutfitItem[];
  reasoning: string;
  style_notes?: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface UsageStats {
  embedding_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  embedding_cost_usd: number;
  gpt_input_cost_usd: number;
  gpt_output_cost_usd: number;
  total_cost_usd: number;
  total_cost_idr: number;
  processing_time_ms: number;
}

export interface RecommendationResponse {
  combinations: OutfitCombination[];
  usage: UsageStats;
  metadata: {
    gender: string;
    occasion: string;
    total_items: number;
    items_considered: number;
  };
}

export interface CategoryBalancedItems {
  fullBody: WardrobeItemWithEmbedding[];
  tops: WardrobeItemWithEmbedding[];
  bottoms: WardrobeItemWithEmbedding[];
  outerwear: WardrobeItemWithEmbedding[];
  footwear: WardrobeItemWithEmbedding[];
  accessories: WardrobeItemWithEmbedding[];
}
