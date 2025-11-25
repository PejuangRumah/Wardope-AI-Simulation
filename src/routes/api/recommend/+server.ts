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

export const POST: RequestHandler = async ({ request, locals }) => {
  const startTime = Date.now();

  try {
    // 1. Parse form data
    const formData = await request.formData();
    const gender = formData.get('gender') as string;
    // CSV file is no longer used
    const occasion = formData.get('occasion') as string;
    const note = (formData.get('note') as string) || '';
    const customPrompt = formData.get('customPrompt') as string;

    // 2. Validate inputs
    if (!gender || !GENDERS.includes(gender as any)) {
      return json({ error: 'Invalid gender. Must be "men" or "women".' }, { status: 400 });
    }

    if (!occasion || !OCCASIONS.includes(occasion as any)) {
      return json(
        {
          error: `Invalid occasion. Must be one of: ${OCCASIONS.join(', ')}.`
        },
        { status: 400 }
      );
    }

    // 3. Fetch wardrobe items from backend
    const session = await locals.getSession();
    if (!session) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Import dynamically to avoid circular dependency issues if any, though standard import is fine here
    const { listWardrobeItems } = await import('$lib/services/wardrobe');
    
    // Fetch all items (pagination might be needed for very large wardrobes, but for now fetch a reasonable limit)
    // We fetch 100 items for now. In a real app we might need better strategy.
    const wardrobeResponse = await listWardrobeItems(session.user.id, { limit: 100 }, locals.supabase);
    
    if (wardrobeResponse.items.length === 0) {
       return json(
        {
          error: 'Your wardrobe is empty. Please add items to your wardrobe first.'
        },
        { status: 400 }
      );
    }

    // 4. Transform backend items to "CSV-like" format expected by the system
    const rawItems = wardrobeResponse.items.map(item => ({
      id: item.id,
      desc: item.description,
      category: item.category,
      subcategory: item.subcategory,
      color: item.colors.map(c => c.name).join(', '),
      fit: item.fit || '',
      brand: item.brand || '',
      occasion: item.occasions.map(o => o.name).join(', '),
      image: item.image_url || '', // Use the signed URL
      price: '', // Backend doesn't seem to have price, leave empty
      gender: gender // Add gender context if needed, though filtering happens later
    }));

    // 5. Validate items (reuse existing validation logic)
    const { valid: items, invalid } = validateWardrobeItems(rawItems);

    if (items.length === 0) {
      return json(
        {
          error: 'No valid items found in your wardrobe. Please ensure items have description, category, and color.'
        },
        { status: 400 }
      );
    }

    // 6. Create embeddings for wardrobe items
    const { itemsWithEmbeddings, totalTokens: embeddingTokens } =
      await createWardrobeEmbeddings(items);

    // 7. Create query embedding
    const { embedding: queryEmbedding, tokens: queryTokens } = await createQueryEmbedding(
      occasion,
      note
    );

    const totalEmbeddingTokens = embeddingTokens + queryTokens;

    // 8. Semantic search + category balancing
    const { selectedItems } = semanticSearch(itemsWithEmbeddings, queryEmbedding);

    // 9. Generate outfit combinations with GPT 5.1 Nano
    const { combinations, promptTokens, completionTokens } = await generateOutfits(
      selectedItems,
      occasion,
      note,
      customPrompt
    );

    // 10. Calculate costs
    const processingTime = Date.now() - startTime;
    const usage = calculateCosts(totalEmbeddingTokens, promptTokens, completionTokens, processingTime);

    // 11. Return response
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
