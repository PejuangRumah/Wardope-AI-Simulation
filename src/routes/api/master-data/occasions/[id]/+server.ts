import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// PUT - Update occasion
export const PUT: RequestHandler = async ({ params, request, locals: { supabase } }) => {
	try {
		const { id } = params;
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

		// Update
		const { data, error } = await supabase
			.from('occasions')
			.update({
				name: name.trim(),
				description: description?.trim() || null,
				display_order,
				updated_at: new Date().toISOString()
			})
			.eq('id', id)
			.select()
			.single();

		if (error) {
			if (error.code === '23505') {
				return json({ error: 'Occasion name already exists' }, { status: 409 });
			}
			if (error.code === 'PGRST116') {
				return json({ error: 'Occasion not found' }, { status: 404 });
			}
			throw error;
		}

		return json({ occasion: data });
	} catch (error) {
		console.error('Error updating occasion:', error);
		return json({ error: 'Failed to update occasion' }, { status: 500 });
	}
};

// DELETE - Delete occasion
export const DELETE: RequestHandler = async ({ params, locals: { supabase } }) => {
	try {
		const { id } = params;

		const { error } = await supabase.from('occasions').delete().eq('id', id);

		if (error) {
			throw error;
		}

		return json({ success: true, message: 'Occasion deleted successfully' });
	} catch (error) {
		console.error('Error deleting occasion:', error);
		return json({ error: 'Failed to delete occasion' }, { status: 500 });
	}
};
