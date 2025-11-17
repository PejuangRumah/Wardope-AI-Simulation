import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
	// Check authentication
	const session = await getSession();
	if (!session?.user) {
		throw redirect(303, '/auth/login');
	}

	const userId = session.user.id;

	// Load all prompts for this user
	const { data: prompts, error: promptsError } = await supabase
		.from('prompts')
		.select('*')
		.eq('user_id', userId)
		.order('type', { ascending: true })
		.order('is_active', { ascending: false }) // Active prompts first
		.order('created_at', { ascending: false });

	if (promptsError) {
		console.error('Error loading prompts:', promptsError);
	}

	// Group prompts by type for easier rendering
	const promptsByType = {
		item_analysis: (prompts || []).filter((p) => p.type === 'item_analysis'),
		item_improvement: (prompts || []).filter((p) => p.type === 'item_improvement'),
		outfit_recommendation: (prompts || []).filter((p) => p.type === 'outfit_recommendation')
	};

	return {
		prompts: prompts || [],
		promptsByType,
		hasPrompts: (prompts || []).length > 0
	};
};
