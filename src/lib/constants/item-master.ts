// Fashion Item Master Data - Categories, Colors, Fits, Occasions
// Used for item analysis and validation

/**
 * Fashion item categories with their subcategories
 */
export const ITEM_CATEGORIES = {
	fullbodies: ['Dress', 'Jumpsuit'],
	tops: ['Shirt', 'T-Shirt', 'Jersey', 'Blouse', 'Tanktop', 'Polo'],
	outerwears: ['Cardigan', 'Hoodie', 'Coat', 'Jacket', 'Sweater', 'Vest'],
	bottoms: [
		'Jeans',
		'Chinos',
		'Shorts',
		'Trousers',
		'Skirt',
		'Skort',
		'Leggings',
		'Sweatpants',
		'Culottes'
	],
	accessories: [
		'Hat',
		'Belt',
		'Tie',
		'Scarf',
		'Watch',
		'Jewelry',
		'Glasses',
		'Sock',
		'Glove',
		'Bag',
		'Wallet',
		'Miscellaneous'
	],
	footwears: ['Sneaker', 'Boot', 'Sandal', 'Loafer', 'Lace-up Shoe', 'Flat Shoe', 'Heels']
} as const;

/**
 * Get all categories as flat array
 */
export function getAllCategories(): string[] {
	return Object.keys(ITEM_CATEGORIES);
}

/**
 * Get subcategories for a specific category
 */
export function getSubcategories(category: string): string[] {
	return ITEM_CATEGORIES[category as keyof typeof ITEM_CATEGORIES] || [];
}

/**
 * Get all subcategories as flat array
 */
export function getAllSubcategories(): string[] {
	return Object.values(ITEM_CATEGORIES).flat();
}

/**
 * Available colors for fashion items
 */
export const COLORS = [
	'red',
	'dark red',
	'maroon',
	'crimson',
	'coral',
	'orange',
	'gold',
	'yellow',
	'green',
	'forest green',
	'olive',
	'army',
	'charcoal',
	'sage',
	'sand',
	'khaki',
	'teal',
	'blue',
	'navy',
	'royal blue',
	'sky blue',
	'indigo',
	'purple',
	'plum',
	'lavender',
	'pink',
	'hot pink',
	'brown',
	'tan',
	'beige',
	'gray',
	'silver',
	'black',
	'white'
] as const;

/**
 * Available occasions for wearing items
 */
export const OCCASIONS = [
	'casual',
	'semi-formal',
	'formal',
	'sportswear',
	'party / events',
	'work / office',
	'vacation / travel',
	'lounge / relax'
] as const;

/**
 * Fit types by category
 */
export const FITS = {
	default: ['oversized', 'regular', 'relaxed', 'slim'],
	bottoms: ['oversized', 'regular', 'relaxed', 'skinny', 'slim', 'straight', 'tapered', 'wide'],
	tops: ['boxy', 'loose', 'oversized', 'regular', 'relaxed', 'slim']
} as const;

/**
 * Get fit options based on category
 */
export function getFitOptions(category: string): string[] {
	const lowerCategory = category.toLowerCase();

	if (lowerCategory === 'bottoms') {
		return [...FITS.bottoms];
	} else if (lowerCategory === 'tops' || lowerCategory === 'outerwears' || lowerCategory === 'fullbodies') {
		return [...FITS.tops];
	}

	return [...FITS.default];
}

/**
 * Get all fit options as flat array
 */
export function getAllFits(): string[] {
	return Array.from(new Set([...FITS.default, ...FITS.bottoms, ...FITS.tops]));
}

/**
 * Image generation quality options
 */
export const IMAGE_QUALITY = {
	STANDARD: 'standard',
	HD: 'hd'
} as const;

/**
 * Image size options (for future flexibility)
 */
export const IMAGE_SIZES = {
	SQUARE: '1024x1024',
	LANDSCAPE: '1792x1024',
	PORTRAIT: '1024x1792'
} as const;

/**
 * Default prompt for item analysis
 */
export function getDefaultAnalysisPrompt(): string {
	return `You are a professional fashion item analyzer for an e-commerce platform.

Analyze the uploaded fashion item image and extract:

1. **Category**: Identify the main category (fullbodies, tops, outerwears, bottoms, accessories, footwears)
2. **Subcategory**: Identify the specific type (e.g., Shirt, Jeans, Sneaker)
3. **Colors**: List all visible colors in the item (primary and secondary)
4. **Fit**: Determine the fit style (oversized, regular, slim, etc.)
5. **Occasions**: Suggest suitable occasions for wearing this item
6. **Description**: Provide a detailed description including:
   - Brand identification if visible
   - Material estimation (cotton, denim, leather, etc.)
   - Style characteristics (casual, formal, sporty, etc.)
   - Unique design features
   - Overall aesthetic

**IMPORTANT**: Only use values from the provided category, color, fit, and occasion lists.

Be accurate, specific, and professional in your analysis.`;
}

/**
 * Default prompt for image improvement
 */
export function getDefaultImprovementPrompt(itemData: {
	category: string;
	subcategory: string;
	colors: string[];
	fit: string;
}): string {
	return `Professional e-commerce product photo of a ${itemData.subcategory}.

Style: ${itemData.category} - ${itemData.subcategory}
Primary Colors: ${itemData.colors.join(', ')}
Fit: ${itemData.fit}

Requirements:
- Clean, white or light neutral background (studio-style)
- Front-facing view, centered composition
- Professional lighting with no harsh shadows
- Remove any other objects, people, or distractions
- High-quality product photography style
- Suitable for premium online fashion retail
- Item should look pristine, well-pressed, and professionally presented
- Sharp focus, high resolution appearance

The result should look like a professional catalog photo from a premium fashion brand website or high-end e-commerce store.`;
}
