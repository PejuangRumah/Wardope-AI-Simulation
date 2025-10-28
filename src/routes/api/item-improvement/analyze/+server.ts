// API Endpoint - Analyze fashion item image using Vision API
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { analyzeItemImage, extractBase64FromDataUrl, isValidBase64Image } from '$lib/services/item-analyzer';
import { PRICING, USD_TO_IDR } from '$lib/services/openai';
import type { AnalysisResponse } from '$lib/types/item';

export const POST: RequestHandler = async ({ request }) => {
	const startTime = Date.now();

	try {
		// 1. Parse request body
		const body = await request.json();
		const { image, customPrompt } = body;

		// 2. Validate inputs
		if (!image) {
			return json({ error: 'Image is required.' }, { status: 400 });
		}

		// Extract base64 data from data URL if needed
		const imageBase64 = extractBase64FromDataUrl(image);

		// Validate base64 image
		if (!isValidBase64Image(imageBase64)) {
			return json(
				{
					error: 'Invalid image. Must be a valid base64-encoded image (JPEG/PNG, 1KB-20MB).'
				},
				{ status: 400 }
			);
		}

		// 3. Analyze image using Vision API
		const { analysis, promptTokens, completionTokens } = await analyzeItemImage(
			imageBase64,
			customPrompt
		);

		// 4. Calculate costs
		const processingTime = Date.now() - startTime;

		// Vision API cost = text tokens cost + image cost
		const textInputCost = (promptTokens / 1_000_000) * PRICING.GPT_INPUT;
		const textOutputCost = (completionTokens / 1_000_000) * PRICING.GPT_OUTPUT;
		const imageCost = PRICING.VISION_IMAGE; // Per image

		const totalCostUsd = textInputCost + textOutputCost + imageCost;
		const totalCostIdr = totalCostUsd * USD_TO_IDR;

		// 5. Return response
		const response: AnalysisResponse = {
			analysis,
			usage: {
				prompt_tokens: promptTokens,
				completion_tokens: completionTokens,
				total_tokens: promptTokens + completionTokens,
				cost_usd: totalCostUsd,
				cost_idr: totalCostIdr,
				processing_time_ms: processingTime
			}
		};

		return json(response, { status: 200 });
	} catch (error) {
		// Handle errors
		console.error('Error analyzing item:', error);

		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error occurred during analysis';

		return json(
			{
				error: `Failed to analyze item: ${errorMessage}`
			},
			{ status: 500 }
		);
	}
};
