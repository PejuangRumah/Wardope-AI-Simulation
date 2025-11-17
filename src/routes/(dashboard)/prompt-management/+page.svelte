<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Plus, Edit, Trash2, CheckCircle2, Circle, Sparkles, FileText } from 'lucide-svelte';
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
		is_active: false,
		tags: [] as string[],
		change_summary: ''
	};
	let loading = false;
	let seedingDefaults = false;

	$: promptsByType = data.promptsByType;
	$: hasPrompts = data.hasPrompts;

	const typeLabels = {
		item_analysis: 'Item Analysis Prompts',
		item_improvement: 'Item Improvement Prompts',
		outfit_recommendation: 'Outfit Recommendation Prompts'
	};

	const typeDescriptions = {
		item_analysis:
			'Prompts for analyzing fashion items using GPT-4o Vision API (category, colors, fit, etc.)',
		item_improvement:
			'Prompts for improving item images using GPT-Image-1 (professional product photos)',
		outfit_recommendation:
			'Prompts for generating outfit recommendations using GPT-4o (style combinations)'
	};

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

	function openCreateModal(
		type: 'item_analysis' | 'item_improvement' | 'outfit_recommendation'
	) {
		editingPrompt = null;
		formData = {
			name: '',
			description: '',
			type,
			content: '',
			template_variables: type === 'outfit_recommendation' ? ['occasion', 'note'] : [],
			is_active: false,
			tags: [],
			change_summary: ''
		};
		showModal = true;
	}

	function openEditModal(prompt: any) {
		editingPrompt = prompt;
		formData = {
			name: prompt.name,
			description: prompt.description || '',
			type: prompt.type,
			content: prompt.content,
			template_variables: prompt.template_variables || [],
			is_active: prompt.is_active,
			tags: prompt.tags || [],
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

	async function handleDelete(id: string, name: string) {
		if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

		try {
			const response = await fetch(`/api/prompts/${id}`, {
				method: 'DELETE'
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error);
			}

			toast.success('Prompt deleted!');
			await invalidateAll();
		} catch (error: any) {
			toast.error(error.message);
		}
	}

	async function handleActivate(id: string, name: string) {
		try {
			const response = await fetch(`/api/prompts/${id}/activate`, {
				method: 'POST'
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error);
			}

			if (!result.already_active) {
				toast.success(`"${name}" is now active!`);
				await invalidateAll();
			}
		} catch (error: any) {
			toast.error(error.message);
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
</script>

<svelte:head>
	<title>Prompt Management - Wardope AI</title>
</svelte:head>

<div class="p-8">
	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
			<FileText class="w-7 h-7 text-indigo-600" />
			Prompt Management
		</h1>
		<p class="text-gray-600 mt-1">
			Manage AI prompts for item analysis, image improvement, and outfit generation
		</p>
	</div>

	<!-- Seed Defaults Banner (Only show if no prompts) -->
	{#if !hasPrompts}
		<div class="mb-8 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
			<div class="flex items-start gap-4">
				<div class="flex-shrink-0">
					<Sparkles class="w-8 h-8 text-indigo-600" />
				</div>
				<div class="flex-1">
					<h3 class="text-lg font-semibold text-gray-900 mb-2">Get Started with AI Prompts</h3>
					<p class="text-gray-700 mb-4">
						You don't have any prompts yet. Click "Seed Default Prompts" to automatically create 3
						optimized prompts for all AI features:
					</p>
					<ul class="list-disc list-inside text-sm text-gray-600 space-y-1 mb-4">
						<li><strong>Item Analysis</strong> - Analyze fashion items with GPT-4o Vision</li>
						<li><strong>Item Improvement</strong> - Create professional product photos with GPT-Image-1</li>
						<li><strong>Outfit Recommendation</strong> - Generate stylish outfit combinations with GPT-4o</li>
					</ul>
					<button
						on:click={seedDefaultPrompts}
						disabled={seedingDefaults}
						class="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
					>
						{#if seedingDefaults}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
							Seeding...
						{:else}
							<Sparkles class="w-5 h-5" />
							Seed Default Prompts
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Prompts List (Grouped by Type) -->
	{#if hasPrompts}
		<div class="space-y-8">
			{#each Object.entries(promptsByType) as [type, prompts]}
				<div>
					<!-- Type Header -->
					<div class="mb-4 flex items-center justify-between">
						<div>
							<h2 class="text-lg font-semibold text-gray-900">
								{typeLabels[type]} ({prompts.length})
							</h2>
							<p class="text-sm text-gray-600 mt-0.5">{typeDescriptions[type]}</p>
						</div>
						<button
							on:click={() => openCreateModal(type)}
							class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium text-sm"
						>
							<Plus class="w-4 h-4" />
							Add New
						</button>
					</div>

					<!-- Prompts Table -->
					<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
						{#if prompts.length === 0}
							<div class="p-8 text-center text-gray-500">
								<p>No {typeLabels[type].toLowerCase()} yet.</p>
							</div>
						{:else}
							<table class="min-w-full divide-y divide-gray-200">
								<thead class="bg-gray-50">
									<tr>
										<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8">
											Status
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
											Name
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
											Version
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
											Last Used
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
											Usage
										</th>
										<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
											Actions
										</th>
									</tr>
								</thead>
								<tbody class="bg-white divide-y divide-gray-200">
									{#each prompts as prompt (prompt.id)}
										<tr class="hover:bg-gray-50">
											<td class="px-4 py-4 whitespace-nowrap">
												{#if prompt.is_active}
													<CheckCircle2 class="w-5 h-5 text-green-600" title="Active" />
												{:else}
													<Circle class="w-5 h-5 text-gray-300" title="Inactive" />
												{/if}
											</td>
											<td class="px-6 py-4">
												<div class="text-sm font-medium text-gray-900">{prompt.name}</div>
												{#if prompt.description}
													<div class="text-xs text-gray-500 mt-0.5">{prompt.description}</div>
												{/if}
												{#if prompt.tags && prompt.tags.length > 0}
													<div class="flex gap-1 mt-1.5">
														{#each prompt.tags as tag}
															<span class="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
																{tag}
															</span>
														{/each}
													</div>
												{/if}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												v{prompt.version}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{prompt.last_used_at ? formatDate(prompt.last_used_at) : 'Never'}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{prompt.usage_count} uses
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
												{#if !prompt.is_active}
													<button
														on:click={() => handleActivate(prompt.id, prompt.name)}
														class="text-green-600 hover:text-green-900"
														title="Set as Active"
													>
														Activate
													</button>
												{/if}
												<button
													on:click={() => openEditModal(prompt)}
													class="text-indigo-600 hover:text-indigo-900"
													title="Edit"
												>
													<Edit class="w-4 h-4 inline" />
												</button>
												<button
													on:click={() => handleDelete(prompt.id, prompt.name)}
													class="text-red-600 hover:text-red-900"
													title="Delete"
												>
													<Trash2 class="w-4 h-4 inline" />
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal for Create/Edit -->
<Modal bind:open={showModal} title={editingPrompt ? 'Edit Prompt' : 'Add New Prompt'} size="lg">
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
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
					placeholder="e.g., Item Analysis (Custom)"
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
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
					rows="12"
					maxlength="10000"
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
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
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
						placeholder="What did you change? (optional)"
					/>
					<p class="text-xs text-gray-500 mt-1">
						Helps track prompt evolution over time
					</p>
				</div>
			{/if}

			<div class="flex items-center gap-2">
				<input
					id="is_active"
					type="checkbox"
					bind:checked={formData.is_active}
					class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
				/>
				<label for="is_active" class="text-sm font-medium text-gray-700">
					Set as active prompt (deactivates others of this type)
				</label>
			</div>
		</div>
	</form>

	<svelte:fragment slot="footer">
		<button
			type="button"
			on:click={() => (showModal = false)}
			class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
		>
			Cancel
		</button>
		<button
			type="button"
			on:click={handleSubmit}
			disabled={loading}
			class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
		>
			{loading ? 'Saving...' : 'Save'}
		</button>
	</svelte:fragment>
</Modal>
