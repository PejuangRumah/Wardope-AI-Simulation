import { removeBackground } from '@imgly/background-removal';

/**
 * Remove background from an image file using client-side ML processing
 * @param imageFile - The image file to process
 * @param onProgress - Optional callback for progress updates
 * @returns Blob of the image with transparent background (PNG format)
 */
export async function removeBgFromImage(
	imageFile: File,
	onProgress?: (progress: number) => void
): Promise<Blob> {
	// Track progress per operation key to handle multiple phases
	const progressByKey: Record<string, number> = {};
	let lastReportedProgress = 0;

	// Known operation phases and their weights (approximate)
	const phaseWeights: Record<string, { weight: number; order: number }> = {
		fetch: { weight: 10, order: 0 }, // Model fetching
		compute: { weight: 80, order: 1 }, // Main computation
		encode: { weight: 10, order: 2 } // Result encoding
	};

	try {
		const blob = await removeBackground(imageFile, {
			progress: (key, current, total) => {
				if (!onProgress) return;

				// Calculate progress for this specific phase
				const phaseProgress = total > 0 ? (current / total) * 100 : 0;
				progressByKey[key] = phaseProgress;

				// Calculate weighted total progress
				let totalProgress = 0;
				let totalWeight = 0;

				for (const [phaseKey, progress] of Object.entries(progressByKey)) {
					// Find matching phase or use default weight
					const matchedPhase = Object.entries(phaseWeights).find(([name]) =>
						phaseKey.toLowerCase().includes(name)
					);
					const weight = matchedPhase ? matchedPhase[1].weight : 20;
					totalProgress += (progress / 100) * weight;
					totalWeight += weight;
				}

				// Normalize to 0-100 and ensure monotonic increase
				const normalizedProgress = totalWeight > 0 ? (totalProgress / totalWeight) * 100 : 0;
				const roundedProgress = Math.round(Math.min(normalizedProgress, 99)); // Cap at 99 until done

				// Only report if progress increased (monotonic)
				if (roundedProgress > lastReportedProgress) {
					lastReportedProgress = roundedProgress;
					onProgress(roundedProgress);
				}
			}
		});

		// Report 100% on completion
		if (onProgress) {
			onProgress(100);
		}

		return blob;
	} catch (error) {
		console.error('Background removal failed:', error);
		throw new Error('Failed to remove background. Please try again.');
	}
}

/**
 * Convert a Blob to base64 data URI
 * @param blob - The blob to convert
 * @returns Base64 data URI string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

/**
 * Compress image blob to reduce file size for storage
 * Uses canvas to resize and compress as JPEG
 * @param blob - Image blob to compress
 * @param maxWidth - Maximum width in pixels (default: 1200)
 * @param quality - JPEG quality 0-1 (default: 0.85)
 * @returns Compressed image blob as JPEG
 */
export async function compressImage(
	blob: Blob,
	maxWidth: number = 1200,
	quality: number = 0.85
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(blob);

		img.onload = () => {
			URL.revokeObjectURL(url);

			// Calculate new dimensions maintaining aspect ratio
			let width = img.width;
			let height = img.height;

			if (width > maxWidth) {
				height = Math.round((height * maxWidth) / width);
				width = maxWidth;
			}

			// Create canvas and draw resized image
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;

			const ctx = canvas.getContext('2d');
			if (!ctx) {
				reject(new Error('Failed to get canvas context'));
				return;
			}

			// Fill with white background (for transparent PNGs converting to JPEG)
			ctx.fillStyle = '#FFFFFF';
			ctx.fillRect(0, 0, width, height);

			// Draw the image
			ctx.drawImage(img, 0, 0, width, height);

			// Convert to JPEG blob with compression
			canvas.toBlob(
				(compressedBlob) => {
					if (compressedBlob) {
						resolve(compressedBlob);
					} else {
						reject(new Error('Failed to compress image'));
					}
				},
				'image/jpeg',
				quality
			);
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load image for compression'));
		};

		img.src = url;
	});
}

/**
 * Remove background and convert to base64 in one step
 * @param imageFile - The image file to process
 * @param onProgress - Optional callback for progress updates
 * @returns Base64 data URI string of the PNG with transparent background
 */
export async function removeBgAndConvertToBase64(
	imageFile: File,
	onProgress?: (progress: number) => void
): Promise<string> {
	const blob = await removeBgFromImage(imageFile, onProgress);
	// Compress before converting to base64 to reduce file size
	const compressedBlob = await compressImage(blob);
	return await blobToBase64(compressedBlob);
}

/**
 * Convert base64 data URI to File object
 * @param base64DataUri - The base64 data URI string
 * @param filename - The filename for the file object
 * @returns File object
 */
export function base64ToFile(base64DataUri: string, filename: string): File {
	const arr = base64DataUri.split(',');
	const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
	const bstr = atob(arr[1]);
	let n = bstr.length;
	const u8arr = new Uint8Array(n);
	while (n--) {
		u8arr[n] = bstr.charCodeAt(n);
	}
	return new File([u8arr], filename, { type: mime });
}
