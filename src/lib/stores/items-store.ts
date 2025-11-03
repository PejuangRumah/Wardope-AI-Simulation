// localStorage wrapper for fashion items
// Items persist across sessions but can be cleared

import type { StoredItem } from '$lib/types/item';

const STORAGE_KEY = 'wardope_items';

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
	return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Get all stored items from localStorage
 */
export function getItems(): StoredItem[] {
	if (!isBrowser()) return [];

	try {
		const data = localStorage.getItem(STORAGE_KEY);
		if (!data) return [];

		const items = JSON.parse(data);
		return Array.isArray(items) ? items : [];
	} catch (error) {
		console.error('Error reading items from localStorage:', error);
		return [];
	}
}

/**
 * Save a new item to localStorage
 */
export function saveItem(item: StoredItem): void {
	if (!isBrowser()) return;

	try {
		const existingItems = getItems();
		const updatedItems = [item, ...existingItems]; // Newest first

		localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems));
	} catch (error) {
		console.error('Error saving item to localStorage:', error);
		throw new Error('Failed to save item. Storage might be full.');
	}
}

/**
 * Update an existing item in localStorage
 */
export function updateItem(id: string, updates: Partial<StoredItem>): void {
	if (!isBrowser()) return;

	try {
		const items = getItems();
		const index = items.findIndex((item) => item.id === id);

		if (index === -1) {
			throw new Error(`Item with id ${id} not found`);
		}

		items[index] = { ...items[index], ...updates };
		localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
	} catch (error) {
		console.error('Error updating item in localStorage:', error);
		throw error;
	}
}

/**
 * Delete an item from localStorage
 */
export function deleteItem(id: string): void {
	if (!isBrowser()) return;

	try {
		const items = getItems();
		const filteredItems = items.filter((item) => item.id !== id);

		localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredItems));
	} catch (error) {
		console.error('Error deleting item from localStorage:', error);
		throw new Error('Failed to delete item.');
	}
}

/**
 * Clear all items from localStorage
 */
export function clearAllItems(): void {
	if (!isBrowser()) return;

	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch (error) {
		console.error('Error clearing items from localStorage:', error);
		throw new Error('Failed to clear items.');
	}
}

/**
 * Get total count of stored items
 */
export function getItemCount(): number {
	return getItems().length;
}

/**
 * Get total cost spent on all items
 */
export function getTotalCost(): number {
	const items = getItems();
	return items.reduce((total, item) => total + item.costs.total_cost_idr, 0);
}

/**
 * Generate a unique ID for a new item
 */
export function generateItemId(): string {
	return `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
