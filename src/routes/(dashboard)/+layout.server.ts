import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { getSession, supabase } }) => {
	// Get validated session from locals (already validated in hooks.server.ts)
	const session = await getSession();

	// If not authenticated, redirect to login
	if (!session) {
		throw redirect(303, '/login');
	}

	// Load master data once at layout level (cached for all child pages)
	const [categoriesRes, colorsRes, fitsRes, occasionsRes, subcategoriesRes] = await Promise.all([
		supabase.from('categories').select('*').order('display_order'),
		supabase.from('colors').select('*').order('display_order'),
		supabase.from('fits').select('*').order('display_order'),
		supabase.from('occasions').select('*').order('display_order'),
		supabase.from('subcategories').select('*, category:categories(id, name)').order('display_order')
	]);

	const masterData = {
		categories: categoriesRes.data || [],
		colors: colorsRes.data || [],
		fits: fitsRes.data || [],
		occasions: occasionsRes.data || [],
		subcategories: subcategoriesRes.data || []
	};

	// Return user session data and master data
	return {
		session,
		masterData
	};
};
