// API Endpoint - Improve fashion item image using Image Generation API
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { improveItemImage, estimateImageCost } from '$lib/services/item-improver';
import { PRICING, USD_TO_IDR, GuardrailTripwireTriggered } from '$lib/services/openai';
import { GUARDRAIL_ERROR_MESSAGES } from '$lib/config/guardrails';
import type { ImprovementRequest, ImprovementResponse } from '$lib/types/item';

export const POST: RequestHandler = async ({ request }) => {
	const startTime = Date.now();

	try {
		// 1. Parse request body
		const body: ImprovementRequest = await request.json();
		const { itemData, quality, customPrompt } = body;

		// 2. Validate inputs
		if (!itemData) {
			return json({ error: 'Item data is required.' }, { status: 400 });
		}

		if (!itemData.category || !itemData.subcategory) {
			return json(
				{
					error: 'Item data must include category and subcategory.'
				},
				{ status: 400 }
			);
		}

		if (!quality || !['standard', 'hd'].includes(quality)) {
			return json(
				{
					error: 'Quality must be either "standard" or "hd".'
				},
				{ status: 400 }
			);
		}

		// 3. Generate improved image
		const imageUrl = await improveItemImage(itemData, quality, customPrompt);

		// 4. Calculate costs
		const processingTime = Date.now() - startTime;

		const costUsd = estimateImageCost(quality);
		const costIdr = costUsd * USD_TO_IDR;

		// 5. Return response
		const response: ImprovementResponse = {
			imageUrl,
			usage: {
				cost_usd: costUsd,
				cost_idr: costIdr,
				processing_time_ms: processingTime
			}
		};

		return json(response, { status: 200 });
	} catch (error) {
		// Handle guardrail violations
		if (error instanceof GuardrailTripwireTriggered) {
			console.warn('Guardrail triggered:', {
				timestamp: new Date().toISOString(),
				guardrail: error.name,
				message: error.message
			});

			// Determine user-friendly error message
			let errorMessage = GUARDRAIL_ERROR_MESSAGES.GENERIC;

			if (error.name?.toLowerCase().includes('topic')) {
				errorMessage = GUARDRAIL_ERROR_MESSAGES.TOPICAL_ALIGNMENT;
			} else if (error.name?.toLowerCase().includes('jailbreak')) {
				errorMessage = GUARDRAIL_ERROR_MESSAGES.JAILBREAK;
			}

			return json(
				{
					error: errorMessage,
					type: 'guardrail_violation'
				},
				{ status: 400 }
			);
		}

		// Handle other errors
		console.error('Error improving item image:', error);

		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error occurred during image improvement';

		return json(
			{
				error: `Failed to improve image: ${errorMessage}`
			},
			{ status: 500 }
		);
	}
};
