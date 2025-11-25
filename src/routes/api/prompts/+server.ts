import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET - List all user's prompts
export const GET: RequestHandler = async ({ locals: { supabase, getSession } }) => {
	try {
		// Get authenticated user
		const session = await getSession();
		if (!session?.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = session.user.id;

		// Fetch all prompts for this user, ordered by type and creation date
		const { data, error } = await supabase
			.from('prompts')
			.select('*')
			.eq('user_id', userId)
			.order('type', { ascending: true })
			.order('created_at', { ascending: false });

		if (error) throw error;

		return json({ prompts: data || [] });
	} catch (error) {
		console.error('Error fetching prompts:', error);
		return json({ error: 'Failed to fetch prompts' }, { status: 500 });
	}
};

// POST - Create new prompt
export const POST: RequestHandler = async ({ request, locals: { supabase, getSession } }) => {
	try {
		// Get authenticated user
		const session = await getSession();
		if (!session?.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = session.user.id;
		const {
			name,
			description,
			type,
			content,
			template_variables,
			is_active,
			metadata,
			tags
		} = await request.json();

		// Validation
		if (!name || name.trim().length === 0) {
			return json({ error: 'Prompt name is required' }, { status: 400 });
		}

		if (!type) {
			return json({ error: 'Prompt type is required' }, { status: 400 });
		}

		if (!['item_analysis', 'item_improvement', 'outfit_recommendation'].includes(type)) {
			return json(
				{
					error:
						'Invalid prompt type. Must be: item_analysis, item_improvement, or outfit_recommendation'
				},
				{ status: 400 }
			);
		}

		if (!content || content.trim().length === 0) {
			return json({ error: 'Prompt content is required' }, { status: 400 });
		}

		if (content.trim().length > 10000) {
			return json({ error: 'Prompt content too long (max 10000 characters)' }, { status: 400 });
		}

		// If is_active is true, deactivate other prompts of the same type
		if (is_active) {
			const { error: deactivateError } = await supabase
				.from('prompts')
				.update({ is_active: false, updated_at: new Date().toISOString() })
				.eq('user_id', userId)
				.eq('type', type)
				.eq('is_active', true);

			if (deactivateError) {
				console.error('Error deactivating other prompts:', deactivateError);
				// Continue anyway, unique constraint will handle it
			}
		}

		// Insert new prompt
		const { data, error } = await supabase
			.from('prompts')
			.insert({
				user_id: userId,
				name: name.trim(),
				description: description?.trim() || null,
				type,
				content: content.trim(),
				template_variables: template_variables || [],
				version: 1,
				is_active: is_active !== undefined ? is_active : false,
				usage_count: 0,
				metadata: metadata || {},
				tags: tags || []
			})
			.select()
			.single();

		if (error) {
			// Handle unique constraint violation (only one active prompt per type)
			if (error.code === '23505') {
				return json(
					{
						error: `An active ${type} prompt already exists. Please deactivate it first or create this prompt as inactive.`
					},
					{ status: 409 }
				);
			}
			throw error;
		}

		return json({ prompt: data }, { status: 201 });
	} catch (error) {
		console.error('Error creating prompt:', error);
		return json({ error: 'Failed to create prompt' }, { status: 500 });
	}
};
