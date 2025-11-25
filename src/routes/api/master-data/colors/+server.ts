import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET - List all colors
export const GET: RequestHandler = async ({ locals: { supabase } }) => {
	try {
		const { data, error } = await supabase
			.from('colors')
			.select('*')
			.order('display_order', { ascending: true });

		if (error) throw error;

		return json({ colors: data });
	} catch (error) {
		console.error('Error fetching colors:', error);
		return json({ error: 'Failed to fetch colors' }, { status: 500 });
	}
};

// POST - Create new color
export const POST: RequestHandler = async ({ request, locals: { supabase } }) => {
	try {
		const { name, hex_code, display_order } = await request.json();

		// Validation
		if (!name || name.trim().length === 0) {
			return json({ error: 'Color name is required' }, { status: 400 });
		}

		if (name.trim().length > 100) {
			return json({ error: 'Color name too long (max 100 characters)' }, { status: 400 });
		}

		// Validate hex_code format if provided
		if (hex_code && !/^#[0-9A-Fa-f]{6}$/.test(hex_code)) {
			return json(
				{ error: 'Invalid hex code format. Use format: #RRGGBB (e.g., #FF5733)' },
				{ status: 400 }
			);
		}

		// Insert
		const { data, error } = await supabase
			.from('colors')
			.insert({
				name: name.trim(),
				hex_code: hex_code?.trim() || null,
				display_order: display_order || 0
			})
			.select()
			.single();

		if (error) {
			// Handle unique constraint violation
			if (error.code === '23505') {
				return json({ error: 'Color name already exists' }, { status: 409 });
			}
			throw error;
		}

		return json({ color: data }, { status: 201 });
	} catch (error) {
		console.error('Error creating color:', error);
		return json({ error: 'Failed to create color' }, { status: 500 });
	}
};
