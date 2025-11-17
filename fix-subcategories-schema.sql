-- ========================================
-- Migration: Fix Subcategories Table Schema
-- ========================================
-- Purpose: Add UNIQUE constraint and ensure CASCADE delete for subcategories table
-- Date: 2025-01-17
--
-- Changes:
-- 1. Add UNIQUE constraint on (category_id, name) to prevent duplicate subcategory names per category
-- 2. Ensure ON DELETE CASCADE exists for foreign key constraint
-- ========================================

-- Add UNIQUE constraint to prevent duplicate subcategory names within the same category
-- This allows "Shirt" to exist under "Top" and "Shirt" under "Bottom" as different entries
ALTER TABLE public.subcategories
ADD CONSTRAINT subcategories_category_id_name_key
UNIQUE (category_id, name);

-- Drop existing foreign key constraint (if exists)
ALTER TABLE public.subcategories
DROP CONSTRAINT IF EXISTS subcategories_category_id_fkey;

-- Recreate foreign key constraint with ON DELETE CASCADE
-- This ensures that when a category is deleted, all its subcategories are automatically deleted
ALTER TABLE public.subcategories
ADD CONSTRAINT subcategories_category_id_fkey
FOREIGN KEY (category_id)
REFERENCES public.categories(id)
ON DELETE CASCADE;

-- Verify the constraints
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.subcategories'::regclass
ORDER BY conname;

-- Display current subcategories with their categories
SELECT
  c.name AS category,
  COUNT(s.id) AS subcategory_count,
  STRING_AGG(s.name, ', ' ORDER BY s.display_order) AS subcategories
FROM public.categories c
LEFT JOIN public.subcategories s ON s.category_id = c.id
GROUP BY c.name
ORDER BY c.name;
