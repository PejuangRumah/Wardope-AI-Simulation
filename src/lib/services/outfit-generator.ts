// Outfit Generator Service - Generate outfit combinations using GPT-4o
import { openai } from './openai';
import type { WardrobeItemWithEmbedding, OutfitCombination } from '$lib/types';

/**
 * Get the default system prompt template
 * Template variables: {{occasion}}, {{note}}
 */
export function getDefaultPromptTemplate(): string {
	return `You are a professional fashion stylist AI.

Your task: Create 3-5 complete outfit combinations from the provided wardrobe items for the occasion: "{{occasion}}".

COMBINATION RULES:
1. Full Body items (Dress/Jumpsuit): Can be standalone OR can be layered with outerwear/accessories
2. Regular outfit: Must include at minimum:
   - Top (or Outerwear as top layer)
   - Bottom
   - Footwear
3. Optional additions: Outerwear, Accessories (recommended for completeness)

STYLE GUIDELINES:
- Color harmony: Consider complementary, analogous, or monochromatic color schemes
- Occasion appropriateness: Match formality level to "{{occasion}}"
- Practical combinations: Ensure items work together functionally
- Style coherence: Maintain consistent aesthetic (casual, formal, sporty, etc.)
{{note}}

For each combination, provide clear reasoning WHY these items work together.`;
}

/**
 * Build system prompt from template by replacing variables
 */
function buildSystemPrompt(template: string, occasion: string, note?: string): string {
	let prompt = template.replace(/\{\{occasion\}\}/g, occasion);

	// Handle note variable
	if (note) {
		prompt = prompt.replace('{{note}}', `- User preference: ${note}`);
	} else {
		prompt = prompt.replace('{{note}}', '');
	}

	return prompt;
}

/**
 * Generate outfit combinations using GPT-4o with structured output
 */
export async function generateOutfits(
  items: WardrobeItemWithEmbedding[],
  occasion: string,
  note?: string,
  customPrompt?: string
): Promise<{
  combinations: OutfitCombination[];
  promptTokens: number;
  completionTokens: number;
}> {
  // Prepare items for AI (remove embedding vectors)
  const itemsForAI = items.map((item) => ({
    id: item.id,
    category: item.category,
    subcategory: item.subcategory,
    desc: item.desc,
    color: item.color,
    fit: item.fit,
    brand: item.brand,
    occasion: item.occasion
  }));

  // Create system prompt - use custom if provided, otherwise use default template
  const systemPrompt = customPrompt
    ? buildSystemPrompt(customPrompt, occasion, note)
    : buildSystemPrompt(getDefaultPromptTemplate(), occasion, note);

  // Call GPT-4o with structured output
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-2024-08-06',
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Available wardrobe items:\n\n${JSON.stringify(itemsForAI, null, 2)}`
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'outfit_recommendations',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            combinations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        category: { type: 'string' },
                        subcategory: { type: 'string' },
                        color: { type: 'string' },
                        reason: { type: 'string' }
                      },
                      required: ['id', 'category', 'subcategory', 'color', 'reason'],
                      additionalProperties: false
                    }
                  },
                  reasoning: { type: 'string' },
                  style_notes: { type: 'string' },
                  confidence: {
                    type: 'string',
                    enum: ['low', 'medium', 'high']
                  }
                },
                required: ['id', 'items', 'reasoning', 'style_notes', 'confidence'],
                additionalProperties: false
              }
            }
          },
          required: ['combinations'],
          additionalProperties: false
        }
      }
    }
  });

  // Parse response
  const result = JSON.parse(response.choices[0].message.content || '{"combinations":[]}');

  return {
    combinations: result.combinations,
    promptTokens: response.usage?.prompt_tokens || 0,
    completionTokens: response.usage?.completion_tokens || 0
  };
}
