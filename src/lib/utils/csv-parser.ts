// CSV Parser Utility
import { parse } from 'csv-parse/sync';
import type { WardrobeItem } from '$lib/types';

/**
 * Parse CSV file to wardrobe items
 */
export function parseCSV(csvText: string): WardrobeItem[] {
  try {
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: false
    });

    return records.map((record: any) => ({
      id: record.id?.toString() || '',
      desc: record.desc || '',
      category: record.category || '',
      subcategory: record.subcategory || '',
      color: record.color || '',
      fit: record.fit || '',
      brand: record.brand || '',
      occasion: record.occasion || '',
      image: record.image || record['asset name'] || '',
      price: record.price || '',
      ...record // Keep all other fields
    }));
  } catch (error) {
    throw new Error(`CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate required fields in wardrobe items
 */
export function validateWardrobeItems(items: WardrobeItem[]): {
  valid: WardrobeItem[];
  invalid: number[];
} {
  const valid: WardrobeItem[] = [];
  const invalid: number[] = [];

  items.forEach((item, index) => {
    // Check required fields
    if (item.id && item.desc && item.category && item.subcategory && item.color) {
      valid.push(item);
    } else {
      invalid.push(index + 2); // +2 because CSV line 1 is header, and index is 0-based
    }
  });

  return { valid, invalid };
}
