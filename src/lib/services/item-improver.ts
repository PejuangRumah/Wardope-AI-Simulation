// Item Improver Service - Generate improved fashion item images using GPT-Image-1
import { toFile } from 'openai';
import { getOpenAIClientWithoutGuardrails } from './openai';
import type { ItemAnalysis } from '$lib/types/item';
import type { PromptInfo } from '$lib/types/wardrobe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getDefaultImprovementPrompt } from '$lib/constants/item-master';

/**
 * Generate an improved product photo using gpt-image-1
 * Creates professional e-commerce style images from item data
 *
 * @param itemData - Analysis data from Vision API
 * @param originalImage - Base64 data URI of the uploaded image
 * @param quality - Quality level (for cost estimation only; not used by API)
 * @param options - Optional configuration
 * @param options.customPrompt - Custom prompt to override default
 * @param options.promptId - ID of prompt to fetch from database
 * @param options.supabase - Supabase client for fetching prompts
 * @returns Promise resolving to data URI and prompt info
 */
export async function improveItemImage(
	itemData: ItemAnalysis,
	originalImage: string,
	quality: 'low' | 'medium' | 'high' = 'medium',
	options?: {
		customPrompt?: string;
		promptId?: string;
		supabase?: SupabaseClient;
	}
): Promise<{ imageUrl: string; promptUsed?: PromptInfo }> {
	// Get OpenAI client without guardrails (no user input to validate)
	const openai = getOpenAIClientWithoutGuardrails();

	// Prepare prompt and prompt info
	let prompt = options?.customPrompt || getDefaultImprovementPrompt(itemData);
	let promptInfo: PromptInfo | undefined = undefined;

	// Fetch prompt from database if supabase client provided
	if (options?.supabase) {
		if (options.promptId) {
			// Fetch specific prompt by ID
			const { data } = await options.supabase
				.from('prompts')
				.select('*')
				.eq('id', options.promptId)
				.single();

			if (data) {
				prompt = data.content;
				promptInfo = {
					id: data.id,
					name: data.name,
					version: data.version
				};
			}
		} else {
			// Fetch active item_improvement prompt
			const { data } = await options.supabase
				.from('prompts')
				.select('*')
				.eq('type', 'item_improvement')
				.eq('is_active', true)
				.single();

			if (data) {
				prompt = data.content;
				promptInfo = {
					id: data.id,
					name: data.name,
					version: data.version
				};
			}
		}
	}

	// Convert base64 data URI to Buffer
	const uploadedImageBase64 = originalImage.replace(/^data:image\/\w+;base64,/, '');
	const buffer = Buffer.from(uploadedImageBase64, 'base64');

	// Convert Buffer to File object for API
	const imageFile = await toFile(buffer, 'input.png', { type: 'image/png' });

	// Call Image Edit API with gpt-image-1
	const response = await openai.images.edit({
		model: 'gpt-image-1',
		image: imageFile,
		prompt: prompt,
		n: 1,
		size: '1024x1024'
		// Note: gpt-image-1 returns base64-encoded JSON (b64_json), not URLs
	});

	// Extract base64 image data
	if (!response.data || response.data.length === 0) {
		throw new Error('No image data returned from OpenAI');
	}

	const base64Data = response.data[0]?.b64_json;

	if (!base64Data) {
		throw new Error('No base64 image data returned from OpenAI');
	}

	// Convert base64 to data URI for use in <img> src
	const dataUri = `data:image/png;base64,${base64Data}`;

	return {
		imageUrl: dataUri,
		promptUsed: promptInfo
	};
}

/**
 * Build a custom prompt for image generation
 * Helper function for experimental controls
 *
 * @param itemData - Item analysis data
 * @param customization - Custom prompt elements
 * @returns Formatted prompt string
 */
export function buildCustomImprovementPrompt(
	itemData: ItemAnalysis,
	customization: {
		background?: string;
		lighting?: string;
		angle?: string;
		style?: string;
		additionalInstructions?: string;
	}
): string {
	const { background, lighting, angle, style, additionalInstructions } = customization;

	return `Professional product photo of a ${itemData.subcategory}.

Item Details:
- Category: ${itemData.category}
- Type: ${itemData.subcategory}
- Colors: ${itemData.colors.join(', ')}
- Fit: ${itemData.fit}
- Style: ${itemData.description}

Photography Style:
- Background: ${background || 'clean white studio background'}
- Lighting: ${lighting || 'soft professional lighting with no harsh shadows'}
- Angle: ${angle || 'front-facing, centered composition'}
- Style: ${style || 'high-end e-commerce product photography'}

Requirements:
- Remove any other objects, people, or distractions
- Item should look pristine and professionally presented
- Sharp focus, high resolution appearance
- Suitable for premium online fashion retail

${additionalInstructions || ''}`;
}

/**
 * Get cost estimate for image generation
 * @param quality - Image quality setting ('low', 'medium', 'high')
 * @returns Cost in USD
 */
export function estimateImageCost(quality: 'low' | 'medium' | 'high'): number {
	// gpt-image-1 pricing (1024x1024, 2025)
	// Based on token consumption at different quality levels
	// Low: ~85 tokens, Medium: ~250 tokens, High: ~765 tokens
	if (quality === 'low') return 0.01; // Low quality
	if (quality === 'high') return 0.17; // High quality
	return 0.04; // Medium quality (default)
}
