// Cost Calculator Utility - Calculate API costs from token usage
import { PRICING, USD_TO_IDR } from '$lib/services/openai';
import type { UsageStats } from '$lib/types';

/**
 * Calculate costs from token usage
 */
export function calculateCosts(
  embeddingTokens: number,
  promptTokens: number,
  completionTokens: number,
  processingTimeMs: number
): UsageStats {
  // Calculate costs in USD
  const embeddingCost = (embeddingTokens / 1_000_000) * PRICING.EMBEDDING;
  const gptInputCost = (promptTokens / 1_000_000) * PRICING.GPT_INPUT;
  const gptOutputCost = (completionTokens / 1_000_000) * PRICING.GPT_OUTPUT;
  const totalCost = embeddingCost + gptInputCost + gptOutputCost;

  return {
    embedding_tokens: embeddingTokens,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: embeddingTokens + promptTokens + completionTokens,
    embedding_cost_usd: parseFloat(embeddingCost.toFixed(6)),
    gpt_input_cost_usd: parseFloat(gptInputCost.toFixed(6)),
    gpt_output_cost_usd: parseFloat(gptOutputCost.toFixed(6)),
    total_cost_usd: parseFloat(totalCost.toFixed(6)),
    total_cost_idr: Math.ceil(totalCost * USD_TO_IDR),
    processing_time_ms: processingTimeMs
  };
}

/**
 * Format cost for display
 */
export function formatCost(usd: number): string {
  return `$${usd.toFixed(6)}`;
}

/**
 * Format IDR cost for display
 */
export function formatCostIDR(idr: number): string {
  return `Rp ${idr.toLocaleString('id-ID')}`;
}

/**
 * Check if cost is within budget
 */
export function isWithinBudget(costIDR: number, budgetIDR: number = 1250): boolean {
  return costIDR <= budgetIDR;
}
