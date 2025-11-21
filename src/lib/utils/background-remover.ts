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
	try {
		const blob = await removeBackground(imageFile, {
			progress: (key, current, total) => {
				const progressPercent = Math.round((current / total) * 100);
				if (onProgress) {
					onProgress(progressPercent);
				}
			}
		});
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
	return await blobToBase64(blob);
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
