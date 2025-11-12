<script lang="ts">
	import { page } from '$app/stores';
	import { Shirt, Sparkles, Image, Database, ChevronDown, ChevronRight } from 'lucide-svelte';

	let masterDataExpanded = false;

	// Check if current path matches
	$: currentPath = $page.url.pathname;
	$: isActive = (path: string) => currentPath === path || currentPath.startsWith(path + '/');
	$: isMasterDataActive = currentPath.startsWith('/master-data');

	// Auto-expand master data if any submenu is active
	$: if (isMasterDataActive && !masterDataExpanded) {
		masterDataExpanded = true;
	}

	function toggleMasterData() {
		masterDataExpanded = !masterDataExpanded;
	}
</script>

<aside class="bg-gray-50 border-r border-gray-200 w-64 flex flex-col">
	<nav class="flex-1 px-4 py-6 space-y-1">
		<!-- Wardrobe -->
		<a
			href="/wardrobe"
			class="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
			class:bg-indigo-50={isActive('/wardrobe')}
			class:text-indigo-700={isActive('/wardrobe')}
			class:text-gray-700={!isActive('/wardrobe')}
			class:hover:bg-gray-100={!isActive('/wardrobe')}
		>
			<Shirt class="w-5 h-5" />
			<span>Wardrobe</span>
		</a>

		<!-- Outfit Recommendation -->
		<a
			href="/outfit-recommendation"
			class="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
			class:bg-indigo-50={isActive('/outfit-recommendation')}
			class:text-indigo-700={isActive('/outfit-recommendation')}
			class:text-gray-700={!isActive('/outfit-recommendation')}
			class:hover:bg-gray-100={!isActive('/outfit-recommendation')}
		>
			<Sparkles class="w-5 h-5" />
			<span>Outfit Recommendation</span>
		</a>

		<!-- Item Improvement -->
		<a
			href="/item-improvement"
			class="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
			class:bg-indigo-50={isActive('/item-improvement')}
			class:text-indigo-700={isActive('/item-improvement')}
			class:text-gray-700={!isActive('/item-improvement')}
			class:hover:bg-gray-100={!isActive('/item-improvement')}
		>
			<Image class="w-5 h-5" />
			<span>Item Improvement</span>
		</a>

		<!-- Divider -->
		<div class="pt-4 pb-2">
			<div class="border-t border-gray-200"></div>
		</div>

		<!-- Master Data (Expandable) -->
		<button
			on:click={toggleMasterData}
			class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
			class:bg-indigo-50={isMasterDataActive}
			class:text-indigo-700={isMasterDataActive}
			class:text-gray-700={!isMasterDataActive}
			class:hover:bg-gray-100={!isMasterDataActive}
		>
			<Database class="w-5 h-5" />
			<span class="flex-1 text-left">Manage Master Data</span>
			{#if masterDataExpanded}
				<ChevronDown class="w-4 h-4" />
			{:else}
				<ChevronRight class="w-4 h-4" />
			{/if}
		</button>

		<!-- Master Data Submenu -->
		{#if masterDataExpanded}
			<div class="ml-8 space-y-1 mt-1">
				<a
					href="/master-data/categories"
					class="block px-4 py-2 rounded-lg text-sm transition-colors"
					class:bg-indigo-50={isActive('/master-data/categories')}
					class:text-indigo-700={isActive('/master-data/categories')}
					class:text-gray-600={!isActive('/master-data/categories')}
					class:hover:bg-gray-100={!isActive('/master-data/categories')}
				>
					Categories
				</a>
				<a
					href="/master-data/subcategories"
					class="block px-4 py-2 rounded-lg text-sm transition-colors"
					class:bg-indigo-50={isActive('/master-data/subcategories')}
					class:text-indigo-700={isActive('/master-data/subcategories')}
					class:text-gray-600={!isActive('/master-data/subcategories')}
					class:hover:bg-gray-100={!isActive('/master-data/subcategories')}
				>
					Subcategories
				</a>
				<a
					href="/master-data/colors"
					class="block px-4 py-2 rounded-lg text-sm transition-colors"
					class:bg-indigo-50={isActive('/master-data/colors')}
					class:text-indigo-700={isActive('/master-data/colors')}
					class:text-gray-600={!isActive('/master-data/colors')}
					class:hover:bg-gray-100={!isActive('/master-data/colors')}
				>
					Colors
				</a>
				<a
					href="/master-data/occasions"
					class="block px-4 py-2 rounded-lg text-sm transition-colors"
					class:bg-indigo-50={isActive('/master-data/occasions')}
					class:text-indigo-700={isActive('/master-data/occasions')}
					class:text-gray-600={!isActive('/master-data/occasions')}
					class:hover:bg-gray-100={!isActive('/master-data/occasions')}
				>
					Occasions
				</a>
				<a
					href="/master-data/fits"
					class="block px-4 py-2 rounded-lg text-sm transition-colors"
					class:bg-indigo-50={isActive('/master-data/fits')}
					class:text-indigo-700={isActive('/master-data/fits')}
					class:text-gray-600={!isActive('/master-data/fits')}
					class:hover:bg-gray-100={!isActive('/master-data/fits')}
				>
					Fits
				</a>
			</div>
		{/if}
	</nav>

	<!-- Footer Info -->
	<div class="px-4 py-4 border-t border-gray-200">
		<p class="text-xs text-gray-500 text-center">Proof of Concept - Wardope AI</p>
	</div>
</aside>
