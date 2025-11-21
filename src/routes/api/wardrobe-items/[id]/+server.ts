// API Endpoint - Individual Wardrobe Item (GET, PUT, DELETE)
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getWardrobeItem, updateWardrobeItem, deleteWardrobeItem } from '$lib/services/wardrobe';
import type { WardrobeItemUpdate } from '$lib/types/wardrobe';

/**
 * GET /api/wardrobe-items/[id]
 * Fetch a single wardrobe item by ID
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		// Check authentication
		const session = await locals.getSession();
		if (!session?.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = session.user.id;
		const itemId = params.id;

		if (!itemId) {
			return json({ error: 'Item ID is required' }, { status: 400 });
		}

		// Fetch item
		const item = await getWardrobeItem(itemId, userId, locals.supabase);

		return json({ item }, { status: 200 });
	} catch (error) {
		console.error('Error fetching wardrobe item:', error);

		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error occurred';

		// Check if it's a "not found" error
		if (errorMessage.includes('not found') || errorMessage.includes('access denied')) {
			return json({ error: errorMessage }, { status: 404 });
		}

		return json(
			{ error: `Failed to fetch wardrobe item: ${errorMessage}` },
			{ status: 500 }
		);
	}
};

/**
 * PUT /api/wardrobe-items/[id]
 * Update a wardrobe item
 */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		// Check authentication
		const session = await locals.getSession();
		if (!session?.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = session.user.id;
		const itemId = params.id;

		if (!itemId) {
			return json({ error: 'Item ID is required' }, { status: 400 });
		}

		// Parse request body
		const body: WardrobeItemUpdate = await request.json();

		// Validate if category is being updated
		if (body.category) {
			const validCategories = ['Top', 'Bottom', 'Footwear', 'Outerwear', 'Accessory'];
			if (!validCategories.includes(body.category)) {
				return json(
					{
						error: `Invalid category. Must be one of: ${validCategories.join(', ')}`
					},
					{ status: 400 }
				);
			}
		}

		// Validate colors if provided (now an array)
		if (body.colors !== undefined) {
			if (!Array.isArray(body.colors) || body.colors.length === 0) {
				return json({ error: 'Colors must be a non-empty array' }, { status: 400 });
			}

			if (body.colors.some(color => !color || color.trim().length === 0)) {
				return json({ error: 'All colors must be non-empty strings' }, { status: 400 });
			}
		}

		// Validate occasions if provided (optional array)
		if (body.occasions !== undefined) {
			if (!Array.isArray(body.occasions)) {
				return json({ error: 'Occasions must be an array' }, { status: 400 });
			}

			if (body.occasions.some(occasion => !occasion || occasion.trim().length === 0)) {
				return json({ error: 'All occasions must be non-empty strings' }, { status: 400 });
			}
		}

		// Update item
		const item = await updateWardrobeItem(itemId, body, userId, locals.supabase);

		return json({ item }, { status: 200 });
	} catch (error) {
		console.error('Error updating wardrobe item:', error);

		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error occurred';

		// Check if it's a "not found" error
		if (errorMessage.includes('not found') || errorMessage.includes('access denied')) {
			return json({ error: errorMessage }, { status: 404 });
		}

		return json(
			{ error: `Failed to update wardrobe item: ${errorMessage}` },
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/wardrobe-items/[id]
 * Delete a wardrobe item
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		// Check authentication
		const session = await locals.getSession();
		if (!session?.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = session.user.id;
		const itemId = params.id;

		if (!itemId) {
			return json({ error: 'Item ID is required' }, { status: 400 });
		}

		// Delete item
		await deleteWardrobeItem(itemId, userId, locals.supabase);

		return json({ success: true, message: 'Wardrobe item deleted successfully' }, { status: 200 });
	} catch (error) {
		console.error('Error deleting wardrobe item:', error);

		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error occurred';

		// Check if it's a "not found" error
		if (errorMessage.includes('not found') || errorMessage.includes('access denied')) {
			return json({ error: errorMessage }, { status: 404 });
		}

		return json(
			{ error: `Failed to delete wardrobe item: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
