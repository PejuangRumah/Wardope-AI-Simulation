import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals: { supabase, getSession } }) => {
	// Check authentication
	const session = await getSession();
	if (!session?.user) {
		throw redirect(303, '/auth/login');
	}

	const promptId = params.id;
	const userId = session.user.id;

	// Fetch prompt details
	const { data: prompt, error: promptError } = await supabase
		.from('prompts')
		.select('*')
		.eq('id', promptId)
		.eq('user_id', userId)
		.single();

	if (promptError || !prompt) {
		throw error(404, 'Prompt not found');
	}

	// Fetch all versions
	const { data: versions, error: versionsError } = await supabase
		.from('prompt_versions')
		.select('*')
		.eq('prompt_id', promptId)
		.order('version', { ascending: false }); // Newest first

	if (versionsError) {
		console.error('Error fetching versions:', versionsError);
	}

	const typeLabels = {
		item_analysis: 'Item Analysis',
		item_improvement: 'Item Improvement',
		outfit_recommendation: 'Outfit Recommendation'
	};

	return {
		prompt,
		typeLabel: typeLabels[prompt.type as keyof typeof typeLabels],
		versions: versions || []
	};
};
