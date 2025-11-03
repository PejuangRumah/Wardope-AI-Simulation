// TypeScript types for Item Improvement PoC

/**
 * Item analysis result from Vision API
 */
export interface ItemAnalysis {
	category: string;
	subcategory: string;
	colors: string[];
	fit: string;
	occasions: string[];
	description: string;
	brand?: string;
	confidence: 'low' | 'medium' | 'high';
}

/**
 * API response for item analysis
 */
export interface AnalysisResponse {
	analysis: ItemAnalysis;
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
		cost_usd: number;
		cost_idr: number;
		processing_time_ms: number;
	};
}

/**
 * API request for item improvement
 */
export interface ImprovementRequest {
	itemData: ItemAnalysis;
	originalImage: string; // base64 data URI of uploaded image
	quality: 'low' | 'medium' | 'high';
	customPrompt?: string;
}

/**
 * API response for image improvement
 */
export interface ImprovementResponse {
	imageUrl: string;
	usage: {
		cost_usd: number;
		cost_idr: number;
		processing_time_ms: number;
	};
}

/**
 * Stored item in localStorage
 */
export interface StoredItem {
	id: string; // UUID
	timestamp: number;
	originalImage: string; // base64 or URL
	improvedImage?: string; // URL from OpenAI
	data: {
		category: string;
		subcategory: string;
		colors: string[];
		fit: string;
		occasions: string[];
		description: string;
		brand?: string;
	};
	costs: {
		analysis_cost_idr: number;
		improvement_cost_idr?: number;
		total_cost_idr: number;
	};
}

/**
 * Experimental settings for item processing
 */
export interface ExperimentalSettings {
	quality: 'low' | 'medium' | 'high';
	customAnalysisPrompt?: string;
	customImprovementPrompt?: string;
	additionalCategories?: string[];
	additionalColors?: string[];
	additionalFits?: string[];
	additionalOccasions?: string[];
}

/**
 * UI state for item improvement flow
 */
export interface ItemImprovementState {
	// Upload state
	uploadedImage: string | null;
	uploadedFileName: string | null;

	// Analysis state
	isAnalyzing: boolean;
	analysisResult: ItemAnalysis | null;
	analysisUsage: AnalysisResponse['usage'] | null;
	analysisError: string | null;

	// Improvement state
	isImproving: boolean;
	improvedImageUrl: string | null;
	improvementUsage: ImprovementResponse['usage'] | null;
	improvementError: string | null;

	// Saved items
	savedItems: StoredItem[];

	// Experimental settings
	experimentalSettings: ExperimentalSettings;
	showExperimental: boolean;
}
