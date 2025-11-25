<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Plus, Edit, Trash2 } from 'lucide-svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { toast } from '$lib/stores/toast';
	import type { PageData } from './$types';
	import type { OccasionDB } from '$lib/types/database';

	export let data: PageData;

	let showModal = false;
	let editingOccasion: OccasionDB | null = null;
	let formData = { name: '', description: '', display_order: 0 };
	let loading = false;

	$: occasions = data.occasions;

	function openCreateModal() {
		editingOccasion = null;
		const maxOrder =
			occasions.length > 0 ? Math.max(...occasions.map((c) => c.display_order)) : -1;
		formData = { name: '', description: '', display_order: maxOrder + 1 };
		showModal = true;
	}

	function openEditModal(occasion: OccasionDB) {
		editingOccasion = occasion;
		formData = {
			name: occasion.name,
			description: occasion.description || '',
			display_order: occasion.display_order
		};
		showModal = true;
	}

	async function handleSubmit() {
		loading = true;
		try {
			const url = editingOccasion
				? `/api/master-data/occasions/${editingOccasion.id}`
				: '/api/master-data/occasions';

			const response = await fetch(url, {
				method: editingOccasion ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'An error occurred');
			}

			toast.success(editingOccasion ? 'Occasion updated!' : 'Occasion created!');
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
			const response = await fetch(`/api/master-data/occasions/${id}`, {
				method: 'DELETE'
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error);
			}

			toast.success('Occasion deleted!');
			await invalidateAll();
		} catch (error: any) {
			toast.error(error.message);
		}
	}
</script>

<svelte:head>
	<title>Occasions - Wardope AI</title>
</svelte:head>

<div class="p-8">
	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-gray-900">Occasions</h1>
		<p class="text-gray-600 mt-1">Manage occasion types for outfit recommendations</p>
	</div>

	<!-- Action Bar -->
	<div class="mb-6">
		<button
			on:click={openCreateModal}
			class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium"
		>
			<Plus class="w-5 h-5" />
			Add Occasion
		</button>
	</div>

	<!-- Table -->
	<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
		{#if occasions.length === 0}
			<div class="p-8 text-center text-gray-500">
				<p>No occasions yet. Click "Add Occasion" to create one.</p>
			</div>
		{:else}
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th
							class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
						>
							Name
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
						>
							Description
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
						>
							Display Order
						</th>
						<th
							class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
						>
							Actions
						</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each occasions as occasion (occasion.id)}
						<tr class="hover:bg-gray-50">
							<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
								{occasion.name}
							</td>
							<td class="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
								{occasion.description || '-'}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{occasion.display_order}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
								<button
									on:click={() => openEditModal(occasion)}
									class="text-indigo-600 hover:text-indigo-900 mr-4"
									title="Edit"
								>
									<Edit class="w-4 h-4 inline" />
								</button>
								<button
									on:click={() => handleDelete(occasion.id, occasion.name)}
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

<!-- Modal -->
<Modal bind:open={showModal} title={editingOccasion ? 'Edit Occasion' : 'Add Occasion'}>
	<form on:submit|preventDefault={handleSubmit}>
		<div class="space-y-4">
			<div>
				<label for="name" class="block text-sm font-medium text-gray-700 mb-1">
					Occasion Name <span class="text-red-500">*</span>
				</label>
				<input
					id="name"
					type="text"
					bind:value={formData.name}
					required
					maxlength="100"
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
					placeholder="e.g., Casual, Formal, Work"
				/>
			</div>

			<div>
				<label for="description" class="block text-sm font-medium text-gray-700 mb-1">
					Description
				</label>
				<textarea
					id="description"
					bind:value={formData.description}
					maxlength="500"
					rows="3"
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
					placeholder="Describe this occasion (optional)"
				/>
				<p class="text-xs text-gray-500 mt-1">Max 500 characters</p>
			</div>

			<div>
				<label for="display_order" class="block text-sm font-medium text-gray-700 mb-1">
					Display Order
				</label>
				<input
					id="display_order"
					type="number"
					bind:value={formData.display_order}
					min="0"
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
				/>
				<p class="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
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
