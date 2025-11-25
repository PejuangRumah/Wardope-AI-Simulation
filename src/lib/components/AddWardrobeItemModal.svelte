<script lang="ts">
	import { createEventDispatcher, onMount } from "svelte";
	import {
		Upload,
		Loader2,
		X,
		Sparkles,
		ArrowRight,
		ArrowLeft,
		Save,
	} from "lucide-svelte";
	import { removeBgAndConvertToBase64 } from "$lib/utils/background-remover";
	import MultiSelect from "./MultiSelect.svelte";
	import type {
		WardrobePrompt,
		WardrobeMasterData,
	} from "$lib/types/wardrobe";
	import type { ItemAnalysis } from "$lib/types/item";

	export let prompts: WardrobePrompt[];
	export let masterData: WardrobeMasterData;

	const dispatch = createEventDispatcher();

	// Current step (1-4)
	let currentStep = 1;

	// Step 1: Upload
	let fileInput: HTMLInputElement;
	let uploadedFile: File | null = null;
	let uploadedImagePreview: string | null = null;
	let uploadedImageBase64: string | null = null; // Base64 for API submission

	// Step 2: Background Removal
	let isRemovingBg = false;
	let bgRemovalProgress = 0;
	let bgRemovedImage: string | null = null;

	// Step 3: AI Options
	let enableAnalysis = true; // Enable by default for faster flow
	let enableGlowUp = false;
	let glowUpQuality: "low" | "medium" | "high" = "medium";
	let selectedAnalysisPromptId: string | undefined;
	let selectedImprovementPromptId: string | undefined;
	let isProcessing = false;
	let processingStep = "";

	// Analysis results
	let analysisResult: ItemAnalysis | null = null;
	let improvedImageUrl: string | null = null;
	let autoSaveAttempted = false; // Track if we tried auto-save

	// Step 4: Form
	let formData = {
		category: "",
		subcategory: "",
		colors: [] as string[],
		fit: "",
		brand: "",
		occasions: [] as string[],
		description: "",
	};

	// Prompts filtered by type
	$: analysisPrompts = prompts.filter((p) => p.type === "item_analysis");
	$: improvementPrompts = prompts.filter(
		(p) => p.type === "item_improvement",
	);

	// Filtered subcategories based on selected category
	$: filteredSubcategories = formData.category
		? masterData.subcategories.filter((s) => {
				const category = masterData.categories.find(
					(c) => c.name === formData.category,
				);
				return category && s.category_id === category.id;
			})
		: [];

	// Filtered fits based on selected category
	$: filteredFits = formData.category
		? masterData.fits.filter((f) => {
				const category = masterData.categories.find(
					(c) => c.name === formData.category,
				);
				// If fit has no category_id, it applies to all (if that's the logic, otherwise strict match)
				// Assuming strict match is required based on user request
				return category && f.category_id === category.id;
			})
		: [];

	// Debugging
	$: if (formData.category) {
		const category = masterData.categories.find(
			(c) => c.name === formData.category,
		);
		console.log(
			"Selected Category:",
			formData.category,
			"ID:",
			category?.id,
		);
		console.log("Filtered Fits:", filteredFits.length);
	}

	// Cost estimation
	$: totalEstimatedCost =
		(enableAnalysis ? 450 : 0) +
		(enableGlowUp
			? glowUpQuality === "low"
				? 150
				: glowUpQuality === "high"
					? 2550
					: 600
			: 0);

	// Auto-select default prompts on mount
	onMount(() => {
		// Find and select "Default Item Analyzer" prompt (latest version)
		const analyzerMatch = analysisPrompts.find(
			(p) =>
				p.name.toLowerCase().includes("default") &&
				p.name.toLowerCase().includes("analyzer"),
		);
		if (analyzerMatch) {
			selectedAnalysisPromptId = analyzerMatch.id;
		}

		// Find and select "Default Image Improver" prompt (latest version)
		const improverMatch = improvementPrompts.find(
			(p) =>
				p.name.toLowerCase().includes("default") &&
				p.name.toLowerCase().includes("improver"),
		);
		if (improverMatch) {
			selectedImprovementPromptId = improverMatch.id;
		}
	});

	// Helper function to convert File to base64 data URI
	function fileToBase64(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	}

	async function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		// Validate file type
		if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
			alert("Please upload a JPEG or PNG image.");
			return;
		}

		// Validate file size (max 20MB)
		if (file.size > 20 * 1024 * 1024) {
			alert("Image size must be less than 20MB.");
			return;
		}

		uploadedFile = file;
		uploadedImagePreview = URL.createObjectURL(file);
		uploadedImageBase64 = await fileToBase64(file); // Convert to base64 for API

		// Auto-proceed to background removal
		await handleBackgroundRemoval();
	}

	async function handleBackgroundRemoval() {
		if (!uploadedFile) return;

		isRemovingBg = true;
		currentStep = 2;

		try {
			bgRemovedImage = await removeBgAndConvertToBase64(
				uploadedFile,
				(progress) => {
					bgRemovalProgress = progress;
				},
			);

			// Auto-proceed to AI options
			setTimeout(() => {
				currentStep = 3;
			}, 500);
		} catch (error) {
			console.error("Background removal error:", error);
			alert(
				`Background removal failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			currentStep = 1; // Go back to upload
			resetUpload();
		} finally {
			isRemovingBg = false;
			bgRemovalProgress = 0;
		}
	}

	async function runAIProcessing() {
		if (!bgRemovedImage) return;

		isProcessing = true;

		try {
			// Step 1: Analysis (if enabled)
			if (enableAnalysis) {
				processingStep = "Analyzing item...";
				const response = await fetch("/api/item-improvement/analyze", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						image: bgRemovedImage,
						promptId: selectedAnalysisPromptId,
					}),
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.error || "Analysis failed");
				}

				const data = await response.json();
				analysisResult = data.analysis;

				// Auto-fill form from analysis result
				if (analysisResult) {
					formData.category = analysisResult.category;
					formData.subcategory = analysisResult.subcategory;
					formData.colors = analysisResult.colors;
					// Find matching fit from masterData (case-insensitive)
					const fitFromAI = analysisResult.fit?.toLowerCase() || "";
					const matchedFit = masterData.fits.find(
						(f) => f.name.toLowerCase() === fitFromAI,
					);
					formData.fit = matchedFit?.name || "";
					formData.occasions = analysisResult.occasions;
					formData.description = analysisResult.description;
					// Handle brand - check for actual null, undefined, or string "null"
					formData.brand =
						analysisResult.brand && analysisResult.brand !== "null"
							? analysisResult.brand
							: "";
				}
			}

			// Step 2: Glow Up (if enabled)
			if (enableGlowUp) {
				processingStep = "Enhancing image...";
				const response = await fetch("/api/item-improvement/improve", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						itemData: analysisResult || {
							category: formData.category || "Top",
							subcategory: formData.subcategory || "Shirt",
							colors:
								formData.colors.length > 0
									? formData.colors
									: ["blue"],
							fit: formData.fit || "regular",
							occasions: formData.occasions,
							description: formData.description,
							brand: formData.brand,
							confidence: "medium",
						},
						originalImage: bgRemovedImage,
						quality: glowUpQuality,
						promptId: selectedImprovementPromptId,
					}),
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.error || "Image improvement failed");
				}

				const data = await response.json();
				improvedImageUrl = data.imageUrl;
			}

			// Check if auto-save is possible (all fields filled with good confidence)
			if (canAutoSave() && !autoSaveAttempted) {
				autoSaveAttempted = true;
				processingStep = "Auto-saving to wardrobe...";
				const saved = await saveToWardrobe(true);
				if (saved) {
					return; // Success - modal will close via dispatch
				}
				// Auto-save failed, fall through to form step
			}

			// Move to form step if auto-save not possible or failed
			currentStep = 4;
		} catch (error) {
			console.error("AI processing error:", error);
			alert(
				`AI processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		} finally {
			isProcessing = false;
			processingStep = "";
		}
	}

	async function saveToWardrobe(isAutoSave = false): Promise<boolean> {
		// Validate required fields
		if (
			!formData.category ||
			!formData.subcategory ||
			formData.colors.length === 0 ||
			!formData.description
		) {
			if (!isAutoSave) {
				alert(
					"Please fill in all required fields (category, subcategory, at least one color, description)",
				);
			}
			return false;
		}

		if (!isAutoSave) {
			isProcessing = true;
		}
		processingStep = "Saving to wardrobe...";

		try {
			const response = await fetch("/api/wardrobe-items", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					originalImage: uploadedImageBase64,
					improvedImage: improvedImageUrl || bgRemovedImage,
					description: formData.description,
					category: formData.category,
					subcategory: formData.subcategory,
					colors: formData.colors,
					fit: formData.fit || undefined,
					brand: formData.brand || undefined,
					occasions:
						formData.occasions.length > 0
							? formData.occasions
							: undefined,
					analysisMetadata: analysisResult
						? {
								confidence: analysisResult.confidence,
								colors: analysisResult.colors,
								occasions: analysisResult.occasions,
							}
						: undefined,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to save item");
			}

			// Success!
			dispatch("success");
			return true;
		} catch (error) {
			console.error("Save error:", error);
			if (!isAutoSave) {
				alert(
					`Failed to save item: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
			return false;
		} finally {
			if (!isAutoSave) {
				isProcessing = false;
				processingStep = "";
			}
		}
	}

	function resetUpload() {
		uploadedFile = null;
		uploadedImagePreview = null;
		uploadedImageBase64 = null;
		bgRemovedImage = null;
		if (fileInput) {
			fileInput.value = "";
		}
	}

	function closeModal() {
		dispatch("close");
	}

	// Check if form data is complete for auto-save
	function isFormDataComplete(): boolean {
		return !!(
			formData.category &&
			formData.subcategory &&
			formData.colors.length > 0 &&
			formData.description &&
			formData.description.length >= 10
		);
	}

	// Check if auto-save conditions are met
	function canAutoSave(): boolean {
		if (!analysisResult) return false;
		// Auto-save if all required fields are filled and confidence is medium or high
		const hasGoodConfidence =
			analysisResult.confidence === "medium" ||
			analysisResult.confidence === "high";
		return isFormDataComplete() && hasGoodConfidence;
	}
</script>

<!-- Modal Overlay -->
<div
	class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
>
	<!-- Modal Container -->
	<div
		class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
	>
		<!-- Header -->
		<div class="flex items-center justify-between p-6 border-b">
			<h2 class="text-2xl font-bold text-gray-900">
				Add New Wardrobe Item
			</h2>
			<button
				on:click={closeModal}
				class="text-gray-400 hover:text-gray-600 transition"
			>
				<X class="w-6 h-6" />
			</button>
		</div>

		<!-- Progress Steps -->
		<div class="px-6 py-4 border-b">
			<div class="flex items-center justify-between">
				{#each [1, 2, 3, 4] as step}
					<div class="flex items-center {step < 4 ? 'flex-1' : ''}">
						<div
							class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm {currentStep >=
							step
								? 'bg-blue-600 text-white'
								: 'bg-gray-200 text-gray-600'}"
						>
							{step}
						</div>
						{#if step < 4}
							<div
								class="flex-1 h-1 mx-2 {currentStep > step
									? 'bg-blue-600'
									: 'bg-gray-200'}"
							></div>
						{/if}
					</div>
				{/each}
			</div>
			<div class="flex justify-between mt-2 text-xs text-gray-600">
				<span>Upload</span>
				<span>Remove BG</span>
				<span>AI Options</span>
				<span>Details</span>
			</div>
		</div>

		<!-- Content -->
		<div class="p-6">
			<!-- Step 1: Upload Image -->
			{#if currentStep === 1}
				<div>
					<h3 class="text-lg font-semibold mb-4">
						Upload Item Image
					</h3>

					<div
						class="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
						on:click={() => fileInput.click()}
						on:keydown={(e) =>
							e.key === "Enter" && fileInput.click()}
						role="button"
						tabindex="0"
					>
						{#if uploadedImagePreview}
							<img
								src={uploadedImagePreview}
								alt="Preview"
								class="max-h-64 mx-auto rounded"
							/>
							<p class="text-sm text-gray-600 mt-4">
								{uploadedFile?.name}
							</p>
						{:else}
							<Upload
								class="w-12 h-12 text-gray-400 mx-auto mb-4"
							/>
							<p class="text-gray-600 mb-2">
								Drag and drop an image here, or click to select
							</p>
							<p class="text-sm text-gray-500">
								JPEG or PNG, max 20MB
							</p>
						{/if}
						<input
							bind:this={fileInput}
							type="file"
							accept="image/jpeg,image/jpg,image/png"
							on:change={handleFileSelect}
							class="hidden"
						/>
					</div>
				</div>
			{/if}

			<!-- Step 2: Background Removal -->
			{#if currentStep === 2}
				<div>
					<h3 class="text-lg font-semibold mb-4">
						Removing Background
					</h3>

					{#if isRemovingBg}
						<div
							class="flex flex-col items-center justify-center py-12"
						>
							<Loader2
								class="w-12 h-12 animate-spin text-blue-600 mb-4"
							/>
							<p class="text-lg font-medium">Processing...</p>
							<p class="text-sm text-gray-600 mt-2">
								This may take 10-20 seconds
							</p>
							{#if bgRemovalProgress > 0}
								<div class="w-full max-w-md mt-4">
									<div class="bg-gray-200 rounded-full h-2">
										<div
											class="bg-blue-600 h-2 rounded-full transition-all"
											style="width: {bgRemovalProgress}%"
										></div>
									</div>
									<p
										class="text-xs text-center mt-1 text-gray-500"
									>
										{bgRemovalProgress}%
									</p>
								</div>
							{/if}
							<p class="text-xs text-gray-500 mt-4">
								Processing happens in your browser (no cost)
							</p>
						</div>
					{:else if bgRemovedImage}
						<div class="grid grid-cols-2 gap-4">
							<div>
								<p class="text-sm font-medium mb-2">Original</p>
								<img
									src={uploadedImagePreview}
									alt="Original"
									class="border rounded w-full"
								/>
							</div>
							<div>
								<p class="text-sm font-medium mb-2">
									Background Removed ✓
								</p>
								<img
									src={bgRemovedImage}
									alt="BG Removed"
									class="border rounded w-full bg-gray-100"
								/>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Step 3: AI Enhancement Options -->
			{#if currentStep === 3}
				<div class="space-y-6">
					<h3 class="text-lg font-semibold">
						AI Enhancement Options
					</h3>

					<!-- Image Preview: Original vs BG Removed -->
					{#if bgRemovedImage}
						<div
							class="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg"
						>
							<div>
								<p
									class="text-sm font-medium mb-2 text-gray-600"
								>
									Original
								</p>
								<img
									src={uploadedImagePreview}
									alt="Original"
									class="border rounded w-full max-h-48 object-contain bg-white"
								/>
							</div>
							<div>
								<p
									class="text-sm font-medium mb-2 text-gray-600"
								>
									Background Removed ✓
								</p>
								<img
									src={bgRemovedImage}
									alt="BG Removed"
									class="border rounded w-full max-h-48 object-contain bg-gray-100"
								/>
							</div>
						</div>
					{/if}

					<!-- Auto-fill Analysis -->
					<label
						class="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
					>
						<input
							type="checkbox"
							bind:checked={enableAnalysis}
							class="mt-1"
						/>
						<div class="flex-1">
							<div class="font-medium">
								Auto-fill item details with AI
							</div>
							<div class="text-sm text-gray-600 mt-1">
								Automatically detect category, colors, fit, and
								description
								<br />
								Cost: ~Rp 400
							</div>

							{#if enableAnalysis}
								<select
									bind:value={selectedAnalysisPromptId}
									class="mt-2 w-full px-3 py-2 border rounded-lg"
								>
									<option value="">Select prompt...</option>
									{#each analysisPrompts as prompt}
										<option value={prompt.id}>
											{prompt.name} (v{prompt.version})
											{#if prompt.name
												.toLowerCase()
												.includes("default") && prompt.name
													.toLowerCase()
													.includes("analyzer")}
												✓
											{/if}
										</option>
									{/each}
								</select>
							{/if}
						</div>
					</label>

					<!-- Glow Up Enhancement -->
					<label
						class="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
					>
						<input
							type="checkbox"
							bind:checked={enableGlowUp}
							class="mt-1"
						/>
						<div class="flex-1">
							<div class="font-medium">
								Enhance image with AI (Glow Up)
							</div>
							<div class="text-sm text-gray-600 mt-1">
								Create professional product photo with clean
								background
							</div>

							{#if enableGlowUp}
								<select
									bind:value={glowUpQuality}
									class="mt-2 w-full px-3 py-2 border rounded-lg"
								>
									<option value="low"
										>Low Quality (Rp 150)</option
									>
									<option value="medium"
										>Medium Quality (Rp 600)</option
									>
									<option value="high"
										>High Quality (Rp 2,550)</option
									>
								</select>

								<select
									bind:value={selectedImprovementPromptId}
									class="mt-2 w-full px-3 py-2 border rounded-lg"
								>
									<option value="">Select prompt...</option>
									{#each improvementPrompts as prompt}
										<option value={prompt.id}>
											{prompt.name} (v{prompt.version})
											{#if prompt.name
												.toLowerCase()
												.includes("default") && prompt.name
													.toLowerCase()
													.includes("improver")}
												✓
											{/if}
										</option>
									{/each}
								</select>
							{/if}
						</div>
					</label>

					<!-- Total Cost Estimate -->
					<div
						class="p-4 bg-blue-50 border border-blue-200 rounded-lg"
					>
						<div class="flex items-center justify-between">
							<div>
								<div class="text-sm font-medium text-gray-700">
									Estimated Total Cost:
								</div>
								<div class="text-xs text-gray-600 mt-1">
									Background removal: Free (processed locally)
								</div>
							</div>
							<div class="text-2xl font-bold text-blue-700">
								Rp {totalEstimatedCost.toLocaleString("id-ID")}
							</div>
						</div>
					</div>

					<button
						on:click={runAIProcessing}
						disabled={isProcessing ||
							(!enableAnalysis && !enableGlowUp)}
						class="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
					>
						{#if isProcessing}
							<Loader2 class="w-5 h-5 animate-spin" />
							{processingStep}
						{:else}
							<Sparkles class="w-5 h-5" />
							Process with AI
						{/if}
					</button>

					<button
						on:click={() => (currentStep = 4)}
						class="w-full border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
					>
						Skip AI Enhancement →
					</button>
				</div>
			{/if}

			<!-- Step 4: Item Details Form -->
			{#if currentStep === 4}
				<div class="space-y-4">
					<h3 class="text-lg font-semibold">Item Details</h3>

					<!-- Image Preview -->
					{#if improvedImageUrl || bgRemovedImage}
						<div class="flex gap-4">
							<img
								src={improvedImageUrl || bgRemovedImage}
								alt="Item"
								class="w-32 h-32 object-cover rounded border"
							/>
						</div>
					{/if}

					<!-- Category -->
					<div>
						<label
							class="block text-sm font-medium text-gray-700 mb-1"
						>
							Category <span class="text-red-500">*</span>
						</label>
						<select
							bind:value={formData.category}
							class="w-full px-3 py-2 border rounded-lg"
							required
						>
							<option value="">Select category...</option>
							{#each masterData.categories as category}
								<option value={category.name}
									>{category.name}</option
								>
							{/each}
						</select>
					</div>

					<!-- Subcategory -->
					<div>
						<label
							class="block text-sm font-medium text-gray-700 mb-1"
						>
							Subcategory <span class="text-red-500">*</span>
						</label>
						<select
							bind:value={formData.subcategory}
							class="w-full px-3 py-2 border rounded-lg"
							required
							disabled={!formData.category}
						>
							<option value="">Select subcategory...</option>
							{#each filteredSubcategories as subcategory}
								<option value={subcategory.name}
									>{subcategory.name}</option
								>
							{/each}
						</select>
					</div>

					<!-- Colors (Multi-select) -->
					<div>
						<MultiSelect
							label="Colors"
							required={true}
							options={masterData.colors}
							bind:selectedValues={formData.colors}
							placeholder="Select colors..."
							showColorDots={true}
						/>
						<p class="text-xs text-gray-500 mt-1">
							Select all colors that appear in this item
						</p>
					</div>

					<!-- Fit -->
					<div>
						<label
							class="block text-sm font-medium text-gray-700 mb-1"
							>Fit (Optional)</label
						>
						<select
							bind:value={formData.fit}
							class="w-full px-3 py-2 border rounded-lg"
							disabled={!formData.category}
						>
							<option value="">Select fit...</option>
							{#each filteredFits as fit}
								<option value={fit.name}>{fit.name}</option>
							{/each}
						</select>
					</div>

					<!-- Brand -->
					<div>
						<label
							class="block text-sm font-medium text-gray-700 mb-1"
							>Brand (Optional)</label
						>
						<input
							type="text"
							bind:value={formData.brand}
							placeholder="e.g., Nike, Adidas..."
							class="w-full px-3 py-2 border rounded-lg"
						/>
					</div>

					<!-- Occasions (Multi-select) -->
					<div>
						<MultiSelect
							label="Occasions (Optional)"
							required={false}
							options={masterData.occasions}
							bind:selectedValues={formData.occasions}
							placeholder="Select occasions..."
							showColorDots={false}
						/>
						<p class="text-xs text-gray-500 mt-1">
							When would you wear this item?
						</p>
					</div>

					<!-- Description -->
					<div>
						<label
							class="block text-sm font-medium text-gray-700 mb-1"
						>
							Description <span class="text-red-500">*</span>
						</label>
						<textarea
							bind:value={formData.description}
							rows="3"
							placeholder="Describe the item..."
							class="w-full px-3 py-2 border rounded-lg"
							required
						></textarea>
					</div>

					<!-- Save Button -->
					<div class="flex gap-3 pt-4">
						<button
							on:click={() => (currentStep = 3)}
							class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
						>
							<ArrowLeft class="w-5 h-5" />
							Back
						</button>
						<button
							on:click={() => saveToWardrobe(false)}
							disabled={isProcessing}
							class="flex-1 bg-green-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
						>
							{#if isProcessing}
								<Loader2 class="w-5 h-5 animate-spin" />
								{processingStep}
							{:else}
								<Save class="w-5 h-5" />
								Save to Wardrobe
							{/if}
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
