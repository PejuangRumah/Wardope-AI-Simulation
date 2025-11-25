<script lang="ts">
    export let showProcessExplanation: boolean;

    import {
        FileText,
        Database,
        Search,
        ListFilter,
        Sparkles,
        Calculator,
        Clock,
        DollarSign,
        RefreshCw,
        Check,
        Info,
    } from "lucide-svelte";
</script>

<div class="border border-gray-300 rounded-lg overflow-hidden">
    <button
        type="button"
        on:click={() => (showProcessExplanation = !showProcessExplanation)}
        class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
    >
        <div class="flex items-center gap-2">
            <svg
                class="w-5 h-5 text-gray-600 transition-transform {showProcessExplanation
                    ? 'rotate-90'
                    : ''}"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                />
            </svg>
            <span class="text-sm font-medium text-gray-700"
                >How AI Recommendation Works</span
            >
            <span
                class="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded"
            >
                Info
            </span>
        </div>
        <span class="text-xs text-gray-500">
            {showProcessExplanation ? "Hide" : "Show"}
        </span>
    </button>

    {#if showProcessExplanation}
        <div class="p-4 bg-white">
            <!-- Introduction -->
            <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div class="flex items-start gap-2">
                    <Info class="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p class="text-sm text-gray-900 font-medium mb-1">
                            Understanding the AI Recommendation Pipeline
                        </p>
                        <p class="text-xs text-gray-600">
                            This system uses OpenAI Guardrails for input
                            validation, OpenAI's embeddings for semantic search,
                            and GPT 5.1 Nano to create intelligent outfit
                            recommendations. The process takes 5-8 seconds and
                            costs approximately Rp 150-200 per request.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Process Steps -->
            <div class="space-y-3">
                <!-- Step 0: Input Validation (Guardrails) -->
                <div class="border border-blue-200 rounded-lg p-3 bg-blue-50">
                    <div class="flex items-start gap-3">
                        <div
                            class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold"
                        >
                            0
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <svg
                                    class="w-4 h-4 text-blue-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                    />
                                </svg>
                                <h4 class="text-sm font-semibold text-gray-900">
                                    Input Validation (Guardrails)
                                </h4>
                                <span
                                    class="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded"
                                    >Security</span
                                >
                            </div>
                            <p class="text-xs text-gray-600 mb-2">
                                Validate user notes to prevent prompt injection
                                attacks and ensure inputs stay within outfit
                                preference context. Uses OpenAI Guardrails with
                                off-topic detection and jailbreak prevention.
                            </p>
                            <div
                                class="p-2 bg-white border border-blue-200 rounded text-xs mb-2"
                            >
                                <div class="font-medium text-gray-700 mb-1">
                                    Protection Against:
                                </div>
                                <ul class="space-y-0.5 text-gray-600">
                                    <li>
                                        • Prompt injection attempts ("ignore
                                        instructions")
                                    </li>
                                    <li>
                                        • System manipulation ("act as different
                                        AI")
                                    </li>
                                    <li>
                                        • Off-topic requests (non-fashion
                                        queries)
                                    </li>
                                </ul>
                            </div>
                            <div
                                class="flex items-center gap-4 text-xs text-gray-500"
                            >
                                <span class="flex items-center gap-1">
                                    <Clock class="w-3.5 h-3.5" />
                                    ~200ms
                                </span>
                                <span
                                    class="flex items-center gap-1 text-gray-700"
                                >
                                    <DollarSign class="w-3.5 h-3.5" />
                                    $0.00001 USD (Rp 0.15)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Step 1: CSV Parsing -->
                <div class="border border-gray-200 rounded-lg p-3 bg-white">
                    <div class="flex items-start gap-3">
                        <div
                            class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold"
                        >
                            1
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <FileText class="w-4 h-4 text-gray-600" />
                                <h4 class="text-sm font-semibold text-gray-900">
                                    CSV Parsing & Validation
                                </h4>
                            </div>
                            <p class="text-xs text-gray-600 mb-2">
                                Parse uploaded CSV file and validate required
                                fields (id, desc, category, subcategory, color).
                            </p>
                            <div
                                class="flex items-center gap-4 text-xs text-gray-500"
                            >
                                <span class="flex items-center gap-1">
                                    <Clock class="w-3.5 h-3.5" />
                                    ~50ms
                                </span>
                                <span
                                    class="flex items-center gap-1 text-gray-600"
                                >
                                    <Check class="w-3.5 h-3.5" />
                                    No API cost
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Step 2: Create Embeddings -->
                <div class="border border-gray-200 rounded-lg p-3 bg-white">
                    <div class="flex items-start gap-3">
                        <div
                            class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold"
                        >
                            2
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <Database class="w-4 h-4 text-gray-600" />
                                <h4 class="text-sm font-semibold text-gray-900">
                                    Create Item Embeddings
                                </h4>
                            </div>
                            <p class="text-xs text-gray-600 mb-2">
                                Convert each wardrobe item into a
                                1536-dimensional vector using <code
                                    class="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono"
                                    >text-embedding-3-small</code
                                >. Embeddings capture semantic meaning for
                                similarity search.
                            </p>
                            <div
                                class="p-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono text-gray-700 mb-2"
                            >
                                Category: Top | Type: Shirt | Color: Blue |
                                Occasion: Casual → [0.123, -0.456, ...]
                            </div>
                            <div
                                class="flex items-center gap-4 text-xs text-gray-500 flex-wrap"
                            >
                                <span class="flex items-center gap-1">
                                    <Clock class="w-3.5 h-3.5" />
                                    ~1-2s (86 items)
                                </span>
                                <span
                                    class="flex items-center gap-1 text-gray-700"
                                >
                                    <DollarSign class="w-3.5 h-3.5" />
                                    $0.0001 USD (Rp 1.5)
                                </span>
                                <span
                                    class="flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-0.5 rounded"
                                >
                                    <RefreshCw class="w-3 h-3" />
                                    Cached 1 hour
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Step 3: Query Embedding -->
                <div class="border border-gray-200 rounded-lg p-3 bg-white">
                    <div class="flex items-start gap-3">
                        <div
                            class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold"
                        >
                            3
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <Search class="w-4 h-4 text-gray-600" />
                                <h4 class="text-sm font-semibold text-gray-900">
                                    Query Embedding
                                </h4>
                            </div>
                            <p class="text-xs text-gray-600 mb-2">
                                Create embedding for user query: occasion +
                                preferences.
                            </p>
                            <div
                                class="p-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono text-gray-700 mb-2"
                            >
                                "casual outfit prefer blue colors" → [0.789,
                                -0.234, ...]
                            </div>
                            <div
                                class="flex items-center gap-4 text-xs text-gray-500"
                            >
                                <span class="flex items-center gap-1">
                                    <Clock class="w-3.5 h-3.5" />
                                    ~200ms
                                </span>
                                <span
                                    class="flex items-center gap-1 text-gray-700"
                                >
                                    <DollarSign class="w-3.5 h-3.5" />
                                    $0.00001 USD (Rp 0.15)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Step 4: Semantic Search -->
                <div class="border border-gray-200 rounded-lg p-3 bg-white">
                    <div class="flex items-start gap-3">
                        <div
                            class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold"
                        >
                            4
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <ListFilter class="w-4 h-4 text-gray-600" />
                                <h4 class="text-sm font-semibold text-gray-900">
                                    Semantic Search (Vector Similarity)
                                </h4>
                            </div>
                            <p class="text-xs text-gray-600 mb-2">
                                Calculate cosine similarity between query and
                                all items. Select top items per category to
                                ensure variety.
                            </p>
                            <div
                                class="p-2 bg-gray-50 border border-gray-200 rounded text-xs mb-2"
                            >
                                <div class="font-medium text-gray-700 mb-1">
                                    Selection Strategy:
                                </div>
                                <ul class="space-y-0.5 text-gray-600">
                                    <li>Tops: Top 15 most similar</li>
                                    <li>Bottoms: Top 15 most similar</li>
                                    <li>Footwear: Top 8 most similar</li>
                                    <li>Outerwear: Top 8 most similar</li>
                                    <li>Accessories: Top 5 most similar</li>
                                </ul>
                                <div class="mt-1 text-gray-600 font-medium">
                                    Total: ~40-50 items sent to AI
                                </div>
                            </div>
                            <div
                                class="flex items-center gap-4 text-xs text-gray-500"
                            >
                                <span class="flex items-center gap-1">
                                    <Clock class="w-3.5 h-3.5" />
                                    ~100ms
                                </span>
                                <span
                                    class="flex items-center gap-1 text-gray-600"
                                >
                                    <Check class="w-3.5 h-3.5" />
                                    No API cost
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Step 5: GPT 5.1 Nano Combination -->
                <div class="border border-gray-200 rounded-lg p-3 bg-white">
                    <div class="flex items-start gap-3">
                        <div
                            class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold"
                        >
                            5
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <Sparkles class="w-4 h-4 text-gray-600" />
                                <h4 class="text-sm font-semibold text-gray-900">
                                    GPT 5.1 Nano Outfit Generation
                                </h4>
                            </div>
                            <p class="text-xs text-gray-600 mb-2">
                                AI analyzes filtered items and creates 3-5
                                complete outfit combinations with reasoning.
                                Uses structured output (JSON Schema) for
                                consistent results.
                            </p>
                            <div
                                class="p-2 bg-gray-50 border border-gray-200 rounded text-xs mb-2"
                            >
                                <div class="font-medium text-gray-700 mb-1">
                                    AI Considerations:
                                </div>
                                <ul class="space-y-0.5 text-gray-600">
                                    <li>
                                        Color harmony (complementary, analogous,
                                        monochromatic)
                                    </li>
                                    <li>
                                        Occasion appropriateness (formality
                                        level)
                                    </li>
                                    <li>
                                        Style coherence (consistent aesthetic)
                                    </li>
                                    <li>
                                        Practical combinations (functional
                                        items)
                                    </li>
                                    <li>
                                        Background color recommendations for
                                        Instagram
                                    </li>
                                </ul>
                            </div>
                            <div
                                class="flex items-center gap-4 text-xs text-gray-500 flex-wrap"
                            >
                                <span class="flex items-center gap-1">
                                    <Clock class="w-3.5 h-3.5" />
                                    ~3-5s
                                </span>
                                <span
                                    class="flex items-center gap-1 text-gray-700"
                                >
                                    <DollarSign class="w-3.5 h-3.5" />
                                    Input: $0.005 (Rp 75)
                                </span>
                                <span
                                    class="flex items-center gap-1 text-gray-700"
                                >
                                    <DollarSign class="w-3.5 h-3.5" />
                                    Output: $0.005 (Rp 75)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Step 6: Cost Calculation -->
                <div class="border border-gray-200 rounded-lg p-3 bg-white">
                    <div class="flex items-start gap-3">
                        <div
                            class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold"
                        >
                            6
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <Calculator class="w-4 h-4 text-gray-600" />
                                <h4 class="text-sm font-semibold text-gray-900">
                                    Cost Calculation & Response
                                </h4>
                            </div>
                            <p class="text-xs text-gray-600 mb-2">
                                Calculate total token usage and costs in USD and
                                IDR. Return recommendations with full
                                transparency.
                            </p>
                            <div
                                class="p-2 bg-gray-50 border border-gray-200 rounded text-xs"
                            >
                                <div
                                    class="grid grid-cols-2 gap-2 text-gray-700"
                                >
                                    <div>
                                        <div class="font-medium">
                                            Total Tokens:
                                        </div>
                                        <div class="text-gray-600">
                                            ~6,000 tokens
                                        </div>
                                    </div>
                                    <div>
                                        <div class="font-medium">
                                            Total Cost:
                                        </div>
                                        <div class="text-gray-600">
                                            ~$0.01 (Rp 150)
                                        </div>
                                    </div>
                                    <div>
                                        <div class="font-medium">
                                            Processing Time:
                                        </div>
                                        <div class="text-gray-600">
                                            ~5-8 seconds
                                        </div>
                                    </div>
                                    <div>
                                        <div class="font-medium">
                                            Budget Margin:
                                        </div>
                                        <div class="text-gray-600">
                                            88% under budget
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div
                                class="flex items-center gap-4 text-xs text-gray-500 mt-2"
                            >
                                <span class="flex items-center gap-1">
                                    <Clock class="w-3.5 h-3.5" />
                                    Instant
                                </span>
                                <span
                                    class="flex items-center gap-1 text-gray-600"
                                >
                                    <Check class="w-3.5 h-3.5" />
                                    No API cost
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Summary -->
            <div class="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div class="flex items-start gap-2">
                    <Info class="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
                    <div class="text-xs text-gray-700">
                        <p class="font-semibold mb-1">Why This Approach?</p>
                        <p class="text-gray-600 mb-2">
                            <strong>Guardrails</strong> protect against
                            malicious inputs before processing begins, ensuring
                            system integrity. <strong>Semantic search</strong>
                            ensures AI only considers the most relevant items
                            (reducing cost by 80%+), while
                            <strong>GPT 5.1 Nano</strong> creates stylistically coherent
                            combinations with detailed reasoning. Embeddings are
                            cached to avoid repeated API calls for the same wardrobe.
                        </p>
                        <p class="text-gray-600">
                            This multi-layered approach balances security,
                            cost-efficiency, and quality to deliver safe,
                            intelligent outfit recommendations.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>
