import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, parent }) => {
	// Get session from parent layout (already validated)
	const { session } = await parent();
	const userId = session.user.id;

	// Load active prompts for each type (one per type)
	const { data: prompts, error: promptsError } = await supabase
		.from('prompts')
		.select('*')
		.eq('user_id', userId)
		.eq('is_active', true); // Only active prompts

	if (promptsError) {
		console.error('Error loading prompts:', promptsError);
	}

	// Structure: One prompt per type (or null if not configured)
	const promptsMap = {
		item_analysis: (prompts || []).find((p) => p.type === 'item_analysis') || null,
		item_improvement: (prompts || []).find((p) => p.type === 'item_improvement') || null,
		outfit_recommendation:
			(prompts || []).find((p) => p.type === 'outfit_recommendation') || null
	};

	const hasAnyPrompts = Object.values(promptsMap).some((p) => p !== null);

	return {
		prompts: promptsMap,
		hasPrompts: hasAnyPrompts
	};
};
