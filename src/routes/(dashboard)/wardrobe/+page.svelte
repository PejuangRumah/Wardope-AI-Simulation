<script lang="ts">
	import { Shirt, Plus } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Wardrobe - Wardope AI</title>
</svelte:head>

<div class="p-8">
	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-gray-900">My Wardrobe</h1>
		<p class="text-gray-600 mt-1">Manage your clothing items and accessories</p>
	</div>

	<!-- Action Bar -->
	<div class="mb-6 flex justify-between items-center">
		<div class="flex gap-3">
			<button
				class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium"
			>
				<Plus class="w-5 h-5" />
				Add Item
			</button>
		</div>

		<!-- Future: Filters, Search, Sort -->
		<div class="text-sm text-gray-600">0 items</div>
	</div>

	<!-- Empty State -->
	<div class="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
		<div class="flex flex-col items-center">
			<div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
				<Shirt class="w-8 h-8 text-gray-400" />
			</div>
			<h3 class="text-lg font-medium text-gray-900 mb-2">No wardrobe items yet</h3>
			<p class="text-gray-600 mb-6 max-w-md">
				Start building your digital wardrobe by adding your first clothing item. Upload an image
				and our AI will automatically analyze and categorize it.
			</p>
			<button
				class="px-6 py-2.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium"
			>
				Add Your First Item
			</button>
		</div>
	</div>

	<!-- Future: Grid of wardrobe items -->
	<!-- <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
		Item cards will go here
	</div> -->
</div>
