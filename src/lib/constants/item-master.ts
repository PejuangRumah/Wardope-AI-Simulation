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
export function getSubcategories(category: string): readonly string[] {
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
 * Uses variables: {categories}, {subcategories}, {colors}, {occasions}, {fits}
 * Variables are replaced with actual master data from database before sending to API
 */
export function getDefaultAnalysisPrompt(): string {
	return `You are a professional fashion item analyzer for a wardrobe management platform.

Analyze the uploaded fashion item image and extract the following information.

## Available Data (MUST choose from these lists only)

**Categories:** {categories}

**Subcategories:** {subcategories}

**Colors:** {colors}

**Occasions:** {occasions}

**Fits:** {fits}

## Required Output

1. **category**: Choose exactly ONE from the Categories list above
2. **subcategory**: Choose exactly ONE from the Subcategories list above (must match the selected category)
3. **colors**: Choose 1-3 colors from the Colors list above (array format, pick the most prominent colors)
4. **fit**: Choose exactly ONE from the Fits list above
5. **occasions**: Choose 1-5 occasions from the Occasions list above (array format, select all that apply)
6. **description**: Provide a concise description (50-150 words) including:
   - Brand identification if visible
   - Material estimation (cotton, denim, leather, polyester, etc.)
   - Style characteristics
   - Unique design features
7. **brand**: Brand name if visible, otherwise null
8. **confidence**: Your confidence level (low, medium, high)

## Rules
- You MUST select values exactly as written in the lists above
- Do NOT invent new categories, colors, fits, or occasions
- Colors array: minimum 1, maximum 3
- Occasions array: minimum 1, maximum 5
- Be accurate and specific in your analysis`;
}

/**
 * Default prompt for image improvement
 * Creates professional e-commerce product photos
 */
export function getDefaultImprovementPrompt(itemData: {
	category: string;
	subcategory: string;
	colors: string[];
	fit: string;
}): string {
	const colorList = itemData.colors?.join(', ') || 'original colors';

	return `Transform this ${itemData.subcategory || 'fashion item'} into a professional e-commerce product photo.

## Item Details
- Category: ${itemData.category || 'Fashion Item'}
- Type: ${itemData.subcategory || 'Clothing'}
- Colors: ${colorList}
- Fit: ${itemData.fit || 'Standard'}

## Background Requirements
- Pure white background (#FFFFFF) or very light neutral gray (#F5F5F5)
- No gradients, patterns, or textures in background
- Clean studio environment appearance

## Lighting Requirements
- Soft, diffused studio lighting from multiple angles
- No harsh shadows on or behind the item
- Even illumination across the entire garment
- Subtle shadow beneath item for depth (soft, not sharp)

## Composition Requirements
- Item centered in frame with balanced margins
- Front-facing view showing full garment
- Maintain original aspect ratio and proportions
- No cropping of any part of the item

## Item Presentation
- Remove all wrinkles, creases, and fold marks
- Garment appears freshly pressed and pristine
- Enhance fabric texture visibility without altering material
- Preserve all original design elements (logos, patterns, prints, stitching)
- Maintain accurate color representation (${colorList})

## Technical Requirements
- High resolution output (minimum 1024x1024)
- Sharp focus on all details
- No compression artifacts
- Professional color grading suitable for e-commerce

## Strict Rules
- DO NOT change the garment's original colors, patterns, or design
- DO NOT add accessories, people, mannequins, or hangers
- DO NOT alter the style, cut, or silhouette of the item
- Remove any background distractions, tags, or non-essential elements

The final image should match the quality standards of premium fashion retailers like Zara, H&M, or Uniqlo product catalogs.`;
}
