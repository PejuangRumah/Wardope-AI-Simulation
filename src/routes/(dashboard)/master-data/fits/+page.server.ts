import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Load fits with category names (JOIN)
	const { data: fits, error: fitsError } = await supabase
		.from('fits')
		.select('*, categories(name)')
		.order('display_order', { ascending: true });

	if (fitsError) {
		console.error('Error loading fits:', fitsError);
	}

	// Load all categories for dropdown selector
	const { data: categories, error: categoriesError } = await supabase
		.from('categories')
		.select('*')
		.order('display_order', { ascending: true });

	if (categoriesError) {
		console.error('Error loading categories:', categoriesError);
	}

	return {
		fits: fits || [],
		categories: categories || []
	};
};
