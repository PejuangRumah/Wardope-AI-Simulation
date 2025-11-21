// Item Analyzer Service - Analyze fashion items using GPT-4o Vision API
import { getOpenAIClientWithoutGuardrails } from './openai';
import type { ItemAnalysis } from '$lib/types/item';
import type { PromptInfo } from '$lib/types/wardrobe';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	getDefaultAnalysisPrompt,
	getAllCategories,
	getAllSubcategories,
	COLORS,
	OCCASIONS,
	getAllFits
} from '$lib/constants/item-master';

/**
 * Analyze a fashion item image using GPT-4o Vision API
 * Returns structured data about the item (category, colors, fit, etc.)
 *
 * @param imageBase64 - Base64 encoded image string (without data:image prefix)
 * @param options - Optional configuration
 * @param options.customPrompt - Custom prompt to override default
 * @param options.promptId - ID of prompt to fetch from database
 * @param options.supabase - Supabase client for fetching prompts
 * @returns Promise resolving to ItemAnalysis, token usage, and prompt info
 */
export async function analyzeItemImage(
	imageBase64: string,
	options?: {
		customPrompt?: string;
		promptId?: string;
		supabase?: SupabaseClient;
	}
): Promise<{
	analysis: ItemAnalysis;
	promptTokens: number;
	completionTokens: number;
	promptUsed?: PromptInfo;
}> {
	// Get OpenAI client without guardrails (no user input to validate)
	const openai = getOpenAIClientWithoutGuardrails();

	// Prepare system prompt and prompt info
	let systemPrompt = options?.customPrompt || getDefaultAnalysisPrompt();
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
				systemPrompt = data.content;
				promptInfo = {
					id: data.id,
					name: data.name,
					version: data.version
				};
			}
		} else {
			// Fetch active item_analysis prompt
			const { data } = await options.supabase
				.from('prompts')
				.select('*')
				.eq('type', 'item_analysis')
				.eq('is_active', true)
				.single();

			if (data) {
				systemPrompt = data.content;
				promptInfo = {
					id: data.id,
					name: data.name,
					version: data.version
				};
			}
		}
	}

	// Add context about available options
	const contextPrompt = `${systemPrompt}

**Available Options:**

Categories: ${getAllCategories().join(', ')}

Subcategories: ${getAllSubcategories().join(', ')}

Colors: ${COLORS.join(', ')}

Occasions: ${OCCASIONS.join(', ')}

Fits: ${getAllFits().join(', ')}

IMPORTANT: Choose values ONLY from the lists above. Be specific and accurate.`;

	// Call GPT-4o Vision API with structured output
	const response = await openai.chat.completions.create({
		model: 'gpt-4o',
		messages: [
			{
				role: 'system',
				content: contextPrompt
			},
			{
				role: 'user',
				content: [
					{
						type: 'text',
						text: 'Analyze this fashion item image:'
					},
					{
						type: 'image_url',
						image_url: {
							url: `data:image/jpeg;base64,${imageBase64}`
						}
					}
				]
			}
		],
		response_format: {
			type: 'json_schema',
			json_schema: {
				name: 'item_analysis',
				strict: true,
				schema: {
					type: 'object',
					properties: {
						category: {
							type: 'string',
							description: 'Main category: fullbodies, tops, outerwears, bottoms, accessories, or footwears'
						},
						subcategory: {
							type: 'string',
							description: 'Specific type (e.g., Shirt, Jeans, Sneaker)'
						},
						colors: {
							type: 'array',
							items: { type: 'string' },
							description: 'List of visible colors (primary and secondary)'
						},
						fit: {
							type: 'string',
							description: 'Fit style (e.g., oversized, regular, slim)'
						},
						occasions: {
							type: 'array',
							items: { type: 'string' },
							description: 'Suitable occasions (e.g., casual, formal, work/office)'
						},
						description: {
							type: 'string',
							description: 'Detailed description including brand, material, style, features'
						},
						brand: {
							type: 'string',
							description: 'Brand name if visible, otherwise empty string'
						},
						confidence: {
							type: 'string',
							enum: ['low', 'medium', 'high'],
							description: 'Confidence level in the analysis'
						}
					},
					required: [
						'category',
						'subcategory',
						'colors',
						'fit',
						'occasions',
						'description',
						'brand',
						'confidence'
					],
					additionalProperties: false
				}
			}
		}
	});

	// Parse response
	const result = JSON.parse(
		response.choices[0].message.content || '{"error": "No response from AI"}'
	);

	// Validate result
	if (!result.category || !result.subcategory) {
		throw new Error('Invalid analysis result: missing required fields');
	}

	return {
		analysis: {
			category: result.category,
			subcategory: result.subcategory,
			colors: result.colors || [],
			fit: result.fit || 'regular',
			occasions: result.occasions || [],
			description: result.description || '',
			brand: result.brand || undefined,
			confidence: result.confidence || 'medium'
		},
		promptTokens: response.usage?.prompt_tokens || 0,
		completionTokens: response.usage?.completion_tokens || 0,
		promptUsed: promptInfo
	};
}

/**
 * Validate image base64 string
 * @param base64 - Base64 string to validate
 * @returns true if valid, false otherwise
 */
export function isValidBase64Image(base64: string): boolean {
	try {
		// Check if it's a valid base64 string
		const decoded = atob(base64);

		// Check minimum length (1KB)
		if (decoded.length < 1000) return false;

		// Check maximum length (20MB)
		if (decoded.length > 20 * 1024 * 1024) return false;

		return true;
	} catch (error) {
		return false;
	}
}

/**
 * Extract base64 data from data URL
 * @param dataUrl - Data URL (e.g., data:image/jpeg;base64,...)
 * @returns Base64 string without prefix
 */
export function extractBase64FromDataUrl(dataUrl: string): string {
	const parts = dataUrl.split(',');
	return parts.length > 1 ? parts[1] : dataUrl;
}
