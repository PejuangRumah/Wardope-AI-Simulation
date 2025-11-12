<script lang="ts">
	import { user } from '$lib/stores/auth';
	import { supabase } from '$lib/supabase';

	async function handleLogout() {
		await supabase.auth.signOut();
	}
</script>

<header class="bg-white border-b border-gray-200 h-16 flex items-center px-6">
	<div class="flex items-center justify-between w-full">
		<!-- Logo/Brand -->
		<div class="flex items-center gap-3">
			<img src="/assets/logo/logo-wardope.png" alt="Wardope" class="w-8 h-8 rounded-lg" />
			<span class="text-lg font-semibold text-gray-900">Wardope AI</span>
		</div>

		<!-- User Info & Logout -->
		<div class="flex items-center gap-4">
			<span class="text-sm text-gray-600">{$user?.email}</span>
			<button
				on:click={handleLogout}
				class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
			>
				Logout
			</button>
		</div>
	</div>
</header>
