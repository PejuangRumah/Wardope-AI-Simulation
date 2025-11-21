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
