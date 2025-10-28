<script lang="ts">
	import { ArrowLeft } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Wardope AI - Item Improvement POC</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8 px-4">
	<div class="max-w-5xl mx-auto">
		<!-- Header -->
		<header class="mb-8">
			<a
				href="/"
				class="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors"
			>
				<ArrowLeft class="w-5 h-5" />
				<span class="font-medium">Back to Home</span>
			</a>
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Wardope AI</h1>
			<p class="text-gray-600">Item Improvement Proof of Concept</p>
		</header>

		<!-- Placeholder Content -->
		<div class="bg-white rounded-lg shadow-sm p-12">
			<div class="text-center max-w-2xl mx-auto">
				<div class="mb-6">
					<div class="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
						<svg
							class="w-10 h-10 text-blue-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
					</div>
				</div>

				<h2 class="text-2xl font-bold text-gray-900 mb-3">Coming Soon</h2>
				<p class="text-gray-600 mb-6">
					This feature is currently under development. It will include AI-powered item description
					generation and image enhancement capabilities using OpenAI Vision API.
				</p>

				<div class="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
					<svg
						class="w-4 h-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>Stay tuned for updates!</span>
				</div>
			</div>
		</div>
	</div>
</div>
