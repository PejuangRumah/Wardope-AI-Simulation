import type { WardrobeItemDB } from './database';
import type { ItemAnalysis } from './item';

/**
 * Prompt information returned from AI processing
 */
export interface PromptInfo {
	id: string;
	name: string;
	version: number;
}

/**
 * Filters for querying wardrobe items
 */
export interface WardrobeFilters {
	category?: string;
	color?: string;
	fit?: string;
	occasion?: string;
	search?: string;
	page?: number;
	limit?: number;
}

/**
 * Data for creating a new wardrobe item
 */
export interface WardrobeItemCreate {
	originalImage: string; // base64 data URI
	improvedImage?: string; // base64 data URI
	description: string;
	category: string;
	subcategory: string;
	colors: string[]; // Array of color names (changed from single color)
	fit?: string;
	brand?: string;
	occasions?: string[]; // Array of occasion names (changed from single occasion)
	analysisMetadata?: {
		confidence?: string;
		colors?: string[];
		occasions?: string[];
		promptUsed?: PromptInfo;
	};
}

/**
 * Data for updating an existing wardrobe item
 */
export interface WardrobeItemUpdate {
	description?: string;
	category?: string;
	subcategory?: string;
	colors?: string[]; // Array of color names (changed from single color)
	fit?: string;
	brand?: string;
	occasions?: string[]; // Array of occasion names (changed from single occasion)
	originalImage?: string;
	improvedImage?: string;
	analysisMetadata?: Record<string, any>;
}

/**
 * Wardrobe item with joined colors and occasions
 * This extends WardrobeItemDB with arrays from junction tables
 */
export interface WardrobeItem extends WardrobeItemDB {
	colors: Array<{ id: string; name: string; hex_code?: string }>;
	occasions: Array<{ id: string; name: string; description?: string }>;
}

/**
 * Paginated list response
 */
export interface WardrobeListResponse {
	items: WardrobeItem[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

/**
 * Master data for dropdowns and filters
 */
export interface WardrobeMasterData {
	categories: Array<{ id: string; name: string; display_order: number }>;
	colors: Array<{ id: string; name: string; hex_code?: string; display_order: number }>;
	fits: Array<{ id: string; name: string; category_id?: string; display_order: number }>;
	occasions: Array<{ id: string; name: string; description?: string; display_order: number }>;
	subcategories: Array<{ id: string; name: string; category_id: string; display_order: number }>;
}

/**
 * Prompt from database with type
 */
export interface WardrobePrompt {
	id: string;
	name: string;
	description?: string;
	type: 'item_analysis' | 'item_improvement';
	content: string;
	version: number;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

/**
 * Analysis result with prompt information
 */
export interface AnalysisWithPrompt {
	analysis: ItemAnalysis;
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
		cost_usd: number;
		cost_idr: number;
		processing_time_ms: number;
	};
	promptUsed?: PromptInfo;
}

/**
 * Improvement result with prompt information
 */
export interface ImprovementWithPrompt {
	imageUrl: string;
	usage: {
		cost_usd: number;
		cost_idr: number;
		processing_time_ms: number;
	};
	promptUsed?: PromptInfo;
}
