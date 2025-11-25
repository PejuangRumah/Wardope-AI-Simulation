import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals: { supabase, getSession } }) => {
	// Check authentication
	const session = await getSession();
	if (!session?.user) {
		throw error(401, 'Unauthorized');
	}

	const promptId = params.id;
	const targetVersion = parseInt(params.version, 10);
	const userId = session.user.id;

	if (isNaN(targetVersion) || targetVersion < 1) {
		throw error(400, 'Invalid version number');
	}

	// Verify user owns this prompt
	const { data: prompt, error: promptError } = await supabase
		.from('prompts')
		.select('id, user_id, version')
		.eq('id', promptId)
		.eq('user_id', userId)
		.single();

	if (promptError || !prompt) {
		throw error(404, 'Prompt not found');
	}

	// Check if target version exists
	const { data: versionData, error: versionError } = await supabase
		.from('prompt_versions')
		.select('version, content, template_variables, metadata')
		.eq('prompt_id', promptId)
		.eq('version', targetVersion)
		.single();

	if (versionError || !versionData) {
		throw error(404, 'Version not found');
	}

	// Check if already at this version
	if (prompt.version === targetVersion) {
		return json({
			success: true,
			message: 'Already at this version',
			already_at_version: true,
			version: targetVersion
		});
	}

	// Use the database function to rollback
	const { data: rollbackResult, error: rollbackError } = await supabase.rpc(
		'rollback_prompt_to_version',
		{
			p_prompt_id: promptId,
			p_target_version: targetVersion
		}
	);

	if (rollbackError) {
		console.error('Error rolling back prompt:', rollbackError);
		throw error(500, 'Failed to restore version');
	}

	// Fetch updated prompt to return
	const { data: updatedPrompt, error: updatedError } = await supabase
		.from('prompts')
		.select('*')
		.eq('id', promptId)
		.single();

	if (updatedError) {
		console.error('Error fetching updated prompt:', updatedError);
		throw error(500, 'Failed to fetch updated prompt');
	}

	return json({
		success: true,
		message: `Restored to version ${targetVersion}`,
		prompt: updatedPrompt
	});
};
