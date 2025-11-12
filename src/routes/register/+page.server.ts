import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { getSession } }) => {

	// Get validated session from locals
	const session = await getSession();

	// If authenticated, redirect to dashboard
	if (session) {
		throw redirect(303, '/wardrobe');
	}

	// If not authenticated, allow access to register page
	return {};
};
