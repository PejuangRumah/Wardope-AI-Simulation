<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { ArrowLeft, History, RotateCcw, Eye, Code } from 'lucide-svelte';
	import { toast } from '$lib/stores/toast';
	import type { PageData } from './$types';

	export let data: PageData;

	let restoringVersion: number | null = null;
	let expandedVersions = new Set<number>();
	let viewingContent: any = null;

	$: prompt = data.prompt;
	$: typeLabel = data.typeLabel;
	$: versions = data.versions;

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

		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function toggleExpand(version: number) {
		if (expandedVersions.has(version)) {
			expandedVersions.delete(version);
		} else {
			expandedVersions.add(version);
		}
		expandedVersions = expandedVersions;
	}

	async function restoreVersion(version: number) {
		const confirmRestore = confirm(
			`Are you sure you want to restore to version ${version}? This will create a new version with the content from v${version}.`
		);

		if (!confirmRestore) return;

		restoringVersion = version;
		try {
			const response = await fetch(`/api/prompts/${prompt.id}/versions/${version}/restore`, {
				method: 'POST'
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to restore version');
			}

			if (result.already_at_version) {
				toast.success(`Already at version ${version}`);
			} else {
				toast.success(`Restored to version ${version}`);
			}

			await invalidateAll();
			goto('/prompt-management');
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			restoringVersion = null;
		}
	}

	function viewContent(version: any) {
		viewingContent = version;
	}

	function closeContentView() {
		viewingContent = null;
	}

	function getContentPreview(content: string, maxLength: number = 150): string {
		if (content.length <= maxLength) return content;
		return content.substring(0, maxLength) + '...';
	}
</script>

<svelte:head>
	<title>Version History - {typeLabel} - Wardope AI</title>
</svelte:head>

<div class="p-8">
	<!-- Header -->
	<div class="mb-8">
		<button
			on:click={() => goto('/prompt-management')}
			class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
		>
			<ArrowLeft class="w-4 h-4" />
			<span>Back to Prompt Management</span>
		</button>

		<div class="flex items-start justify-between">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">{typeLabel} - Version History</h1>
				<p class="text-gray-600 mt-1 text-sm">{prompt.name}</p>
			</div>
			<div class="flex items-center gap-3">
				<span class="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded">
					Current: v{prompt.version}
				</span>
				<span class="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded">
					{versions.length} version{versions.length !== 1 ? 's' : ''}
				</span>
			</div>
		</div>
	</div>

	<!-- Current Version Card -->
	<div class="mb-8 bg-white border-2 border-indigo-200 rounded-lg p-6">
		<div class="flex items-center gap-2 mb-3">
			<h2 class="text-lg font-semibold text-gray-900">Current Version (v{prompt.version})</h2>
			<span class="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
				Active
			</span>
		</div>
		<div class="mb-4">
			<p class="text-sm text-gray-600 mb-2">
				Last updated: {formatDate(prompt.updated_at)}
			</p>
			{#if prompt.description}
				<p class="text-sm text-gray-700 mb-3">{prompt.description}</p>
			{/if}
			<div class="bg-gray-50 border border-gray-200 rounded p-4">
				<p class="text-xs font-mono text-gray-700 whitespace-pre-wrap break-words">
					{getContentPreview(prompt.content, 200)}
				</p>
			</div>
		</div>
		<button
			on:click={() =>
				viewContent({
					version: prompt.version,
					content: prompt.content,
					created_at: prompt.updated_at,
					change_summary: 'Current active version'
				})}
			class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-900"
		>
			<Eye class="w-4 h-4" />
			<span>View Full Content</span>
		</button>
	</div>

	<!-- Version History Timeline -->
	<div>
		<h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<History class="w-5 h-5" />
			<span>Version History</span>
		</h2>

		{#if versions.length === 0}
			<div class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
				<p class="text-gray-600">No previous versions yet. Edit this prompt to create versions.</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each versions as version}
					<div
						class="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors"
					>
						<div class="flex items-start justify-between mb-3">
							<div class="flex-1">
								<div class="flex items-center gap-3 mb-2">
									<h3 class="text-base font-semibold text-gray-900">Version {version.version}</h3>
									{#if version.version === prompt.version}
										<span
											class="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded"
										>
											Current
										</span>
									{/if}
								</div>
								<div class="flex items-center gap-4 text-xs text-gray-500 mb-2">
									<span>{formatDate(version.created_at)}</span>
									<span>•</span>
									<span>{version.content.length} characters</span>
								</div>
								{#if version.change_summary}
									<p class="text-sm text-gray-700 mb-3">
										<span class="font-medium">Changes:</span>
										{version.change_summary}
									</p>
								{/if}
							</div>
							<div class="flex items-center gap-2 ml-4">
								<button
									on:click={() => viewContent(version)}
									class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
									title="View full content"
								>
									<Eye class="w-4 h-4" />
									<span>View</span>
								</button>
								{#if version.version !== prompt.version}
									<button
										on:click={() => restoreVersion(version.version)}
										disabled={restoringVersion !== null}
										class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
										title="Restore this version"
									>
										{#if restoringVersion === version.version}
											<span class="text-xs">Restoring...</span>
										{:else}
											<RotateCcw class="w-4 h-4" />
											<span>Restore</span>
										{/if}
									</button>
								{/if}
							</div>
						</div>

						<!-- Content Preview -->
						{#if expandedVersions.has(version.version)}
							<div class="mt-3 bg-gray-50 border border-gray-200 rounded p-4">
								<p class="text-xs font-mono text-gray-700 whitespace-pre-wrap break-words">
									{version.content}
								</p>
							</div>
							<button
								on:click={() => toggleExpand(version.version)}
								class="mt-2 text-xs text-indigo-600 hover:text-indigo-900"
							>
								Hide content
							</button>
						{:else}
							<div class="mt-3 bg-gray-50 border border-gray-200 rounded p-4">
								<p class="text-xs font-mono text-gray-700 whitespace-pre-wrap break-words">
									{getContentPreview(version.content)}
								</p>
							</div>
							{#if version.content.length > 150}
								<button
									on:click={() => toggleExpand(version.version)}
									class="mt-2 text-xs text-indigo-600 hover:text-indigo-900"
								>
									Show full content
								</button>
							{/if}
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Full Content Modal -->
{#if viewingContent}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
		on:click={closeContentView}
		on:keydown={(e) => e.key === 'Escape' && closeContentView()}
	>
		<div
			class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
			on:click|stopPropagation
		>
			<!-- Modal Header -->
			<div class="border-b border-gray-200 px-6 py-4">
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-semibold text-gray-900">
						Version {viewingContent.version} - Full Content
					</h3>
					<button
						on:click={closeContentView}
						class="text-gray-400 hover:text-gray-600 text-2xl leading-none"
					>
						×
					</button>
				</div>
				<p class="text-sm text-gray-600 mt-1">{formatDate(viewingContent.created_at)}</p>
			</div>

			<!-- Modal Content -->
			<div class="flex-1 overflow-y-auto px-6 py-4">
				<div class="bg-gray-50 border border-gray-200 rounded p-4">
					<pre
						class="text-sm font-mono text-gray-800 whitespace-pre-wrap break-words">{viewingContent.content}</pre>
				</div>
			</div>

			<!-- Modal Footer -->
			<div class="border-t border-gray-200 px-6 py-4 flex justify-end gap-2">
				<button
					on:click={closeContentView}
					class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
				>
					Close
				</button>
				{#if viewingContent.version !== prompt.version}
					<button
						on:click={() => restoreVersion(viewingContent.version)}
						class="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
					>
						Restore This Version
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
