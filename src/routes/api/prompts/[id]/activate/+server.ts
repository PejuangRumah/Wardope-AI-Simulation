import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Activate a prompt (deactivates others of the same type)
 * POST /api/prompts/[id]/activate
 */
export const POST: RequestHandler = async ({ params, locals: { supabase, getSession } }) => {
	try {
		// Get authenticated user
		const session = await getSession();
		if (!session?.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = session.user.id;
		const { id } = params;

		// Get the prompt to activate
		const { data: promptToActivate, error: fetchError } = await supabase
			.from('prompts')
			.select('type, is_active')
			.eq('id', id)
			.eq('user_id', userId)
			.single();

		if (fetchError || !promptToActivate) {
			return json({ error: 'Prompt not found' }, { status: 404 });
		}

		// If already active, return success
		if (promptToActivate.is_active) {
			return json({
				success: true,
				message: 'Prompt is already active',
				already_active: true
			});
		}

		// Deactivate all other prompts of the same type for this user
		const { error: deactivateError } = await supabase
			.from('prompts')
			.update({ is_active: false, updated_at: new Date().toISOString() })
			.eq('user_id', userId)
			.eq('type', promptToActivate.type)
			.eq('is_active', true);

		if (deactivateError) {
			console.error('Error deactivating other prompts:', deactivateError);
			return json({ error: 'Failed to deactivate other prompts' }, { status: 500 });
		}

		// Activate the target prompt
		const { data, error: activateError } = await supabase
			.from('prompts')
			.update({ is_active: true, updated_at: new Date().toISOString() })
			.eq('id', id)
			.eq('user_id', userId)
			.select()
			.single();

		if (activateError) {
			console.error('Error activating prompt:', activateError);
			return json({ error: 'Failed to activate prompt' }, { status: 500 });
		}

		return json({
			success: true,
			message: 'Prompt activated successfully',
			prompt: data
		});
	} catch (error) {
		console.error('Error activating prompt:', error);
		return json({ error: 'Failed to activate prompt' }, { status: 500 });
	}
};
