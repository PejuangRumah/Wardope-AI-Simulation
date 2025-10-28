// API Endpoint - Improve fashion item image using Image Generation API
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { improveItemImage, estimateImageCost } from '$lib/services/item-improver';
import { USD_TO_IDR } from '$lib/services/openai';
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

		if (!quality || !['low', 'medium', 'high'].includes(quality)) {
			return json(
				{
					error: 'Quality must be "low", "medium", or "high".'
				},
				{ status: 400 }
			);
		}

		// 3. Generate improved image
		const imageUrl = await improveItemImage(itemData, quality, customPrompt);

		// 4. Calculate costs
		const processingTime = Date.now() - startTime;

		const costUsd = estimateImageCost(quality);
		const costIdr = Math.ceil(costUsd * USD_TO_IDR); // Round up to integer (prevents decimal locale issues)

		// DEBUG: Log cost calculation details
		console.log('🔍 IMPROVEMENT COST DEBUG:', {
			quality,
			costUsd,
			USD_TO_IDR,
			costIdr,
			costIdrType: typeof costIdr,
			processingTime
		});

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
		// Handle errors
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
