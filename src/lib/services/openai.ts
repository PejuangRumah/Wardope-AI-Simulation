// OpenAI Client Service with Guardrails
import { GuardrailsOpenAI, GuardrailTripwireTriggered } from '@openai/guardrails';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';
import { guardrailsConfig } from '$lib/config/guardrails';

if (!OPENAI_API_KEY) {
	throw new Error('OPENAI_API_KEY is not set in environment variables');
}

// Lazy initialization - clients created on first use
let _openaiClient: GuardrailsOpenAI | null = null;
let _openaiClientWithoutGuardrails: OpenAI | null = null;

/**
 * Get or create GuardrailsOpenAI client (lazy initialization)
 * Client is created once and cached for subsequent calls
 * Use this for outfit recommendation where user text input needs validation
 *
 * @returns Promise resolving to GuardrailsOpenAI client instance
 * @throws Error if OPENAI_API_KEY is not set
 */
export async function getOpenAIClient(): Promise<GuardrailsOpenAI> {
	if (!_openaiClient) {
		_openaiClient = await GuardrailsOpenAI.create(
			guardrailsConfig,           // Param 1: Guardrails pipeline config
			{ apiKey: OPENAI_API_KEY }, // Param 2: OpenAI client options
			false                       // Param 3: raiseGuardrailErrors (fail-safe mode)
		);
	}
	return _openaiClient;
}

/**
 * Get or create standard OpenAI client WITHOUT guardrails (lazy initialization)
 * Use this for item improvement where only image input is used (no user text to validate)
 *
 * @returns OpenAI client instance
 * @throws Error if OPENAI_API_KEY is not set
 */
export function getOpenAIClientWithoutGuardrails(): OpenAI {
	if (!_openaiClientWithoutGuardrails) {
		_openaiClientWithoutGuardrails = new OpenAI({
			apiKey: OPENAI_API_KEY
		});
	}
	return _openaiClientWithoutGuardrails;
}

// Export error type for handling guardrail violations
export { GuardrailTripwireTriggered };

// Pricing constants (per 1M tokens for text, per image for vision/generation)
export const PRICING = {
  EMBEDDING: 0.02, // text-embedding-3-small (per 1M tokens)
  GPT_INPUT: 2.5, // gpt-4o input (per 1M tokens)
  GPT_OUTPUT: 10, // gpt-4o output (per 1M tokens)
  VISION_IMAGE: 0.00765, // gpt-4o vision per image (~765 tokens for 1024x1024)
  IMAGE_GEN_STANDARD: 0.04, // gpt-image-1 standard quality (per image, 1024x1024)
  IMAGE_GEN_HD: 0.08 // gpt-image-1 HD quality (per image, 1024x1024)
} as const;

// Exchange rate (approximate)
export const USD_TO_IDR = 16600;
