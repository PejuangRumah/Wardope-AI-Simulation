import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data: occasions, error } = await supabase
		.from('occasions')
		.select('*')
		.order('display_order', { ascending: true });

	if (error) {
		console.error('Error loading occasions:', error);
		return { occasions: [] };
	}

	return { occasions };
};
