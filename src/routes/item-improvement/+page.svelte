<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ArrowLeft,
		Upload,
		Loader2,
		Image as ImageIcon,
		Download,
		Save,
		Trash2,
		X,
		Sparkles,
		Info,
		Clock,
		Check,
		DollarSign,
		FileText,
		Database
	} from 'lucide-svelte';
	import type { ItemAnalysis, AnalysisResponse, ImprovementResponse, StoredItem } from '$lib/types/item';
	import {
		getDefaultAnalysisPrompt,
		getDefaultImprovementPrompt
	} from '$lib/constants/item-master';
	import { getItems, saveItem, deleteItem, clearAllItems, generateItemId } from '$lib/stores/items-store';

	// Upload state
	let uploadedImage: string | null = null;
	let uploadedFileName: string | null = null;
	let fileInput: HTMLInputElement;

	// Processing state
	let isProcessing = false;
	let currentStep = '';
	let processingSeconds = 0;
	let processingInterval: ReturnType<typeof setInterval> | null = null;

	// Analysis state
	let analysisResult: ItemAnalysis | null = null;
	let analysisUsage: AnalysisResponse['usage'] | null = null;
	let analysisError: string | null = null;

	// Improvement state
	let enableImprovement = false;
	let improvementQuality: 'low' | 'medium' | 'high' = 'medium';
	let improvedImageUrl: string | null = null;
	let improvementUsage: ImprovementResponse['usage'] | null = null;
	let improvementError: string | null = null;

	// Custom prompts
	let defaultAnalysisPrompt = '';
	let customAnalysisPrompt = '';
	let defaultImprovementPrompt = '';
	let customImprovementPrompt = '';

	// Saved items
	let savedItems: StoredItem[] = [];

	// UI state
	let showProcessExplanation = false;

	// Computed values
	$: totalCostIdr =
		(analysisUsage?.cost_idr || 0) + (improvementUsage?.cost_idr || 0);
	$: totalCostUsd =
		(analysisUsage?.cost_usd || 0) + (improvementUsage?.cost_usd || 0);

	// Handle file upload
	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			processFile(file);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		const file = event.dataTransfer?.files[0];
		if (file) {
			processFile(file);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	function processFile(file: File) {
		// Validate file type
		if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
			analysisError = 'Please upload a JPEG or PNG image.';
			return;
		}

		// Validate file size (max 20MB)
		if (file.size > 20 * 1024 * 1024) {
			analysisError = 'Image size must be less than 20MB.';
			return;
		}

		// Read file as base64
		const reader = new FileReader();
		reader.onload = (e) => {
			uploadedImage = e.target?.result as string;
			uploadedFileName = file.name;
			analysisError = null;
			// Reset previous results
			analysisResult = null;
			analysisUsage = null;
			improvedImageUrl = null;
			improvementUsage = null;
			improvementError = null;
		};
		reader.readAsDataURL(file);
	}

	function clearUpload() {
		uploadedImage = null;
		uploadedFileName = null;
		analysisResult = null;
		analysisUsage = null;
		improvedImageUrl = null;
		improvementUsage = null;
		analysisError = null;
		improvementError = null;
		if (fileInput) {
			fileInput.value = '';
		}
	}

	async function handleSubmit() {
		if (!uploadedImage) return;

		isProcessing = true;
		analysisError = null;
		improvementError = null;
		analysisResult = null;
		improvedImageUrl = null;
		analysisUsage = null;
		improvementUsage = null;

		// Start processing timer
		processingSeconds = 0;
		processingInterval = setInterval(() => {
			processingSeconds++;
		}, 1000);

		try {
			// Step 1: Always analyze
			currentStep = 'Analyzing image...';
			const analysisResponse = await fetch('/api/item-improvement/analyze', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					image: uploadedImage,
					customPrompt: customAnalysisPrompt || undefined
				})
			});

			const analysisData = await analysisResponse.json();

			if (!analysisResponse.ok) {
				throw new Error(analysisData.error || 'Failed to analyze image');
			}

			analysisResult = analysisData.analysis;
			analysisUsage = analysisData.usage;

			// Update improvement prompt with actual analyzed data
			if (analysisResult) {
				defaultImprovementPrompt = getDefaultImprovementPrompt({
					category: analysisResult.category,
					subcategory: analysisResult.subcategory,
					colors: analysisResult.colors,
					fit: analysisResult.fit
				});
				// Only update custom prompt if user hasn't modified it (still matches old default)
				if (customImprovementPrompt === defaultImprovementPrompt || customImprovementPrompt.includes('tops - Shirt')) {
					customImprovementPrompt = defaultImprovementPrompt;
				}
			}

			// Step 2: Conditionally improve
			if (enableImprovement && analysisResult) {
				currentStep = 'Generating improved image...';

				try {
					const improvementResponse = await fetch('/api/item-improvement/improve', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							itemData: analysisResult,
							originalImage: uploadedImage,
							quality: improvementQuality,
							customPrompt: customImprovementPrompt || undefined
						})
					});

					const improvementData = await improvementResponse.json();

					if (!improvementResponse.ok) {
						throw new Error(improvementData.error || 'Failed to improve image');
					}

					improvedImageUrl = improvementData.imageUrl;
					improvementUsage = improvementData.usage;
				} catch (error) {
					console.error('Improvement error:', error);
					improvementError = error instanceof Error ? error.message : 'Unknown error occurred';
					// Continue to show analysis results even if improvement fails
				}
			}

		} catch (error) {
			console.error('Analysis error:', error);
			analysisError = error instanceof Error ? error.message : 'Unknown error occurred';
		} finally {
			isProcessing = false;
			currentStep = '';

			// Stop processing timer
			if (processingInterval) {
				clearInterval(processingInterval);
				processingInterval = null;
			}

			// Auto-scroll to results after processing completes
			if (analysisResult) {
				setTimeout(() => {
					const resultsElement = document.getElementById('analysis-results');
					if (resultsElement) {
						resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
					}
				}, 100);
			}
		}
	}

	function saveCurrentItem() {
		if (!analysisResult || !uploadedImage) return;

		const item: StoredItem = {
			id: generateItemId(),
			timestamp: Date.now(),
			originalImage: uploadedImage,
			improvedImage: improvedImageUrl || undefined,
			data: {
				category: analysisResult.category,
				subcategory: analysisResult.subcategory,
				colors: analysisResult.colors,
				fit: analysisResult.fit,
				occasions: analysisResult.occasions,
				description: analysisResult.description,
				brand: analysisResult.brand || undefined
			},
			costs: {
				analysis_cost_idr: analysisUsage?.cost_idr || 0,
				improvement_cost_idr: improvementUsage?.cost_idr,
				total_cost_idr: totalCostIdr
			}
		};

		saveItem(item);
		savedItems = getItems();

		// Reset form
		clearUpload();
		enableImprovement = false;

		alert('Item saved successfully!');
	}

	function deleteSavedItem(id: string) {
		if (confirm('Are you sure you want to delete this item?')) {
			deleteItem(id);
			savedItems = getItems();
		}
	}

	function clearAll() {
		if (confirm('Are you sure you want to delete ALL saved items? This cannot be undone.')) {
			clearAllItems();
			savedItems = getItems();
		}
	}

	function downloadImage(url: string, filename: string) {
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
	}

	function resetAnalysisPrompt() {
		customAnalysisPrompt = defaultAnalysisPrompt;
	}

	function resetImprovementPrompt() {
		customImprovementPrompt = defaultImprovementPrompt;
	}

	onMount(() => {
		savedItems = getItems();

		// Load default prompts
		defaultAnalysisPrompt = getDefaultAnalysisPrompt();
		customAnalysisPrompt = defaultAnalysisPrompt;

		// Load default improvement prompt with sample data
		const sampleItemData = {
			category: 'tops',
			subcategory: 'Shirt',
			colors: ['blue', 'white'],
			fit: 'regular'
		};
		defaultImprovementPrompt = getDefaultImprovementPrompt(sampleItemData);
		customImprovementPrompt = defaultImprovementPrompt;
	});
</script>

<svelte:head>
	<title>Wardope AI - Item Improvement POC</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8 px-4">
	<div class="max-w-6xl mx-auto">
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

		<!-- Main Content -->
		<div class="space-y-6">
			<!-- Main Form Card -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<h2 class="text-xl font-semibold text-gray-900 mb-6">Upload & Configuration</h2>

				<div class="space-y-6">
					<!-- Section 1: Upload Image -->
					<div>
						<div class="flex items-center gap-2 mb-4">
							<div
								class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm"
							>
								1
							</div>
							<h3 class="text-lg font-semibold text-gray-900">Upload Item Image</h3>
						</div>

						{#if !uploadedImage}
							<div
								class="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
								on:drop={handleDrop}
								on:dragover={handleDragOver}
								on:click={() => fileInput.click()}
								role="button"
								tabindex="0"
							>
								<Upload class="w-12 h-12 text-gray-400 mx-auto mb-4" />
								<p class="text-gray-600 mb-2">Drag and drop an image here, or click to select</p>
								<p class="text-sm text-gray-500">JPEG or PNG, max 20MB</p>
								<input
									bind:this={fileInput}
									type="file"
									accept="image/jpeg,image/jpg,image/png"
									on:change={handleFileSelect}
									class="hidden"
								/>
							</div>
						{:else}
							<div class="space-y-4">
								<div class="relative border border-gray-200 rounded-lg p-4">
									<img
										src={uploadedImage}
										alt="Uploaded item"
										class="max-h-96 mx-auto rounded"
									/>
									<button
										type="button"
										on:click={clearUpload}
										class="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors"
										title="Remove image"
									>
										<X class="w-4 h-4" />
									</button>
								</div>
								<p class="text-sm text-gray-600">{uploadedFileName}</p>
							</div>
						{/if}

						{#if analysisError}
							<div class="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
								<p class="text-red-800 text-sm">{analysisError}</p>
							</div>
						{/if}
					</div>

					<!-- Section 2: Analysis Settings -->
					<div class="border-t pt-6">
						<div class="flex items-center gap-2 mb-4">
							<div
								class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm"
							>
								2
							</div>
							<h3 class="text-lg font-semibold text-gray-900">Analysis Settings</h3>
						</div>

						<div>
							<div class="flex items-center justify-between mb-2">
								<label class="block text-sm font-medium text-gray-700">
									Custom Analysis Prompt (Optional)
								</label>
								<button
									type="button"
									on:click={resetAnalysisPrompt}
									class="text-xs text-blue-600 hover:text-blue-700 font-medium"
								>
									Reset to Default
								</button>
							</div>
							<textarea
								bind:value={customAnalysisPrompt}
								rows="6"
								placeholder="Loading default prompt..."
								class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs resize-none"
							></textarea>
							<p class="mt-1 text-xs text-gray-500">
								This prompt guides GPT-4o Vision to analyze uploaded item images and extract structured data.
							</p>
						</div>
					</div>

					<!-- Section 3: Image Improvement Settings -->
					<div class="border-t pt-6">
						<div class="flex items-center gap-2 mb-4">
							<div
								class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm"
							>
								3
							</div>
							<h3 class="text-lg font-semibold text-gray-900">Image Improvement</h3>
						</div>

						<!-- Toggle Switch -->
						<div class="mb-4">
							<label class="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									bind:checked={enableImprovement}
									class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
								/>
								<span class="text-sm font-medium text-gray-700">Enable Image Improvement</span>
							</label>
							<p class="mt-1 ml-8 text-xs text-gray-500">
								Generate a professional e-commerce style product photo with transparent background
							</p>
						</div>

						<!-- Conditional: Quality & Prompt -->
						{#if enableImprovement}
							<div class="ml-8 space-y-4 pl-4 border-l-2 border-blue-200">
								<!-- Quality Selector -->
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-3">
										Image Quality (affects cost)
									</label>
									<div class="grid grid-cols-3 gap-3">
										<label class="relative flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer {improvementQuality === 'low' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 hover:border-gray-400'}">
											<input
												type="radio"
												bind:group={improvementQuality}
												value="low"
												class="sr-only"
											/>
											<span class="font-medium text-sm">Low (Rp 150)</span>
										</label>
										<label class="relative flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer {improvementQuality === 'medium' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 hover:border-gray-400'}">
											<input
												type="radio"
												bind:group={improvementQuality}
												value="medium"
												class="sr-only"
											/>
											<span class="font-medium text-sm">Medium (Rp 600)</span>
										</label>
										<label class="relative flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer {improvementQuality === 'high' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 hover:border-gray-400'}">
											<input
												type="radio"
												bind:group={improvementQuality}
												value="high"
												class="sr-only"
											/>
											<span class="font-medium text-sm">High (Rp 2,550)</span>
										</label>
									</div>
								</div>

								<!-- Custom Improvement Prompt -->
								<div>
									<div class="flex items-center justify-between mb-2">
										<label class="block text-sm font-medium text-gray-700">
											Custom Improvement Prompt (Optional)
										</label>
										<button
											type="button"
											on:click={resetImprovementPrompt}
											class="text-xs text-blue-600 hover:text-blue-700 font-medium"
										>
											Reset to Default
										</button>
									</div>
									<textarea
										bind:value={customImprovementPrompt}
										rows="6"
										placeholder="Loading default prompt..."
										class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs resize-none"
									></textarea>
									<p class="mt-1 text-xs text-gray-500">
										This prompt guides gpt-image-1 to generate professional product photos with transparent backgrounds.
									</p>
								</div>
							</div>
						{/if}
					</div>

					<!-- Section 4: Submit Button -->
					<div class="border-t pt-6">
						<button
							type="button"
							on:click={handleSubmit}
							disabled={isProcessing || !uploadedImage}
							class="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
						>
							{#if isProcessing}
								<Loader2 class="w-5 h-5 animate-spin" />
								{currentStep} ({processingSeconds}s)
							{:else if enableImprovement}
								<Sparkles class="w-5 h-5" />
								Analyze & Improve Item
							{:else}
								<Sparkles class="w-5 h-5" />
								Analyze Item
							{/if}
						</button>
					</div>
				</div>
			</div>

			<!-- How AI Item Improvement Works -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
				<button
					type="button"
					on:click={() => (showProcessExplanation = !showProcessExplanation)}
					class="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
				>
					<div class="flex items-center gap-2">
						<svg
							class="w-5 h-5 text-gray-600 transition-transform {showProcessExplanation
								? 'rotate-90'
								: ''}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5l7 7-7 7"
							/>
						</svg>
						<span class="text-sm font-medium text-gray-700">How AI Item Improvement Works</span>
						<span class="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
							Info
						</span>
					</div>
					<span class="text-xs text-gray-500">
						{showProcessExplanation ? 'Hide' : 'Show'}
					</span>
				</button>

				{#if showProcessExplanation}
					<div class="p-4 bg-white">
						<!-- Introduction -->
						<div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
							<div class="flex items-start gap-2">
								<Info class="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
								<div>
									<p class="text-sm text-gray-900 font-medium mb-1">
										Understanding the AI Item Processing Pipeline
									</p>
									<p class="text-xs text-gray-600">
										This system uses GPT-4o Vision for image analysis and gpt-image-1 for professional image generation. The complete process takes 3-5 seconds for analysis and 8-12 seconds for improvement, with costs approximately Rp 350-500 per item (analysis) and Rp 150-2,550 per image (generation based on quality).
									</p>
								</div>
							</div>
						</div>

						<!-- Process Steps -->
						<div class="space-y-3">
							<!-- Step 1: Image Upload & Validation -->
							<div class="border border-gray-200 rounded-lg p-3 bg-white">
								<div class="flex items-start gap-3">
									<div class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
										1
									</div>
									<div class="flex-1">
										<div class="flex items-center gap-2 mb-1">
											<FileText class="w-4 h-4 text-gray-600" />
											<h4 class="text-sm font-semibold text-gray-900">Image Upload & Validation</h4>
										</div>
										<p class="text-xs text-gray-600 mb-2">
											Validate uploaded image format (JPEG/PNG) and size (max 20MB). Convert to base64 encoding for API transmission.
										</p>
										<div class="flex items-center gap-4 text-xs text-gray-500">
											<span class="flex items-center gap-1">
												<Clock class="w-3.5 h-3.5" />
												~100ms
											</span>
											<span class="flex items-center gap-1 text-gray-600">
												<Check class="w-3.5 h-3.5" />
												No API cost
											</span>
										</div>
									</div>
								</div>
							</div>

							<!-- Step 2: Item Analysis (GPT-4o Vision) -->
							<div class="border border-blue-200 rounded-lg p-3 bg-blue-50">
								<div class="flex items-start gap-3">
									<div class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
										2
									</div>
									<div class="flex-1">
										<div class="flex items-center gap-2 mb-1">
											<Database class="w-4 h-4 text-blue-600" />
											<h4 class="text-sm font-semibold text-gray-900">Item Analysis (GPT-4o Vision API)</h4>
											<span class="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded">AI Analysis</span>
										</div>
										<p class="text-xs text-gray-600 mb-2">
											GPT-4o Vision API analyzes the uploaded fashion item image and extracts structured data using JSON Schema strict mode for consistent results.
										</p>
										<div class="p-2 bg-white border border-blue-200 rounded text-xs mb-2">
											<div class="font-medium text-gray-700 mb-1">What It Extracts:</div>
											<ul class="space-y-0.5 text-gray-600">
												<li>• Category identification (fullbodies, tops, outerwears, bottoms, accessories, footwears)</li>
												<li>• Subcategory classification (e.g., Shirt, Jeans, Sneaker)</li>
												<li>• Color detection (primary and secondary colors visible in item)</li>
												<li>• Fit assessment (oversized, regular, slim, etc.)</li>
												<li>• Occasion suitability (casual, formal, work/office, etc.)</li>
												<li>• Detailed description (brand, material, style characteristics, unique features)</li>
												<li>• Confidence level (low, medium, high)</li>
											</ul>
										</div>
										<div class="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
											<span class="flex items-center gap-1">
												<Clock class="w-3.5 h-3.5" />
												~3-5s
											</span>
											<span class="flex items-center gap-1 text-gray-700">
												<DollarSign class="w-3.5 h-3.5" />
												$0.002-0.003 USD (Rp 350-500)
											</span>
										</div>
									</div>
								</div>
							</div>

							<!-- Step 3: Image Improvement (gpt-image-1) - Conditional -->
							<div class="border border-purple-200 rounded-lg p-3 bg-purple-50">
								<div class="flex items-start gap-3">
									<div class="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
										3
									</div>
									<div class="flex-1">
										<div class="flex items-center gap-2 mb-1">
											<ImageIcon class="w-4 h-4 text-purple-600" />
											<h4 class="text-sm font-semibold text-gray-900">Professional Image Generation (gpt-image-1)</h4>
											<span class="px-2 py-0.5 bg-purple-600 text-white text-xs font-semibold rounded">AI Generation</span>
											<span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">Optional</span>
										</div>
										<p class="text-xs text-gray-600 mb-2">
											gpt-image-1 creates professional e-commerce style product photos with transparent backgrounds based on analyzed item data. Uses customizable prompt template for consistent branding.
										</p>
										<div class="p-2 bg-white border border-purple-200 rounded text-xs mb-2">
											<div class="font-medium text-gray-700 mb-1">Generation Parameters:</div>
											<ul class="space-y-0.5 text-gray-600">
												<li>• Model: gpt-image-1</li>
												<li>• Size: 1024x1024 (square format, 1:1 ratio)</li>
												<li>• Background: transparent (PNG with no background)</li>
												<li>• Output Format: png (supports transparency)</li>
												<li>• Quality: Low (Rp 150), Medium (Rp 600), or High (Rp 2,550)</li>
											</ul>
										</div>
										<div class="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
											<span class="flex items-center gap-1">
												<Clock class="w-3.5 h-3.5" />
												~8-12s
											</span>
											<span class="flex items-center gap-1 text-gray-700">
												<DollarSign class="w-3.5 h-3.5" />
												Low: $0.01 (Rp 150) | Medium: $0.04 (Rp 600) | High: $0.17 (Rp 2,550)
											</span>
										</div>
									</div>
								</div>
							</div>

							<!-- Step 4: Result Storage -->
							<div class="border border-gray-200 rounded-lg p-3 bg-white">
								<div class="flex items-start gap-3">
									<div class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
										4
									</div>
									<div class="flex-1">
										<div class="flex items-center gap-2 mb-1">
											<Database class="w-4 h-4 text-gray-600" />
											<h4 class="text-sm font-semibold text-gray-900">Local Storage & Download</h4>
										</div>
										<p class="text-xs text-gray-600 mb-2">
											Improved images and item data are stored in browser localStorage. Users can download images, save item records, and maintain a collection for batch processing.
										</p>
										<div class="flex items-center gap-4 text-xs text-gray-500">
											<span class="flex items-center gap-1">
												<Clock class="w-3.5 h-3.5" />
												~50ms
											</span>
											<span class="flex items-center gap-1 text-gray-600">
												<Check class="w-3.5 h-3.5" />
												No API cost
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>

						<!-- Total Cost Summary -->
						<div class="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
							<h5 class="text-xs font-semibold text-gray-900 mb-2">Total Cost Breakdown</h5>
							<div class="space-y-1 text-xs text-gray-600">
								<div class="flex justify-between">
									<span>Analysis (Required):</span>
									<span class="font-mono">Rp 350-500</span>
								</div>
								<div class="flex justify-between">
									<span>Improvement Low:</span>
									<span class="font-mono">Rp 150</span>
								</div>
								<div class="flex justify-between">
									<span>Improvement Medium:</span>
									<span class="font-mono">Rp 600</span>
								</div>
								<div class="flex justify-between">
									<span>Improvement High:</span>
									<span class="font-mono">Rp 2,550</span>
								</div>
								<div class="flex justify-between pt-2 border-t border-gray-300 font-semibold text-gray-900">
									<span>Total (Low):</span>
									<span class="font-mono">Rp 500-650</span>
								</div>
								<div class="flex justify-between font-semibold text-gray-900">
									<span>Total (Medium):</span>
									<span class="font-mono">Rp 950-1,100</span>
								</div>
								<div class="flex justify-between font-semibold text-gray-900">
									<span>Total (High):</span>
									<span class="font-mono">Rp 2,900-3,050</span>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Results Section -->
			{#if analysisResult && analysisUsage}
				<!-- Analysis Results Card -->
				<div id="analysis-results" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<div class="flex items-center gap-2 mb-4">
						<h2 class="text-xl font-semibold text-gray-900">Analysis Results</h2>
						<span
							class="ml-auto px-3 py-1 rounded-full text-xs font-semibold uppercase {analysisResult.confidence ===
							'high'
								? 'bg-green-100 text-green-800'
								: analysisResult.confidence === 'medium'
									? 'bg-yellow-100 text-yellow-800'
									: 'bg-red-100 text-red-800'}"
						>
							{analysisResult.confidence} confidence
						</span>
					</div>

					<div class="grid md:grid-cols-2 gap-4 mb-6">
						<!-- Category -->
						<div>
							<span class="text-sm font-medium text-gray-700">Category</span>
							<div class="mt-1">
								<span class="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded">
									{analysisResult.category}
								</span>
							</div>
						</div>

						<!-- Subcategory -->
						<div>
							<span class="text-sm font-medium text-gray-700">Subcategory</span>
							<div class="mt-1">
								<span class="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded">
									{analysisResult.subcategory}
								</span>
							</div>
						</div>

						<!-- Colors -->
						<div>
							<span class="text-sm font-medium text-gray-700">Colors</span>
							<div class="mt-1 flex flex-wrap gap-2">
								{#each analysisResult.colors as color}
									<span class="inline-block px-3 py-1 bg-purple-100 text-purple-800 text-sm font-semibold rounded">
										{color}
									</span>
								{/each}
							</div>
						</div>

						<!-- Fit -->
						<div>
							<span class="text-sm font-medium text-gray-700">Fit</span>
							<div class="mt-1">
								<span class="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded">
									{analysisResult.fit}
								</span>
							</div>
						</div>
					</div>

					<!-- Occasions -->
					<div class="mb-6">
						<span class="text-sm font-medium text-gray-700">Occasions</span>
						<div class="mt-1 flex flex-wrap gap-2">
							{#each analysisResult.occasions as occasion}
								<span class="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-sm font-semibold rounded">
									{occasion}
								</span>
							{/each}
						</div>
					</div>

					<!-- Brand (if available) -->
					{#if analysisResult.brand}
						<div class="mb-6">
							<span class="text-sm font-medium text-gray-700">Brand</span>
							<div class="mt-1">
								<span class="text-gray-900">{analysisResult.brand}</span>
							</div>
						</div>
					{/if}

					<!-- Description -->
					<div class="mb-6">
						<span class="text-sm font-medium text-gray-700">Description</span>
						<p class="mt-1 text-gray-900 text-sm leading-relaxed">{analysisResult.description}</p>
					</div>

					<!-- Processing Stats -->
					<div class="flex gap-4 text-sm text-gray-600 pt-4 border-t">
						<span class="flex items-center gap-1">
							<Clock class="w-4 h-4" />
							{(analysisUsage.processing_time_ms / 1000).toFixed(2)}s
						</span>
						<span class="flex items-center gap-1">
							<DollarSign class="w-4 h-4" />
							${analysisUsage.cost_usd.toFixed(4)} USD (Rp {analysisUsage.cost_idr.toLocaleString('id-ID')})
						</span>
					</div>
				</div>

				<!-- Improved Image Card (conditional) -->
				{#if improvedImageUrl && improvementUsage}
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 class="text-xl font-semibold text-gray-900 mb-4">Improved Product Image</h2>

						<div class="mb-6">
							<div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
								<img
									src={improvedImageUrl}
									alt="Improved item"
									class="max-h-96 mx-auto rounded"
								/>
							</div>
						</div>

						<!-- Processing Stats -->
						<div class="flex gap-4 text-sm text-gray-600 mb-6 pb-6 border-b">
							<span class="flex items-center gap-1">
								<Clock class="w-4 h-4" />
								{(improvementUsage.processing_time_ms / 1000).toFixed(2)}s
							</span>
							<span class="flex items-center gap-1">
								<DollarSign class="w-4 h-4" />
								${improvementUsage.cost_usd.toFixed(4)} USD (Rp {improvementUsage.cost_idr.toLocaleString('id-ID')})
							</span>
							<span class="flex items-center gap-1">
								<span class="text-gray-700">Quality:</span>
								<span class="font-semibold">{improvementQuality}</span>
							</span>
						</div>

						<!-- Actions -->
						<div class="flex gap-3">
							<button
								type="button"
								on:click={() => downloadImage(improvedImageUrl!, 'wardope-improved-item.png')}
								class="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
							>
								<Download class="w-5 h-5" />
								Download Image
							</button>
							<button
								type="button"
								on:click={saveCurrentItem}
								class="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
							>
								<Save class="w-5 h-5" />
								Save Item Data
							</button>
						</div>
					</div>
				{:else if improvementError}
					<div class="bg-red-50 border border-red-200 rounded-lg p-4">
						<p class="text-red-800 text-sm font-medium">Improvement Failed</p>
						<p class="text-red-700 text-sm mt-1">{improvementError}</p>
					</div>
				{/if}

				<!-- Cost Breakdown Card -->
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h3 class="text-lg font-semibold text-gray-900 mb-4">API Usage & Cost Breakdown</h3>

					<div class="space-y-2 text-sm mb-6">
						<div class="flex justify-between">
							<span class="text-gray-600">Analysis cost:</span>
							<span class="font-mono">${analysisUsage.cost_usd.toFixed(4)} USD (Rp {analysisUsage.cost_idr.toLocaleString('id-ID')})</span>
						</div>
						{#if improvementUsage}
							<div class="flex justify-between">
								<span class="text-gray-600">Improvement ({improvementQuality}):</span>
								<span class="font-mono">${improvementUsage.cost_usd.toFixed(4)} USD (Rp {improvementUsage.cost_idr.toLocaleString('id-ID')})</span>
							</div>
						{/if}
						<div class="flex justify-between pt-2 border-t font-semibold">
							<span>Total cost:</span>
							<span class="font-mono">${totalCostUsd.toFixed(4)} USD (Rp {totalCostIdr.toLocaleString('id-ID')})</span>
						</div>
					</div>

					<!-- Budget Status -->
					<div
						class="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg {totalCostIdr <=
						2000
							? 'bg-green-50 border border-green-200'
							: 'bg-red-50 border border-red-200'}"
					>
						<div class="flex flex-wrap gap-4 text-sm">
							<span class="text-gray-700">
								Budget: <strong>Rp 2,000</strong>
							</span>
							<span class="text-gray-400">|</span>
							<span class="text-gray-700">
								Used: <strong>Rp {totalCostIdr.toLocaleString('id-ID')}</strong>
							</span>
						</div>
						<span
							class="px-4 py-2 rounded-md font-semibold text-sm {totalCostIdr <= 2000
								? 'bg-green-100 text-green-800'
								: 'bg-red-100 text-red-800'}"
						>
							{totalCostIdr <= 2000 ? 'UNDER BUDGET' : 'OVER BUDGET'}
						</span>
					</div>
				</div>
			{/if}

			<!-- Saved Items -->
			{#if savedItems.length > 0}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-semibold text-gray-900">Saved Items ({savedItems.length})</h3>
						<button
							type="button"
							on:click={clearAll}
							class="text-sm text-red-600 hover:text-red-700 font-medium"
						>
							Clear All
						</button>
					</div>

					<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
						{#each savedItems as item}
							<div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
								<div class="mb-3">
									<img
										src={item.improvedImage || item.originalImage}
										alt={item.data.subcategory}
										class="w-full h-48 object-cover rounded"
									/>
								</div>
								<h4 class="font-semibold text-gray-900 mb-1">{item.data.subcategory}</h4>
								<p class="text-sm text-gray-600 mb-1">
									{item.data.colors.join(', ')} • {item.data.fit}
								</p>
								<p class="text-sm text-gray-600 mb-2 line-clamp-1">
									{item.data.occasions.join(', ')}
								</p>
								<div class="flex items-center justify-between pt-2 border-t">
									<span class="text-sm font-medium text-gray-700">
										Rp {item.costs.total_cost_idr.toLocaleString('id-ID')}
									</span>
									<button
										type="button"
										on:click={() => deleteSavedItem(item.id)}
										class="text-red-600 hover:text-red-700 p-1"
										title="Delete"
									>
										<Trash2 class="w-4 h-4" />
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
