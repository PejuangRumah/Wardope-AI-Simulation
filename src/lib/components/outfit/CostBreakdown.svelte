<script lang="ts">
    import type { RecommendationResponse } from "$lib/types";

    export let usage: RecommendationResponse["usage"];
</script>

<div class="bg-white rounded-lg shadow-sm p-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">
        API Usage & Cost Breakdown
    </h3>

    <div class="grid md:grid-cols-2 gap-6 mb-6">
        <!-- Token Usage -->
        <div>
            <h4 class="text-sm font-medium text-gray-700 mb-3">Token Usage</h4>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                    <span class="text-gray-600">Embedding tokens:</span>
                    <span class="font-mono"
                        >{usage.embedding_tokens.toLocaleString()}</span
                    >
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Input tokens (GPT):</span>
                    <span class="font-mono"
                        >{usage.prompt_tokens.toLocaleString()}</span
                    >
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Output tokens (GPT):</span>
                    <span class="font-mono"
                        >{usage.completion_tokens.toLocaleString()}</span
                    >
                </div>
                <div class="flex justify-between pt-2 border-t font-semibold">
                    <span>Total tokens:</span>
                    <span class="font-mono"
                        >{usage.total_tokens.toLocaleString()}</span
                    >
                </div>
            </div>
        </div>

        <!-- Cost -->
        <div>
            <h4 class="text-sm font-medium text-gray-700 mb-3">
                Cost Breakdown
            </h4>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                    <span class="text-gray-600">Embedding cost:</span>
                    <span class="font-mono"
                        >${usage.embedding_cost_usd.toFixed(6)}</span
                    >
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">GPT input cost:</span>
                    <span class="font-mono"
                        >${usage.gpt_input_cost_usd.toFixed(6)}</span
                    >
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">GPT output cost:</span>
                    <span class="font-mono"
                        >${usage.gpt_output_cost_usd.toFixed(6)}</span
                    >
                </div>
                <div class="flex justify-between pt-2 border-t font-semibold">
                    <span>Total cost (USD):</span>
                    <span class="font-mono"
                        >${usage.total_cost_usd.toFixed(6)}</span
                    >
                </div>
                <div class="flex justify-between font-semibold">
                    <span>Total cost (IDR):</span>
                    <span class="font-mono"
                        >Rp {usage.total_cost_idr.toLocaleString("id-ID")}</span
                    >
                </div>
            </div>
        </div>
    </div>

    <!-- Budget Status -->
    <div
        class="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg {usage.total_cost_idr <=
        1250
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'}"
    >
        <div class="flex flex-wrap gap-4 text-sm">
            <span class="text-gray-700">
                Budget: <strong>Rp 1,250</strong>
            </span>
            <span class="text-gray-400">|</span>
            <span class="text-gray-700">
                Used: <strong
                    >Rp {usage.total_cost_idr.toLocaleString("id-ID")}</strong
                >
            </span>
            <span class="text-gray-400">|</span>
            <span class="text-gray-700">
                Time: <strong
                    >{(usage.processing_time_ms / 1000).toFixed(2)}s</strong
                >
            </span>
        </div>
        <span
            class="px-4 py-2 rounded-md font-semibold text-sm {usage.total_cost_idr <=
            1250
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'}"
        >
            {usage.total_cost_idr <= 1250 ? "UNDER BUDGET" : "OVER BUDGET"}
        </span>
    </div>
</div>
