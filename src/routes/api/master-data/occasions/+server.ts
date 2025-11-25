import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET - List all occasions
export const GET: RequestHandler = async ({ locals: { supabase } }) => {
	try {
		const { data, error } = await supabase
			.from('occasions')
			.select('*')
			.order('display_order', { ascending: true });

		if (error) throw error;

		return json({ occasions: data });
	} catch (error) {
		console.error('Error fetching occasions:', error);
		return json({ error: 'Failed to fetch occasions' }, { status: 500 });
	}
};

// POST - Create new occasion
export const POST: RequestHandler = async ({ request, locals: { supabase } }) => {
	try {
		const { name, description, display_order } = await request.json();

		// Validation
		if (!name || name.trim().length === 0) {
			return json({ error: 'Occasion name is required' }, { status: 400 });
		}

		if (name.trim().length > 100) {
			return json({ error: 'Occasion name too long (max 100 characters)' }, { status: 400 });
		}

		if (description && description.length > 500) {
			return json({ error: 'Description too long (max 500 characters)' }, { status: 400 });
		}

		// Insert
		const { data, error } = await supabase
			.from('occasions')
			.insert({
				name: name.trim(),
				description: description?.trim() || null,
				display_order: display_order || 0
			})
			.select()
			.single();

		if (error) {
			// Handle unique constraint violation
			if (error.code === '23505') {
				return json({ error: 'Occasion name already exists' }, { status: 409 });
			}
			throw error;
		}

		return json({ occasion: data }, { status: 201 });
	} catch (error) {
		console.error('Error creating occasion:', error);
		return json({ error: 'Failed to create occasion' }, { status: 500 });
	}
};
