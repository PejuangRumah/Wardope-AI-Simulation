import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// PUT - Update prompt (creates new version)
export const PUT: RequestHandler = async ({ params, request, locals: { supabase, getSession } }) => {
	try {
		// Get authenticated user
		const session = await getSession();
		if (!session?.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = session.user.id;
		const { id } = params;
		const { name, description, content, template_variables, is_active, metadata, tags, change_summary } =
			await request.json();

		// Validation
		if (!name || name.trim().length === 0) {
			return json({ error: 'Prompt name is required' }, { status: 400 });
		}

		if (!content || content.trim().length === 0) {
			return json({ error: 'Prompt content is required' }, { status: 400 });
		}

		if (content.trim().length > 10000) {
			return json({ error: 'Prompt content too long (max 10000 characters)' }, { status: 400 });
		}

		// Get existing prompt to check ownership and get current version
		const { data: existingPrompt, error: fetchError } = await supabase
			.from('prompts')
			.select('*')
			.eq('id', id)
			.eq('user_id', userId)
			.single();

		if (fetchError || !existingPrompt) {
			return json({ error: 'Prompt not found' }, { status: 404 });
		}

		// If activating this prompt, deactivate others of the same type
		if (is_active && !existingPrompt.is_active) {
			const { error: deactivateError } = await supabase
				.from('prompts')
				.update({ is_active: false, updated_at: new Date().toISOString() })
				.eq('user_id', userId)
				.eq('type', existingPrompt.type)
				.eq('is_active', true)
				.neq('id', id);

			if (deactivateError) {
				console.error('Error deactivating other prompts:', deactivateError);
			}
		}

		const newVersion = existingPrompt.version + 1;

		// Create version entry if content changed
		if (content.trim() !== existingPrompt.content.trim()) {
			const { error: versionError } = await supabase.from('prompt_versions').insert({
				prompt_id: id,
				version: newVersion,
				content: content.trim(),
				template_variables: template_variables || existingPrompt.template_variables || [],
				metadata: metadata || {},
				change_summary: change_summary || 'Prompt content updated',
				created_by: userId
			});

			if (versionError) {
				console.error('Error creating version entry:', versionError);
				// Continue anyway, versioning is optional
			}
		}

		// Update main prompts table
		const { data, error } = await supabase
			.from('prompts')
			.update({
				name: name.trim(),
				description: description?.trim() || null,
				content: content.trim(),
				template_variables: template_variables || existingPrompt.template_variables || [],
				version: content.trim() !== existingPrompt.content.trim() ? newVersion : existingPrompt.version,
				is_active: is_active !== undefined ? is_active : existingPrompt.is_active,
				metadata: metadata || existingPrompt.metadata || {},
				tags: tags || existingPrompt.tags || [],
				updated_at: new Date().toISOString()
			})
			.eq('id', id)
			.eq('user_id', userId)
			.select()
			.single();

		if (error) {
			// Handle unique constraint violation
			if (error.code === '23505') {
				return json(
					{
						error: `An active ${existingPrompt.type} prompt already exists. Please deactivate it first.`
					},
					{ status: 409 }
				);
			}
			// Handle not found
			if (error.code === 'PGRST116') {
				return json({ error: 'Prompt not found' }, { status: 404 });
			}
			throw error;
		}

		return json({ prompt: data });
	} catch (error) {
		console.error('Error updating prompt:', error);
		return json({ error: 'Failed to update prompt' }, { status: 500 });
	}
};

// DELETE - Delete prompt
export const DELETE: RequestHandler = async ({ params, locals: { supabase, getSession } }) => {
	try {
		// Get authenticated user
		const session = await getSession();
		if (!session?.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = session.user.id;
		const { id } = params;

		// Check if this is the last active prompt of its type
		const { data: existingPrompt, error: fetchError } = await supabase
			.from('prompts')
			.select('type, is_active')
			.eq('id', id)
			.eq('user_id', userId)
			.single();

		if (fetchError || !existingPrompt) {
			return json({ error: 'Prompt not found' }, { status: 404 });
		}

		// If this is an active prompt, check if there are others
		if (existingPrompt.is_active) {
			const { data: otherPrompts, error: countError } = await supabase
				.from('prompts')
				.select('id')
				.eq('user_id', userId)
				.eq('type', existingPrompt.type)
				.neq('id', id);

			if (countError) {
				console.error('Error counting other prompts:', countError);
			}

			// Warn if deleting the last active prompt (but allow it)
			if (!otherPrompts || otherPrompts.length === 0) {
				console.warn(`User ${userId} is deleting their last ${existingPrompt.type} prompt`);
			}
		}

		// Delete prompt (CASCADE will delete versions and usage logs)
		const { error } = await supabase.from('prompts').delete().eq('id', id).eq('user_id', userId);

		if (error) {
			throw error;
		}

		return json({ success: true, message: 'Prompt deleted successfully' });
	} catch (error) {
		console.error('Error deleting prompt:', error);
		return json({ error: 'Failed to delete prompt' }, { status: 500 });
	}
};
