// Database types matching supabase-schema.sql
export interface WardrobeItemDB {
	id: string;
	user_id: string;
	description: string;
	category: 'Top' | 'Bottom' | 'Footwear' | 'Outerwear' | 'Accessory';
	subcategory: string;
	// Legacy fields (still in schema but deprecated - use junction tables instead)
	color: string;
	occasion?: string;
	// Primary color/occasion data accessed via:
	// - wardrobe_item_colors junction table
	// - wardrobe_item_occasions junction table
	fit?: string;
	brand?: string;
	image_url?: string;
	improved_image_url?: string;
	metadata?: Record<string, any>;
	analysis_confidence?: number;
	analysis_metadata?: any;
	created_at: string;
	updated_at: string;
}

// Junction table for wardrobe item colors (many-to-many)
export interface WardrobeItemColorDB {
	id: string;
	wardrobe_item_id: string;
	color_id: string;
	created_at: string;
}

// Junction table for wardrobe item occasions (many-to-many)
export interface WardrobeItemOccasionDB {
	id: string;
	wardrobe_item_id: string;
	occasion_id: string;
	created_at: string;
}

export interface ItemEmbeddingDB {
	id: string;
	item_id: string;
	embedding: number[];
	model: string;
	generated_at: string;
}

export interface OutfitCombinationDB {
	id: string;
	user_id: string;
	occasion: string;
	note?: string;
	reasoning: string;
	style_notes: string;
	confidence: 'low' | 'medium' | 'high';
	background_colors: Array<{ hex: string; name: string }>;
	api_cost_rp?: number;
	created_at: string;
}

export interface OutfitItemDB {
	id: string;
	combination_id: string;
	item_id: string;
	reason: string;
}

// Master Data Types
export interface CategoryDB {
	id: string;
	name: string;
	display_order: number;
	created_at: string;
	updated_at: string;
}

export interface SubcategoryDB {
	id: string;
	category_id: string;
	name: string;
	display_order: number;
	created_at: string;
	updated_at: string;
}

export interface ColorDB {
	id: string;
	name: string;
	hex_code?: string;
	display_order: number;
	created_at: string;
	updated_at: string;
}

export interface OccasionDB {
	id: string;
	name: string;
	description?: string;
	display_order: number;
	created_at: string;
	updated_at: string;
}

export interface FitDB {
	id: string;
	category_id: string;
	name: string;
	display_order: number;
	created_at: string;
	updated_at: string;
}
