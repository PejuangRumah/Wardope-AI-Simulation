// API Endpoint - Generate outfit recommendations
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseCSV, validateWardrobeItems } from '$lib/utils/csv-parser';
import { createWardrobeEmbeddings, createQueryEmbedding } from '$lib/services/embeddings';
import { semanticSearch } from '$lib/services/vector-search';
import { generateOutfits } from '$lib/services/outfit-generator';
import { calculateCosts } from '$lib/utils/cost-calculator';
import { OCCASIONS, GENDERS } from '$lib/constants/wardrobe-master';
import type { RecommendationResponse } from '$lib/types';
import { GuardrailTripwireTriggered } from '$lib/services/openai';
import { GUARDRAIL_ERROR_MESSAGES } from '$lib/config/guardrails';

export const POST: RequestHandler = async ({ request }) => {
  const startTime = Date.now();

  try {
    // 1. Parse form data
    const formData = await request.formData();
    const gender = formData.get('gender') as string;
    const csvFile = formData.get('csv') as File;
    const occasion = formData.get('occasion') as string;
    const note = (formData.get('note') as string) || '';
    const customPrompt = formData.get('customPrompt') as string;

    // 2. Validate inputs
    if (!gender || !GENDERS.includes(gender as any)) {
      return json({ error: 'Invalid gender. Must be "men" or "women".' }, { status: 400 });
    }

    if (!csvFile) {
      return json({ error: 'CSV file is required.' }, { status: 400 });
    }

    if (!occasion || !OCCASIONS.includes(occasion as any)) {
      return json(
        {
          error: `Invalid occasion. Must be one of: ${OCCASIONS.join(', ')}.`
        },
        { status: 400 }
      );
    }

    // 3. Parse CSV
    const csvText = await csvFile.text();
    const rawItems = parseCSV(csvText);

    // 4. Validate items
    const { valid: items, invalid } = validateWardrobeItems(rawItems);

    if (items.length === 0) {
      return json(
        {
          error: 'No valid items found in CSV. Please check required fields: id, desc, category, subcategory, color.'
        },
        { status: 400 }
      );
    }

    // Log warnings for invalid items
    if (invalid.length > 0) {
      console.warn(`Warning: ${invalid.length} invalid items at CSV lines: ${invalid.join(', ')}`);
    }

    // 5. Create embeddings for wardrobe items
    const { itemsWithEmbeddings, totalTokens: embeddingTokens } =
      await createWardrobeEmbeddings(items);

    // 6. Create query embedding
    const { embedding: queryEmbedding, tokens: queryTokens } = await createQueryEmbedding(
      occasion,
      note
    );

    const totalEmbeddingTokens = embeddingTokens + queryTokens;

    // 7. Semantic search + category balancing
    const { selectedItems } = semanticSearch(itemsWithEmbeddings, queryEmbedding);

    // 8. Generate outfit combinations with GPT 5.1 Nano
    const { combinations, promptTokens, completionTokens } = await generateOutfits(
      selectedItems,
      occasion,
      note,
      customPrompt
    );

    // 9. Calculate costs
    const processingTime = Date.now() - startTime;
    const usage = calculateCosts(totalEmbeddingTokens, promptTokens, completionTokens, processingTime);

    // 10. Return response
    const response: RecommendationResponse = {
      combinations,
      usage,
      metadata: {
        gender,
        occasion,
        total_items: items.length,
        items_considered: selectedItems.length
      }
    };

    return json(response);
  } catch (error) {
    // Handle guardrail violations (prompt injection, off-topic, etc.)
    if (error instanceof GuardrailTripwireTriggered) {
      console.warn('Guardrail triggered:', {
        timestamp: new Date().toISOString(),
        guardrail: error.name,
        input: error.message
      });

      // Determine error message based on guardrail type
      let errorMessage: string = GUARDRAIL_ERROR_MESSAGES.GENERIC;
      if (error.name?.toLowerCase().includes('topical')) {
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
    console.error('Error generating recommendations:', error);

    return json(
      {
        error: 'Failed to generate recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};
