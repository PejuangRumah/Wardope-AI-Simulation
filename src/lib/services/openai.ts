// OpenAI Client Service with Guardrails
import { GuardrailsOpenAI, GuardrailTripwireTriggered } from '@openai/guardrails';
import { OPENAI_API_KEY } from '$env/static/private';
import { guardrailsConfig } from '$lib/config/guardrails';

if (!OPENAI_API_KEY) {
	throw new Error('OPENAI_API_KEY is not set in environment variables');
}

// Lazy initialization - client created on first use
let _openaiClient: GuardrailsOpenAI | null = null;

/**
 * Get or create GuardrailsOpenAI client (lazy initialization)
 * Client is created once and cached for subsequent calls
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

// Export error type for handling guardrail violations
export { GuardrailTripwireTriggered };

// Pricing constants (per 1M tokens)
export const PRICING = {
  EMBEDDING: 0.02, // text-embedding-3-small
  GPT_INPUT: 2.5, // gpt-4o input
  GPT_OUTPUT: 10 // gpt-4o output
} as const;

// Exchange rate (approximate)
export const USD_TO_IDR = 15000;
