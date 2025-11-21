import type { PageServerLoad } from './$types';
import { listWardrobeItems } from '$lib/services/wardrobe';

export const load: PageServerLoad = async ({ locals: { supabase }, url, parent }) => {
	// Get session from parent layout (already validated)
	const { session } = await parent();
	const userId = session.user.id;

	// Parse query params for filters
	const category = url.searchParams.get('category') || undefined;
	const color = url.searchParams.get('color') || undefined;
	const fit = url.searchParams.get('fit') || undefined;
	const occasion = url.searchParams.get('occasion') || undefined;
	const search = url.searchParams.get('search') || undefined;
	const page = parseInt(url.searchParams.get('page') || '1');

	// Load wardrobe items and prompts in parallel
	const [wardrobeData, promptsRes] = await Promise.all([
		listWardrobeItems(
			userId,
			{ category, color, fit, occasion, search, page, limit: 20 },
			supabase
		).catch((error) => {
			console.error('Error loading wardrobe items:', error);
			return { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
		}),
		supabase
			.from('prompts')
			.select('*')
			.eq('user_id', userId)
			.in('type', ['item_analysis', 'item_improvement'])
			.order('type', { ascending: true })
			.order('version', { ascending: false })
	]);

	// masterData is available from parent layout via $page.data.masterData
	const prompts = promptsRes.data || [];
	const hasPrompts = prompts.length > 0;

	return {
		items: wardrobeData.items,
		total: wardrobeData.total,
		page: wardrobeData.page,
		totalPages: wardrobeData.totalPages,
		prompts,
		hasPrompts,
		filters: {
			category,
			color,
			fit,
			occasion,
			search
		}
	};
};
