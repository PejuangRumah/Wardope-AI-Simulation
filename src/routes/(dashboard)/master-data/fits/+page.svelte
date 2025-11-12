<script lang="ts">
	import { Plus } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Fits - Wardope AI</title>
</svelte:head>

<div class="p-8">
	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-gray-900">Fits</h1>
		<p class="text-gray-600 mt-1">Manage fit types for clothing items</p>
	</div>

	<!-- Action Bar -->
	<div class="mb-6 flex justify-between items-center">
		<button
			class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium"
		>
			<Plus class="w-5 h-5" />
			Add Fit
		</button>
	</div>

	<!-- Placeholder Content -->
	<div class="bg-white rounded-lg border border-gray-200 p-6">
		<p class="text-gray-600">Master data management coming soon...</p>
		<p class="text-sm text-gray-500 mt-2">
			Fits: Regular, Slim, Oversized, Relaxed, Tight, Loose, Tailored, etc.
		</p>
	</div>
</div>
