import { writable } from 'svelte/store';

export interface Toast {
	id: number;
	type: 'success' | 'error' | 'info';
	message: string;
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	let id = 0;

	function add(type: Toast['type'], message: string) {
		const newToast: Toast = { id: id++, type, message };

		update((toasts) => [...toasts, newToast]);

		// Auto-dismiss after 3 seconds
		setTimeout(() => {
			remove(newToast.id);
		}, 3000);
	}

	function remove(toastId: number) {
		update((toasts) => toasts.filter((t) => t.id !== toastId));
	}

	return {
		subscribe,
		success: (message: string) => add('success', message),
		error: (message: string) => add('error', message),
		info: (message: string) => add('info', message),
		remove
	};
}

export const toast = createToastStore();
