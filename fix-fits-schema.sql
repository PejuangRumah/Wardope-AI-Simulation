-- ========================================
-- Migration: Fix Fits Table Schema
-- ========================================
-- Purpose: Add category_id foreign key to fits table
-- Date: 2025-01-15
--
-- IMPORTANT: This will DROP and RECREATE the fits table
-- All existing data in fits table will be LOST
-- ========================================

-- Drop existing fits table
DROP TABLE IF EXISTS public.fits CASCADE;

-- Recreate fits table with correct schema
CREATE TABLE public.fits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  name text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fits_pkey PRIMARY KEY (id),
  CONSTRAINT fits_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE,
  CONSTRAINT fits_category_id_name_key UNIQUE (category_id, name)
);

-- Insert default fit data
-- This assumes all 5 categories already exist
DO $$
DECLARE
  top_id uuid;
  bottom_id uuid;
  footwear_id uuid;
  outerwear_id uuid;
  accessory_id uuid;
BEGIN
  -- Get category IDs
  SELECT id INTO top_id FROM public.categories WHERE name = 'Top';
  SELECT id INTO bottom_id FROM public.categories WHERE name = 'Bottom';
  SELECT id INTO footwear_id FROM public.categories WHERE name = 'Footwear';
  SELECT id INTO outerwear_id FROM public.categories WHERE name = 'Outerwear';
  SELECT id INTO accessory_id FROM public.categories WHERE name = 'Accessory';

  -- Check if all required categories exist
  IF top_id IS NULL OR bottom_id IS NULL OR footwear_id IS NULL OR
     outerwear_id IS NULL OR accessory_id IS NULL THEN
    RAISE EXCEPTION 'Required categories not found. Please create all 5 categories first: Top, Bottom, Footwear, Outerwear, Accessory';
  END IF;

  -- Insert fits for Tops: boxy, loose, oversized, regular, relaxed, slim
  INSERT INTO public.fits (category_id, name, display_order) VALUES
    (top_id, 'Boxy', 0),
    (top_id, 'Loose', 1),
    (top_id, 'Oversized', 2),
    (top_id, 'Regular', 3),
    (top_id, 'Relaxed', 4),
    (top_id, 'Slim', 5);

  -- Insert fits for Bottoms: oversized, regular, relaxed, skinny, slim, straight, tapered, wide
  INSERT INTO public.fits (category_id, name, display_order) VALUES
    (bottom_id, 'Oversized', 0),
    (bottom_id, 'Regular', 1),
    (bottom_id, 'Relaxed', 2),
    (bottom_id, 'Skinny', 3),
    (bottom_id, 'Slim', 4),
    (bottom_id, 'Straight', 5),
    (bottom_id, 'Tapered', 6),
    (bottom_id, 'Wide', 7);

  -- Insert fits for Footwear: oversized, regular, relaxed, slim (default)
  INSERT INTO public.fits (category_id, name, display_order) VALUES
    (footwear_id, 'Oversized', 0),
    (footwear_id, 'Regular', 1),
    (footwear_id, 'Relaxed', 2),
    (footwear_id, 'Slim', 3);

  -- Insert fits for Outerwear: oversized, regular, relaxed, slim (default)
  INSERT INTO public.fits (category_id, name, display_order) VALUES
    (outerwear_id, 'Oversized', 0),
    (outerwear_id, 'Regular', 1),
    (outerwear_id, 'Relaxed', 2),
    (outerwear_id, 'Slim', 3);

  -- Insert fits for Accessory: oversized, regular, relaxed, slim (default)
  INSERT INTO public.fits (category_id, name, display_order) VALUES
    (accessory_id, 'Oversized', 0),
    (accessory_id, 'Regular', 1),
    (accessory_id, 'Relaxed', 2),
    (accessory_id, 'Slim', 3);

  RAISE NOTICE 'Fits table recreated successfully with % total entries',
    (SELECT COUNT(*) FROM public.fits);
END $$;

-- Verify the migration
SELECT
  c.name as category,
  COUNT(f.id) as fit_count,
  STRING_AGG(f.name, ', ' ORDER BY f.display_order) as fits
FROM public.categories c
LEFT JOIN public.fits f ON f.category_id = c.id
WHERE c.name IN ('Top', 'Bottom', 'Footwear', 'Outerwear', 'Accessory')
GROUP BY c.name
ORDER BY c.name;
