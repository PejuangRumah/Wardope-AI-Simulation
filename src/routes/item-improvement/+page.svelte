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
		getAllCategories,
		getSubcategories,
		COLORS,
		OCCASIONS,
		getFitOptions,
		getDefaultAnalysisPrompt,
		getDefaultImprovementPrompt,
		ITEM_CATEGORIES,
		FITS
	} from '$lib/constants/item-master';
	import { getItems, saveItem, deleteItem, clearAllItems, generateItemId } from '$lib/stores/items-store';

	// Upload state
	let uploadedImage: string | null = null;
	let uploadedFileName: string | null = null;
	let fileInput: HTMLInputElement;

	// Analysis state
	let isAnalyzing = false;
	let analysisResult: ItemAnalysis | null = null;
	let analysisUsage: AnalysisResponse['usage'] | null = null;
	let analysisError: string | null = null;
	let analysisSeconds = 0;
	let analysisInterval: ReturnType<typeof setInterval> | null = null;

	// Editable analysis fields
	let selectedCategory = '';
	let selectedSubcategory = '';
	let selectedColors: string[] = [];
	let selectedFit = '';
	let selectedOccasions: string[] = [];
	let itemDescription = '';
	let itemBrand = '';

	// Improvement state
	let isImproving = false;
	let improvedImageUrl: string | null = null;
	let improvementUsage: ImprovementResponse['usage'] | null = null;
	let improvementError: string | null = null;
	let improvementSeconds = 0;
	let improvementInterval: ReturnType<typeof setInterval> | null = null;

	// Saved items
	let savedItems: StoredItem[] = [];

	// Experimental settings
	let showExperimental = false;
	let showMasterData = false;
	let showProcessExplanation = false;
	let quality: 'low' | 'medium' | 'high' = 'medium';
	let defaultAnalysisPrompt = '';
	let defaultImprovementPrompt = '';
	let customAnalysisPrompt = '';
	let customImprovementPrompt = '';
	let customCategories: string[] = [];
	let customColors: string[] = [];
	let customFits: string[] = [];
	let customOccasions: string[] = [];

	// Computed values
	$: allCategories = [...getAllCategories(), ...customCategories];
	$: allColors = [...COLORS, ...customColors];
	$: allOccasions = [...OCCASIONS, ...customOccasions];
	$: availableFits = selectedCategory
		? [...getFitOptions(selectedCategory), ...customFits]
		: customFits;
	$: availableSubcategories = selectedCategory ? getSubcategories(selectedCategory) : [];

	$: totalCostIdr =
		(analysisUsage?.cost_idr || 0) + (improvementUsage?.cost_idr || 0);

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

	async function analyzeImage() {
		if (!uploadedImage) return;

		isAnalyzing = true;
		analysisError = null;

		// Start processing timer
		analysisSeconds = 0;
		analysisInterval = setInterval(() => {
			analysisSeconds++;
		}, 1000);

		try {
			const response = await fetch('/api/item-improvement/analyze', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					image: uploadedImage,
					customPrompt: customAnalysisPrompt || undefined
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to analyze image');
			}

			analysisResult = data.analysis;
			analysisUsage = data.usage;

			// Populate editable fields
			selectedCategory = data.analysis.category;
			selectedSubcategory = data.analysis.subcategory;
			selectedColors = data.analysis.colors;
			selectedFit = data.analysis.fit;
			selectedOccasions = data.analysis.occasions;
			itemDescription = data.analysis.description;
			itemBrand = data.analysis.brand || '';
		} catch (error) {
			console.error('Analysis error:', error);
			analysisError = error instanceof Error ? error.message : 'Unknown error occurred';
		} finally {
			isAnalyzing = false;

			// Stop processing timer
			if (analysisInterval) {
				clearInterval(analysisInterval);
				analysisInterval = null;
			}
		}
	}

	async function improveImage() {
		if (!analysisResult) return;

		// Build current item data from editable fields
		const currentItemData: ItemAnalysis = {
			category: selectedCategory,
			subcategory: selectedSubcategory,
			colors: selectedColors,
			fit: selectedFit,
			occasions: selectedOccasions,
			description: itemDescription,
			brand: itemBrand || undefined,
			confidence: analysisResult.confidence
		};

		isImproving = true;
		improvementError = null;

		// Start processing timer
		improvementSeconds = 0;
		improvementInterval = setInterval(() => {
			improvementSeconds++;
		}, 1000);

		try {
			const response = await fetch('/api/item-improvement/improve', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					itemData: currentItemData,
					quality,
					customPrompt: customImprovementPrompt || undefined
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to improve image');
			}

			improvedImageUrl = data.imageUrl;
			improvementUsage = data.usage;
		} catch (error) {
			console.error('Improvement error:', error);
			improvementError = error instanceof Error ? error.message : 'Unknown error occurred';
		} finally {
			isImproving = false;

			// Stop processing timer
			if (improvementInterval) {
				clearInterval(improvementInterval);
				improvementInterval = null;
			}
		}
	}

	function toggleColor(color: string) {
		if (selectedColors.includes(color)) {
			selectedColors = selectedColors.filter((c) => c !== color);
		} else {
			selectedColors = [...selectedColors, color];
		}
	}

	function toggleOccasion(occasion: string) {
		if (selectedOccasions.includes(occasion)) {
			selectedOccasions = selectedOccasions.filter((o) => o !== occasion);
		} else {
			selectedOccasions = [...selectedOccasions, occasion];
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
				category: selectedCategory,
				subcategory: selectedSubcategory,
				colors: selectedColors,
				fit: selectedFit,
				occasions: selectedOccasions,
				description: itemDescription,
				brand: itemBrand || undefined
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

	function addCustomData(type: 'category' | 'color' | 'fit' | 'occasion') {
		const value = prompt(`Enter new ${type}:`);
		if (!value) return;

		const trimmed = value.trim();
		if (!trimmed) return;

		if (type === 'category') {
			if (!customCategories.includes(trimmed)) {
				customCategories = [...customCategories, trimmed];
			}
		} else if (type === 'color') {
			if (!customColors.includes(trimmed)) {
				customColors = [...customColors, trimmed];
			}
		} else if (type === 'fit') {
			if (!customFits.includes(trimmed)) {
				customFits = [...customFits, trimmed];
			}
		} else if (type === 'occasion') {
			if (!customOccasions.includes(trimmed)) {
				customOccasions = [...customOccasions, trimmed];
			}
		}
	}

	function resetExperimental() {
		quality = 'medium';
		customAnalysisPrompt = defaultAnalysisPrompt;
		customImprovementPrompt = defaultImprovementPrompt;
		customCategories = [];
		customColors = [];
		customFits = [];
		customOccasions = [];
	}

	onMount(() => {
		savedItems = getItems();

		// Load default prompts into textareas
		defaultAnalysisPrompt = getDefaultAnalysisPrompt();
		customAnalysisPrompt = defaultAnalysisPrompt;

		// For improvement prompt, we need a sample item data to show the template
		// We'll use a placeholder that shows the structure
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
			<!-- Step 1: Upload Image -->
			<div class="bg-white rounded-lg shadow-md border border-gray-200 p-6">
				<div class="flex items-center gap-2 mb-4">
					<div
						class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold"
					>
						1
					</div>
					<h2 class="text-xl font-semibold text-gray-900">Upload Item Image</h2>
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
						<div class="flex items-center justify-between">
							<p class="text-sm text-gray-600">{uploadedFileName}</p>
							<button
								type="button"
								on:click={analyzeImage}
								disabled={isAnalyzing}
								class="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
							>
								{#if isAnalyzing}
									<Loader2 class="w-4 h-4 animate-spin" />
									Analyzing... {analysisSeconds}s
								{:else}
									<Sparkles class="w-4 h-4" />
									Analyze Item
								{/if}
							</button>
						</div>
					</div>
				{/if}

				{#if analysisError}
					<div class="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
						<p class="text-red-800 text-sm">{analysisError}</p>
					</div>
				{/if}
			</div>

			<!-- Step 2: Analysis Results (shows after analysis) -->
			{#if analysisResult && analysisUsage}
				<div class="bg-white rounded-lg shadow-md border border-gray-200 p-6">
					<div class="flex items-center gap-2 mb-4">
						<div
							class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold"
						>
							2
						</div>
						<h2 class="text-xl font-semibold text-gray-900">Review & Edit Analysis</h2>
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

					<div class="grid md:grid-cols-2 gap-6">
						<!-- Category -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Category <span class="text-red-600">*</span>
							</label>
							<select
								bind:value={selectedCategory}
								class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="">Select category</option>
								{#each allCategories as cat}
									<option value={cat}>{cat}</option>
								{/each}
							</select>
						</div>

						<!-- Subcategory -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Subcategory <span class="text-red-600">*</span>
							</label>
							<select
								bind:value={selectedSubcategory}
								disabled={!selectedCategory}
								class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
							>
								<option value="">Select subcategory</option>
								{#each availableSubcategories as subcat}
									<option value={subcat}>{subcat}</option>
								{/each}
							</select>
						</div>

						<!-- Fit -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Fit <span class="text-red-600">*</span>
							</label>
							<select
								bind:value={selectedFit}
								class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="">Select fit</option>
								{#each availableFits as fit}
									<option value={fit}>{fit}</option>
								{/each}
							</select>
						</div>

						<!-- Brand -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Brand (Optional)
							</label>
							<input
								type="text"
								bind:value={itemBrand}
								placeholder="e.g., Nike, Adidas, Zara"
								class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
					</div>

					<!-- Colors -->
					<div class="mt-6">
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Colors <span class="text-red-600">*</span>
						</label>
						<div class="flex flex-wrap gap-2">
							{#each allColors as color}
								<button
									type="button"
									on:click={() => toggleColor(color)}
									class="px-3 py-1 rounded-full text-sm font-medium transition-colors {selectedColors.includes(
										color
									)
										? 'bg-blue-600 text-white'
										: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
								>
									{color}
								</button>
							{/each}
						</div>
					</div>

					<!-- Occasions -->
					<div class="mt-6">
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Occasions <span class="text-red-600">*</span>
						</label>
						<div class="flex flex-wrap gap-2">
							{#each allOccasions as occasion}
								<button
									type="button"
									on:click={() => toggleOccasion(occasion)}
									class="px-3 py-1 rounded-full text-sm font-medium transition-colors {selectedOccasions.includes(
										occasion
									)
										? 'bg-blue-600 text-white'
										: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
								>
									{occasion}
								</button>
							{/each}
						</div>
					</div>

					<!-- Description -->
					<div class="mt-6">
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Description <span class="text-red-600">*</span>
						</label>
						<textarea
							bind:value={itemDescription}
							rows="4"
							placeholder="Detailed description of the item..."
							class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
						></textarea>
					</div>

					<!-- Improve Button -->
					<div class="mt-6 flex justify-end">
						<button
							type="button"
							on:click={improveImage}
							disabled={isImproving || !selectedCategory || !selectedSubcategory || selectedColors.length === 0}
							class="inline-flex items-center gap-2 bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
						>
							{#if isImproving}
								<Loader2 class="w-5 h-5 animate-spin" />
								Improving Image... {improvementSeconds}s
							{:else}
								<ImageIcon class="w-5 h-5" />
								Improve Image
							{/if}
						</button>
					</div>

					{#if improvementError}
						<div class="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
							<p class="text-red-800 text-sm">{improvementError}</p>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Step 3: Image Comparison (shows after improvement) -->
			{#if improvedImageUrl && improvementUsage}
				<div class="bg-white rounded-lg shadow-md border border-gray-200 p-6">
					<div class="flex items-center gap-2 mb-4">
						<div
							class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold"
						>
							3
						</div>
						<h2 class="text-xl font-semibold text-gray-900">Image Comparison</h2>
					</div>

					<div class="grid md:grid-cols-2 gap-6 mb-6">
						<!-- Original -->
						<div>
							<h3 class="text-sm font-semibold text-gray-700 mb-2">Original</h3>
							<div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
								<img
									src={uploadedImage}
									alt="Original"
									class="w-full h-auto rounded"
								/>
							</div>
						</div>

						<!-- Improved -->
						<div>
							<h3 class="text-sm font-semibold text-gray-700 mb-2">Improved</h3>
							<div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
								<img
									src={improvedImageUrl}
									alt="Improved"
									class="w-full h-auto rounded"
								/>
							</div>
						</div>
					</div>

					<!-- Actions -->
					<div class="flex gap-3">
						<button
							type="button"
							on:click={() => downloadImage(improvedImageUrl!, 'wardope-improved-item.png')}
							class="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
						>
							<Download class="w-5 h-5" />
							Download Improved
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
			{/if}

			<!-- Cost Breakdown -->
			{#if analysisUsage || improvementUsage}
				<div class="bg-white rounded-lg shadow-md border border-gray-200 p-6">
					<h3 class="text-lg font-semibold text-gray-900 mb-4">API Usage & Cost Breakdown</h3>

					<div class="grid md:grid-cols-2 gap-6">
						<!-- Token Usage -->
						{#if analysisUsage}
							<div>
								<h4 class="text-sm font-medium text-gray-700 mb-3">Token Usage (Analysis)</h4>
								<div class="space-y-2 text-sm">
									<div class="flex justify-between">
										<span class="text-gray-600">Input tokens:</span>
										<span class="font-mono">{analysisUsage.prompt_tokens.toLocaleString()}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-gray-600">Output tokens:</span>
										<span class="font-mono">{analysisUsage.completion_tokens.toLocaleString()}</span>
									</div>
									<div class="flex justify-between pt-2 border-t font-semibold">
										<span>Total tokens:</span>
										<span class="font-mono">{analysisUsage.total_tokens.toLocaleString()}</span>
									</div>
								</div>
							</div>
						{/if}

						<!-- Cost -->
						<div>
							<h4 class="text-sm font-medium text-gray-700 mb-3">Cost Breakdown</h4>
							<div class="space-y-2 text-sm">
								{#if analysisUsage}
									<div class="flex justify-between">
										<span class="text-gray-600">Analysis cost:</span>
										<span class="font-mono">Rp {analysisUsage.cost_idr.toLocaleString('id-ID')}</span>
									</div>
								{/if}
								{#if improvementUsage}
									<div class="flex justify-between">
										<span class="text-gray-600">Improvement ({quality}):</span>
										<span class="font-mono">Rp {improvementUsage.cost_idr.toLocaleString('id-ID')}</span>
									</div>
								{/if}
								<div class="flex justify-between pt-2 border-t font-semibold">
									<span>Total cost (IDR):</span>
									<span class="font-mono">Rp {totalCostIdr.toLocaleString('id-ID')}</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Budget Status -->
					<div
						class="mt-4 flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg {totalCostIdr <=
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

			<!-- AI Process Explanation -->
			<div class="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
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
										This system uses GPT-4o Vision for image analysis and GPT-Image-1 for professional image generation. The complete process takes 3-5 seconds for analysis and 8-12 seconds for improvement, with costs approximately Rp 350-500 per item (analysis) and Rp 600-1,200 per image (generation).
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
										<div class="p-2 bg-white border border-blue-200 rounded text-xs font-mono text-gray-700 mb-2">
											<div class="text-gray-900 mb-1">Example:</div>
											Input: [Image of blue shirt]<br />
											Output: category: "tops", subcategory: "Shirt", colors: ["blue", "white"], fit: "regular"
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

							<!-- Step 3: User Review & Edit -->
							<div class="border border-gray-200 rounded-lg p-3 bg-white">
								<div class="flex items-start gap-3">
									<div class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
										3
									</div>
									<div class="flex-1">
										<div class="flex items-center gap-2 mb-1">
											<Check class="w-4 h-4 text-gray-600" />
											<h4 class="text-sm font-semibold text-gray-900">User Review & Manual Editing</h4>
										</div>
										<p class="text-xs text-gray-600 mb-2">
											Analysis results are fully editable. Users can adjust category, subcategory, colors, fit, occasions, brand, and description before generating improved images.
										</p>
										<div class="flex items-center gap-4 text-xs text-gray-500">
											<span class="flex items-center gap-1">
												<Clock class="w-3.5 h-3.5" />
												User-controlled
											</span>
											<span class="flex items-center gap-1 text-gray-600">
												<Check class="w-3.5 h-3.5" />
												No API cost
											</span>
										</div>
									</div>
								</div>
							</div>

							<!-- Step 4: Image Improvement (GPT-Image-1) -->
							<div class="border border-purple-200 rounded-lg p-3 bg-purple-50">
								<div class="flex items-start gap-3">
									<div class="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
										4
									</div>
									<div class="flex-1">
										<div class="flex items-center gap-2 mb-1">
											<ImageIcon class="w-4 h-4 text-purple-600" />
											<h4 class="text-sm font-semibold text-gray-900">Professional Image Generation (DALL-E 3)</h4>
											<span class="px-2 py-0.5 bg-purple-600 text-white text-xs font-semibold rounded">AI Generation</span>
										</div>
										<p class="text-xs text-gray-600 mb-2">
											DALL-E 3 creates professional e-commerce style product photos based on analyzed item data. Uses customizable prompt template for consistent branding.
										</p>
										<div class="p-2 bg-white border border-purple-200 rounded text-xs mb-2">
											<div class="font-medium text-gray-700 mb-1">Generation Parameters:</div>
											<ul class="space-y-0.5 text-gray-600">
												<li>• Model: DALL-E 3</li>
												<li>• Size: 1024x1024 (square format, 1:1 ratio)</li>
												<li>• Format: PNG without background</li>
												<li>• Quality: Low (Rp 400), Medium (Rp 600), or High (Rp 1,200)</li>
											</ul>
										</div>
										<div class="p-2 bg-white border border-purple-200 rounded text-xs mb-2">
											<div class="font-medium text-gray-700 mb-1">What It Generates:</div>
											<ul class="space-y-0.5 text-gray-600">
												<li>• Professional product photo with clean white/neutral background</li>
												<li>• Front-facing view with centered composition</li>
												<li>• Studio-quality lighting without harsh shadows</li>
												<li>• Catalog-ready presentation for premium e-commerce</li>
											</ul>
										</div>
										<div class="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
											<span class="flex items-center gap-1">
												<Clock class="w-3.5 h-3.5" />
												~8-12s
											</span>
											<span class="flex items-center gap-1 text-gray-700">
												<DollarSign class="w-3.5 h-3.5" />
												Low: $0.027 (Rp 400) | Medium: $0.04 (Rp 600) | High: $0.08 (Rp 1,200)
											</span>
										</div>
									</div>
								</div>
							</div>

							<!-- Step 5: Result Storage -->
							<div class="border border-gray-200 rounded-lg p-3 bg-white">
								<div class="flex items-start gap-3">
									<div class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
										5
									</div>
									<div class="flex-1">
										<div class="flex items-center gap-2 mb-1">
											<Database class="w-4 h-4 text-gray-600" />
											<h4 class="text-sm font-semibold text-gray-900">Local Storage & Download</h4>
										</div>
										<p class="text-xs text-gray-600 mb-2">
											Improved images and item data are stored in browser localStorage. Users can download images, save item records, and maintain a collection for batch processing.
										</p>
										<div class="p-2 bg-gray-50 border border-gray-200 rounded text-xs mb-2">
											<div class="font-medium text-gray-700 mb-1">Storage Includes:</div>
											<ul class="space-y-0.5 text-gray-600">
												<li>• Original image (base64)</li>
												<li>• Improved image (OpenAI CDN URL)</li>
												<li>• Complete item data</li>
												<li>• Cost breakdown (analysis + improvement)</li>
												<li>• Timestamp</li>
											</ul>
										</div>
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
									<span class="font-mono">Rp 400</span>
								</div>
								<div class="flex justify-between">
									<span>Improvement Medium:</span>
									<span class="font-mono">Rp 600</span>
								</div>
								<div class="flex justify-between">
									<span>Improvement High:</span>
									<span class="font-mono">Rp 1,200</span>
								</div>
								<div class="flex justify-between pt-2 border-t border-gray-300 font-semibold text-gray-900">
									<span>Total (Low):</span>
									<span class="font-mono">Rp 750-900</span>
								</div>
								<div class="flex justify-between font-semibold text-gray-900">
									<span>Total (Medium):</span>
									<span class="font-mono">Rp 950-1,100</span>
								</div>
								<div class="flex justify-between font-semibold text-gray-900">
									<span>Total (High):</span>
									<span class="font-mono">Rp 1,550-1,700</span>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Saved Items -->
			{#if savedItems.length > 0}
				<div class="bg-white rounded-lg shadow-md border border-gray-200 p-6">
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

			<!-- Experimental Controls -->
			<div class="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
				<button
					type="button"
					on:click={() => (showExperimental = !showExperimental)}
					class="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
				>
					<div class="flex items-center gap-2">
						<svg
							class="w-5 h-5 text-gray-600 transition-transform {showExperimental ? 'rotate-90' : ''}"
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
						<span class="text-sm font-medium text-gray-700">Experimental Controls</span>
						<span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">
							Advanced
						</span>
					</div>
					<span class="text-xs text-gray-500">
						{showExperimental ? 'Hide' : 'Show'}
					</span>
				</button>

				{#if showExperimental}
					<div class="p-4 bg-white space-y-4">
						<!-- Warning -->
						<div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
							<p class="text-xs text-yellow-800">
								<strong>Warning:</strong> These settings are for testing and experimentation only. Changes
								are not persisted across sessions.
							</p>
						</div>

						<!-- Quality Setting -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Image Quality (affects cost)
							</label>
							<div class="grid grid-cols-3 gap-3">
								<label class="relative flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer {quality === 'low' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 hover:border-gray-400'}">
									<input
										type="radio"
										bind:group={quality}
										value="low"
										class="sr-only"
									/>
									<span class="font-medium text-sm">Low (Rp 400)</span>
								</label>
								<label class="relative flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer {quality === 'medium' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 hover:border-gray-400'}">
									<input
										type="radio"
										bind:group={quality}
										value="medium"
										class="sr-only"
									/>
									<span class="font-medium text-sm">Medium (Rp 600)</span>
								</label>
								<label class="relative flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer {quality === 'high' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 hover:border-gray-400'}">
									<input
										type="radio"
										bind:group={quality}
										value="high"
										class="sr-only"
									/>
									<span class="font-medium text-sm">High (Rp 1,200)</span>
								</label>
							</div>
						</div>

						<!-- Custom Analysis Prompt -->
						<div>
							<div class="flex items-center justify-between mb-2">
								<label class="block text-sm font-medium text-gray-700">
									Custom Analysis Prompt
								</label>
								<button
									type="button"
									on:click={() => customAnalysisPrompt = defaultAnalysisPrompt}
									class="text-xs text-blue-600 hover:text-blue-700 font-medium"
								>
									Reset to Default
								</button>
							</div>
							<textarea
								bind:value={customAnalysisPrompt}
								rows="8"
								placeholder="Loading default prompt..."
								class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs resize-none"
							></textarea>
							<p class="mt-1 text-xs text-gray-500">
								This prompt guides GPT-4o Vision to analyze uploaded item images and extract category, colors, fit, occasions, and description.
							</p>
						</div>

						<!-- Custom Improvement Prompt -->
						<div>
							<div class="flex items-center justify-between mb-2">
								<label class="block text-sm font-medium text-gray-700">
									Custom Improvement Prompt
								</label>
								<button
									type="button"
									on:click={() => customImprovementPrompt = defaultImprovementPrompt}
									class="text-xs text-blue-600 hover:text-blue-700 font-medium"
								>
									Reset to Default
								</button>
							</div>
							<textarea
								bind:value={customImprovementPrompt}
								rows="8"
								placeholder="Loading default prompt..."
								class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs resize-none"
							></textarea>
							<p class="mt-1 text-xs text-gray-500">
								This prompt guides GPT-Image-1 to generate professional e-commerce style product photos. The template uses item data from analysis.
							</p>
						</div>

						<!-- Master Data Reference -->
						<div class="border-t border-gray-200 pt-4">
							<button
								type="button"
								on:click={() => (showMasterData = !showMasterData)}
								class="w-full flex items-center justify-between mb-3"
							>
								<div class="flex items-center gap-2">
									<svg
										class="w-4 h-4 text-gray-600 transition-transform {showMasterData ? 'rotate-90' : ''}"
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
									<span class="text-sm font-medium text-gray-700">Master Data Reference</span>
									<span class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded">
										Read-Only
									</span>
								</div>
								<span class="text-xs text-gray-500">
									{showMasterData ? 'Hide' : 'Show'}
								</span>
							</button>

							{#if showMasterData}
								<div class="space-y-4 pl-6">
									<!-- Categories & Subcategories -->
									<div>
										<h5 class="text-xs font-semibold text-gray-900 mb-2">
											Categories & Subcategories
											<span class="text-gray-500 font-normal">(6 categories, 44 subcategories)</span>
										</h5>
										<div class="space-y-2 text-xs">
											{#each Object.entries(ITEM_CATEGORIES) as [category, subcategories]}
												<div class="p-2 bg-gray-50 border border-gray-200 rounded">
													<div class="font-medium text-gray-900 mb-1">
														{category}
														<span class="ml-1 px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
															{subcategories.length}
														</span>
													</div>
													<div class="text-gray-600">
														{subcategories.join(', ')}
													</div>
												</div>
											{/each}
										</div>
									</div>

									<!-- Available Colors -->
									<div>
										<h5 class="text-xs font-semibold text-gray-900 mb-2">
											Available Colors
											<span class="text-gray-500 font-normal">(34 colors)</span>
										</h5>
										<div class="space-y-2 text-xs">
											<div class="p-2 bg-gray-50 border border-gray-200 rounded">
												<div class="font-medium text-gray-700 mb-1">Reds</div>
												<div class="text-gray-600">red, dark red, maroon, crimson, coral</div>
											</div>
											<div class="p-2 bg-gray-50 border border-gray-200 rounded">
												<div class="font-medium text-gray-700 mb-1">Orange/Yellow</div>
												<div class="text-gray-600">orange, gold, yellow</div>
											</div>
											<div class="p-2 bg-gray-50 border border-gray-200 rounded">
												<div class="font-medium text-gray-700 mb-1">Greens</div>
												<div class="text-gray-600">green, forest green, olive, army, sage, khaki</div>
											</div>
											<div class="p-2 bg-gray-50 border border-gray-200 rounded">
												<div class="font-medium text-gray-700 mb-1">Blues</div>
												<div class="text-gray-600">blue, navy, royal blue, sky blue, indigo, teal</div>
											</div>
											<div class="p-2 bg-gray-50 border border-gray-200 rounded">
												<div class="font-medium text-gray-700 mb-1">Purples/Pinks</div>
												<div class="text-gray-600">purple, plum, lavender, pink, hot pink</div>
											</div>
											<div class="p-2 bg-gray-50 border border-gray-200 rounded">
												<div class="font-medium text-gray-700 mb-1">Browns</div>
												<div class="text-gray-600">brown, tan, beige</div>
											</div>
											<div class="p-2 bg-gray-50 border border-gray-200 rounded">
												<div class="font-medium text-gray-700 mb-1">Neutrals</div>
												<div class="text-gray-600">gray, silver, charcoal, sand, black, white</div>
											</div>
										</div>
									</div>

									<!-- Available Fits -->
									<div>
										<h5 class="text-xs font-semibold text-gray-900 mb-2">Available Fits</h5>
										<div class="space-y-2 text-xs">
											<div class="p-2 bg-gray-50 border border-gray-200 rounded">
												<div class="font-medium text-gray-700 mb-1">Default</div>
												<div class="text-gray-600">{FITS.default.join(', ')}</div>
											</div>
											<div class="p-2 bg-gray-50 border border-gray-200 rounded">
												<div class="font-medium text-gray-700 mb-1">Bottoms-specific</div>
												<div class="text-gray-600">{FITS.bottoms.join(', ')}</div>
											</div>
											<div class="p-2 bg-gray-50 border border-gray-200 rounded">
												<div class="font-medium text-gray-700 mb-1">Tops/Outerwear-specific</div>
												<div class="text-gray-600">{FITS.tops.join(', ')}</div>
											</div>
										</div>
									</div>

									<!-- Available Occasions -->
									<div>
										<h5 class="text-xs font-semibold text-gray-900 mb-2">
											Available Occasions
											<span class="text-gray-500 font-normal">(8 occasions)</span>
										</h5>
										<div class="p-2 bg-gray-50 border border-gray-200 rounded text-xs">
											<div class="text-gray-600">
												{OCCASIONS.join(', ')}
											</div>
										</div>
									</div>
								</div>
							{/if}
						</div>

						<!-- Add Custom Data -->
						<div class="border-t border-gray-200 pt-4">
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Add Custom Data
							</label>
							<div class="grid grid-cols-2 gap-2">
								<button
									type="button"
									on:click={() => addCustomData('category')}
									class="px-3 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200 transition-colors"
								>
									Add Category
								</button>
								<button
									type="button"
									on:click={() => addCustomData('color')}
									class="px-3 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200 transition-colors"
								>
									Add Color
								</button>
								<button
									type="button"
									on:click={() => addCustomData('fit')}
									class="px-3 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200 transition-colors"
								>
									Add Fit
								</button>
								<button
									type="button"
									on:click={() => addCustomData('occasion')}
									class="px-3 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200 transition-colors"
								>
									Add Occasion
								</button>
							</div>
						</div>

						<!-- Custom Data Display -->
						{#if customCategories.length > 0 || customColors.length > 0 || customFits.length > 0 || customOccasions.length > 0}
							<div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
								<p class="text-xs font-medium text-blue-900 mb-2">Custom Data Added:</p>
								<div class="text-xs text-blue-700 space-y-1">
									{#if customCategories.length > 0}
										<p><strong>Categories:</strong> {customCategories.join(', ')}</p>
									{/if}
									{#if customColors.length > 0}
										<p><strong>Colors:</strong> {customColors.join(', ')}</p>
									{/if}
									{#if customFits.length > 0}
										<p><strong>Fits:</strong> {customFits.join(', ')}</p>
									{/if}
									{#if customOccasions.length > 0}
										<p><strong>Occasions:</strong> {customOccasions.join(', ')}</p>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Reset Button -->
						<div class="flex justify-end">
							<button
								type="button"
								on:click={resetExperimental}
								class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
							>
								Reset to Defaults
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
