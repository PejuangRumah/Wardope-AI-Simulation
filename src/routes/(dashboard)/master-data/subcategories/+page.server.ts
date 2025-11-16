import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Load subcategories with category names (JOIN)
	const { data: subcategories, error: subcategoriesError } = await supabase
		.from('subcategories')
		.select('*, categories(name)')
		.order('display_order', { ascending: true });

	if (subcategoriesError) {
		console.error('Error loading subcategories:', subcategoriesError);
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
		subcategories: subcategories || [],
		categories: categories || []
	};
};
