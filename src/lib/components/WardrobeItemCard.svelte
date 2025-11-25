<script lang="ts">
	import { Trash2, Edit } from "lucide-svelte";
	import type { WardrobeItem } from "$lib/types/wardrobe";

	export let item: WardrobeItem;

	async function handleDelete() {
		if (
			!confirm(
				`Delete ${item.subcategory}? This action cannot be undone.`,
			)
		) {
			return;
		}

		try {
			const response = await fetch(`/api/wardrobe-items/${item.id}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to delete item");
			}

			// Reload page to update list
			location.reload();
		} catch (error) {
			console.error("Delete error:", error);
			alert(
				`Failed to delete item: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}
</script>

<div
	class="group relative border border-gray-200 rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 bg-white"
>
	<!-- Image -->
	<div class="aspect-square bg-gray-100 relative overflow-hidden">
		<img
			src={item.improved_image_url || item.image_url}
			alt={item.subcategory}
			class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
		/>

		<!-- Action buttons overlay (show on hover on desktop, always on mobile) -->
		<div
			class="absolute top-2 right-2 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200"
		>
			<button
				type="button"
				on:click|stopPropagation={handleDelete}
				class="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg backdrop-blur-sm"
				title="Delete item"
			>
				<Trash2 class="w-4 h-4" />
			</button>
		</div>
	</div>
</div>
