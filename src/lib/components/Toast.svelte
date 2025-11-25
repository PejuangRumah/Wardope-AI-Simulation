<script lang="ts">
	import { toast } from '$lib/stores/toast';
	import { X, CheckCircle, XCircle, Info } from 'lucide-svelte';
	import { fly } from 'svelte/transition';

	const icons = {
		success: CheckCircle,
		error: XCircle,
		info: Info
	};

	const colors = {
		success: 'bg-green-500',
		error: 'bg-red-500',
		info: 'bg-blue-500'
	};
</script>

<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
	{#each $toast as t (t.id)}
		<div
			transition:fly={{ x: 300, duration: 300 }}
			class="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white {colors[
				t.type
			]} min-w-[300px] pointer-events-auto"
		>
			<svelte:component this={icons[t.type]} class="w-5 h-5 flex-shrink-0" />
			<p class="flex-1 text-sm font-medium">{t.message}</p>
			<button
				on:click={() => toast.remove(t.id)}
				class="hover:opacity-75 transition-opacity"
				type="button"
				aria-label="Close notification"
			>
				<X class="w-4 h-4" />
			</button>
		</div>
	{/each}
</div>
