import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, parent }) => {
	// Get master data from parent layout (includes categories)
	const { masterData } = await parent();

	// Load fits with category names (JOIN)
	const { data: fits, error: fitsError } = await supabase
		.from('fits')
		.select('*, categories(name)')
		.order('display_order', { ascending: true });

	if (fitsError) {
		console.error('Error loading fits:', fitsError);
	}

	return {
		fits: fits || [],
		categories: masterData.categories // Use from layout
	};
};
