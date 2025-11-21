import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDefaultAnalysisPrompt, getDefaultImprovementPrompt } from '$lib/constants/item-master';
import { getDefaultPromptTemplate } from '$lib/services/outfit-generator';

/**
 * Seed default prompts for a user
 * Creates 3 prompts: item_analysis, item_improvement, outfit_generation
 * POST /api/prompts/seed-defaults
 */
export const POST: RequestHandler = async ({ locals: { supabase, getSession } }) => {
	try {
		// Get authenticated user
		const session = await getSession();
		if (!session?.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = session.user.id;

		// Check if user already has prompts
		const { data: existingPrompts, error: checkError } = await supabase
			.from('prompts')
			.select('id')
			.eq('user_id', userId)
			.limit(1);

		if (checkError) {
			console.error('Error checking existing prompts:', checkError);
			return json({ error: 'Failed to check existing prompts' }, { status: 500 });
		}

		if (existingPrompts && existingPrompts.length > 0) {
			return json(
				{
					error: 'User already has prompts. Delete existing prompts first if you want to reseed.'
				},
				{ status: 409 }
			);
		}

		// Prepare default prompts
		const defaultPrompts = [
			{
				user_id: userId,
				name: 'Item Analysis (Default)',
				description:
					'Default system prompt for analyzing fashion items using GPT 5.1 Nano. Extracts category, subcategory, colors, fit, occasions, and detailed description.',
				type: 'item_analysis',
				content: getDefaultAnalysisPrompt(),
				template_variables: [],
				version: 1,
				is_active: true,
				usage_count: 0,
				metadata: {
					source: 'system_default',
					created_via: 'seed_defaults'
				},
				tags: ['default', 'vision', 'analysis']
			},
			{
				user_id: userId,
				name: 'Item Improvement (Default)',
				description:
					'Default system prompt for improving fashion item images using GPT-Image-1. Creates professional e-commerce style product photos with clean backgrounds.',
				type: 'item_improvement',
				content: getDefaultImprovementPrompt({
					category: '',
					subcategory: '',
					colors: [],
					fit: ''
				}).split('\n\n')[0], // Get just the base prompt without item details
				template_variables: [],
				version: 1,
				is_active: true,
				usage_count: 0,
				metadata: {
					source: 'system_default',
					created_via: 'seed_defaults'
				},
				tags: ['default', 'image-generation', 'e-commerce']
			},
			{
				user_id: userId,
				name: 'Outfit Recommendation (Default)',
				description:
					'Default system prompt for generating outfit recommendations using GPT 5.1 Nano. Creates 1-5 outfit combinations based on user occasion and preferences with color harmony and style guidelines.',
				type: 'outfit_recommendation',
				content: getDefaultPromptTemplate(),
				template_variables: ['occasion', 'note'],
				version: 1,
				is_active: true,
				usage_count: 0,
				metadata: {
					source: 'system_default',
					created_via: 'seed_defaults',
					template_info: {
						occasion: 'User-selected occasion (e.g., casual, formal, work/office)',
						note: 'Optional user preferences (e.g., prefer blue colors, minimalist style)'
					}
				},
				tags: ['default', 'outfit', 'styling', 'recommendation']
			}
		];

		// Insert all 3 default prompts
		const { data: createdPrompts, error: insertError } = await supabase
			.from('prompts')
			.insert(defaultPrompts)
			.select();

		if (insertError) {
			console.error('Error inserting default prompts:', insertError);
			return json({ error: 'Failed to create default prompts' }, { status: 500 });
		}

		return json(
			{
				success: true,
				message: 'Default prompts created successfully',
				prompts: createdPrompts
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error seeding default prompts:', error);
		return json({ error: 'Failed to seed default prompts' }, { status: 500 });
	}
};
