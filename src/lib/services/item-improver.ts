// Item Improver Service - Generate improved fashion item images using GPT-Image-1
import { getOpenAIClientWithoutGuardrails } from './openai';
import type { ItemAnalysis } from '$lib/types/item';
import { getDefaultImprovementPrompt } from '$lib/constants/item-master';

/**
 * Map our quality settings to OpenAI API parameters
 * low = standard quality, medium = standard, high = hd
 */
function mapQualityToOpenAI(quality: 'low' | 'medium' | 'high'): 'standard' | 'hd' {
	if (quality === 'high') return 'hd';
	return 'standard';
}

/**
 * Generate an improved product photo using gpt-image-1
 * Creates professional e-commerce style images from item data
 *
 * @param itemData - Analysis data from Vision API
 * @param quality - Image quality: 'low', 'medium', or 'high'
 * @param customPrompt - Optional custom prompt to override default
 * @returns Promise resolving to generated image URL
 */
export async function improveItemImage(
	itemData: ItemAnalysis,
	quality: 'low' | 'medium' | 'high' = 'medium',
	customPrompt?: string
): Promise<string> {
	// Get OpenAI client WITHOUT guardrails (no user text to validate)
	const openai = getOpenAIClientWithoutGuardrails();

	// Generate prompt
	const prompt = customPrompt || getDefaultImprovementPrompt(itemData);

	// Map quality to OpenAI parameter
	const openaiQuality = mapQualityToOpenAI(quality);

	// Call Image Generation API
	const response = await openai.images.generate({
		model: 'dall-e-3',
		prompt: prompt,
		n: 1, // Generate 1 image
		size: '1024x1024', // Square format (1:1 ratio)
		quality: openaiQuality,
		response_format: 'url'
	});

	// Extract image URL
	if (!response.data || response.data.length === 0) {
		throw new Error('No image data returned from OpenAI');
	}

	const imageUrl = response.data[0]?.url;

	if (!imageUrl) {
		throw new Error('No image URL returned from OpenAI');
	}

	return imageUrl;
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
	// DALL-E 3 pricing (1024x1024)
	// low = standard quality at lower cost
	// medium = standard quality
	// high = hd quality
	if (quality === 'low') return 0.027; // Approximate lower cost
	if (quality === 'high') return 0.08; // HD quality
	return 0.04; // Standard quality (medium)
}
