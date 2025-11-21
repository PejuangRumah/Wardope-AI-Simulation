<script lang="ts">
	import { invalidateAll, goto } from '$app/navigation';
	import { Edit, History } from 'lucide-svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { toast } from '$lib/stores/toast';
	import type { PageData } from './$types';

	export let data: PageData;

	let showModal = false;
	let editingPrompt: any | null = null;
	let formData = {
		name: '',
		description: '',
		type: 'item_analysis' as 'item_analysis' | 'item_improvement' | 'outfit_recommendation',
		content: '',
		template_variables: [] as string[],
		is_active: true, // Always set to active since there's only one per type
		tags: [] as string[],
		change_summary: ''
	};
	let loading = false;
	let seedingDefaults = false;

	$: prompts = data.prompts;
	$: hasPrompts = data.hasPrompts;

	const promptTypes: Array<{
		key: 'item_analysis' | 'item_improvement' | 'outfit_recommendation';
		label: string;
		description: string;
	}> = [
		{
			key: 'item_analysis',
			label: 'Item Analysis',
			description: 'Analyze fashion items using GPT-4o Vision API'
		},
		{
			key: 'item_improvement',
			label: 'Item Improvement',
			description: 'Improve item images using GPT-Image-1'
		},
		{
			key: 'outfit_recommendation',
			label: 'Outfit Recommendation',
			description: 'Generate outfit combinations using GPT-4o'
		}
	];

	async function seedDefaultPrompts() {
		seedingDefaults = true;
		try {
			const response = await fetch('/api/prompts/seed-defaults', {
				method: 'POST'
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to seed default prompts');
			}

			toast.success('Default prompts created successfully!');
			await invalidateAll();
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			seedingDefaults = false;
		}
	}

	function openEditModal(prompt: any) {
		editingPrompt = prompt;
		formData = {
			name: prompt.name,
			description: prompt.description || '',
			type: prompt.type,
			content: prompt.content,
			template_variables: prompt.template_variables || [],
			is_active: true,
			tags: prompt.tags || [],
			change_summary: ''
		};
		showModal = true;
	}

	function openSetupModal(type: 'item_analysis' | 'item_improvement' | 'outfit_recommendation') {
		editingPrompt = null;
		const typeDefaults = {
			item_analysis: {
				name: 'Item Analysis Prompt',
				template_variables: []
			},
			item_improvement: {
				name: 'Item Improvement Prompt',
				template_variables: []
			},
			outfit_recommendation: {
				name: 'Outfit Recommendation Prompt',
				template_variables: ['occasion', 'note']
			}
		};

		formData = {
			name: typeDefaults[type].name,
			description: '',
			type,
			content: '',
			template_variables: typeDefaults[type].template_variables,
			is_active: true,
			tags: [],
			change_summary: ''
		};
		showModal = true;
	}

	async function handleSubmit() {
		loading = true;
		try {
			const url = editingPrompt ? `/api/prompts/${editingPrompt.id}` : '/api/prompts';

			const response = await fetch(url, {
				method: editingPrompt ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'An error occurred');
			}

			toast.success(editingPrompt ? 'Prompt updated!' : 'Prompt created!');
			showModal = false;
			await invalidateAll();
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			loading = false;
		}
	}

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
		if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
		if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

		return date.toLocaleDateString();
	}

	function viewHistory(promptId: string) {
		goto(`/prompt-management/${promptId}`);
	}
</script>

<svelte:head>
	<title>Prompt Management - Wardope AI</title>
</svelte:head>

<div class="p-8">
	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-gray-900">Prompt Management</h1>
		<p class="text-gray-600 mt-1 text-sm">
			Manage AI prompts for item analysis, image improvement, and outfit recommendations. Each edit
			creates a new version.
		</p>
	</div>

	<!-- Seed Defaults Banner (Only show if no prompts) -->
	{#if !hasPrompts}
		<div class="mb-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
			<h3 class="text-base font-semibold text-gray-900 mb-2">No prompts configured</h3>
			<p class="text-gray-600 text-sm mb-4">
				Create default prompts for all AI features to get started.
			</p>
			<button
				on:click={seedDefaultPrompts}
				disabled={seedingDefaults}
				class="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
			>
				{#if seedingDefaults}
					Seeding...
				{:else}
					Seed Default Prompts
				{/if}
			</button>
		</div>
	{/if}

	<!-- Prompts List (Fixed 3 Cards) -->
	<div class="space-y-4">
		{#each promptTypes as promptType}
			{@const prompt = prompts[promptType.key]}
			<div class="bg-white border border-gray-200 rounded-lg p-6">
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<div class="flex items-center gap-3 mb-2">
							<h2 class="text-lg font-semibold text-gray-900">{promptType.label}</h2>
							{#if prompt}
								<span class="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">
									v{prompt.version}
								</span>
							{:else}
								<span class="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
									Not configured
								</span>
							{/if}
						</div>
						<p class="text-sm text-gray-600 mb-3">{promptType.description}</p>
						{#if prompt}
							<div class="flex items-center gap-4 text-xs text-gray-500">
								<span>Last edited: {formatDate(prompt.updated_at)}</span>
								{#if prompt.usage_count > 0}
									<span>•</span>
									<span>{prompt.usage_count} uses</span>
								{/if}
							</div>
						{/if}
					</div>
					<div class="flex items-center gap-2 ml-4">
						{#if prompt}
							<button
								on:click={() => viewHistory(prompt.id)}
								class="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
							>
								<History class="w-4 h-4" />
								<span>History</span>
							</button>
							<button
								on:click={() => openEditModal(prompt)}
								class="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
							>
								<Edit class="w-4 h-4" />
								<span>Edit</span>
							</button>
						{:else}
							<button
								on:click={() => openSetupModal(promptType.key)}
								class="px-3 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
							>
								Setup Prompt
							</button>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>

<!-- Modal for Edit/Create -->
<Modal bind:open={showModal} title={editingPrompt ? 'Edit Prompt' : 'Setup Prompt'} size="lg">
	<form on:submit|preventDefault={handleSubmit}>
		<div class="space-y-4">
			<div>
				<label for="name" class="block text-sm font-medium text-gray-700 mb-1">
					Prompt Name <span class="text-red-500">*</span>
				</label>
				<input
					id="name"
					type="text"
					bind:value={formData.name}
					required
					maxlength="100"
					class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-indigo-500"
					placeholder="e.g., Item Analysis Prompt"
				/>
			</div>

			<div>
				<label for="description" class="block text-sm font-medium text-gray-700 mb-1">
					Description
				</label>
				<input
					id="description"
					type="text"
					bind:value={formData.description}
					maxlength="200"
					class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-indigo-500"
					placeholder="Brief description of this prompt's purpose"
				/>
			</div>

			<div>
				<label for="content" class="block text-sm font-medium text-gray-700 mb-1">
					Prompt Content <span class="text-red-500">*</span>
				</label>
				<textarea
					id="content"
					bind:value={formData.content}
					required
					rows="8"
					maxlength="10000"
					class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-indigo-500 font-mono text-sm"
					placeholder="Enter your AI prompt here..."
				></textarea>
				<p class="text-xs text-gray-500 mt-1">
					{formData.content.length} / 10000 characters
				</p>
			</div>

			{#if editingPrompt}
				<div>
					<label for="change_summary" class="block text-sm font-medium text-gray-700 mb-1">
						Change Summary
					</label>
					<input
						id="change_summary"
						type="text"
						bind:value={formData.change_summary}
						maxlength="200"
						class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-indigo-500"
						placeholder="What did you change? (optional)"
					/>
					<p class="text-xs text-gray-500 mt-1">Helps track prompt evolution over time</p>
				</div>
			{/if}
		</div>
	</form>

	<svelte:fragment slot="footer">
		<button
			type="button"
			on:click={() => (showModal = false)}
			class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
		>
			Cancel
		</button>
		<button
			type="button"
			on:click={handleSubmit}
			disabled={loading}
			class="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
		>
			{loading ? 'Saving...' : editingPrompt ? 'Save Changes' : 'Create Prompt'}
		</button>
	</svelte:fragment>
</Modal>
