<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { X, Save, Loader2 } from "lucide-svelte";
    import MultiSelect from "./MultiSelect.svelte";
    import type { WardrobeMasterData, WardrobeItem } from "$lib/types/wardrobe";

    export let item: WardrobeItem;
    export let masterData: WardrobeMasterData;

    const dispatch = createEventDispatcher();

    let isProcessing = false;
    let processingStep = "";

    // Initialize form data from item
    let formData = {
        category: item.category,
        subcategory: item.subcategory,
        colors: item.colors.map((c) => c.name),
        fit: item.fit || "",
        brand: item.brand || "",
        occasions: item.occasions.map((o) => o.name),
        description: item.description,
    };

    // Filtered subcategories based on selected category
    $: filteredSubcategories = formData.category
        ? masterData.subcategories.filter((s) => {
              const category = masterData.categories.find(
                  (c) => c.name === formData.category,
              );
              return category && s.category_id === category.id;
          })
        : [];

    // Filtered fits based on selected category
    $: filteredFits = formData.category
        ? masterData.fits.filter((f) => {
              const category = masterData.categories.find(
                  (c) => c.name === formData.category,
              );
              return category && f.category_id === category.id;
          })
        : [];

    // Debugging
    $: if (formData.category) {
        const category = masterData.categories.find(
            (c) => c.name === formData.category,
        );
        console.log(
            "Selected Category:",
            formData.category,
            "ID:",
            category?.id,
        );
        console.log("All Fits:", masterData.fits);
        if (category) {
            const matches = masterData.fits.filter(
                (f) => f.category_id === category.id,
            );
            console.log("Direct Matches:", matches.length);
            if (matches.length === 0) {
                console.log(
                    "Sample Fit Category IDs:",
                    masterData.fits.slice(0, 3).map((f) => f.category_id),
                );
            }
        }
        console.log("Filtered Fits:", filteredFits.length);
    }

    async function updateItem() {
        // Validate required fields
        if (
            !formData.category ||
            !formData.subcategory ||
            formData.colors.length === 0 ||
            !formData.description
        ) {
            alert(
                "Please fill in all required fields (category, subcategory, at least one color, description)",
            );
            return;
        }

        isProcessing = true;
        processingStep = "Updating item...";

        try {
            const response = await fetch(`/api/wardrobe-items/${item.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    description: formData.description,
                    category: formData.category,
                    subcategory: formData.subcategory,
                    colors: formData.colors,
                    fit: formData.fit || undefined,
                    brand: formData.brand || undefined,
                    occasions:
                        formData.occasions.length > 0
                            ? formData.occasions
                            : undefined,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to update item");
            }

            dispatch("success");
        } catch (error) {
            console.error("Update error:", error);
            alert(
                `Failed to update item: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        } finally {
            isProcessing = false;
            processingStep = "";
        }
    }

    function closeModal() {
        dispatch("close");
    }
</script>

<!-- Modal Overlay -->
<div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
>
    <!-- Modal Container -->
    <div
        class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
    >
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b">
            <h2 class="text-2xl font-bold text-gray-900">Edit Wardrobe Item</h2>
            <button
                on:click={closeModal}
                class="text-gray-400 hover:text-gray-600 transition"
            >
                <X class="w-6 h-6" />
            </button>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-6">
            <!-- Image Preview (Read-only) -->
            <div class="flex justify-center">
                <img
                    src={item.improved_image_url || item.image_url}
                    alt={item.subcategory}
                    class="h-48 object-contain rounded border bg-gray-50"
                />
            </div>

            <!-- Item Details Form -->
            <div class="space-y-4">
                <!-- Category -->
                <div>
                    <label
                        for="edit-category"
                        class="block text-sm font-medium text-gray-700 mb-1"
                    >
                        Category <span class="text-red-500">*</span>
                    </label>
                    <select
                        id="edit-category"
                        bind:value={formData.category}
                        class="w-full px-3 py-2 border rounded-lg"
                        required
                    >
                        <option value="">Select category...</option>
                        {#each masterData.categories as category}
                            <option value={category.name}
                                >{category.name}</option
                            >
                        {/each}
                    </select>
                </div>

                <!-- Subcategory -->
                <div>
                    <label
                        for="edit-subcategory"
                        class="block text-sm font-medium text-gray-700 mb-1"
                    >
                        Subcategory <span class="text-red-500">*</span>
                    </label>
                    <select
                        id="edit-subcategory"
                        bind:value={formData.subcategory}
                        class="w-full px-3 py-2 border rounded-lg"
                        required
                        disabled={!formData.category}
                    >
                        <option value="">Select subcategory...</option>
                        {#each filteredSubcategories as subcategory}
                            <option value={subcategory.name}
                                >{subcategory.name}</option
                            >
                        {/each}
                    </select>
                </div>

                <!-- Colors (Multi-select) -->
                <div>
                    <MultiSelect
                        id="edit-colors"
                        label="Colors"
                        required={true}
                        options={masterData.colors}
                        bind:selectedValues={formData.colors}
                        placeholder="Select colors..."
                        showColorDots={true}
                    />
                </div>

                <!-- Fit -->
                <div>
                    <label
                        for="edit-fit"
                        class="block text-sm font-medium text-gray-700 mb-1"
                        >Fit (Optional)</label
                    >
                    <select
                        id="edit-fit"
                        bind:value={formData.fit}
                        class="w-full px-3 py-2 border rounded-lg"
                        disabled={!formData.category}
                    >
                        <option value="">Select fit...</option>
                        {#each filteredFits as fit}
                            <option value={fit.name}>{fit.name}</option>
                        {/each}
                    </select>
                </div>

                <!-- Brand -->
                <div>
                    <label
                        for="edit-brand"
                        class="block text-sm font-medium text-gray-700 mb-1"
                        >Brand (Optional)</label
                    >
                    <input
                        id="edit-brand"
                        type="text"
                        bind:value={formData.brand}
                        placeholder="e.g., Nike, Adidas..."
                        class="w-full px-3 py-2 border rounded-lg"
                    />
                </div>

                <!-- Occasions (Multi-select) -->
                <div>
                    <MultiSelect
                        id="edit-occasions"
                        label="Occasions (Optional)"
                        required={false}
                        options={masterData.occasions}
                        bind:selectedValues={formData.occasions}
                        placeholder="Select occasions..."
                        showColorDots={false}
                    />
                </div>

                <!-- Description -->
                <div>
                    <label
                        for="edit-description"
                        class="block text-sm font-medium text-gray-700 mb-1"
                    >
                        Description <span class="text-red-500">*</span>
                    </label>
                    <textarea
                        bind:value={formData.description}
                        rows="3"
                        placeholder="Describe the item..."
                        class="w-full px-3 py-2 border rounded-lg"
                        required
                    ></textarea>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3 pt-4 border-t">
                <button
                    on:click={closeModal}
                    class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    on:click={updateItem}
                    disabled={isProcessing}
                    class="flex-1 bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                    {#if isProcessing}
                        <Loader2 class="w-5 h-5 animate-spin" />
                        {processingStep}
                    {:else}
                        <Save class="w-5 h-5" />
                        Update Item
                    {/if}
                </button>
            </div>
        </div>
    </div>
</div>
