// Wardrobe Service - Handle CRUD operations for wardrobe items
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WardrobeItemDB } from '$lib/types/database';
import type { WardrobeItemCreate, WardrobeItemUpdate, WardrobeFilters, WardrobeListResponse } from '$lib/types/wardrobe';

/**
 * Upload a base64 image to Supabase Storage
 * @param base64DataUri - Base64 data URI string
 * @param bucket - Storage bucket name
 * @param userId - User ID for organizing files
 * @param supabase - Supabase client
 * @returns Public URL of the uploaded image
 */
export async function uploadImageToStorage(
	base64DataUri: string,
	bucket: 'wardrobe-originals' | 'wardrobe-improved',
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

	// Get public URL
	const { data: { publicUrl } } = supabase
		.storage
		.from(bucket)
		.getPublicUrl(data.path);

	return publicUrl;
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
): Promise<WardrobeItemDB> {
	// Upload images to storage
	const imageUrl = await uploadImageToStorage(
		data.originalImage,
		'wardrobe-originals',
		userId,
		supabase
	);

	let improvedImageUrl: string | undefined;
	if (data.improvedImage) {
		improvedImageUrl = await uploadImageToStorage(
			data.improvedImage,
			'wardrobe-improved',
			userId,
			supabase
		);
	}

	// Insert into database
	const { data: item, error } = await supabase
		.from('wardrobe_items')
		.insert({
			user_id: userId,
			description: data.description,
			category: data.category,
			subcategory: data.subcategory,
			color: data.color,
			fit: data.fit,
			brand: data.brand,
			occasion: data.occasion,
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

	return item;
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
): Promise<WardrobeItemDB> {
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
			'wardrobe-originals',
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
			'wardrobe-improved',
			userId,
			supabase
		);
		// Delete old improved image
		if (existingItem.improved_image_url) {
			await deleteImageFromStorage(existingItem.improved_image_url, supabase);
		}
	}

	// Update database
	const { data: item, error } = await supabase
		.from('wardrobe_items')
		.update({
			description: data.description,
			category: data.category,
			subcategory: data.subcategory,
			color: data.color,
			fit: data.fit,
			brand: data.brand,
			occasion: data.occasion,
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

	return item;
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

	// Build query
	let query = supabase
		.from('wardrobe_items')
		.select('*', { count: 'exact' })
		.eq('user_id', userId);

	// Apply filters
	if (category) {
		query = query.eq('category', category);
	}
	if (color) {
		query = query.eq('color', color);
	}
	if (fit) {
		query = query.eq('fit', fit);
	}
	if (occasion) {
		query = query.eq('occasion', occasion);
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
	const { data: items, error, count } = await query;

	if (error) {
		throw new Error(`Failed to fetch wardrobe items: ${error.message}`);
	}

	const totalPages = Math.ceil((count || 0) / limit);

	return {
		items: items || [],
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
 * @returns Wardrobe item
 */
export async function getWardrobeItem(
	id: string,
	userId: string,
	supabase: SupabaseClient
): Promise<WardrobeItemDB> {
	const { data: item, error } = await supabase
		.from('wardrobe_items')
		.select('*')
		.eq('id', id)
		.eq('user_id', userId)
		.single();

	if (error || !item) {
		throw new Error('Wardrobe item not found or access denied');
	}

	return item;
}
