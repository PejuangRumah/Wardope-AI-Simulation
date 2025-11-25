import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'wardope-sidebar-collapsed';

// Get initial state from localStorage or default to false
const getInitialState = (): boolean => {
	if (browser) {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? JSON.parse(stored) : false;
	}
	return false;
};

// Create the writable store
const createSidebarStore = () => {
	const { subscribe, set, update } = writable<boolean>(getInitialState());

	return {
		subscribe,
		toggle: () => {
			update((collapsed) => {
				const newValue = !collapsed;
				if (browser) {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(newValue));
				}
				return newValue;
			});
		},
		set: (value: boolean) => {
			if (browser) {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
			}
			set(value);
		}
	};
};

export const sidebarCollapsed = createSidebarStore();
