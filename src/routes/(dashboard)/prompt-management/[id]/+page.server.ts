import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals: { supabase }, parent }) => {
	// Get session from parent layout (already validated)
	const { session } = await parent();
	const userId = session.user.id;
	const promptId = params.id;

	// Fetch prompt and versions in parallel
	const [promptRes, versionsRes] = await Promise.all([
		supabase
			.from('prompts')
			.select('*')
			.eq('id', promptId)
			.eq('user_id', userId)
			.single(),
		supabase
			.from('prompt_versions')
			.select('*')
			.eq('prompt_id', promptId)
			.order('version', { ascending: false })
	]);

	if (promptRes.error || !promptRes.data) {
		throw error(404, 'Prompt not found');
	}

	if (versionsRes.error) {
		console.error('Error fetching versions:', versionsRes.error);
	}

	const prompt = promptRes.data;
	const versions = versionsRes.data || [];

	const typeLabels = {
		item_analysis: 'Item Analysis',
		item_improvement: 'Item Improvement',
		outfit_recommendation: 'Outfit Recommendation'
	};

	return {
		prompt,
		typeLabel: typeLabels[prompt.type as keyof typeof typeLabels],
		versions
	};
};
