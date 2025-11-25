import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET - List all categories
export const GET: RequestHandler = async ({ locals: { supabase } }) => {
	try {
		const { data, error } = await supabase
			.from('categories')
			.select('*')
			.order('display_order', { ascending: true });

		if (error) throw error;

		return json({ categories: data });
	} catch (error) {
		console.error('Error fetching categories:', error);
		return json({ error: 'Failed to fetch categories' }, { status: 500 });
	}
};

// POST - Create new category
export const POST: RequestHandler = async ({ request, locals: { supabase } }) => {
	try {
		const { name, display_order } = await request.json();

		// Validation
		if (!name || name.trim().length === 0) {
			return json({ error: 'Category name is required' }, { status: 400 });
		}

		if (name.trim().length > 100) {
			return json({ error: 'Category name too long (max 100 characters)' }, { status: 400 });
		}

		// Insert
		const { data, error } = await supabase
			.from('categories')
			.insert({
				name: name.trim(),
				display_order: display_order || 0
			})
			.select()
			.single();

		if (error) {
			// Handle unique constraint violation (23505 = duplicate key)
			if (error.code === '23505') {
				return json({ error: 'Category name already exists' }, { status: 409 });
			}
			throw error;
		}

		return json({ category: data }, { status: 201 });
	} catch (error) {
		console.error('Error creating category:', error);
		return json({ error: 'Failed to create category' }, { status: 500 });
	}
};
