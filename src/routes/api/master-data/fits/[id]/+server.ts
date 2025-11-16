import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// PUT - Update fit
export const PUT: RequestHandler = async ({ params, request, locals: { supabase } }) => {
	try {
		const { id } = params;
		const { name, category_id, display_order } = await request.json();

		// Validation
		if (!name || name.trim().length === 0) {
			return json({ error: 'Fit name is required' }, { status: 400 });
		}

		if (name.trim().length > 100) {
			return json({ error: 'Fit name too long (max 100 characters)' }, { status: 400 });
		}

		if (!category_id) {
			return json({ error: 'Category is required' }, { status: 400 });
		}

		// Update
		const { data, error } = await supabase
			.from('fits')
			.update({
				name: name.trim(),
				category_id,
				display_order,
				updated_at: new Date().toISOString()
			})
			.eq('id', id)
			.select()
			.single();

		if (error) {
			// Handle unique constraint violation
			if (error.code === '23505') {
				return json({ error: 'Fit name already exists for this category' }, { status: 409 });
			}
			// Handle foreign key constraint violation
			if (error.code === '23503') {
				return json({ error: 'Invalid category selected' }, { status: 400 });
			}
			// Handle not found
			if (error.code === 'PGRST116') {
				return json({ error: 'Fit not found' }, { status: 404 });
			}
			throw error;
		}

		return json({ fit: data });
	} catch (error) {
		console.error('Error updating fit:', error);
		return json({ error: 'Failed to update fit' }, { status: 500 });
	}
};

// DELETE - Delete fit
export const DELETE: RequestHandler = async ({ params, locals: { supabase } }) => {
	try {
		const { id } = params;

		const { error } = await supabase.from('fits').delete().eq('id', id);

		if (error) {
			// Foreign key constraint violation (if fits were used elsewhere)
			if (error.code === '23503') {
				return json(
					{ error: 'Cannot delete fit that is being used in wardrobe items' },
					{ status: 409 }
				);
			}
			throw error;
		}

		return json({ success: true, message: 'Fit deleted successfully' });
	} catch (error) {
		console.error('Error deleting fit:', error);
		return json({ error: 'Failed to delete fit' }, { status: 500 });
	}
};
