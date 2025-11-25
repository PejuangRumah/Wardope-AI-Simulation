<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import { Plus, Edit, Trash2 } from "lucide-svelte";
	import Modal from "$lib/components/Modal.svelte";
	import { toast } from "$lib/stores/toast";
	import type { PageData } from "./$types";
	import type { SubcategoryDB } from "$lib/types/database";

	export let data: PageData;

	let showModal = false;
	let editingSubcategory: SubcategoryDB | null = null;
	let formData = { name: "", category_id: "", display_order: 0 };
	let loading = false;

	$: subcategories = data.subcategories;
	$: categories = data.categories;

	function openCreateModal() {
		editingSubcategory = null;
		// Auto-fill display order: get max + 1, or 0 if empty
		const maxOrder =
			subcategories.length > 0
				? Math.max(...subcategories.map((s) => s.display_order))
				: -1;
		formData = { name: "", category_id: "", display_order: maxOrder + 1 };
		showModal = true;
	}

	function openEditModal(subcategory: SubcategoryDB) {
		editingSubcategory = subcategory;
		formData = {
			name: subcategory.name,
			category_id: subcategory.category_id,
			display_order: subcategory.display_order,
		};
		showModal = true;
	}

	async function handleSubmit() {
		loading = true;
		try {
			const url = editingSubcategory
				? `/api/master-data/subcategories/${editingSubcategory.id}`
				: "/api/master-data/subcategories";

			const response = await fetch(url, {
				method: editingSubcategory ? "PUT" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formData),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "An error occurred");
			}

			toast.success(
				editingSubcategory
					? "Subcategory updated!"
					: "Subcategory created!",
			);
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
			const response = await fetch(
				`/api/master-data/subcategories/${id}`,
				{
					method: "DELETE",
				},
			);

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error);
			}

			toast.success("Subcategory deleted!");
			await invalidateAll();
		} catch (error: any) {
			toast.error(error.message);
		}
	}
</script>

<svelte:head>
	<title>Subcategories - Wardope AI</title>
</svelte:head>

<div class="p-4 md:p-8">
	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-gray-900">Subcategories</h1>
		<p class="text-gray-600 mt-1">
			Manage detailed item types per category
		</p>
	</div>

	<!-- Action Bar -->
	<div class="mb-6">
		<button
			on:click={openCreateModal}
			class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium"
		>
			<Plus class="w-5 h-5" />
			Add Subcategory
		</button>
	</div>

	<!-- Table -->
	<div class="bg-white rounded-lg border border-gray-200 overflow-x-auto">
		{#if subcategories.length === 0}
			<div class="p-8 text-center text-gray-500">
				<p>
					No subcategories yet. Click "Add Subcategory" to create one.
				</p>
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
							Category
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
					{#each subcategories as subcategory (subcategory.id)}
						<tr class="hover:bg-gray-50">
							<td
								class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
							>
								{subcategory.name}
							</td>
							<td
								class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
							>
								{subcategory.categories?.name || "N/A"}
							</td>
							<td
								class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
							>
								{subcategory.display_order}
							</td>
							<td
								class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
							>
								<button
									on:click={() => openEditModal(subcategory)}
									class="text-indigo-600 hover:text-indigo-900 mr-4"
									title="Edit"
								>
									<Edit class="w-4 h-4 inline" />
								</button>
								<button
									on:click={() =>
										handleDelete(
											subcategory.id,
											subcategory.name,
										)}
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
<Modal
	bind:open={showModal}
	title={editingSubcategory ? "Edit Subcategory" : "Add Subcategory"}
>
	<form on:submit|preventDefault={handleSubmit}>
		<div class="space-y-4">
			<div>
				<label
					for="category"
					class="block text-sm font-medium text-gray-700 mb-1"
				>
					Category <span class="text-red-500">*</span>
				</label>
				<select
					id="category"
					bind:value={formData.category_id}
					required
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
				>
					<option value="">Select a category</option>
					{#each categories as category}
						<option value={category.id}>{category.name}</option>
					{/each}
				</select>
				<p class="text-xs text-gray-500 mt-1">
					Choose which category this subcategory belongs to
				</p>
			</div>

			<div>
				<label
					for="name"
					class="block text-sm font-medium text-gray-700 mb-1"
				>
					Subcategory Name <span class="text-red-500">*</span>
				</label>
				<input
					id="name"
					type="text"
					bind:value={formData.name}
					required
					maxlength="100"
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
					placeholder="e.g., Shirt, Jeans, Sneakers"
				/>
			</div>

			<div>
				<label
					for="display_order"
					class="block text-sm font-medium text-gray-700 mb-1"
				>
					Display Order
				</label>
				<input
					id="display_order"
					type="number"
					bind:value={formData.display_order}
					min="0"
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
				/>
				<p class="text-xs text-gray-500 mt-1">
					Lower numbers appear first
				</p>
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
			{loading ? "Saving..." : "Save"}
		</button>
	</svelte:fragment>
</Modal>
