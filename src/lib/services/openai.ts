// OpenAI Client Service
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables');
}

export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

// Pricing constants (per 1M tokens)
export const PRICING = {
  EMBEDDING: 0.02, // text-embedding-3-small
  GPT_INPUT: 2.5, // gpt-4o input
  GPT_OUTPUT: 10 // gpt-4o output
} as const;

// Exchange rate (approximate)
export const USD_TO_IDR = 15000;
