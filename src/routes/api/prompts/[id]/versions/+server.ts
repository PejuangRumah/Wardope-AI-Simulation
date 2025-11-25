import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals: { supabase, getSession } }) => {
	// Check authentication
	const session = await getSession();
	if (!session?.user) {
		throw error(401, 'Unauthorized');
	}

	const promptId = params.id;
	const userId = session.user.id;

	// Verify user owns this prompt
	const { data: prompt, error: promptError } = await supabase
		.from('prompts')
		.select('id, user_id, name, type')
		.eq('id', promptId)
		.eq('user_id', userId)
		.single();

	if (promptError || !prompt) {
		throw error(404, 'Prompt not found');
	}

	// Fetch all versions for this prompt from prompt_versions table
	const { data: versions, error: versionsError } = await supabase
		.from('prompt_versions')
		.select(
			`
			id,
			version,
			content,
			template_variables,
			metadata,
			change_summary,
			created_at,
			created_by
		`
		)
		.eq('prompt_id', promptId)
		.order('version', { ascending: false }); // Newest first

	if (versionsError) {
		console.error('Error fetching versions:', versionsError);
		throw error(500, 'Failed to fetch version history');
	}

	// Also fetch the current active version from prompts table
	const { data: currentPrompt, error: currentError } = await supabase
		.from('prompts')
		.select('version, content, template_variables, metadata, updated_at')
		.eq('id', promptId)
		.single();

	if (currentError) {
		console.error('Error fetching current prompt:', currentError);
		throw error(500, 'Failed to fetch current version');
	}

	return json({
		prompt: {
			id: prompt.id,
			name: prompt.name,
			type: prompt.type,
			current_version: currentPrompt.version
		},
		versions: versions || [],
		current: {
			version: currentPrompt.version,
			content: currentPrompt.content,
			template_variables: currentPrompt.template_variables,
			metadata: currentPrompt.metadata,
			updated_at: currentPrompt.updated_at
		}
	});
};
