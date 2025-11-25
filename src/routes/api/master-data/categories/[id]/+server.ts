import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// PUT - Update category
export const PUT: RequestHandler = async ({ params, request, locals: { supabase } }) => {
	try {
		const { id } = params;
		const { name, display_order } = await request.json();

		// Validation
		if (!name || name.trim().length === 0) {
			return json({ error: 'Category name is required' }, { status: 400 });
		}

		if (name.trim().length > 100) {
			return json({ error: 'Category name too long (max 100 characters)' }, { status: 400 });
		}

		// Update
		const { data, error } = await supabase
			.from('categories')
			.update({
				name: name.trim(),
				display_order,
				updated_at: new Date().toISOString()
			})
			.eq('id', id)
			.select()
			.single();

		if (error) {
			if (error.code === '23505') {
				return json({ error: 'Category name already exists' }, { status: 409 });
			}
			if (error.code === 'PGRST116') {
				return json({ error: 'Category not found' }, { status: 404 });
			}
			throw error;
		}

		return json({ category: data });
	} catch (error) {
		console.error('Error updating category:', error);
		return json({ error: 'Failed to update category' }, { status: 500 });
	}
};

// DELETE - Delete category
export const DELETE: RequestHandler = async ({ params, locals: { supabase } }) => {
	try {
		const { id } = params;

		const { error } = await supabase.from('categories').delete().eq('id', id);

		if (error) {
			// Foreign key constraint violation (23503)
			if (error.code === '23503') {
				return json(
					{ error: 'Cannot delete category with existing subcategories' },
					{ status: 409 }
				);
			}
			throw error;
		}

		return json({ success: true, message: 'Category deleted successfully' });
	} catch (error) {
		console.error('Error deleting category:', error);
		return json({ error: 'Failed to delete category' }, { status: 500 });
	}
};
