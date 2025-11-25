<script lang="ts">
	import '../app.css';
	import Toast from '$lib/components/Toast.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/assets/logo/logo-wardope.png" type="image/png" />
</svelte:head>

{@render children?.()}

<Toast />
