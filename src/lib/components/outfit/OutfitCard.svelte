<script lang="ts">
    import type { RecommendationResponse } from "$lib/types";

    export let combo: RecommendationResponse["combinations"][0];
    export let index: number;
    export let addedItems: Set<string>;
    export let onAddToCanvas: (itemId: string) => void;

    function getImagePath(itemId: string): string {
        // Get image from wardrobe items API
        return `/api/wardrobe-items/${itemId}/image`;
    }

    function isItemAdded(itemId: string): boolean {
        return addedItems.has(itemId);
    }
</script>

```
<div class="border border-gray-200 rounded-lg p-6">
    <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">Outfit {combo.id || index + 1}</h3>
        <span
            class="px-3 py-1 rounded-full text-xs font-semibold uppercase {combo.confidence ===
            'high'
                ? 'bg-green-100 text-green-800'
                : combo.confidence === 'medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'}"
        >
            {combo.confidence} confidence
        </span>
    </div>

    <div class="flex gap-4 overflow-x-auto pb-4 mb-6 snap-x snap-mandatory">
        {#each combo.items as item}
            <div
                class="border rounded-lg p-4 flex-shrink-0 w-64 transition-all snap-start {isItemAdded(
                    item.id,
                )
                    ? 'border-green-500 bg-green-50 ring-2 ring-green-300'
                    : 'border-gray-200'}"
            >
                <div class="mb-3">
                    <img
                        src={getImagePath(item.id)}
                        alt="Item {item.id}"
                        class="w-full h-48 object-contain bg-gray-50 rounded"
                        on:error={(e) => {
                            const target = e.currentTarget;
                            target.style.display = "none";
                        }}
                    />
                </div>
                <div class="flex items-start justify-between mb-2">
                    <span class="text-xs font-semibold text-gray-500"
                        >ID: {item.id}</span
                    >
                    <span
                        class="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded"
                    >
                        {item.category}
                    </span>
                </div>
                {#if item.subcategory}
                    <p class="text-sm text-gray-700 mb-1">{item.subcategory}</p>
                {/if}
                {#if item.color}
                    <p class="text-sm text-gray-600 mb-2">
                        Color: {item.color}
                    </p>
                {/if}
                <p class="text-sm text-gray-800 leading-relaxed mb-3">
                    {item.reason}
                </p>
                {#if isItemAdded(item.id)}
                    <button
                        type="button"
                        disabled
                        class="w-full bg-green-600 text-white text-sm font-semibold py-2 px-3 rounded cursor-default"
                    >
                        Added to Canvas
                    </button>
                {:else}
                    <button
                        type="button"
                        on:click={() => onAddToCanvas(item.id)}
                        class="w-full bg-blue-600 text-white text-sm font-semibold py-2 px-3 rounded hover:bg-blue-700 transition-colors"
                    >
                        Add to Canvas
                    </button>
                {/if}
            </div>
        {/each}
    </div>

    <div class="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
        <h4 class="font-semibold text-blue-900 mb-2">Reasoning</h4>
        <p class="text-blue-800 text-sm leading-relaxed">{combo.reasoning}</p>
        {#if combo.style_notes}
            <p class="text-blue-700 text-sm mt-2 italic">{combo.style_notes}</p>
        {/if}
    </div>
</div>
