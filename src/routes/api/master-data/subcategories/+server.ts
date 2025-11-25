import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET - List all subcategories with category names
export const GET: RequestHandler = async ({ locals: { supabase } }) => {
	try {
		const { data, error } = await supabase
			.from('subcategories')
			.select('*, categories(name)')
			.order('display_order', { ascending: true });

		if (error) throw error;

		return json({ subcategories: data });
	} catch (error) {
		console.error('Error fetching subcategories:', error);
		return json({ error: 'Failed to fetch subcategories' }, { status: 500 });
	}
};

// POST - Create new subcategory
export const POST: RequestHandler = async ({ request, locals: { supabase } }) => {
	try {
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

		// Insert
		const { data, error } = await supabase
			.from('subcategories')
			.insert({
				name: name.trim(),
				category_id,
				display_order: display_order || 0
			})
			.select()
			.single();

		if (error) {
			// Handle unique constraint violation (23505 = duplicate key)
			if (error.code === '23505') {
				return json(
					{ error: 'Subcategory name already exists for this category' },
					{ status: 409 }
				);
			}
			// Handle foreign key constraint violation (23503 = invalid reference)
			if (error.code === '23503') {
				return json({ error: 'Invalid category selected' }, { status: 400 });
			}
			throw error;
		}

		return json({ subcategory: data }, { status: 201 });
	} catch (error) {
		console.error('Error creating subcategory:', error);
		return json({ error: 'Failed to create subcategory' }, { status: 500 });
	}
};
