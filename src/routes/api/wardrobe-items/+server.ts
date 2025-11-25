// API Endpoint - Wardrobe Items CRUD (GET list, POST create)
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createWardrobeItem, listWardrobeItems } from '$lib/services/wardrobe';
import type { WardrobeItemCreate } from '$lib/types/wardrobe';

/**
 * GET /api/wardrobe-items
 * List wardrobe items with optional filters and pagination
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		// Check authentication
		const session = await locals.getSession();
		if (!session?.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = session.user.id;

		// Parse query parameters
		const category = url.searchParams.get('category') || undefined;
		const color = url.searchParams.get('color') || undefined;
		const fit = url.searchParams.get('fit') || undefined;
		const occasion = url.searchParams.get('occasion') || undefined;
		const search = url.searchParams.get('search') || undefined;
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');

		// Validate pagination parameters
		if (page < 1 || limit < 1 || limit > 100) {
			return json(
				{ error: 'Invalid pagination parameters (page >= 1, 1 <= limit <= 100)' },
				{ status: 400 }
			);
		}

		// Fetch wardrobe items
		const result = await listWardrobeItems(
			userId,
			{ category, color, fit, occasion, search, page, limit },
			locals.supabase
		);

		return json(result, { status: 200 });
	} catch (error) {
		console.error('Error fetching wardrobe items:', error);

		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error occurred';

		return json(
			{ error: `Failed to fetch wardrobe items: ${errorMessage}` },
			{ status: 500 }
		);
	}
};

/**
 * POST /api/wardrobe-items
 * Create a new wardrobe item
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Check authentication
		const session = await locals.getSession();
		if (!session?.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = session.user.id;

		// Parse request body
		const body: WardrobeItemCreate = await request.json();

		// Validate required fields
		if (!body.originalImage) {
			return json({ error: 'Original image is required' }, { status: 400 });
		}

		if (!body.description || body.description.trim().length === 0) {
			return json({ error: 'Description is required' }, { status: 400 });
		}

		if (!body.category || body.category.trim().length === 0) {
			return json({ error: 'Category is required' }, { status: 400 });
		}

		if (!body.subcategory || body.subcategory.trim().length === 0) {
			return json({ error: 'Subcategory is required' }, { status: 400 });
		}

		// Validate colors (now an array)
		if (!body.colors || !Array.isArray(body.colors) || body.colors.length === 0) {
			return json({ error: 'At least one color is required' }, { status: 400 });
		}

		// Validate color strings are not empty
		if (body.colors.some(color => !color || color.trim().length === 0)) {
			return json({ error: 'All colors must be non-empty strings' }, { status: 400 });
		}

		// Validate occasions if provided (optional array)
		if (body.occasions && !Array.isArray(body.occasions)) {
			return json({ error: 'Occasions must be an array' }, { status: 400 });
		}

		if (body.occasions && body.occasions.some(occasion => !occasion || occasion.trim().length === 0)) {
			return json({ error: 'All occasions must be non-empty strings' }, { status: 400 });
		}

		// Validate category values
		const validCategories = ['Top', 'Bottom', 'Footwear', 'Outerwear', 'Accessory'];
		if (!validCategories.includes(body.category)) {
			return json(
				{
					error: `Invalid category. Must be one of: ${validCategories.join(', ')}`
				},
				{ status: 400 }
			);
		}

		// Create wardrobe item
		const item = await createWardrobeItem(body, userId, locals.supabase);

		return json({ item }, { status: 201 });
	} catch (error) {
		console.error('Error creating wardrobe item:', error);

		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error occurred';

		return json(
			{ error: `Failed to create wardrobe item: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
