import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data: categories, error } = await supabase
		.from('categories')
		.select('*')
		.order('display_order', { ascending: true });

	if (error) {
		console.error('Error loading categories:', error);
		return { categories: [] };
	}

	return { categories };
};
