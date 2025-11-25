<script lang="ts">
	import type { RecommendationResponse } from "$lib/types";
	import type { PageData } from "./$types";
	import { onMount } from "svelte";
	import ProcessExplanation from "$lib/components/outfit/ProcessExplanation.svelte";
	import CostBreakdown from "$lib/components/outfit/CostBreakdown.svelte";
	import OutfitCard from "$lib/components/outfit/OutfitCard.svelte";

	export let data: PageData;

	$: ({ wardrobeStats, prompts, masterData } = data);
	$: hasEnoughItems = wardrobeStats.totalItems >= 20;
	$: hasEnoughCategories = wardrobeStats.uniqueCategories >= 3;
	$: isWardrobeReady = hasEnoughItems && hasEnoughCategories;

	let occasion: string = "";
	let note = "";
	let selectedPromptId: string = "";
	let showProcessExplanation = false;
	let loading = false;
	let processingSeconds = 0;
	let processingInterval: ReturnType<typeof setInterval> | null = null;
	let result: RecommendationResponse | null = null;
	let error: string | null = null;

	// Canvas state
	type CanvasItem = {
		id: string;
		imageSrc: string;
		x: number;
		y: number;
		width: number;
		height: number;
		rotation: number;
	};

	let canvasElement: HTMLCanvasElement;
	let canvasBackgroundColor = "#ffffff";
	let canvasItems: CanvasItem[] = [];
	let selectedItemId: string | null = null;
	let isDragging = false;
	let isResizing = false;
	let isRotating = false;
	let dragStartX = 0;
	let dragStartY = 0;
	let resizeCorner = "";
	let itemStartWidth = 0;
	let itemStartHeight = 0;
	let itemStartRotation = 0;
	let addedItems = new Set<string>();

	const CANVAS_WIDTH = 1080;
	const CANVAS_HEIGHT = 1920;
	const LOGO_SIZE = 80;

	// Auto-select default prompt on mount
	onMount(() => {
		const defaultPrompt = prompts.find(
			(p) =>
				p.name.toLowerCase().includes("default") &&
				p.name.toLowerCase().includes("outfit"),
		);
		if (defaultPrompt) {
			selectedPromptId = defaultPrompt.id;
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	});

	async function handleSubmit() {
		if (!occasion) {
			error = "Please select an occasion";
			return;
		}

		if (!selectedPromptId) {
			error = "Please select a prompt";
			return;
		}

		loading = true;
		error = null;
		result = null;

		processingSeconds = 0;
		processingInterval = setInterval(() => {
			processingSeconds++;
		}, 1000);

		try {
			const response = await fetch("/api/recommend", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					occasion,
					note,
					promptId: selectedPromptId,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(
					data.error || "Failed to generate recommendations",
				);
			}

			result = data;

			if (data.combinations && data.combinations.length > 0) {
				canvasItems = [];
				canvasBackgroundColor = "#ffffff";
				addedItems = new Set<string>();
			}
		} catch (err) {
			error =
				err instanceof Error ? err.message : "Unknown error occurred";
			console.error(err);
		} finally {
			loading = false;
			if (processingInterval) {
				clearInterval(processingInterval);
				processingInterval = null;
			}
		}
	}

	function formatOccasion(occ: string): string {
		return occ
			.split("/")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" / ");
	}

	function getImagePath(itemId: string): string {
		// Images are stored in wardrobe_items table with image_url
		// For now, return the improved_image_url or image_url
		return `/api/wardrobe-items/${itemId}/image`;
	}

	function addItemToCanvas(itemId: string) {
		const imageSrc = getImagePath(itemId);
		addedItems = new Set([...addedItems, itemId]);

		const newItem: CanvasItem = {
			id: `item-${itemId}-${Date.now()}`,
			imageSrc,
			x: 100,
			y: 100,
			width: 250,
			height: 250,
			rotation: 0,
		};

		canvasItems = [...canvasItems, newItem];
		renderCanvas();
	}

	function isItemAdded(itemId: string): boolean {
		return addedItems.has(itemId);
	}

	function clearCanvas() {
		canvasItems = [];
		addedItems = new Set<string>();
		renderCanvas();
	}

	function renderCanvas() {
		if (!canvasElement) return;

		const ctx = canvasElement.getContext("2d");
		if (!ctx) return;

		ctx.fillStyle = canvasBackgroundColor;
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		canvasItems.forEach((item) => {
			const img = new Image();
			img.src = item.imageSrc;
			img.onload = () => {
				ctx.save();

				const centerX = item.x + item.width / 2;
				const centerY = item.y + item.height / 2;
				ctx.translate(centerX, centerY);
				ctx.rotate((item.rotation * Math.PI) / 180);
				ctx.translate(-centerX, -centerY);

				ctx.drawImage(img, item.x, item.y, item.width, item.height);
				ctx.restore();

				if (item.id === selectedItemId) {
					ctx.save();
					ctx.strokeStyle = "#3b82f6";
					ctx.lineWidth = 3;
					ctx.strokeRect(item.x, item.y, item.width, item.height);

					const handleSize = 10;
					ctx.fillStyle = "#3b82f6";
					ctx.fillRect(
						item.x - handleSize / 2,
						item.y - handleSize / 2,
						handleSize,
						handleSize,
					);
					ctx.fillRect(
						item.x + item.width - handleSize / 2,
						item.y - handleSize / 2,
						handleSize,
						handleSize,
					);
					ctx.fillRect(
						item.x - handleSize / 2,
						item.y + item.height - handleSize / 2,
						handleSize,
						handleSize,
					);
					ctx.fillRect(
						item.x + item.width - handleSize / 2,
						item.y + item.height - handleSize / 2,
						handleSize,
						handleSize,
					);

					const rotateHandleY = item.y - 30;
					ctx.beginPath();
					ctx.arc(centerX, rotateHandleY, 8, 0, Math.PI * 2);
					ctx.fill();

					ctx.beginPath();
					ctx.moveTo(centerX, item.y);
					ctx.lineTo(centerX, rotateHandleY);
					ctx.strokeStyle = "#3b82f6";
					ctx.lineWidth = 2;
					ctx.stroke();

					ctx.restore();
				}
			};
		});
	}

	function handleCanvasClick(event: MouseEvent) {
		if (!canvasElement) return;

		const rect = canvasElement.getBoundingClientRect();
		const scaleX = CANVAS_WIDTH / rect.width;
		const scaleY = CANVAS_HEIGHT / rect.height;
		const x = (event.clientX - rect.left) * scaleX;
		const y = (event.clientY - rect.top) * scaleY;

		if (selectedItemId) {
			const selectedItem = canvasItems.find(
				(i) => i.id === selectedItemId,
			);
			if (selectedItem) {
				const handleSize = 10;
				const tolerance = handleSize;

				const centerX = selectedItem.x + selectedItem.width / 2;
				const rotateHandleY = selectedItem.y - 30;
				const distToRotate = Math.sqrt(
					Math.pow(x - centerX, 2) + Math.pow(y - rotateHandleY, 2),
				);
				if (distToRotate <= 10) {
					isRotating = true;
					dragStartX = x;
					dragStartY = y;
					itemStartRotation = selectedItem.rotation;
					return;
				}

				const corners = [
					{ name: "tl", x: selectedItem.x, y: selectedItem.y },
					{
						name: "tr",
						x: selectedItem.x + selectedItem.width,
						y: selectedItem.y,
					},
					{
						name: "bl",
						x: selectedItem.x,
						y: selectedItem.y + selectedItem.height,
					},
					{
						name: "br",
						x: selectedItem.x + selectedItem.width,
						y: selectedItem.y + selectedItem.height,
					},
				];

				for (const corner of corners) {
					if (
						Math.abs(x - corner.x) <= tolerance &&
						Math.abs(y - corner.y) <= tolerance
					) {
						isResizing = true;
						resizeCorner = corner.name;
						dragStartX = x;
						dragStartY = y;
						itemStartWidth = selectedItem.width;
						itemStartHeight = selectedItem.height;
						return;
					}
				}
			}
		}

		for (let i = canvasItems.length - 1; i >= 0; i--) {
			const item = canvasItems[i];
			if (
				x >= item.x &&
				x <= item.x + item.width &&
				y >= item.y &&
				y <= item.y + item.height
			) {
				selectedItemId = item.id;
				isDragging = true;
				dragStartX = x - item.x;
				dragStartY = y - item.y;
				renderCanvas();
				return;
			}
		}

		selectedItemId = null;
		renderCanvas();
	}

	function handleCanvasMouseMove(event: MouseEvent) {
		if (!canvasElement) return;

		const rect = canvasElement.getBoundingClientRect();
		const scaleX = CANVAS_WIDTH / rect.width;
		const scaleY = CANVAS_HEIGHT / rect.height;
		const x = (event.clientX - rect.left) * scaleX;
		const y = (event.clientY - rect.top) * scaleY;

		const item = canvasItems.find((i) => i.id === selectedItemId);
		if (!item) return;

		if (isRotating) {
			const centerX = item.x + item.width / 2;
			const centerY = item.y + item.height / 2;
			const angle =
				(Math.atan2(y - centerY, x - centerX) * 180) / Math.PI;
			item.rotation = angle + 90;
			renderCanvas();
		} else if (isResizing) {
			const dx = x - dragStartX;
			const dy = y - dragStartY;

			if (resizeCorner === "br") {
				item.width = Math.max(50, itemStartWidth + dx);
				item.height = Math.max(50, itemStartHeight + dy);
			} else if (resizeCorner === "bl") {
				const newWidth = Math.max(50, itemStartWidth - dx);
				item.x = item.x + (item.width - newWidth);
				item.width = newWidth;
				item.height = Math.max(50, itemStartHeight + dy);
			} else if (resizeCorner === "tr") {
				item.width = Math.max(50, itemStartWidth + dx);
				const newHeight = Math.max(50, itemStartHeight - dy);
				item.y = item.y + (item.height - newHeight);
				item.height = newHeight;
			} else if (resizeCorner === "tl") {
				const newWidth = Math.max(50, itemStartWidth - dx);
				const newHeight = Math.max(50, itemStartHeight - dy);
				item.x = item.x + (item.width - newWidth);
				item.y = item.y + (item.height - newHeight);
				item.width = newWidth;
				item.height = newHeight;
			}

			renderCanvas();
		} else if (isDragging) {
			item.x = Math.max(
				0,
				Math.min(x - dragStartX, CANVAS_WIDTH - item.width),
			);
			item.y = Math.max(
				0,
				Math.min(y - dragStartY, CANVAS_HEIGHT - item.height),
			);
			renderCanvas();
		}
	}

	function handleCanvasMouseUp() {
		isDragging = false;
		isResizing = false;
		isRotating = false;
	}

	function deleteSelectedItem() {
		if (!selectedItemId) return;
		canvasItems = canvasItems.filter((item) => item.id !== selectedItemId);
		selectedItemId = null;
		renderCanvas();
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === "Delete" || event.key === "Backspace") {
			if (
				selectedItemId &&
				!["INPUT", "TEXTAREA"].includes(
					(event.target as HTMLElement).tagName,
				)
			) {
				event.preventDefault();
				deleteSelectedItem();
			}
		}
	}

	async function exportCanvas(format: "png" | "jpeg") {
		if (!canvasElement) return;

		const ctx = canvasElement.getContext("2d");
		if (!ctx) return;

		ctx.fillStyle = canvasBackgroundColor;
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		for (const item of canvasItems) {
			const img = new Image();
			img.src = item.imageSrc;
			await new Promise((resolve) => {
				img.onload = () => {
					ctx.save();

					const centerX = item.x + item.width / 2;
					const centerY = item.y + item.height / 2;
					ctx.translate(centerX, centerY);
					ctx.rotate((item.rotation * Math.PI) / 180);
					ctx.translate(-centerX, -centerY);

					ctx.drawImage(img, item.x, item.y, item.width, item.height);

					ctx.restore();
					resolve(null);
				};
			});
		}

		const logo = new Image();
		logo.src = "/assets/logo/logo-wardope.png";
		await new Promise((resolve) => {
			logo.onload = () => {
				ctx.save();

				const logoX = CANVAS_WIDTH - LOGO_SIZE - 20;
				const logoY = CANVAS_HEIGHT - LOGO_SIZE - 20;
				const centerX = logoX + LOGO_SIZE / 2;
				const centerY = logoY + LOGO_SIZE / 2;
				const radius = LOGO_SIZE / 2;

				ctx.beginPath();
				ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
				ctx.closePath();
				ctx.clip();

				ctx.globalAlpha = 0.8;
				ctx.drawImage(logo, logoX, logoY, LOGO_SIZE, LOGO_SIZE);

				ctx.restore();
				resolve(null);
			};
		});

		const mimeType = format === "png" ? "image/png" : "image/jpeg";
		canvasElement.toBlob((blob) => {
			if (!blob) return;
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `wardope-moodboard-${Date.now()}.${format}`;
			a.click();
			URL.revokeObjectURL(url);
		}, mimeType);
	}

	$: if (canvasElement) {
		setTimeout(() => renderCanvas(), 0);
	}
</script>

<svelte:head>
	<title>Wardope AI - Outfit Recommendation</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8 px-4">
	<div class="max-w-5xl mx-auto">
		<!-- Header -->
		<header class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">
				Outfit Recommendation
			</h1>
			<p class="text-gray-600">
				Get AI-powered outfit suggestions from your wardrobe
			</p>
		</header>

		<!-- Wardrobe Status Warning -->
		{#if !isWardrobeReady}
			<div
				class="bg-amber-50 border-l-4 border-amber-400 p-6 mb-6 rounded-lg"
			>
				<div class="flex items-start gap-3">
					<svg
						class="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
					<div class="flex-1">
						<h3 class="text-lg font-semibold text-amber-900 mb-2">
							Insufficient Wardrobe Items
						</h3>
						<p class="text-amber-800 mb-3">
							For optimal outfit recommendations, you need at
							least <strong>20 items</strong> in your wardrobe
							with a minimum of
							<strong>3 different categories</strong>.
						</p>
						<div class="bg-white rounded-lg p-4 mb-3">
							<div class="grid grid-cols-2 gap-4 text-sm">
								<div>
									<span class="text-gray-600"
										>Total Items:</span
									>
									<span
										class="font-semibold ml-2 {hasEnoughItems
											? 'text-green-600'
											: 'text-amber-600'}"
									>
										{wardrobeStats.totalItems} / 20
									</span>
									{#if hasEnoughItems}
										<span class="text-green-600 ml-1"
											>✓</span
										>
									{/if}
								</div>
								<div>
									<span class="text-gray-600"
										>Categories:</span
									>
									<span
										class="font-semibold ml-2 {hasEnoughCategories
											? 'text-green-600'
											: 'text-amber-600'}"
									>
										{wardrobeStats.uniqueCategories} / 3
									</span>
									{#if hasEnoughCategories}
										<span class="text-green-600 ml-1"
											>✓</span
										>
									{/if}
								</div>
							</div>
						</div>
						<p class="text-sm text-amber-700">
							Please add more items to your wardrobe before
							generating outfit recommendations.
						</p>
						<a
							href="/wardrobe"
							class="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors"
						>
							<svg
								class="w-5 h-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 4v16m8-8H4"
								/>
							</svg>
							Add Items to Wardrobe
						</a>
					</div>
				</div>
			</div>
		{/if}

		<!-- Form Section -->
		<div
			class="bg-white rounded-lg shadow-sm p-6 mb-6 {!isWardrobeReady
				? 'opacity-60 pointer-events-none'
				: ''}"
		>
			<h2 class="text-xl font-semibold text-gray-900 mb-4">
				Generate Recommendations
			</h2>

			<div class="space-y-4">
				<!-- Occasion Selector -->
				<div>
					<label
						for="occasion-select"
						class="block text-sm font-medium text-gray-700 mb-2"
					>
						Occasion <span class="text-red-500">*</span>
					</label>
					<select
						id="occasion-select"
						bind:value={occasion}
						disabled={!isWardrobeReady}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
						required
					>
						<option value="">Select occasion...</option>
						{#each masterData.occasions as occ}
							<option value={occ.name}>{occ.name}</option>
						{/each}
					</select>
				</div>

				<!-- Prompt Selector -->
				<div>
					<label
						for="prompt-select"
						class="block text-sm font-medium text-gray-700 mb-2"
					>
						AI Prompt <span class="text-red-500">*</span>
					</label>
					<select
						id="prompt-select"
						bind:value={selectedPromptId}
						disabled={!isWardrobeReady}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
						required
					>
						<option value="">Select prompt...</option>
						{#each prompts as prompt}
							<option value={prompt.id}>
								{prompt.name} (v{prompt.version})
								{#if prompt.name
									.toLowerCase()
									.includes("default")}✓{/if}
							</option>
						{/each}
					</select>
					{#if prompts.length === 0}
						<p class="text-sm text-amber-600 mt-1">
							No prompts found. Please create an outfit
							recommendation prompt first.
						</p>
					{/if}
				</div>

				<!-- Note/Preferences -->
				<div>
					<label
						for="preferences-input"
						class="block text-sm font-medium text-gray-700 mb-2"
					>
						Additional Preferences (Optional)
					</label>
					<textarea
						id="preferences-input"
						bind:value={note}
						disabled={!isWardrobeReady}
						placeholder="E.g., prefer blue colors, avoid formal wear..."
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
						rows="3"
					></textarea>
				</div>
			</div>
		</div>

		<!-- AI Process Explanation -->
		<ProcessExplanation bind:showProcessExplanation />

		<!-- Submit Button -->
		<button
			type="button"
			on:click={handleSubmit}
			disabled={!isWardrobeReady ||
				loading ||
				!occasion ||
				!selectedPromptId}
			class="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors mt-6"
		>
			{loading
				? `Processing... (${processingSeconds}s)`
				: !isWardrobeReady
					? "Add More Items to Wardrobe"
					: "Generate Recommendations"}
		</button>

		<!-- Error -->
		{#if error}
			<div class="bg-red-50 border border-red-200 rounded-lg p-4 my-6">
				<div class="flex items-start gap-3">
					<svg
						class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<div class="flex-1">
						<p class="text-red-800 font-medium mb-1">Error</p>
						<p class="text-red-700 text-sm">{error}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Results -->
		{#if result}
			<div class="space-y-6 mt-6">
				<!-- Cost Breakdown -->
				<CostBreakdown usage={result.usage} />

				<!-- Metadata -->
				<div class="bg-white rounded-lg shadow-sm p-6">
					<div class="flex flex-wrap gap-6 text-sm">
						<div>
							<span class="text-gray-600">Occasion:</span>
							<span class="font-semibold ml-2"
								>{formatOccasion(
									result.metadata.occasion,
								)}</span
							>
						</div>
						<div>
							<span class="text-gray-600">Items analyzed:</span>
							<span class="font-semibold ml-2"
								>{result.metadata.items_considered} / {result
									.metadata.total_items}</span
							>
						</div>
					</div>
				</div>

				<!-- Side-by-side layout for Combinations and Canvas -->
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<!-- Combinations -->
					<div
						class="bg-white rounded-lg shadow-sm p-6 lg:max-h-[1200px] lg:overflow-y-auto"
					>
						<h2 class="text-xl font-semibold text-gray-900 mb-6">
							Outfit Recommendations
						</h2>

						{#if result.combinations.length === 0}
							<div
								class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center"
							>
								<p class="text-yellow-800">
									No outfit combinations generated. Try
									different items or occasion.
								</p>
							</div>
						{:else}
							<div class="space-y-6">
								{#each result.combinations as combo, index}
									<OutfitCard
										{combo}
										{index}
										{addedItems}
										onAddToCanvas={addItemToCanvas}
									/>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Canvas Moodboard Builder -->
					<div
						class="bg-white rounded-lg shadow-sm p-6 lg:sticky lg:top-6 lg:max-h-[1200px] lg:overflow-y-auto"
					>
						<div class="flex items-center justify-between mb-6">
							<h2 class="text-xl font-semibold text-gray-900">
								Moodboard Builder
							</h2>
						</div>

						<!-- Canvas Controls -->
						<div class="mb-6">
							<div class="mb-4">
								<label
									for="canvas-bg"
									class="block text-sm font-medium text-gray-700 mb-3"
								>
									Background Color
								</label>

								<!-- Recommended Colors -->
								{#if result && result.combinations}
									{@const allColors = result.combinations
										.flatMap(
											(c) => c.background_colors || [],
										)
										.reduce((acc, color) => {
											if (
												!acc.find(
													(c) => c.hex === color.hex,
												)
											) {
												acc.push(color);
											}
											return acc;
										}, [])}

									{#if allColors.length > 0}
										<div class="mb-3">
											<span
												class="text-xs text-gray-500 mb-2 block"
												>AI Recommended:</span
											>
											<div class="flex flex-wrap gap-2">
												{#each allColors as color}
													<button
														type="button"
														on:click={() => {
															canvasBackgroundColor =
																color.hex;
															renderCanvas();
														}}
														class="group relative"
														title={color.name}
													>
														<div
															class="w-10 h-10 rounded-full border-2 transition-all {canvasBackgroundColor.toLowerCase() ===
															color.hex.toLowerCase()
																? 'border-blue-500 ring-2 ring-blue-200'
																: 'border-gray-300 hover:border-gray-400'}"
															style="background-color: {color.hex};"
														></div>
														<span
															class="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-white bg-gray-900 bg-opacity-90 px-3 py-1.5 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50"
														>
															{color.name}
														</span>
													</button>
												{/each}
											</div>
										</div>
									{/if}
								{/if}

								<!-- Custom Color Picker -->
								<div>
									<span
										class="text-xs text-gray-500 mb-2 block"
										>Or pick custom:</span
									>
									<input
										id="canvas-bg"
										type="color"
										bind:value={canvasBackgroundColor}
										on:input={() => renderCanvas()}
										class="h-10 w-full rounded border border-gray-300 cursor-pointer"
									/>
								</div>
							</div>

							<!-- Clear Canvas Button -->
							<div class="flex gap-2">
								<button
									type="button"
									on:click={clearCanvas}
									class="flex-1 bg-red-600 text-white text-sm font-semibold py-2 px-4 rounded hover:bg-red-700 transition-colors"
								>
									Clear Canvas
								</button>
							</div>
						</div>

						<!-- Canvas Display -->
						<div
							class="border-2 border-gray-300 rounded-lg overflow-hidden mb-4"
						>
							<canvas
								bind:this={canvasElement}
								width={CANVAS_WIDTH}
								height={CANVAS_HEIGHT}
								on:mousedown={handleCanvasClick}
								on:mousemove={handleCanvasMouseMove}
								on:mouseup={handleCanvasMouseUp}
								on:mouseleave={handleCanvasMouseUp}
								class="w-full h-auto max-h-[800px] cursor-pointer"
								style="display: block;"
							></canvas>
						</div>

						<div class="text-sm text-gray-600 mb-4">
							<p>
								<strong>Instructions:</strong> Click "Add to Canvas"
								buttons to add items. Drag items to move, drag corners
								to resize, drag top circle to rotate. Press Delete/Backspace
								to remove selected item.
							</p>
							<p class="mt-1">
								Canvas size: 1080x1920 (Instagram Story) •
								Items: {canvasItems.length}
							</p>
						</div>

						<!-- Export Controls -->
						<div class="flex gap-2">
							<button
								type="button"
								on:click={() => exportCanvas("png")}
								class="flex-1 bg-green-600 text-white font-semibold py-3 px-4 rounded hover:bg-green-700 transition-colors"
							>
								Export as PNG
							</button>
							<button
								type="button"
								on:click={() => exportCanvas("jpeg")}
								class="flex-1 bg-green-600 text-white font-semibold py-3 px-4 rounded hover:bg-green-700 transition-colors"
							>
								Export as JPEG
							</button>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
