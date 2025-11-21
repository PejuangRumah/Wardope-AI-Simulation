// Wardrobe Service - Handle CRUD operations for wardrobe items
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WardrobeItemDB } from '$lib/types/database';
import type { WardrobeItemCreate, WardrobeItemUpdate, WardrobeFilters, WardrobeListResponse, WardrobeItem } from '$lib/types/wardrobe';

/**
 * Upload a base64 image to Supabase Storage
 * @param base64DataUri - Base64 data URI string
 * @param bucket - Storage bucket name
 * @param userId - User ID for organizing files
 * @param supabase - Supabase client
 * @returns Storage path of the uploaded image (not full URL)
 */
export async function uploadImageToStorage(
	base64DataUri: string,
	bucket: 'wardrobe-images' | 'improved-images',
	userId: string,
	supabase: SupabaseClient
): Promise<string> {
	// Convert base64 data URI to File
	const arr = base64DataUri.split(',');
	const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
	const bstr = atob(arr[1]);
	let n = bstr.length;
	const u8arr = new Uint8Array(n);
	while (n--) {
		u8arr[n] = bstr.charCodeAt(n);
	}

	const blob = new Blob([u8arr], { type: mime });

	// Generate unique filename: {userId}/{timestamp}-{uuid}.png
	const timestamp = Date.now();
	const uuid = crypto.randomUUID();
	const ext = mime.split('/')[1] || 'png';
	const filePath = `${userId}/${timestamp}-${uuid}.${ext}`;

	// Upload to Supabase Storage
	const { data, error } = await supabase
		.storage
		.from(bucket)
		.upload(filePath, blob, {
			contentType: mime,
			cacheControl: '3600',
			upsert: false
		});

	if (error) {
		console.error('Error uploading image:', error);
		throw new Error(`Failed to upload image: ${error.message}`);
	}

	// Return the storage path (not full URL) - signed URLs will be generated on fetch
	return data.path;
}

/**
 * Generate a signed URL for accessing private storage
 * @param filePath - Storage path of the file
 * @param bucket - Storage bucket name
 * @param supabase - Supabase client
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Signed URL for accessing the file
 */
export async function generateSignedUrl(
	filePath: string,
	bucket: 'wardrobe-images' | 'improved-images',
	supabase: SupabaseClient,
	expiresIn: number = 3600
): Promise<string | null> {
	if (!filePath) return null;

	let pathToSign = filePath;

	// Handle legacy full public URLs - extract the path
	if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
		// Format: https://xxx.supabase.co/storage/v1/object/public/{bucket}/{userId}/{filename}
		const pathMatch = filePath.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
		if (pathMatch) {
			pathToSign = pathMatch[1]; // Extract: {userId}/{filename}
		} else {
			console.warn('Could not extract path from legacy URL:', filePath);
			return filePath; // Can't parse, return as-is
		}
	}

	const { data, error } = await supabase
		.storage
		.from(bucket)
		.createSignedUrl(pathToSign, expiresIn);

	if (error) {
		console.error('Error generating signed URL:', error);
		return null;
	}

	return data.signedUrl;
}

/**
 * Delete an image from Supabase Storage
 * @param url - Public URL of the image to delete
 * @param supabase - Supabase client
 */
export async function deleteImageFromStorage(
	url: string,
	supabase: SupabaseClient
): Promise<void> {
	try {
		// Extract bucket and path from URL
		// URL format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
		const urlParts = url.split('/storage/v1/object/public/');
		if (urlParts.length < 2) {
			console.warn('Invalid storage URL format:', url);
			return;
		}

		const [bucket, ...pathParts] = urlParts[1].split('/');
		const filePath = pathParts.join('/');

		// Delete from storage
		const { error } = await supabase
			.storage
			.from(bucket)
			.remove([filePath]);

		if (error) {
			console.error('Error deleting image:', error);
			// Don't throw - allow graceful degradation
		}
	} catch (error) {
		console.error('Error parsing storage URL:', error);
		// Don't throw - allow graceful degradation
	}
}

/**
 * Find or create color records by name
 * @param colorNames - Array of color names
 * @param supabase - Supabase client
 * @returns Array of color IDs
 */
async function findOrCreateColors(
	colorNames: string[],
	supabase: SupabaseClient
): Promise<string[]> {
	if (!colorNames || colorNames.length === 0) return [];

	const colorIds: string[] = [];

	for (const colorName of colorNames) {
		// Try to find existing color (case-insensitive)
		const { data: existingColor } = await supabase
			.from('colors')
			.select('id')
			.ilike('name', colorName)
			.single();

		if (existingColor) {
			colorIds.push(existingColor.id);
		} else {
			// Create new color
			const { data: newColor, error } = await supabase
				.from('colors')
				.insert({ name: colorName })
				.select('id')
				.single();

			if (error) {
				console.error('Error creating color:', error);
				continue; // Skip this color if creation fails
			}

			if (newColor) {
				colorIds.push(newColor.id);
			}
		}
	}

	return colorIds;
}

/**
 * Find or create occasion records by name
 * @param occasionNames - Array of occasion names
 * @param supabase - Supabase client
 * @returns Array of occasion IDs
 */
async function findOrCreateOccasions(
	occasionNames: string[],
	supabase: SupabaseClient
): Promise<string[]> {
	if (!occasionNames || occasionNames.length === 0) return [];

	const occasionIds: string[] = [];

	for (const occasionName of occasionNames) {
		// Try to find existing occasion (case-insensitive)
		const { data: existingOccasion } = await supabase
			.from('occasions')
			.select('id')
			.ilike('name', occasionName)
			.single();

		if (existingOccasion) {
			occasionIds.push(existingOccasion.id);
		} else {
			// Create new occasion
			const { data: newOccasion, error } = await supabase
				.from('occasions')
				.insert({ name: occasionName })
				.select('id')
				.single();

			if (error) {
				console.error('Error creating occasion:', error);
				continue; // Skip this occasion if creation fails
			}

			if (newOccasion) {
				occasionIds.push(newOccasion.id);
			}
		}
	}

	return occasionIds;
}

/**
 * Link colors to a wardrobe item via junction table
 * @param wardrobeItemId - Wardrobe item ID
 * @param colorIds - Array of color IDs
 * @param supabase - Supabase client
 */
async function linkColorsToItem(
	wardrobeItemId: string,
	colorIds: string[],
	supabase: SupabaseClient
): Promise<void> {
	if (!colorIds || colorIds.length === 0) return;

	const records = colorIds.map(colorId => ({
		wardrobe_item_id: wardrobeItemId,
		color_id: colorId
	}));

	const { error } = await supabase
		.from('wardrobe_item_colors')
		.insert(records);

	if (error) {
		console.error('Error linking colors to item:', error);
		throw new Error(`Failed to link colors: ${error.message}`);
	}
}

/**
 * Link occasions to a wardrobe item via junction table
 * @param wardrobeItemId - Wardrobe item ID
 * @param occasionIds - Array of occasion IDs
 * @param supabase - Supabase client
 */
async function linkOccasionsToItem(
	wardrobeItemId: string,
	occasionIds: string[],
	supabase: SupabaseClient
): Promise<void> {
	if (!occasionIds || occasionIds.length === 0) return;

	const records = occasionIds.map(occasionId => ({
		wardrobe_item_id: wardrobeItemId,
		occasion_id: occasionId
	}));

	const { error } = await supabase
		.from('wardrobe_item_occasions')
		.insert(records);

	if (error) {
		console.error('Error linking occasions to item:', error);
		throw new Error(`Failed to link occasions: ${error.message}`);
	}
}

/**
 * Fetch wardrobe item with joined colors and occasions
 * @param itemId - Wardrobe item ID
 * @param userId - User ID for verification
 * @param supabase - Supabase client
 * @returns Wardrobe item with colors and occasions arrays
 */
async function fetchItemWithRelations(
	itemId: string,
	userId: string,
	supabase: SupabaseClient
): Promise<WardrobeItem> {
	// Fetch base item
	const { data: item, error: itemError } = await supabase
		.from('wardrobe_items')
		.select('*')
		.eq('id', itemId)
		.eq('user_id', userId)
		.single();

	if (itemError || !item) {
		throw new Error('Wardrobe item not found or access denied');
	}

	// Fetch colors via junction table
	const { data: colorRelations } = await supabase
		.from('wardrobe_item_colors')
		.select('color_id, colors(id, name, hex_code)')
		.eq('wardrobe_item_id', itemId);

	// Fetch occasions via junction table
	const { data: occasionRelations } = await supabase
		.from('wardrobe_item_occasions')
		.select('occasion_id, occasions(id, name, description)')
		.eq('wardrobe_item_id', itemId);

	// Map to proper format
	const colors = colorRelations?.map(rel => (rel as any).colors).filter(Boolean) || [];
	const occasions = occasionRelations?.map(rel => (rel as any).occasions).filter(Boolean) || [];

	// Generate signed URLs for images (private storage)
	const [signedImageUrl, signedImprovedImageUrl] = await Promise.all([
		item.image_url ? generateSignedUrl(item.image_url, 'wardrobe-images', supabase) : null,
		item.improved_image_url ? generateSignedUrl(item.improved_image_url, 'improved-images', supabase) : null
	]);

	return {
		...item,
		image_url: signedImageUrl || item.image_url,
		improved_image_url: signedImprovedImageUrl || item.improved_image_url,
		colors,
		occasions
	};
}

/**
 * Create a new wardrobe item
 * @param data - Wardrobe item creation data
 * @param userId - User ID
 * @param supabase - Supabase client
 * @returns Created wardrobe item
 */
export async function createWardrobeItem(
	data: WardrobeItemCreate,
	userId: string,
	supabase: SupabaseClient
): Promise<WardrobeItem> {
	// Upload images to storage
	const imageUrl = await uploadImageToStorage(
		data.originalImage,
		'wardrobe-images',
		userId,
		supabase
	);

	let improvedImageUrl: string | undefined;
	if (data.improvedImage) {
		improvedImageUrl = await uploadImageToStorage(
			data.improvedImage,
			'improved-images',
			userId,
			supabase
		);
	}

	// Find or create colors and occasions
	const colorIds = await findOrCreateColors(data.colors, supabase);
	const occasionIds = data.occasions ? await findOrCreateOccasions(data.occasions, supabase) : [];

	// Insert into database (without color and occasion columns)
	const { data: item, error } = await supabase
		.from('wardrobe_items')
		.insert({
			user_id: userId,
			description: data.description,
			category: data.category,
			subcategory: data.subcategory,
			fit: data.fit,
			brand: data.brand,
			image_url: imageUrl,
			improved_image_url: improvedImageUrl,
			analysis_confidence: data.analysisMetadata?.confidence ?
				(data.analysisMetadata.confidence === 'high' ? 0.9 :
				 data.analysisMetadata.confidence === 'medium' ? 0.7 : 0.5) : undefined,
			analysis_metadata: data.analysisMetadata
		})
		.select()
		.single();

	if (error) {
		// Clean up uploaded images if database insert fails
		await deleteImageFromStorage(imageUrl, supabase);
		if (improvedImageUrl) {
			await deleteImageFromStorage(improvedImageUrl, supabase);
		}
		throw new Error(`Failed to create wardrobe item: ${error.message}`);
	}

	// Link colors and occasions via junction tables
	try {
		await linkColorsToItem(item.id, colorIds, supabase);
		await linkOccasionsToItem(item.id, occasionIds, supabase);
	} catch (junctionError) {
		// If junction table linking fails, delete the item and clean up images
		await supabase.from('wardrobe_items').delete().eq('id', item.id);
		await deleteImageFromStorage(imageUrl, supabase);
		if (improvedImageUrl) {
			await deleteImageFromStorage(improvedImageUrl, supabase);
		}
		throw junctionError;
	}

	// Fetch and return item with relations
	return await fetchItemWithRelations(item.id, userId, supabase);
}

/**
 * Update an existing wardrobe item
 * @param id - Wardrobe item ID
 * @param data - Update data
 * @param userId - User ID (for verification)
 * @param supabase - Supabase client
 * @returns Updated wardrobe item
 */
export async function updateWardrobeItem(
	id: string,
	data: WardrobeItemUpdate,
	userId: string,
	supabase: SupabaseClient
): Promise<WardrobeItem> {
	// Fetch existing item to verify ownership and get current image URLs
	const { data: existingItem, error: fetchError } = await supabase
		.from('wardrobe_items')
		.select('*')
		.eq('id', id)
		.eq('user_id', userId)
		.single();

	if (fetchError || !existingItem) {
		throw new Error('Wardrobe item not found or access denied');
	}

	// Handle image updates
	let newImageUrl = existingItem.image_url;
	let newImprovedImageUrl = existingItem.improved_image_url;

	if (data.originalImage) {
		// Upload new original image
		newImageUrl = await uploadImageToStorage(
			data.originalImage,
			'wardrobe-images',
			userId,
			supabase
		);
		// Delete old original image
		if (existingItem.image_url) {
			await deleteImageFromStorage(existingItem.image_url, supabase);
		}
	}

	if (data.improvedImage) {
		// Upload new improved image
		newImprovedImageUrl = await uploadImageToStorage(
			data.improvedImage,
			'improved-images',
			userId,
			supabase
		);
		// Delete old improved image
		if (existingItem.improved_image_url) {
			await deleteImageFromStorage(existingItem.improved_image_url, supabase);
		}
	}

	// Update colors if provided
	if (data.colors) {
		// Delete existing color links
		await supabase
			.from('wardrobe_item_colors')
			.delete()
			.eq('wardrobe_item_id', id);

		// Create new color links
		const colorIds = await findOrCreateColors(data.colors, supabase);
		await linkColorsToItem(id, colorIds, supabase);
	}

	// Update occasions if provided
	if (data.occasions) {
		// Delete existing occasion links
		await supabase
			.from('wardrobe_item_occasions')
			.delete()
			.eq('wardrobe_item_id', id);

		// Create new occasion links
		const occasionIds = await findOrCreateOccasions(data.occasions, supabase);
		await linkOccasionsToItem(id, occasionIds, supabase);
	}

	// Update database (without color and occasion columns)
	const { data: item, error } = await supabase
		.from('wardrobe_items')
		.update({
			description: data.description,
			category: data.category,
			subcategory: data.subcategory,
			fit: data.fit,
			brand: data.brand,
			image_url: newImageUrl,
			improved_image_url: newImprovedImageUrl,
			analysis_metadata: data.analysisMetadata,
			updated_at: new Date().toISOString()
		})
		.eq('id', id)
		.eq('user_id', userId)
		.select()
		.single();

	if (error) {
		throw new Error(`Failed to update wardrobe item: ${error.message}`);
	}

	// Fetch and return item with relations
	return await fetchItemWithRelations(id, userId, supabase);
}

/**
 * Delete a wardrobe item
 * @param id - Wardrobe item ID
 * @param userId - User ID (for verification)
 * @param supabase - Supabase client
 */
export async function deleteWardrobeItem(
	id: string,
	userId: string,
	supabase: SupabaseClient
): Promise<void> {
	// Fetch item to get image URLs before deletion
	const { data: item, error: fetchError } = await supabase
		.from('wardrobe_items')
		.select('image_url, improved_image_url')
		.eq('id', id)
		.eq('user_id', userId)
		.single();

	if (fetchError || !item) {
		throw new Error('Wardrobe item not found or access denied');
	}

	// Delete from database
	const { error } = await supabase
		.from('wardrobe_items')
		.delete()
		.eq('id', id)
		.eq('user_id', userId);

	if (error) {
		throw new Error(`Failed to delete wardrobe item: ${error.message}`);
	}

	// Delete images from storage
	if (item.image_url) {
		await deleteImageFromStorage(item.image_url, supabase);
	}
	if (item.improved_image_url) {
		await deleteImageFromStorage(item.improved_image_url, supabase);
	}
}

/**
 * List wardrobe items with optional filters and pagination
 * @param userId - User ID
 * @param filters - Filter options
 * @param supabase - Supabase client
 * @returns Paginated list of wardrobe items
 */
export async function listWardrobeItems(
	userId: string,
	filters: WardrobeFilters,
	supabase: SupabaseClient
): Promise<WardrobeListResponse> {
	const {
		category,
		color,
		fit,
		occasion,
		search,
		page = 1,
		limit = 20
	} = filters;

	// Build base query
	let query = supabase
		.from('wardrobe_items')
		.select('*', { count: 'exact' })
		.eq('user_id', userId);

	// Apply filters
	if (category) {
		query = query.eq('category', category);
	}
	if (fit) {
		query = query.eq('fit', fit);
	}
	if (search) {
		// Full-text search on description and brand
		query = query.or(`description.ilike.%${search}%,brand.ilike.%${search}%`);
	}

	// Apply pagination
	const startIndex = (page - 1) * limit;
	const endIndex = startIndex + limit - 1;
	query = query.range(startIndex, endIndex);

	// Order by most recent first
	query = query.order('created_at', { ascending: false });

	// Execute query
	const { data: baseItems, error, count } = await query;

	if (error) {
		throw new Error(`Failed to fetch wardrobe items: ${error.message}`);
	}

	if (!baseItems || baseItems.length === 0) {
		return {
			items: [],
			total: count || 0,
			page,
			limit,
			totalPages: 0
		};
	}

	// Fetch colors and occasions for all items in batch
	const itemIds = baseItems.map(item => item.id);

	// Fetch colors
	const { data: colorRelations } = await supabase
		.from('wardrobe_item_colors')
		.select('wardrobe_item_id, colors(id, name, hex_code)')
		.in('wardrobe_item_id', itemIds);

	// Fetch occasions
	const { data: occasionRelations } = await supabase
		.from('wardrobe_item_occasions')
		.select('wardrobe_item_id, occasions(id, name, description)')
		.in('wardrobe_item_id', itemIds);

	// Map colors and occasions to items
	const itemsWithRelations: WardrobeItem[] = baseItems.map(item => {
		const itemColors = colorRelations
			?.filter(rel => rel.wardrobe_item_id === item.id)
			.map(rel => (rel as any).colors)
			.filter(Boolean) || [];

		const itemOccasions = occasionRelations
			?.filter(rel => rel.wardrobe_item_id === item.id)
			.map(rel => (rel as any).occasions)
			.filter(Boolean) || [];

		return {
			...item,
			colors: itemColors,
			occasions: itemOccasions
		};
	});

	// Apply color filter if provided
	let filteredItems = itemsWithRelations;
	if (color) {
		filteredItems = itemsWithRelations.filter(item =>
			item.colors.some(c => c.name.toLowerCase() === color.toLowerCase())
		);
	}

	// Apply occasion filter if provided
	if (occasion) {
		filteredItems = filteredItems.filter(item =>
			item.occasions.some(o => o.name.toLowerCase() === occasion.toLowerCase())
		);
	}

	// Generate signed URLs for images (private storage)
	const itemsWithSignedUrls = await Promise.all(
		filteredItems.map(async (item) => {
			const [signedImageUrl, signedImprovedImageUrl] = await Promise.all([
				item.image_url ? generateSignedUrl(item.image_url, 'wardrobe-images', supabase) : null,
				item.improved_image_url ? generateSignedUrl(item.improved_image_url, 'improved-images', supabase) : null
			]);

			return {
				...item,
				image_url: signedImageUrl || item.image_url,
				improved_image_url: signedImprovedImageUrl || item.improved_image_url
			};
		})
	);

	const totalPages = Math.ceil((count || 0) / limit);

	return {
		items: itemsWithSignedUrls,
		total: count || 0,
		page,
		limit,
		totalPages
	};
}

/**
 * Get a single wardrobe item by ID
 * @param id - Wardrobe item ID
 * @param userId - User ID (for verification)
 * @param supabase - Supabase client
 * @returns Wardrobe item with colors and occasions
 */
export async function getWardrobeItem(
	id: string,
	userId: string,
	supabase: SupabaseClient
): Promise<WardrobeItem> {
	return await fetchItemWithRelations(id, userId, supabase);
}
