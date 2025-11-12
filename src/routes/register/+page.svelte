<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';

	let email = '';
	let password = '';
	let loading = false;
	let error = '';
	let success = false;

	async function handleRegister() {
		loading = true;
		error = '';
		success = false;

		const { data, error: signUpError } = await supabase.auth.signUp({
			email,
			password
		});

		if (signUpError) {
			error = signUpError.message;
			loading = false;
		} else {
			// Check if email confirmation is required
			if (data.user && !data.session) {
				success = true;
				error = 'Please check your email to confirm your account.';
			} else {
				// Auto-login successful, redirect to homepage
				goto('/');
			}
			loading = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
	<div class="max-w-md w-full space-y-8">
		<div>
			<h2 class="text-center text-3xl font-bold text-gray-900">Register</h2>
			<p class="mt-2 text-center text-sm text-gray-600">
				Already have an account?
				<a href="/login" class="font-medium text-indigo-600 hover:text-indigo-500">Login</a>
			</p>
		</div>

		<form class="mt-8 space-y-6" on:submit|preventDefault={handleRegister}>
			<div class="space-y-4">
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700">Email</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						required
						class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700"
						>Password (min 6 characters)</label
					>
					<input
						id="password"
						type="password"
						bind:value={password}
						required
						minlength="6"
						class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
					/>
				</div>
			</div>

			{#if error}
				<div class="text-sm" class:text-red-600={!success} class:text-green-600={success}>
					{error}
				</div>
			{/if}

			<button
				type="submit"
				disabled={loading}
				class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
			>
				{loading ? 'Creating account...' : 'Register'}
			</button>

			<div class="text-center">
				<a href="/" class="text-sm text-gray-600 hover:text-gray-900">← Back to home</a>
			</div>
		</form>
	</div>
</div>
