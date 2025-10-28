<script lang="ts">
	import { Sparkles, Image, ArrowRight, ShoppingBag } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Wardope AI - Proof of Concepts</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
	<div class="max-w-6xl mx-auto px-4 py-16">
		<!-- Hero Section -->
		<header class="text-center mb-16">
			<div class="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-6">
				<ShoppingBag class="w-8 h-8 text-white" />
			</div>
			<h1 class="text-5xl font-bold text-gray-900 mb-4">
				Wardope AI
			</h1>
			<p class="text-xl text-gray-600 mb-2">
				AI-Powered Fashion Intelligence Platform
			</p>
			<p class="text-gray-500">
				Explore our proof of concepts showcasing the future of fashion technology
			</p>
		</header>

		<!-- PoC Cards -->
		<div class="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
			<!-- Outfit Recommendation PoC Card -->
			<a
				href="/outfit-recommendation"
				class="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-300 transform hover:-translate-y-1"
			>
				<div class="p-8">
					<!-- Icon & Badge -->
					<div class="flex items-center justify-between mb-6">
						<div class="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
							<Sparkles class="w-7 h-7 text-white" />
						</div>
						<span class="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
							Active
						</span>
					</div>

					<!-- Title -->
					<h2 class="text-2xl font-bold text-gray-900 mb-3">
						Outfit Recommendation
					</h2>

					<!-- Description -->
					<p class="text-gray-600 mb-6 leading-relaxed">
						Generate AI-powered outfit combinations from your wardrobe using GPT-4o and semantic search. Get intelligent recommendations with color harmony, style coherence, and occasion appropriateness.
					</p>

					<!-- Features -->
					<ul class="space-y-2 mb-6">
						<li class="flex items-start gap-2 text-sm text-gray-700">
							<svg class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							<span>Semantic search using embeddings</span>
						</li>
						<li class="flex items-start gap-2 text-sm text-gray-700">
							<svg class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							<span>GPT-4o fashion intelligence</span>
						</li>
						<li class="flex items-start gap-2 text-sm text-gray-700">
							<svg class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							<span>Interactive moodboard builder</span>
						</li>
						<li class="flex items-start gap-2 text-sm text-gray-700">
							<svg class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							<span>OpenAI Guardrails security</span>
						</li>
					</ul>

					<!-- CTA Button -->
					<div class="flex items-center gap-2 text-blue-600 group-hover:text-blue-700 font-semibold group-hover:gap-3 transition-all">
						<span>Open Outfit PoC</span>
						<ArrowRight class="w-5 h-5" />
					</div>
				</div>

				<!-- Bottom Accent -->
				<div class="h-2 bg-gradient-to-r from-blue-500 to-blue-600"></div>
			</a>

			<!-- Item Improvement PoC Card -->
			<a
				href="/item-improvement"
				class="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-purple-300 transform hover:-translate-y-1"
			>
				<div class="p-8">
					<!-- Icon & Badge -->
					<div class="flex items-center justify-between mb-6">
						<div class="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
							<Image class="w-7 h-7 text-white" />
						</div>
						<span class="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
							Coming Soon
						</span>
					</div>

					<!-- Title -->
					<h2 class="text-2xl font-bold text-gray-900 mb-3">
						Item Improvement
					</h2>

					<!-- Description -->
					<p class="text-gray-600 mb-6 leading-relaxed">
						AI-powered item description and image enhancement using OpenAI Vision API. Transform your fashion items with intelligent descriptions and visual improvements.
					</p>

					<!-- Features (placeholder) -->
					<ul class="space-y-2 mb-6">
						<li class="flex items-start gap-2 text-sm text-gray-700">
							<svg class="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							<span>OpenAI Vision API integration</span>
						</li>
						<li class="flex items-start gap-2 text-sm text-gray-700">
							<svg class="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							<span>Automated item descriptions</span>
						</li>
						<li class="flex items-start gap-2 text-sm text-gray-700">
							<svg class="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							<span>Image enhancement & upscaling</span>
						</li>
						<li class="flex items-start gap-2 text-sm text-gray-700">
							<svg class="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							<span>Batch processing support</span>
						</li>
					</ul>

					<!-- CTA Button -->
					<div class="flex items-center gap-2 text-purple-600 group-hover:text-purple-700 font-semibold group-hover:gap-3 transition-all">
						<span>Open Item PoC</span>
						<ArrowRight class="w-5 h-5" />
					</div>
				</div>

				<!-- Bottom Accent -->
				<div class="h-2 bg-gradient-to-r from-purple-500 to-purple-600"></div>
			</a>
		</div>

		<!-- Footer Info -->
		<footer class="text-center mt-16 text-gray-500 text-sm">
			<p>
				Built with SvelteKit, TailwindCSS, and OpenAI APIs
			</p>
			<p class="mt-1">
				Proof of Concept - Academy Project 2025
			</p>
		</footer>
	</div>
</div>
