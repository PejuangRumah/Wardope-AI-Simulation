<script lang="ts">
	import { Shirt, Plus, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import WardrobeItemCard from '$lib/components/WardrobeItemCard.svelte';
	import AddWardrobeItemModal from '$lib/components/AddWardrobeItemModal.svelte';

	export let data;

	let showAddModal = false;

	// Filter state
	let searchQuery = data.filters.search || '';
	let selectedCategory = data.filters.category || '';
	let selectedColor = data.filters.color || '';
	let selectedFit = data.filters.fit || '';

	function applyFilters() {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (selectedCategory) params.set('category', selectedCategory);
		if (selectedColor) params.set('color', selectedColor);
		if (selectedFit) params.set('fit', selectedFit);
		params.set('page', '1'); // Reset to page 1 when filters change

		goto(`/wardrobe?${params.toString()}`);
	}

	function clearFilters() {
		searchQuery = '';
		selectedCategory = '';
		selectedColor = '';
		selectedFit = '';
		goto('/wardrobe');
	}

	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.search);
		params.set('page', pageNum.toString());
		goto(`/wardrobe?${params.toString()}`);
	}

	function handleModalSuccess() {
		showAddModal = false;
		// Reload page to show new item
		location.reload();
	}
</script>

<svelte:head>
	<title>Wardrobe - Wardope AI</title>
</svelte:head>

<div class="p-8">
	{#if !data.hasPrompts}
		<!-- Setup Required CTA -->
		<div class="flex flex-col items-center justify-center min-h-[60vh]">
			<div class="text-center max-w-md">
				<div class="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
					<Shirt class="w-8 h-8 text-indigo-600" />
				</div>
				<h2 class="text-xl font-semibold text-gray-900 mb-2">Setup Required</h2>
				<p class="text-gray-600 mb-6">
					You need to configure AI prompts before using the wardrobe features. This only takes a moment.
				</p>
				<a
					href="/prompt-management"
					class="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
				>
					Go to Prompt Management
				</a>
			</div>
		</div>
	{:else}
		<!-- Page Header -->
		<div class="mb-8">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-2xl font-bold text-gray-900">My Wardrobe</h1>
					<p class="text-gray-600 mt-1">
						{data.total} {data.total === 1 ? 'item' : 'items'} in your collection
					</p>
				</div>
				<button
					on:click={() => (showAddModal = true)}
					class="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium shadow-md"
				>
					<Plus class="w-5 h-5" />
					Add Item
				</button>
			</div>
		</div>

	<!-- Search & Filters -->
	<div class="mb-6 bg-white rounded-lg border border-gray-200 p-4">
		<div class="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-3">
			<!-- Search -->
			<div class="lg:col-span-2">
				<div class="relative">
					<Search class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
					<input
						type="text"
						bind:value={searchQuery}
						on:input={applyFilters}
						placeholder="Search by description or brand..."
						class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
			</div>

			<!-- Category Filter -->
			<select
				bind:value={selectedCategory}
				on:change={applyFilters}
				class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
			>
				<option value="">All Categories</option>
				{#each data.masterData.categories as category}
					<option value={category.name}>{category.name}</option>
				{/each}
			</select>

			<!-- Color Filter -->
			<select
				bind:value={selectedColor}
				on:change={applyFilters}
				class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
			>
				<option value="">All Colors</option>
				{#each data.masterData.colors as color}
					<option value={color.name}>{color.name}</option>
				{/each}
			</select>

			<!-- Fit Filter -->
			<select
				bind:value={selectedFit}
				on:change={applyFilters}
				class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
			>
				<option value="">All Fits</option>
				{#each data.masterData.fits as fit}
					<option value={fit.name}>{fit.name}</option>
				{/each}
			</select>
		</div>

		<!-- Active Filters -->
		{#if searchQuery || selectedCategory || selectedColor || selectedFit}
			<div class="mt-3 flex items-center gap-2 flex-wrap">
				<span class="text-sm text-gray-600">Active filters:</span>
				{#if searchQuery}
					<span class="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full">
						Search: {searchQuery}
					</span>
				{/if}
				{#if selectedCategory}
					<span class="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full">
						{selectedCategory}
					</span>
				{/if}
				{#if selectedColor}
					<span class="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full">
						{selectedColor}
					</span>
				{/if}
				{#if selectedFit}
					<span class="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full">
						{selectedFit}
					</span>
				{/if}
				<button
					on:click={clearFilters}
					class="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
				>
					Clear all
				</button>
			</div>
		{/if}
	</div>

	<!-- Content -->
	{#if data.items.length > 0}
		<!-- Grid of Items -->
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
			{#each data.items as item}
				<WardrobeItemCard {item} />
			{/each}
		</div>

		<!-- Pagination -->
		{#if data.totalPages > 1}
			<div class="flex items-center justify-center gap-2">
				<button
					on:click={() => goToPage(data.page - 1)}
					disabled={data.page === 1}
					class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
				>
					<ChevronLeft class="w-4 h-4" />
					Previous
				</button>

				<div class="flex items-center gap-1">
					{#each Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
						// Show first 2, last 2, and current page
						if (data.totalPages <= 5) {
							return i + 1;
						} else if (data.page <= 3) {
							return i + 1;
						} else if (data.page >= data.totalPages - 2) {
							return data.totalPages - 4 + i;
						} else {
							return data.page - 2 + i;
						}
					}) as pageNum}
						<button
							on:click={() => goToPage(pageNum)}
							class="w-10 h-10 flex items-center justify-center border rounded-lg {data.page ===
							pageNum
								? 'bg-indigo-600 text-white border-indigo-600'
								: 'border-gray-300 hover:bg-gray-50'}"
						>
							{pageNum}
						</button>
					{/each}
				</div>

				<button
					on:click={() => goToPage(data.page + 1)}
					disabled={data.page === data.totalPages}
					class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
				>
					Next
					<ChevronRight class="w-4 h-4" />
				</button>
			</div>

			<p class="text-center text-sm text-gray-600 mt-4">
				Page {data.page} of {data.totalPages}
			</p>
		{/if}
	{:else}
		<!-- Empty State -->
		<div
			class="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center"
		>
			<div class="flex flex-col items-center">
				<div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
					<Shirt class="w-8 h-8 text-gray-400" />
				</div>
				<h3 class="text-lg font-medium text-gray-900 mb-2">
					{searchQuery || selectedCategory || selectedColor || selectedFit
						? 'No items found'
						: 'No wardrobe items yet'}
				</h3>
				<p class="text-gray-600 mb-6 max-w-md">
					{searchQuery || selectedCategory || selectedColor || selectedFit
						? 'Try adjusting your filters or search query.'
						: 'Start building your digital wardrobe by adding your first clothing item. Upload an image and our AI will automatically analyze and categorize it.'}
				</p>
				{#if searchQuery || selectedCategory || selectedColor || selectedFit}
					<button
						on:click={clearFilters}
						class="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
					>
						Clear Filters
					</button>
				{:else}
					<button
						on:click={() => (showAddModal = true)}
						class="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
					>
						<Plus class="w-5 h-5" />
						Add Your First Item
					</button>
				{/if}
			</div>
		</div>
	{/if}
	{/if}
</div>

<!-- Add Item Modal -->
{#if showAddModal}
	<AddWardrobeItemModal
		prompts={data.prompts}
		masterData={data.masterData}
		on:close={() => (showAddModal = false)}
		on:success={handleModalSuccess}
	/>
{/if}
