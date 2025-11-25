import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data: colors, error } = await supabase
		.from('colors')
		.select('*')
		.order('display_order', { ascending: true });

	if (error) {
		console.error('Error loading colors:', error);
		return { colors: [] };
	}

	return { colors };
};
