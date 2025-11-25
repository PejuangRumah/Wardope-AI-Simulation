import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// PUT - Update color
export const PUT: RequestHandler = async ({ params, request, locals: { supabase } }) => {
	try {
		const { id } = params;
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

		// Update
		const { data, error } = await supabase
			.from('colors')
			.update({
				name: name.trim(),
				hex_code: hex_code?.trim() || null,
				display_order,
				updated_at: new Date().toISOString()
			})
			.eq('id', id)
			.select()
			.single();

		if (error) {
			if (error.code === '23505') {
				return json({ error: 'Color name already exists' }, { status: 409 });
			}
			if (error.code === 'PGRST116') {
				return json({ error: 'Color not found' }, { status: 404 });
			}
			throw error;
		}

		return json({ color: data });
	} catch (error) {
		console.error('Error updating color:', error);
		return json({ error: 'Failed to update color' }, { status: 500 });
	}
};

// DELETE - Delete color
export const DELETE: RequestHandler = async ({ params, locals: { supabase } }) => {
	try {
		const { id } = params;

		const { error } = await supabase.from('colors').delete().eq('id', id);

		if (error) {
			throw error;
		}

		return json({ success: true, message: 'Color deleted successfully' });
	} catch (error) {
		console.error('Error deleting color:', error);
		return json({ error: 'Failed to delete color' }, { status: 500 });
	}
};
