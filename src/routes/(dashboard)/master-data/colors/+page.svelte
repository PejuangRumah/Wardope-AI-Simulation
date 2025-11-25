<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import { Plus, Edit, Trash2 } from "lucide-svelte";
	import Modal from "$lib/components/Modal.svelte";
	import ColorPicker from "$lib/components/ColorPicker.svelte";
	import { toast } from "$lib/stores/toast";
	import type { PageData } from "./$types";
	import type { ColorDB } from "$lib/types/database";

	export let data: PageData;

	let showModal = false;
	let editingColor: ColorDB | null = null;
	let formData = { name: "", hex_code: "", display_order: 0 };
	let loading = false;

	$: colors = data.colors;

	function openCreateModal() {
		editingColor = null;
		const maxOrder =
			colors.length > 0
				? Math.max(...colors.map((c) => c.display_order))
				: -1;
		formData = { name: "", hex_code: "", display_order: maxOrder + 1 };
		showModal = true;
	}

	function openEditModal(color: ColorDB) {
		editingColor = color;
		formData = {
			name: color.name,
			hex_code: color.hex_code || "",
			display_order: color.display_order,
		};
		showModal = true;
	}

	async function handleSubmit() {
		loading = true;
		try {
			const url = editingColor
				? `/api/master-data/colors/${editingColor.id}`
				: "/api/master-data/colors";

			const response = await fetch(url, {
				method: editingColor ? "PUT" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formData),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "An error occurred");
			}

			toast.success(editingColor ? "Color updated!" : "Color created!");
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
			const response = await fetch(`/api/master-data/colors/${id}`, {
				method: "DELETE",
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error);
			}

			toast.success("Color deleted!");
			await invalidateAll();
		} catch (error: any) {
			toast.error(error.message);
		}
	}
</script>

<svelte:head>
	<title>Colors - Wardope AI</title>
</svelte:head>

<div class="p-4 md:p-8">
	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-gray-900">Colors</h1>
		<p class="text-gray-600 mt-1">
			Manage color options for wardrobe items
		</p>
	</div>

	<!-- Action Bar -->
	<div class="mb-6">
		<button
			on:click={openCreateModal}
			class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium"
		>
			<Plus class="w-5 h-5" />
			Add Color
		</button>
	</div>

	<!-- Table -->
	<div class="bg-white rounded-lg border border-gray-200 overflow-x-auto">
		{#if colors.length === 0}
			<div class="p-8 text-center text-gray-500">
				<p>No colors yet. Click "Add Color" to create one.</p>
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
							Color Preview
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
					{#each colors as color (color.id)}
						<tr class="hover:bg-gray-50">
							<td
								class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
							>
								{color.name}
							</td>
							<td
								class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
							>
								{#if color.hex_code}
									<div class="flex items-center gap-2">
										<div
											class="w-8 h-8 border border-gray-300 rounded"
											style="background-color: {color.hex_code}"
											title={color.hex_code}
										></div>
										<span class="font-mono text-xs"
											>{color.hex_code}</span
										>
									</div>
								{:else}
									<span class="text-gray-400">-</span>
								{/if}
							</td>
							<td
								class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
							>
								{color.display_order}
							</td>
							<td
								class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
							>
								<button
									on:click={() => openEditModal(color)}
									class="text-indigo-600 hover:text-indigo-900 mr-4"
									title="Edit"
								>
									<Edit class="w-4 h-4 inline" />
								</button>
								<button
									on:click={() =>
										handleDelete(color.id, color.name)}
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
<Modal bind:open={showModal} title={editingColor ? "Edit Color" : "Add Color"}>
	<form on:submit|preventDefault={handleSubmit}>
		<div class="space-y-4">
			<div>
				<label
					for="name"
					class="block text-sm font-medium text-gray-700 mb-1"
				>
					Color Name <span class="text-red-500">*</span>
				</label>
				<input
					id="name"
					type="text"
					bind:value={formData.name}
					required
					maxlength="100"
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
					placeholder="e.g., Navy Blue, Forest Green"
				/>
			</div>

			<ColorPicker
				bind:value={formData.hex_code}
				label="Hex Color Code (Optional)"
			/>

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
