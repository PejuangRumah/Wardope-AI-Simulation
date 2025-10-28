// Outfit Generator Service - Generate outfit combinations using GPT-4o
import { getOpenAIClient } from './openai';
import type { WardrobeItemWithEmbedding, OutfitCombination } from '$lib/types';

/**
 * Get the default system prompt template
 * Template variables: {{occasion}}, {{note}}
 */
export function getDefaultPromptTemplate(): string {
	return `You are a professional fashion stylist AI.

Your task: Create outfit combinations (1-5) from the provided wardrobe items for the occasion: "{{occasion}}".

IMPORTANT: Prioritize quality over quantity. If only 1 great combination exists, return just that one. If no items match the occasion or user preferences well, return an empty combinations array. Don't force mismatched outfits.

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

BACKGROUND COLOR RECOMMENDATIONS:
For each combination, recommend 3-5 background colors suitable for Instagram Story (1080x1920) that:
- Complement the outfit's color palette
- Enhance visual appeal without overwhelming the outfit
- Consider contrast for better product visibility
- Provide variety (neutral, bold, soft options)

For each combination, provide:
1. Reasoning as bullet points (2-4 concise points explaining why items work together)
2. Background color recommendations with hex codes and descriptive names

Example reasoning format:
- Color harmony: Navy blazer complements beige chinos for balanced contrast
- Occasion fit: Professional polish suitable for work/office settings
- Style coherence: Clean lines maintain minimalist aesthetic`;
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

  // Get OpenAI client with guardrails
  const openai = await getOpenAIClient();

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
                  },
                  background_colors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        hex: { type: 'string' },
                        name: { type: 'string' }
                      },
                      required: ['hex', 'name'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['id', 'items', 'reasoning', 'style_notes', 'confidence', 'background_colors'],
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
