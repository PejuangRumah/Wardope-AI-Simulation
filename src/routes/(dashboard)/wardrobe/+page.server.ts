import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { listWardrobeItems } from '$lib/services/wardrobe';

export const load: PageServerLoad = async ({ locals: { supabase, getSession }, url }) => {
	// Check authentication
	const session = await getSession();
	if (!session?.user) {
		throw redirect(303, '/auth/login');
	}

	const userId = session.user.id;

	// Parse query params for filters
	const category = url.searchParams.get('category') || undefined;
	const color = url.searchParams.get('color') || undefined;
	const fit = url.searchParams.get('fit') || undefined;
	const occasion = url.searchParams.get('occasion') || undefined;
	const search = url.searchParams.get('search') || undefined;
	const page = parseInt(url.searchParams.get('page') || '1');

	// Load wardrobe items with filters
	let wardrobeData;
	try {
		wardrobeData = await listWardrobeItems(
			userId,
			{ category, color, fit, occasion, search, page, limit: 20 },
			supabase
		);
	} catch (error) {
		console.error('Error loading wardrobe items:', error);
		wardrobeData = {
			items: [],
			total: 0,
			page: 1,
			limit: 20,
			totalPages: 0
		};
	}

	// Load master data for filters and dropdowns
	const [categories, colors, fits, occasions, subcategories] = await Promise.all([
		supabase.from('categories').select('*').order('display_order'),
		supabase.from('colors').select('*').order('display_order'),
		supabase.from('fits').select('*').order('display_order'),
		supabase.from('occasions').select('*').order('display_order'),
		supabase.from('subcategories').select('*').order('category_id, display_order')
	]);

	// Load available prompts for item analysis and improvement
	const { data: prompts } = await supabase
		.from('prompts')
		.select('*')
		.eq('user_id', userId)
		.in('type', ['item_analysis', 'item_improvement'])
		.order('type', { ascending: true })
		.order('version', { ascending: false });

	return {
		items: wardrobeData.items,
		total: wardrobeData.total,
		page: wardrobeData.page,
		totalPages: wardrobeData.totalPages,
		masterData: {
			categories: categories.data || [],
			colors: colors.data || [],
			fits: fits.data || [],
			occasions: occasions.data || [],
			subcategories: subcategories.data || []
		},
		prompts: prompts || [],
		filters: {
			category,
			color,
			fit,
			occasion,
			search
		}
	};
};
