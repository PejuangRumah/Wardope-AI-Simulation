import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// PUT - Update subcategory
export const PUT: RequestHandler = async ({ params, request, locals: { supabase } }) => {
	try {
		const { id } = params;
		const { name, category_id, display_order } = await request.json();

		// Validation
		if (!name || name.trim().length === 0) {
			return json({ error: 'Subcategory name is required' }, { status: 400 });
		}

		if (name.trim().length > 100) {
			return json({ error: 'Subcategory name too long (max 100 characters)' }, { status: 400 });
		}

		if (!category_id) {
			return json({ error: 'Category is required' }, { status: 400 });
		}

		// Update
		const { data, error } = await supabase
			.from('subcategories')
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
				return json(
					{ error: 'Subcategory name already exists for this category' },
					{ status: 409 }
				);
			}
			// Handle foreign key constraint violation
			if (error.code === '23503') {
				return json({ error: 'Invalid category selected' }, { status: 400 });
			}
			// Handle not found
			if (error.code === 'PGRST116') {
				return json({ error: 'Subcategory not found' }, { status: 404 });
			}
			throw error;
		}

		return json({ subcategory: data });
	} catch (error) {
		console.error('Error updating subcategory:', error);
		return json({ error: 'Failed to update subcategory' }, { status: 500 });
	}
};

// DELETE - Delete subcategory
export const DELETE: RequestHandler = async ({ params, locals: { supabase } }) => {
	try {
		const { id } = params;

		const { error } = await supabase.from('subcategories').delete().eq('id', id);

		if (error) {
			// Foreign key constraint violation (if subcategories were used elsewhere)
			if (error.code === '23503') {
				return json(
					{ error: 'Cannot delete subcategory that is being used in wardrobe items' },
					{ status: 409 }
				);
			}
			throw error;
		}

		return json({ success: true, message: 'Subcategory deleted successfully' });
	} catch (error) {
		console.error('Error deleting subcategory:', error);
		return json({ error: 'Failed to delete subcategory' }, { status: 500 });
	}
};
