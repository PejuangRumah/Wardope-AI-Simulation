import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { getSession } }) => {

	// Get validated session from locals (already validated in hooks.server.ts)
	const session = await getSession();

	// If not authenticated, redirect to login
	if (!session) {
		throw redirect(303, '/login');
	}

	// Return user session data
	return {
		session
	};
};
