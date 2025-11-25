<script lang="ts">
	import { page } from "$app/stores";
	import {
		Shirt,
		Sparkles,
		Database,
		ChevronDown,
		ChevronRight,
		Menu,
		FileText,
	} from "lucide-svelte";
	import { sidebarCollapsed } from "$lib/stores/sidebar";

	let masterDataExpanded = false;

	// Check if current path matches
	$: currentPath = $page.url.pathname;
	$: isActive = (path: string) =>
		currentPath === path || currentPath.startsWith(path + "/");
	$: isMasterDataActive = currentPath.startsWith("/master-data");

	// Auto-expand master data if any submenu is active
	$: if (isMasterDataActive && !masterDataExpanded) {
		masterDataExpanded = true;
	}

	// Collapse master data when sidebar is collapsed
	$: if ($sidebarCollapsed && masterDataExpanded) {
		masterDataExpanded = false;
	}

	function toggleMasterData() {
		masterDataExpanded = !masterDataExpanded;
	}
</script>

<!-- Mobile Overlay -->
{#if !$sidebarCollapsed}
	<div
		class="fixed inset-0 bg-black/50 z-40 md:hidden"
		on:click={sidebarCollapsed.toggle}
		role="button"
		tabindex="0"
		on:keydown={(e) => e.key === "Escape" && sidebarCollapsed.toggle()}
	></div>
{/if}

<aside
	class="bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 fixed md:relative z-50 h-full"
	class:w-64={!$sidebarCollapsed}
	class:md:w-16={$sidebarCollapsed}
	class:-translate-x-full={$sidebarCollapsed}
	class:md:translate-x-0={$sidebarCollapsed}
>
	<!-- Toggle Button (Desktop only) -->
	<div class="px-4 py-4 border-b border-gray-200 hidden md:block">
		<button
			on:click={sidebarCollapsed.toggle}
			class="w-full flex items-center justify-center p-2 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors"
			title={$sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
		>
			<Menu class="w-5 h-5" />
		</button>
	</div>

	<!-- Mobile Close Button -->
	<div
		class="px-4 py-4 border-b border-gray-200 md:hidden flex justify-between items-center"
	>
		<span class="font-semibold text-gray-900">Menu</span>
		<button
			on:click={sidebarCollapsed.toggle}
			class="p-2 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors"
		>
			<Menu class="w-5 h-5" />
		</button>
	</div>

	<nav class="flex-1 px-4 py-6 space-y-1">
		<!-- Wardrobe -->
		<a
			href="/wardrobe"
			class="flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
			class:px-4={!$sidebarCollapsed}
			class:px-2={$sidebarCollapsed}
			class:justify-center={$sidebarCollapsed}
			class:bg-indigo-50={isActive("/wardrobe")}
			class:text-indigo-700={isActive("/wardrobe")}
			class:text-gray-700={!isActive("/wardrobe")}
			class:hover:bg-gray-100={!isActive("/wardrobe")}
			title={$sidebarCollapsed ? "Wardrobe" : ""}
		>
			<Shirt class="w-5 h-5 flex-shrink-0" />
			{#if !$sidebarCollapsed}
				<span>Wardrobe</span>
			{/if}
		</a>

		<!-- Outfit Recommendation -->
		<a
			href="/outfit-recommendation"
			class="flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
			class:px-4={!$sidebarCollapsed}
			class:px-2={$sidebarCollapsed}
			class:justify-center={$sidebarCollapsed}
			class:bg-indigo-50={isActive("/outfit-recommendation")}
			class:text-indigo-700={isActive("/outfit-recommendation")}
			class:text-gray-700={!isActive("/outfit-recommendation")}
			class:hover:bg-gray-100={!isActive("/outfit-recommendation")}
			title={$sidebarCollapsed ? "Outfit Recommendation" : ""}
		>
			<Sparkles class="w-5 h-5 flex-shrink-0" />
			{#if !$sidebarCollapsed}
				<span>Outfit Recommendation</span>
			{/if}
		</a>

		<!-- Prompt Management -->
		<a
			href="/prompt-management"
			class="flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
			class:px-4={!$sidebarCollapsed}
			class:px-2={$sidebarCollapsed}
			class:justify-center={$sidebarCollapsed}
			class:bg-indigo-50={isActive("/prompt-management")}
			class:text-indigo-700={isActive("/prompt-management")}
			class:text-gray-700={!isActive("/prompt-management")}
			class:hover:bg-gray-100={!isActive("/prompt-management")}
			title={$sidebarCollapsed ? "Prompt Management" : ""}
		>
			<FileText class="w-5 h-5 flex-shrink-0" />
			{#if !$sidebarCollapsed}
				<span>Prompt Management</span>
			{/if}
		</a>

		<!-- Divider -->
		{#if !$sidebarCollapsed}
			<div class="pt-4 pb-2">
				<div class="border-t border-gray-200"></div>
			</div>
		{/if}

		<!-- Master Data (Expandable) -->
		{#if !$sidebarCollapsed}
			<button
				on:click={toggleMasterData}
				class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
				class:bg-indigo-50={isMasterDataActive}
				class:text-indigo-700={isMasterDataActive}
				class:text-gray-700={!isMasterDataActive}
				class:hover:bg-gray-100={!isMasterDataActive}
			>
				<Database class="w-5 h-5 flex-shrink-0" />
				<span class="flex-1 text-left">Manage Master Data</span>
				{#if masterDataExpanded}
					<ChevronDown class="w-4 h-4" />
				{:else}
					<ChevronRight class="w-4 h-4" />
				{/if}
			</button>
		{:else}
			<a
				href="/master-data/categories"
				class="flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors px-2 justify-center"
				class:bg-indigo-50={isMasterDataActive}
				class:text-indigo-700={isMasterDataActive}
				class:text-gray-700={!isMasterDataActive}
				class:hover:bg-gray-100={!isMasterDataActive}
				title="Manage Master Data"
			>
				<Database class="w-5 h-5 flex-shrink-0" />
			</a>
		{/if}

		<!-- Master Data Submenu -->
		{#if masterDataExpanded && !$sidebarCollapsed}
			<div class="ml-8 space-y-1 mt-1">
				<a
					href="/master-data/categories"
					class="block px-4 py-2 rounded-lg text-sm transition-colors"
					class:bg-indigo-50={isActive("/master-data/categories")}
					class:text-indigo-700={isActive("/master-data/categories")}
					class:text-gray-600={!isActive("/master-data/categories")}
					class:hover:bg-gray-100={!isActive(
						"/master-data/categories",
					)}
				>
					Categories
				</a>
				<a
					href="/master-data/subcategories"
					class="block px-4 py-2 rounded-lg text-sm transition-colors"
					class:bg-indigo-50={isActive("/master-data/subcategories")}
					class:text-indigo-700={isActive(
						"/master-data/subcategories",
					)}
					class:text-gray-600={!isActive(
						"/master-data/subcategories",
					)}
					class:hover:bg-gray-100={!isActive(
						"/master-data/subcategories",
					)}
				>
					Subcategories
				</a>
				<a
					href="/master-data/colors"
					class="block px-4 py-2 rounded-lg text-sm transition-colors"
					class:bg-indigo-50={isActive("/master-data/colors")}
					class:text-indigo-700={isActive("/master-data/colors")}
					class:text-gray-600={!isActive("/master-data/colors")}
					class:hover:bg-gray-100={!isActive("/master-data/colors")}
				>
					Colors
				</a>
				<a
					href="/master-data/occasions"
					class="block px-4 py-2 rounded-lg text-sm transition-colors"
					class:bg-indigo-50={isActive("/master-data/occasions")}
					class:text-indigo-700={isActive("/master-data/occasions")}
					class:text-gray-600={!isActive("/master-data/occasions")}
					class:hover:bg-gray-100={!isActive(
						"/master-data/occasions",
					)}
				>
					Occasions
				</a>
				<a
					href="/master-data/fits"
					class="block px-4 py-2 rounded-lg text-sm transition-colors"
					class:bg-indigo-50={isActive("/master-data/fits")}
					class:text-indigo-700={isActive("/master-data/fits")}
					class:text-gray-600={!isActive("/master-data/fits")}
					class:hover:bg-gray-100={!isActive("/master-data/fits")}
				>
					Fits
				</a>
			</div>
		{/if}
	</nav>

	<!-- Footer Info -->
	{#if !$sidebarCollapsed}
		<div class="px-4 py-4 border-t border-gray-200">
			<p class="text-xs text-gray-500 text-center">
				Proof of Concept - Wardope AI
			</p>
		</div>
	{/if}
</aside>
