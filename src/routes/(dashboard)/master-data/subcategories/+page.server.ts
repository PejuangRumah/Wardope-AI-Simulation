import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, parent }) => {
	// Get master data from parent layout (includes categories)
	const { masterData } = await parent();

	// Load subcategories with category names (JOIN)
	const { data: subcategories, error: subcategoriesError } = await supabase
		.from('subcategories')
		.select('*, categories(name)')
		.order('display_order', { ascending: true });

	if (subcategoriesError) {
		console.error('Error loading subcategories:', subcategoriesError);
	}

	return {
		subcategories: subcategories || [],
		categories: masterData.categories // Use from layout
	};
};
