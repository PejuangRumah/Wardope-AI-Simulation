import type { LayoutServerLoad } from './$types';

// Server-side auth check removed for PoC simplicity
// Client-side guard in +layout.svelte handles auth redirect
export const load: LayoutServerLoad = async () => {
	return {};
};
