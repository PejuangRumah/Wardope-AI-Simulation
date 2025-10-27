<script lang="ts">
	import { OCCASIONS, GENDERS } from '$lib/constants/wardrobe-master';
	import type { RecommendationResponse } from '$lib/types';
	import { onMount } from 'svelte';

	let gender: 'men' | 'women' = 'men';
	let csvFile: File | null = null;
	let occasion: string = 'casual';
	let note = '';
	let customPrompt = '';
	let defaultPrompt = '';
	let promptVariables: any[] = [];
	let showPromptEditor = false;
	let loading = false;
	let result: RecommendationResponse | null = null;
	let error: string | null = null;

	// CSV Preview state
	let isDefaultFile = false;
	let csvPreviewData: any[] = [];
	let showPreviewModal = false;
	let csvFileName = '';

	// Canvas state
	type CanvasItem = {
		id: string;
		imageSrc: string;
		x: number;
		y: number;
		width: number;
		height: number;
	};

	type Canvas = {
		id: string;
		name: string;
		backgroundColor: string;
		items: CanvasItem[];
	};

	let canvases: Canvas[] = [];
	let activeCanvasIndex = 0;
	let canvasRefs: Record<string, HTMLCanvasElement> = {};
	let selectedItemId: string | null = null;
	let isDragging = false;
	let isResizing = false;
	let dragStartX = 0;
	let dragStartY = 0;
	let resizeCorner = '';
	// Track which items have been added to which canvas
	let addedItems: Record<string, Set<string>> = {};

	const CANVAS_WIDTH = 1080;
	const CANVAS_HEIGHT = 1920;
	const LOGO_SIZE = 80;

	async function handleSubmit() {
		if (!csvFile) {
			alert('Please select a CSV file');
			return;
		}

		loading = true;
		error = null;
		result = null;

		const formData = new FormData();
		formData.append('gender', gender);
		formData.append('csv', csvFile);
		formData.append('occasion', occasion);
		if (note) formData.append('note', note);
		if (customPrompt) formData.append('customPrompt', customPrompt);

		try {
			const response = await fetch('/api/recommend', {
				method: 'POST',
				body: formData
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to generate recommendations');
			}

			result = data;

			// Auto-generate canvases based on combination count
			if (data.combinations && data.combinations.length > 0) {
				canvases = data.combinations.map((combo: any, index: number) => ({
					id: `canvas-${index + 1}`,
					name: `Canvas ${index + 1}`,
					backgroundColor: '#ffffff',
					items: []
				}));
				activeCanvasIndex = 0;
				// Reset added items tracking
				addedItems = {};
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error occurred';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	function formatOccasion(occ: string): string {
		return occ
			.split('/')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' / ');
	}

	// CSV Functions
	function parseCSVLine(line: string): string[] {
		const fields: string[] = [];
		let currentField = '';
		let insideQuotes = false;
		let i = 0;

		while (i < line.length) {
			const char = line[i];
			const nextChar = line[i + 1];

			if (char === '"') {
				if (insideQuotes && nextChar === '"') {
					// Escaped quote: ""
					currentField += '"';
					i += 2;
					continue;
				} else {
					// Toggle quote state
					insideQuotes = !insideQuotes;
					i++;
					continue;
				}
			}

			if (char === ',' && !insideQuotes) {
				// End of field
				fields.push(currentField.trim());
				currentField = '';
				i++;
				continue;
			}

			currentField += char;
			i++;
		}

		// Push the last field
		fields.push(currentField.trim());

		return fields;
	}

	async function parseCSV(file: File): Promise<any[]> {
		const text = await file.text();
		const lines = text.split('\n').filter((line) => line.trim());

		if (lines.length === 0) return [];

		const headers = parseCSVLine(lines[0]);
		const data = [];

		for (let i = 1; i < lines.length; i++) {
			const fields = parseCSVLine(lines[i]);
			const row: any = {};

			headers.forEach((header, index) => {
				row[header] = fields[index] || '';
			});

			data.push(row);
		}

		return data;
	}

	async function loadDefaultCSV(selectedGender: 'men' | 'women') {
		try {
			const filename =
				selectedGender === 'men'
					? 'Affiliate Items - Mens.csv'
					: 'Affiliate Items - Womens.csv';

			const response = await fetch(`/data/${encodeURIComponent(filename)}`);
			if (!response.ok) throw new Error('Failed to load default CSV');

			const blob = await response.blob();
			const file = new File([blob], filename, { type: 'text/csv' });

			csvFile = file;
			csvFileName = filename;
			isDefaultFile = true;

			csvPreviewData = await parseCSV(file);
		} catch (err) {
			console.error('Error loading default CSV:', err);
			error = 'Failed to load default catalog. Please upload a CSV file manually.';
		}
	}

	async function handleFileInput(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		csvFile = file;
		csvFileName = file.name;
		isDefaultFile = false;

		try {
			csvPreviewData = await parseCSV(file);
		} catch (err) {
			console.error('Error parsing CSV:', err);
		}
	}

	function resetToDefault() {
		loadDefaultCSV(gender);
	}

	async function loadDefaultPrompt() {
		try {
			const response = await fetch('/api/prompt');
			if (!response.ok) throw new Error('Failed to load default prompt');

			const data = await response.json();
			defaultPrompt = data.template;
			promptVariables = data.variables || [];

			// Initialize customPrompt with default if empty
			if (!customPrompt) {
				customPrompt = defaultPrompt;
			}
		} catch (err) {
			console.error('Error loading default prompt:', err);
			error = 'Failed to load default prompt template.';
		}
	}

	function resetPromptToDefault() {
		customPrompt = defaultPrompt;
	}

	function getImagePath(itemId: string): string {
		const prefix = gender === 'men' ? 'affiliate-men' : 'affiliate-women';
		const folder = gender === 'men' ? 'mens' : 'women';
		// Images should be in static/assets folder to be served by SvelteKit
		return `/assets/${folder}/${prefix}-${itemId}.png`;
	}

	function addItemToCanvas(itemId: string, canvasIndex: number) {
		const imageSrc = getImagePath(itemId);
		const canvasId = canvases[canvasIndex].id;

		// Initialize set for this canvas if it doesn't exist
		if (!addedItems[canvasId]) {
			addedItems[canvasId] = new Set();
		}

		// Add to tracking
		addedItems[canvasId].add(itemId);
		addedItems = addedItems; // Trigger reactivity

		const newItem: CanvasItem = {
			id: `item-${itemId}-${Date.now()}`,
			imageSrc,
			x: 100,
			y: 100,
			width: 250,
			height: 250
		};

		canvases[canvasIndex].items = [...canvases[canvasIndex].items, newItem];
		renderCanvas(canvasIndex);
	}

	function isItemAddedToCanvas(itemId: string, canvasIndex: number): boolean {
		const canvasId = canvases[canvasIndex]?.id;
		if (!canvasId || !addedItems[canvasId]) return false;
		return addedItems[canvasId].has(itemId);
	}

	function addNewCanvas() {
		const newCanvas: Canvas = {
			id: `canvas-${canvases.length + 1}`,
			name: `Canvas ${canvases.length + 1}`,
			backgroundColor: '#ffffff',
			items: []
		};
		canvases = [...canvases, newCanvas];
		activeCanvasIndex = canvases.length - 1;
	}

	function deleteCanvas(index: number) {
		if (canvases.length === 1) {
			alert('Cannot delete the last canvas');
			return;
		}
		canvases = canvases.filter((_, i) => i !== index);
		if (activeCanvasIndex >= canvases.length) {
			activeCanvasIndex = canvases.length - 1;
		}
	}

	function clearCanvas(index: number) {
		canvases[index].items = [];
		renderCanvas(index);
	}

	function renderCanvas(canvasIndex: number) {
		const canvas = canvases[canvasIndex];
		const canvasElement = canvasRefs[canvas.id];
		if (!canvasElement) return;

		const ctx = canvasElement.getContext('2d');
		if (!ctx) return;

		// Clear and fill background
		ctx.fillStyle = canvas.backgroundColor;
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		// Draw items
		canvas.items.forEach((item) => {
			const img = new Image();
			img.src = item.imageSrc;
			img.onload = () => {
				ctx.drawImage(img, item.x, item.y, item.width, item.height);

				// Draw selection border if selected
				if (item.id === selectedItemId) {
					ctx.strokeStyle = '#3b82f6';
					ctx.lineWidth = 3;
					ctx.strokeRect(item.x, item.y, item.width, item.height);
				}
			};
		});
	}

	function handleCanvasClick(event: MouseEvent, canvasIndex: number) {
		const canvas = canvases[canvasIndex];
		const canvasElement = canvasRefs[canvas.id];
		if (!canvasElement) return;

		const rect = canvasElement.getBoundingClientRect();
		const scaleX = CANVAS_WIDTH / rect.width;
		const scaleY = CANVAS_HEIGHT / rect.height;
		const x = (event.clientX - rect.left) * scaleX;
		const y = (event.clientY - rect.top) * scaleY;

		// Find clicked item (reverse order to get topmost)
		for (let i = canvas.items.length - 1; i >= 0; i--) {
			const item = canvas.items[i];
			if (x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height) {
				selectedItemId = item.id;
				isDragging = true;
				dragStartX = x - item.x;
				dragStartY = y - item.y;
				renderCanvas(canvasIndex);
				return;
			}
		}

		selectedItemId = null;
		renderCanvas(canvasIndex);
	}

	function handleCanvasMouseMove(event: MouseEvent, canvasIndex: number) {
		if (!isDragging || !selectedItemId) return;

		const canvas = canvases[canvasIndex];
		const canvasElement = canvasRefs[canvas.id];
		if (!canvasElement) return;

		const rect = canvasElement.getBoundingClientRect();
		const scaleX = CANVAS_WIDTH / rect.width;
		const scaleY = CANVAS_HEIGHT / rect.height;
		const x = (event.clientX - rect.left) * scaleX;
		const y = (event.clientY - rect.top) * scaleY;

		const item = canvas.items.find((i) => i.id === selectedItemId);
		if (item) {
			item.x = Math.max(0, Math.min(x - dragStartX, CANVAS_WIDTH - item.width));
			item.y = Math.max(0, Math.min(y - dragStartY, CANVAS_HEIGHT - item.height));
			renderCanvas(canvasIndex);
		}
	}

	function handleCanvasMouseUp() {
		isDragging = false;
	}

	function deleteSelectedItem() {
		if (!selectedItemId) return;

		const canvas = canvases[activeCanvasIndex];
		canvas.items = canvas.items.filter((item) => item.id !== selectedItemId);
		selectedItemId = null;
		renderCanvas(activeCanvasIndex);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Delete' || event.key === 'Backspace') {
			if (selectedItemId && !['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)) {
				event.preventDefault();
				deleteSelectedItem();
			}
		}
	}

	async function exportCanvas(canvasIndex: number, format: 'png' | 'jpeg') {
		const canvas = canvases[canvasIndex];
		const canvasElement = canvasRefs[canvas.id];
		if (!canvasElement) return;

		const ctx = canvasElement.getContext('2d');
		if (!ctx) return;

		// Render final canvas
		ctx.fillStyle = canvas.backgroundColor;
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		// Draw all items
		for (const item of canvas.items) {
			const img = new Image();
			img.src = item.imageSrc;
			await new Promise((resolve) => {
				img.onload = () => {
					ctx.drawImage(img, item.x, item.y, item.width, item.height);
					resolve(null);
				};
			});
		}

		// Add watermark with circular clipping
		const logo = new Image();
		logo.src = '/assets/logo/logo-wardope.png';
		await new Promise((resolve) => {
			logo.onload = () => {
				ctx.save(); // Save current context state

				// Set position and create circular clipping path
				const logoX = CANVAS_WIDTH - LOGO_SIZE - 20;
				const logoY = CANVAS_HEIGHT - LOGO_SIZE - 20;
				const centerX = logoX + LOGO_SIZE / 2;
				const centerY = logoY + LOGO_SIZE / 2;
				const radius = LOGO_SIZE / 2;

				// Create circular clipping region
				ctx.beginPath();
				ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
				ctx.closePath();
				ctx.clip();

				// Draw logo within circular boundary
				ctx.globalAlpha = 0.8;
				ctx.drawImage(logo, logoX, logoY, LOGO_SIZE, LOGO_SIZE);

				ctx.restore(); // Restore context to remove clipping
				resolve(null);
			};
		});

		// Export
		const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
		canvasElement.toBlob((blob) => {
			if (!blob) return;
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `wardope-moodboard-${Date.now()}.${format}`;
			a.click();
			URL.revokeObjectURL(url);
		}, mimeType);
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeyDown);
		loadDefaultCSV(gender); // Load default CSV on mount
		loadDefaultPrompt(); // Load default prompt template on mount
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});

	// Reactive statements
	$: if (canvases.length > 0) {
		setTimeout(() => renderCanvas(activeCanvasIndex), 0);
	}

	// Auto-load CSV when gender changes
	$: if (gender && isDefaultFile) {
		loadDefaultCSV(gender);
	}
</script>

<svelte:head>
	<title>Wardope AI - Outfit Recommendation POC</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8 px-4">
	<div class="max-w-5xl mx-auto">
		<!-- Header -->
		<header class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Wardope AI</h1>
			<p class="text-gray-600">Outfit Recommendation Proof of Concept</p>
		</header>

		<!-- Form -->
		<form on:submit|preventDefault={handleSubmit} class="bg-white rounded-lg shadow-sm p-6 mb-6">
			<div class="space-y-6">
				<!-- Gender Selection -->
				<div>
					<div class="block text-sm font-medium text-gray-700 mb-3">
						Gender <span class="text-red-600">*</span>
					</div>
					<div class="flex gap-3" role="group" aria-label="Gender selection">
						{#each GENDERS as g}
							<label
								class="flex-1 relative flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer transition-all {gender ===
								g
									? 'border-blue-600 bg-blue-50 text-blue-700'
									: 'border-gray-300 hover:border-gray-400'}"
							>
								<input
									type="radio"
									bind:group={gender}
									value={g}
									name="gender"
									class="sr-only"
								/>
								<span class="font-medium">{g.charAt(0).toUpperCase() + g.slice(1)}</span>
							</label>
						{/each}
					</div>
				</div>

				<!-- CSV Upload -->
				<div>
					<label for="csv-file" class="block text-sm font-medium text-gray-700 mb-2">
						Wardrobe CSV File <span class="text-red-600">*</span>
					</label>
					<input
						id="csv-file"
						type="file"
						accept=".csv"
						on:change={handleFileInput}
						class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
					/>
					{#if csvFile}
						<div class="mt-3 space-y-2">
							<div class="flex items-center gap-2">
								{#if isDefaultFile}
									<span
										class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800"
									>
										Default Catalog
									</span>
								{:else}
									<span
										class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
									>
										Custom File
									</span>
								{/if}
								<span class="text-sm text-gray-700">
									{csvFileName} ({(csvFile.size / 1024).toFixed(1)} KB)
								</span>
							</div>
							<div class="flex gap-2">
								<button
									type="button"
									on:click={() => (showPreviewModal = true)}
									class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
								>
									Preview Data
								</button>
								{#if !isDefaultFile}
									<button
										type="button"
										on:click={resetToDefault}
										class="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
									>
										Reset to Default
									</button>
								{/if}
							</div>
						</div>
					{/if}
				</div>

				<!-- Occasion -->
				<div>
					<label for="occasion" class="block text-sm font-medium text-gray-700 mb-2">
						Occasion <span class="text-red-600">*</span>
					</label>
					<select
						id="occasion"
						bind:value={occasion}
						class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
						{#each OCCASIONS as occ}
							<option value={occ}>{formatOccasion(occ)}</option>
						{/each}
					</select>
				</div>

				<!-- Notes -->
				<div>
					<label for="note" class="block text-sm font-medium text-gray-700 mb-2">
						Additional Notes (Optional)
					</label>
					<textarea
						id="note"
						bind:value={note}
						rows="3"
						placeholder="e.g., prefer blue colors, need comfortable shoes"
						class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
					></textarea>
				</div>

				<!-- System Prompt Editor -->
				<div class="border border-gray-300 rounded-lg overflow-hidden">
					<button
						type="button"
						on:click={() => (showPromptEditor = !showPromptEditor)}
						class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
					>
						<div class="flex items-center gap-2">
							<svg
								class="w-5 h-5 text-gray-600 transition-transform {showPromptEditor
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
							<span class="text-sm font-medium text-gray-700">System Prompt Editor</span>
							<span
								class="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded"
							>
								Advanced
							</span>
						</div>
						<span class="text-xs text-gray-500">
							{showPromptEditor ? 'Hide' : 'Show'}
						</span>
					</button>

					{#if showPromptEditor}
						<div class="p-4 bg-white">
							<!-- Help Text -->
							<div class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
								<p class="text-xs text-blue-800 mb-2">
									<strong>Template Variables:</strong> These will be automatically replaced with actual
									values. Do NOT remove them!
								</p>
								<ul class="text-xs text-blue-700 space-y-1">
									{#each promptVariables as variable}
										<li class="flex items-start gap-2">
											<code
												class="px-1.5 py-0.5 bg-blue-100 text-blue-900 rounded font-mono text-xs"
											>
												{variable.name}
											</code>
											<span>
												{variable.description}
												{variable.required ? '(Required)' : '(Optional)'}
											</span>
										</li>
									{/each}
								</ul>
							</div>

							<!-- Prompt Editor -->
							<label for="custom-prompt" class="block text-sm font-medium text-gray-700 mb-2">
								Edit System Prompt
							</label>
							<textarea
								id="custom-prompt"
								bind:value={customPrompt}
								rows="12"
								placeholder="Loading default prompt..."
								class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
							></textarea>

							<!-- Reset Button -->
							<div class="mt-3 flex justify-end">
								<button
									type="button"
									on:click={resetPromptToDefault}
									class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
								>
									Reset to Default
								</button>
							</div>
						</div>
					{/if}
				</div>

				<!-- Submit -->
				<button
					type="submit"
					disabled={loading || !csvFile}
					class="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
				>
					{loading ? 'Processing...' : 'Generate Recommendations'}
				</button>
			</div>
		</form>

		<!-- Error -->
		{#if error}
			<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
				<p class="text-red-800"><strong>Error:</strong> {error}</p>
			</div>
		{/if}

		<!-- Results -->
		{#if result}
			<div class="space-y-6">
				<!-- Usage & Cost -->
				<div class="bg-white rounded-lg shadow-sm p-6">
					<h3 class="text-lg font-semibold text-gray-900 mb-4">API Usage & Cost Breakdown</h3>

					<div class="grid md:grid-cols-2 gap-6 mb-6">
						<!-- Token Usage -->
						<div>
							<h4 class="text-sm font-medium text-gray-700 mb-3">Token Usage</h4>
							<div class="space-y-2 text-sm">
								<div class="flex justify-between">
									<span class="text-gray-600">Embedding tokens:</span>
									<span class="font-mono">{result.usage.embedding_tokens.toLocaleString()}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-600">Input tokens (GPT):</span>
									<span class="font-mono">{result.usage.prompt_tokens.toLocaleString()}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-600">Output tokens (GPT):</span>
									<span class="font-mono">{result.usage.completion_tokens.toLocaleString()}</span>
								</div>
								<div class="flex justify-between pt-2 border-t font-semibold">
									<span>Total tokens:</span>
									<span class="font-mono">{result.usage.total_tokens.toLocaleString()}</span>
								</div>
							</div>
						</div>

						<!-- Cost -->
						<div>
							<h4 class="text-sm font-medium text-gray-700 mb-3">Cost Breakdown</h4>
							<div class="space-y-2 text-sm">
								<div class="flex justify-between">
									<span class="text-gray-600">Embedding cost:</span>
									<span class="font-mono">${result.usage.embedding_cost_usd.toFixed(6)}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-600">GPT input cost:</span>
									<span class="font-mono">${result.usage.gpt_input_cost_usd.toFixed(6)}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-600">GPT output cost:</span>
									<span class="font-mono">${result.usage.gpt_output_cost_usd.toFixed(6)}</span>
								</div>
								<div class="flex justify-between pt-2 border-t font-semibold">
									<span>Total cost (USD):</span>
									<span class="font-mono">${result.usage.total_cost_usd.toFixed(6)}</span>
								</div>
								<div class="flex justify-between font-semibold">
									<span>Total cost (IDR):</span>
									<span class="font-mono"
										>Rp {result.usage.total_cost_idr.toLocaleString('id-ID')}</span
									>
								</div>
							</div>
						</div>
					</div>

					<!-- Budget Status -->
					<div
						class="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg {result.usage
							.total_cost_idr <= 1250
							? 'bg-green-50 border border-green-200'
							: 'bg-red-50 border border-red-200'}"
					>
						<div class="flex flex-wrap gap-4 text-sm">
							<span class="text-gray-700">
								Budget: <strong>Rp 1,250</strong>
							</span>
							<span class="text-gray-400">|</span>
							<span class="text-gray-700">
								Used: <strong>Rp {result.usage.total_cost_idr.toLocaleString('id-ID')}</strong>
							</span>
							<span class="text-gray-400">|</span>
							<span class="text-gray-700">
								Time: <strong>{(result.usage.processing_time_ms / 1000).toFixed(2)}s</strong>
							</span>
						</div>
						<span
							class="px-4 py-2 rounded-md font-semibold text-sm {result.usage.total_cost_idr <=
							1250
								? 'bg-green-100 text-green-800'
								: 'bg-red-100 text-red-800'}"
						>
							{result.usage.total_cost_idr <= 1250 ? 'UNDER BUDGET' : 'OVER BUDGET'}
						</span>
					</div>
				</div>

				<!-- Metadata -->
				<div class="bg-white rounded-lg shadow-sm p-6">
					<div class="flex flex-wrap gap-6 text-sm">
						<div>
							<span class="text-gray-600">Gender:</span>
							<span class="font-semibold ml-2">{result.metadata.gender}</span>
						</div>
						<div>
							<span class="text-gray-600">Occasion:</span>
							<span class="font-semibold ml-2">{formatOccasion(result.metadata.occasion)}</span>
						</div>
						<div>
							<span class="text-gray-600">Items analyzed:</span>
							<span class="font-semibold ml-2"
								>{result.metadata.items_considered} / {result.metadata.total_items}</span
							>
						</div>
					</div>
				</div>

				<!-- Side-by-side layout for Combinations and Canvas -->
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<!-- Combinations -->
					<div class="bg-white rounded-lg shadow-sm p-6 lg:max-h-[1200px] lg:overflow-y-auto">
						<h2 class="text-xl font-semibold text-gray-900 mb-6">Outfit Recommendations</h2>

					{#if result.combinations.length === 0}
						<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
							<p class="text-yellow-800">
								No outfit combinations generated. Try different items or occasion.
							</p>
						</div>
					{:else}
						<div class="space-y-6">
							{#each result.combinations as combo, index}
								<div class="border border-gray-200 rounded-lg p-6">
									<div class="flex items-center justify-between mb-4">
										<h3 class="text-lg font-semibold">Outfit {combo.id || index + 1}</h3>
										<span
											class="px-3 py-1 rounded-full text-xs font-semibold uppercase {combo.confidence ===
											'high'
												? 'bg-green-100 text-green-800'
												: combo.confidence === 'medium'
													? 'bg-yellow-100 text-yellow-800'
													: 'bg-red-100 text-red-800'}"
										>
											{combo.confidence} confidence
										</span>
									</div>

									<div class="grid grid-cols-1 gap-4 mb-6">
										{#each combo.items as item}
											<div class="border border-gray-200 rounded-lg p-4">
												<div class="mb-3">
													<img
														src={getImagePath(item.id)}
														alt="Item {item.id}"
														class="w-full h-48 object-contain bg-gray-50 rounded"
														on:error={(e) => {
															const target = e.currentTarget as HTMLImageElement;
															target.style.display = 'none';
														}}
													/>
												</div>
												<div class="flex items-start justify-between mb-2">
													<span class="text-xs font-semibold text-gray-500">ID: {item.id}</span>
													<span
														class="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded"
													>
														{item.category}
													</span>
												</div>
												{#if item.subcategory}
													<p class="text-sm text-gray-700 mb-1">{item.subcategory}</p>
												{/if}
												{#if item.color}
													<p class="text-sm text-gray-600 mb-2">Color: {item.color}</p>
												{/if}
												<p class="text-sm text-gray-800 leading-relaxed mb-3">{item.reason}</p>
												{#if isItemAddedToCanvas(item.id, index)}
													<button
														type="button"
														disabled
														class="w-full bg-green-600 text-white text-sm font-semibold py-2 px-3 rounded cursor-default"
													>
														Added
													</button>
												{:else}
													<button
														type="button"
														on:click={() => addItemToCanvas(item.id, index)}
														class="w-full bg-blue-600 text-white text-sm font-semibold py-2 px-3 rounded hover:bg-blue-700 transition-colors"
													>
														Add to Canvas {index + 1}
													</button>
												{/if}
											</div>
										{/each}
									</div>

									<div class="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
										<h4 class="font-semibold text-blue-900 mb-2">Reasoning</h4>
										<p class="text-blue-800 text-sm leading-relaxed">{combo.reasoning}</p>
										{#if combo.style_notes}
											<p class="text-blue-700 text-sm mt-2 italic">{combo.style_notes}</p>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
					</div>

					<!-- Canvas Moodboard Builder -->
					{#if canvases.length > 0}
						<div class="bg-white rounded-lg shadow-sm p-6 lg:sticky lg:top-6 lg:max-h-[1200px] lg:overflow-y-auto">
							<div class="flex items-center justify-between mb-6">
								<h2 class="text-xl font-semibold text-gray-900">Moodboard Builder</h2>
								<button
									type="button"
									on:click={addNewCanvas}
									class="bg-gray-600 text-white text-sm font-semibold py-2 px-4 rounded hover:bg-gray-700 transition-colors"
								>
									Add Canvas
								</button>
							</div>

							<!-- Canvas Tabs -->
							<div class="flex gap-2 mb-6 overflow-x-auto pb-2">
								{#each canvases as canvas, index}
									<button
										type="button"
										on:click={() => (activeCanvasIndex = index)}
										class="px-4 py-2 rounded whitespace-nowrap font-medium text-sm transition-colors {activeCanvasIndex ===
										index
											? 'bg-blue-600 text-white'
											: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
									>
										{canvas.name}
									</button>
								{/each}
							</div>

							<!-- Canvas Controls -->
							{#if canvases[activeCanvasIndex]}
								<div class="grid md:grid-cols-2 gap-4 mb-6">
									<div>
										<label
											for="canvas-bg-{activeCanvasIndex}"
											class="block text-sm font-medium text-gray-700 mb-2"
										>
											Background Color
										</label>
										<input
											id="canvas-bg-{activeCanvasIndex}"
											type="color"
											bind:value={canvases[activeCanvasIndex].backgroundColor}
											on:input={() => renderCanvas(activeCanvasIndex)}
											class="h-10 w-full rounded border border-gray-300 cursor-pointer"
										/>
									</div>

									<div class="flex items-end gap-2">
										<button
											type="button"
											on:click={() => clearCanvas(activeCanvasIndex)}
											class="flex-1 bg-yellow-600 text-white text-sm font-semibold py-2 px-4 rounded hover:bg-yellow-700 transition-colors"
										>
											Clear Canvas
										</button>
										<button
											type="button"
											on:click={() => deleteCanvas(activeCanvasIndex)}
											class="flex-1 bg-red-600 text-white text-sm font-semibold py-2 px-4 rounded hover:bg-red-700 transition-colors"
										>
											Delete Canvas
										</button>
									</div>
								</div>

								<!-- Canvas Display -->
								<div class="border-2 border-gray-300 rounded-lg overflow-hidden mb-4">
									<canvas
										bind:this={canvasRefs[canvases[activeCanvasIndex].id]}
										width={CANVAS_WIDTH}
										height={CANVAS_HEIGHT}
										on:mousedown={(e) => handleCanvasClick(e, activeCanvasIndex)}
										on:mousemove={(e) => handleCanvasMouseMove(e, activeCanvasIndex)}
										on:mouseup={handleCanvasMouseUp}
										on:mouseleave={handleCanvasMouseUp}
										class="w-full h-auto max-h-[800px] cursor-pointer"
										style="display: block;"
									></canvas>
								</div>

								<div class="text-sm text-gray-600 mb-4">
									<p>
										<strong>Instructions:</strong> Click "Add to Canvas" buttons above to add items. Drag
										items on canvas to reposition. Press Delete/Backspace to remove selected item.
									</p>
									<p class="mt-1">
										Canvas size: 1080x1920 (Instagram Story) • Items: {canvases[activeCanvasIndex]
											.items.length}
									</p>
								</div>

								<!-- Export Controls -->
								<div class="flex gap-2">
									<button
										type="button"
										on:click={() => exportCanvas(activeCanvasIndex, 'png')}
										class="flex-1 bg-green-600 text-white font-semibold py-3 px-4 rounded hover:bg-green-700 transition-colors"
									>
										Export as PNG
									</button>
									<button
										type="button"
										on:click={() => exportCanvas(activeCanvasIndex, 'jpeg')}
										class="flex-1 bg-green-600 text-white font-semibold py-3 px-4 rounded hover:bg-green-700 transition-colors"
									>
										Export as JPEG
									</button>
								</div>
							{/if}
						</div>
					{/if}
				</div>
				<!-- End of side-by-side grid -->
			</div>
		{/if}
	</div>

	<!-- CSV Preview Modal -->
	{#if showPreviewModal}
		<div
			class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
			on:click={() => (showPreviewModal = false)}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<div
				class="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col"
				on:click={(e) => e.stopPropagation()}
				role="document"
			>
				<!-- Modal Header -->
				<div class="flex items-center justify-between p-6 border-b">
					<div>
						<h2 class="text-2xl font-semibold text-gray-900">CSV Data Preview</h2>
						<p class="text-sm text-gray-600 mt-1">
							{csvFileName} - Total items: {csvPreviewData.length}
						</p>
					</div>
					<button
						type="button"
						on:click={() => (showPreviewModal = false)}
						class="text-gray-400 hover:text-gray-600 transition-colors"
						aria-label="Close modal"
					>
						<svg
							class="w-6 h-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<!-- Modal Content -->
				<div class="flex-1 overflow-auto p-6">
					{#if csvPreviewData.length > 0}
						<div class="overflow-x-auto">
							<table class="w-full border-collapse">
								<thead class="bg-gray-50 sticky top-0">
									<tr>
										<th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b">
											ID
										</th>
										<th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b">
											Description
										</th>
										<th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b">
											Asset Name
										</th>
										<th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b">
											Category
										</th>
										<th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b">
											Subcategory
										</th>
										<th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b">
											Color
										</th>
										<th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b">
											Fit
										</th>
										<th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b">
											Brand
										</th>
										<th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b">
											Occasion
										</th>
									</tr>
								</thead>
								<tbody>
									{#each csvPreviewData as row, index}
										<tr class="{index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
											<td class="px-4 py-3 text-sm text-gray-900 border-b">
												{row.id || '-'}
											</td>
											<td class="px-4 py-3 text-sm text-gray-700 border-b max-w-xl">
												<div class="break-words">
													{row.desc || '-'}
												</div>
											</td>
											<td class="px-4 py-3 text-sm text-gray-700 border-b">
												{row['asset name'] || '-'}
											</td>
											<td class="px-4 py-3 text-sm text-gray-700 border-b">
												{row.category || '-'}
											</td>
											<td class="px-4 py-3 text-sm text-gray-700 border-b">
												{row.subcategory || '-'}
											</td>
											<td class="px-4 py-3 text-sm text-gray-700 border-b">
												{row.color || '-'}
											</td>
											<td class="px-4 py-3 text-sm text-gray-700 border-b">
												{row.fit || '-'}
											</td>
											<td class="px-4 py-3 text-sm text-gray-700 border-b">
												{row.brand || '-'}
											</td>
											<td class="px-4 py-3 text-sm text-gray-700 border-b">
												{row.occasion || '-'}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<div class="text-center py-12">
							<p class="text-gray-500">No data available</p>
						</div>
					{/if}
				</div>

				<!-- Modal Footer -->
				<div class="flex items-center justify-between p-6 border-t bg-gray-50">
					<div class="text-sm text-gray-600">
						Showing all {csvPreviewData.length} items
					</div>
					<button
						type="button"
						on:click={() => (showPreviewModal = false)}
						class="px-4 py-2 bg-gray-600 text-white font-semibold rounded hover:bg-gray-700 transition-colors"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
