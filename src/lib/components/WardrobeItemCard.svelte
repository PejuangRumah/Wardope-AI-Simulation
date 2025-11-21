<script lang="ts">
	import { Trash2, Edit } from 'lucide-svelte';
	import type { WardrobeItem } from '$lib/types/wardrobe';

	export let item: WardrobeItem;

	async function handleDelete() {
		if (!confirm(`Delete ${item.subcategory}? This action cannot be undone.`)) {
			return;
		}

		try {
			const response = await fetch(`/api/wardrobe-items/${item.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to delete item');
			}

			// Reload page to update list
			location.reload();
		} catch (error) {
			console.error('Delete error:', error);
			alert(`Failed to delete item: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
</script>

<div class="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white">
	<!-- Image -->
	<div class="aspect-square bg-gray-100 relative group">
		<img
			src={item.improved_image_url || item.image_url}
			alt={item.subcategory}
			class="w-full h-full object-cover"
		/>

		<!-- Action buttons overlay (show on hover) -->
		<div class="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
			<button
				type="button"
				on:click|stopPropagation={handleDelete}
				class="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-md"
				title="Delete item"
			>
				<Trash2 class="w-4 h-4" />
			</button>
		</div>
	</div>

	<!-- Info -->
	<div class="p-3">
		<h3 class="font-semibold text-gray-900 truncate">{item.subcategory}</h3>

		<!-- Colors -->
		{#if item.colors && item.colors.length > 0}
			<div class="flex items-center gap-1 mt-1 flex-wrap">
				{#each item.colors.slice(0, 2) as color}
					<div class="flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
						{#if color.hex_code}
							<span
								class="inline-block w-2.5 h-2.5 rounded-full border border-gray-300"
								style="background-color: {color.hex_code};"
							></span>
						{/if}
						<span>{color.name}</span>
					</div>
				{/each}
				{#if item.colors.length > 2}
					<span class="text-xs text-gray-500">+{item.colors.length - 2} more</span>
				{/if}
			</div>
		{/if}

		<!-- Occasions -->
		{#if item.occasions && item.occasions.length > 0}
			<div class="flex items-center gap-1 mt-1 flex-wrap">
				{#each item.occasions.slice(0, 2) as occasion}
					<span class="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded">
						{occasion.name}
					</span>
				{/each}
				{#if item.occasions.length > 2}
					<span class="text-xs text-gray-500">+{item.occasions.length - 2} more</span>
				{/if}
			</div>
		{/if}

		{#if item.brand}
			<p class="text-xs text-gray-500 truncate mt-1">{item.brand}</p>
		{/if}

		<div class="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
			<span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
				{item.category}
			</span>

			{#if item.fit}
				<span class="text-xs px-2 py-1 bg-green-100 text-green-800 rounded font-medium">
					{item.fit}
				</span>
			{/if}
		</div>

		{#if item.analysis_confidence}
			<div class="mt-2 flex items-center gap-1">
				<span class="text-xs text-gray-500">AI Confidence:</span>
				<div class="flex-1 bg-gray-200 rounded-full h-1.5">
					<div
						class="h-1.5 rounded-full {item.analysis_confidence >= 0.8
							? 'bg-green-500'
							: item.analysis_confidence >= 0.6
								? 'bg-yellow-500'
								: 'bg-red-500'}"
						style="width: {item.analysis_confidence * 100}%"
					></div>
				</div>
			</div>
		{/if}
	</div>
</div>
