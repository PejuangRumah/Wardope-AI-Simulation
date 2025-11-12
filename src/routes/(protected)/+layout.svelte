<script lang="ts">
	import { user } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		if (!$user) {
			goto('/login');
		}
	});
</script>

{#if $user}
	<slot />
{:else}
	<div class="min-h-screen flex items-center justify-center">
		<p class="text-gray-600">Loading...</p>
	</div>
{/if}
