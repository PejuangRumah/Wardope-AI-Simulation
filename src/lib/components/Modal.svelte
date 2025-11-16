<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { X } from 'lucide-svelte';

	export let open = false;
	export let title = '';
	export let size: 'sm' | 'md' | 'lg' = 'md';

	const dispatch = createEventDispatcher();

	function close() {
		dispatch('close');
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			close();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			close();
		}
	}

	const sizeClasses = {
		sm: 'max-w-md',
		md: 'max-w-lg',
		lg: 'max-w-2xl'
	};
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-50 overflow-y-auto"
		on:click={handleBackdropClick}
		role="dialog"
		aria-modal="true"
	>
		<div class="flex min-h-screen items-center justify-center p-4">
			<!-- Backdrop -->
			<div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

			<!-- Modal -->
			<div class="relative bg-white rounded-lg shadow-xl {sizeClasses[size]} w-full">
				<!-- Header -->
				<div class="flex items-center justify-between p-4 border-b border-gray-200">
					<h3 class="text-lg font-semibold text-gray-900">{title}</h3>
					<button
						on:click={close}
						class="text-gray-400 hover:text-gray-600 transition-colors"
						type="button"
						aria-label="Close modal"
					>
						<X class="w-5 h-5" />
					</button>
				</div>

				<!-- Content -->
				<div class="p-6">
					<slot />
				</div>

				<!-- Footer (optional slot) -->
				{#if $$slots.footer}
					<div class="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
						<slot name="footer" />
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
