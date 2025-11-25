import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Seed default fits data
 * GET /api/fits/seed
 */
export const GET: RequestHandler = async ({ locals: { supabase, getSession } }) => {
    try {
        // Check authentication
        const session = await getSession();
        if (!session?.user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Get Category IDs
        const { data: categories, error: catError } = await supabase
            .from('categories')
            .select('id, name');

        if (catError || !categories) {
            return json({ error: 'Failed to fetch categories' }, { status: 500 });
        }

        const getCatId = (name: string) => categories.find((c) => c.name === name)?.id;

        const topId = getCatId('Top');
        const bottomId = getCatId('Bottom');
        const footwearId = getCatId('Footwear');
        const outerwearId = getCatId('Outerwear');
        const accessoryId = getCatId('Accessory');

        if (!topId || !bottomId || !footwearId || !outerwearId || !accessoryId) {
            return json(
                { error: 'One or more required categories not found' },
                { status: 400 }
            );
        }

        // 2. Prepare Fits Data
        const fitsData = [
            // Tops
            { category_id: topId, name: 'Boxy', display_order: 0 },
            { category_id: topId, name: 'Loose', display_order: 1 },
            { category_id: topId, name: 'Oversized', display_order: 2 },
            { category_id: topId, name: 'Regular', display_order: 3 },
            { category_id: topId, name: 'Relaxed', display_order: 4 },
            { category_id: topId, name: 'Slim', display_order: 5 },
            // Bottoms
            { category_id: bottomId, name: 'Oversized', display_order: 0 },
            { category_id: bottomId, name: 'Regular', display_order: 1 },
            { category_id: bottomId, name: 'Relaxed', display_order: 2 },
            { category_id: bottomId, name: 'Skinny', display_order: 3 },
            { category_id: bottomId, name: 'Slim', display_order: 4 },
            { category_id: bottomId, name: 'Straight', display_order: 5 },
            { category_id: bottomId, name: 'Tapered', display_order: 6 },
            { category_id: bottomId, name: 'Wide', display_order: 7 },
            // Footwear
            { category_id: footwearId, name: 'Oversized', display_order: 0 },
            { category_id: footwearId, name: 'Regular', display_order: 1 },
            { category_id: footwearId, name: 'Relaxed', display_order: 2 },
            { category_id: footwearId, name: 'Slim', display_order: 3 },
            // Outerwear
            { category_id: outerwearId, name: 'Oversized', display_order: 0 },
            { category_id: outerwearId, name: 'Regular', display_order: 1 },
            { category_id: outerwearId, name: 'Relaxed', display_order: 2 },
            { category_id: outerwearId, name: 'Slim', display_order: 3 },
            // Accessory
            { category_id: accessoryId, name: 'Oversized', display_order: 0 },
            { category_id: accessoryId, name: 'Regular', display_order: 1 },
            { category_id: accessoryId, name: 'Relaxed', display_order: 2 },
            { category_id: accessoryId, name: 'Slim', display_order: 3 }
        ];

        // 3. Insert Data
        // We use upsert to avoid duplicates if run multiple times (assuming unique constraint on category_id + name)
        const { data, error } = await supabase
            .from('fits')
            .upsert(fitsData, { onConflict: 'category_id,name' })
            .select();

        if (error) {
            console.error('Error seeding fits:', error);
            return json({ error: `Failed to seed fits: ${error.message}` }, { status: 500 });
        }

        return json({ success: true, count: data.length, message: 'Fits seeded successfully' });
    } catch (error) {
        console.error('Server error seeding fits:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
