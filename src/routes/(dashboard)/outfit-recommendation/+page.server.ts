import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
    const session = await locals.getSession();

    if (!session) {
        throw redirect(303, '/login');
    }

    // Fetch wardrobe stats
    const { data: items, error } = await locals.supabase
        .from('wardrobe_items')
        .select('category')
        .eq('user_id', session.user.id);

    if (error) {
        console.error('Error fetching wardrobe stats:', error);
    }

    const totalItems = items?.length || 0;
    const categories = [...new Set((items || []).map((item) => item.category))];
    const uniqueCategories = categories.length;

    // Fetch outfit recommendation prompts
    const { data: prompts, error: promptsError } = await locals.supabase
        .from('prompts')
        .select('*')
        .eq('type', 'outfit_recommendation')
        .eq('is_active', true)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

    if (promptsError) {
        console.error('Error fetching prompts:', promptsError);
    }

    return {
        wardrobeStats: {
            totalItems,
            uniqueCategories,
            categories
        },
        prompts: prompts || []
    };
};

