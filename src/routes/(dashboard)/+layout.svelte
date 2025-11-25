<script lang="ts">
	import DashboardHeader from '$lib/components/DashboardHeader.svelte';
	import DashboardSidebar from '$lib/components/DashboardSidebar.svelte';
</script>

<div class="h-screen flex flex-col">
	<!-- Header -->
	<DashboardHeader />

	<!-- Main Content Area -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Sidebar -->
		<DashboardSidebar />

		<!-- Page Content -->
		<main class="flex-1 overflow-y-auto bg-gray-50">
			<slot />
		</main>
	</div>
</div>
