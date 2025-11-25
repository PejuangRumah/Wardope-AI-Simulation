import type { SupabaseClient } from '@supabase/supabase-js';
import type { CategoryDB, SubcategoryDB, ColorDB, OccasionDB, FitDB } from '$lib/types/database';

export interface MasterDataVariables {
	categories: string;
	subcategories: string;
	colors: string;
	occasions: string;
	fits: string;
}

export function formatCategoriesForPrompt(categories: CategoryDB[]): string {
	if (!categories || categories.length === 0) {
		return 'Top, Bottom, Footwear, Outerwear, Accessory';
	}
	return categories
		.sort((a, b) => a.display_order - b.display_order)
		.map((c) => c.name)
		.join(', ');
}

export function formatSubcategoriesForPrompt(
	subcategories: (SubcategoryDB & { category?: CategoryDB })[]
): string {
	if (!subcategories || subcategories.length === 0) {
		return 'T-Shirt, Shirt, Blouse, Jeans, Trousers, Skirt, Sneakers, Boots, Heels, Jacket, Blazer, Bag, Hat';
	}

	// Group by category
	const grouped: Record<string, string[]> = {};
	for (const sub of subcategories) {
		const categoryName = sub.category?.name || 'Other';
		if (!grouped[categoryName]) {
			grouped[categoryName] = [];
		}
		grouped[categoryName].push(sub.name);
	}

	// Format as "Category: sub1, sub2, sub3"
	return Object.entries(grouped)
		.map(([category, subs]) => `${category}: ${subs.join(', ')}`)
		.join(' | ');
}

export function formatColorsForPrompt(colors: ColorDB[]): string {
	if (!colors || colors.length === 0) {
		return 'Black, White, Navy Blue, Grey, Beige, Brown, Red, Green, Blue, Pink, Yellow, Orange, Purple';
	}
	return colors
		.sort((a, b) => a.display_order - b.display_order)
		.map((c) => (c.hex_code ? `${c.name} (${c.hex_code})` : c.name))
		.join(', ');
}

export function formatOccasionsForPrompt(occasions: OccasionDB[]): string {
	if (!occasions || occasions.length === 0) {
		return 'Casual, Formal, Work/Office, Party, Semi-Formal, Lounge/Relax, Sport, Beach, Date, Wedding';
	}
	return occasions
		.sort((a, b) => a.display_order - b.display_order)
		.map((o) => o.name)
		.join(', ');
}

export function formatFitsForPrompt(fits: FitDB[]): string {
	if (!fits || fits.length === 0) {
		return 'Slim Fit, Regular Fit, Loose Fit, Oversized, Tailored';
	}
	return fits
		.sort((a, b) => a.display_order - b.display_order)
		.map((f) => f.name)
		.join(', ');
}

export async function getAllMasterDataVariables(
	supabase: SupabaseClient
): Promise<MasterDataVariables> {
	const [categoriesRes, subcategoriesRes, colorsRes, occasionsRes, fitsRes] = await Promise.all([
		supabase.from('categories').select('*').order('display_order'),
		supabase
			.from('subcategories')
			.select('*, category:categories(*)')
			.order('display_order'),
		supabase.from('colors').select('*').order('display_order'),
		supabase.from('occasions').select('*').order('display_order'),
		supabase.from('fits').select('*').order('display_order')
	]);

	return {
		categories: formatCategoriesForPrompt(categoriesRes.data || []),
		subcategories: formatSubcategoriesForPrompt(subcategoriesRes.data || []),
		colors: formatColorsForPrompt(colorsRes.data || []),
		occasions: formatOccasionsForPrompt(occasionsRes.data || []),
		fits: formatFitsForPrompt(fitsRes.data || [])
	};
}

export function replacePromptVariables(
	promptContent: string,
	variables: MasterDataVariables
): string {
	return promptContent
		.replace(/\{categories\}/g, variables.categories)
		.replace(/\{subcategories\}/g, variables.subcategories)
		.replace(/\{colors\}/g, variables.colors)
		.replace(/\{occasions\}/g, variables.occasions)
		.replace(/\{fits\}/g, variables.fits);
}

// List of available variables for UI
export const AVAILABLE_PROMPT_VARIABLES = [
	{ name: '{categories}', description: 'List of all categories (e.g., Top, Bottom, Footwear)' },
	{
		name: '{subcategories}',
		description: 'List of subcategories grouped by category (e.g., Top: T-Shirt, Shirt)'
	},
	{ name: '{colors}', description: 'List of all colors with hex codes (e.g., Black (#000000))' },
	{ name: '{occasions}', description: 'List of all occasions (e.g., Casual, Formal, Work/Office)' },
	{ name: '{fits}', description: 'List of all fits (e.g., Slim Fit, Regular Fit, Loose Fit)' }
];
