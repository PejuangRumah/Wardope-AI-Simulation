-- ============================================
-- Wardope AI - Outfit Storage Enhancement
-- ============================================
-- Purpose: Store rendered outfit combination images + link prompts to outfits
-- Problem Solved: When wardrobe items are deleted, outfit history loses visual reference
-- Solution: Save canvas-rendered outfit images to storage bucket
-- Execute this AFTER: supabase-schema.sql and prompt-management-schema.sql
-- ============================================

-- ============================================
-- 1. ALTER OUTFIT_COMBINATIONS TABLE
-- ============================================

-- Add fields for outfit image storage and prompt tracking
ALTER TABLE outfit_combinations
ADD COLUMN IF NOT EXISTS combination_image_url TEXT,
ADD COLUMN IF NOT EXISTS prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN outfit_combinations.combination_image_url IS 'URL to rendered canvas image of the complete outfit (stored in outfit-images bucket)';
COMMENT ON COLUMN outfit_combinations.prompt_id IS 'Which prompt template was used to generate this outfit combination (for analytics and debugging)';

-- Create index for prompt tracking
CREATE INDEX IF NOT EXISTS idx_outfit_combinations_prompt_id ON outfit_combinations(prompt_id);

-- ============================================
-- 2. STORAGE BUCKET: outfit-images
-- ============================================

-- NOTE: Storage buckets CANNOT be created via SQL. You must create them manually.
-- This section provides the configuration and policies as reference.

-- ============================================
-- MANUAL STEPS (Execute in Supabase Dashboard)
-- ============================================

-- Step 1: Create Bucket
-- Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/storage/buckets
-- Click: "New bucket"
-- Configuration:
--   - Name: outfit-images
--   - Public: NO (require authentication)
--   - File size limit: 5 MB
--   - Allowed MIME types: image/png, image/jpeg, image/webp

-- Step 2: Apply Storage Policies (see section 3 below)

-- ============================================
-- 3. STORAGE RLS POLICIES FOR outfit-images
-- ============================================

-- These policies must be created in:
-- Dashboard > Storage > outfit-images bucket > Policies

-- Policy 1: SELECT (Users can view their own outfit images)
-- Policy Name: "Users can view their own outfit images"
-- Allowed operation: SELECT
-- Target roles: authenticated
-- Policy definition:
-- (bucket_id = 'outfit-images' AND (storage.foldername(name))[1] = auth.uid()::text)

-- Policy 2: INSERT (Users can upload outfit images to their folder)
-- Policy Name: "Users can upload outfit images"
-- Allowed operation: INSERT
-- Target roles: authenticated
-- Policy definition:
-- (bucket_id = 'outfit-images' AND (storage.foldername(name))[1] = auth.uid()::text)

-- Policy 3: DELETE (Users can delete their own outfit images)
-- Policy Name: "Users can delete their own outfit images"
-- Allowed operation: DELETE
-- Target roles: authenticated
-- Policy definition:
-- (bucket_id = 'outfit-images' AND (storage.foldername(name))[1] = auth.uid()::text)

-- ============================================
-- 4. FILE STRUCTURE CONVENTION
-- ============================================

-- Recommended file path structure in outfit-images bucket:
-- {user_id}/{combination_id}.png
--
-- Example:
-- a1b2c3d4-5678-90ef-ghij-klmnopqrstuv/c9d8e7f6-5432-10ab-cdef-ghijklmnopqr.png
--
-- Benefits:
-- - RLS policies work automatically (user_id matches auth.uid())
-- - Easy to find outfit images by combination_id
-- - PNG format preserves quality for canvas exports
-- - Automatic cleanup when outfit combination is deleted (implement in app)

-- ============================================
-- 5. HELPER FUNCTION: Get Outfit Image URL
-- ============================================

-- Function: Generate Supabase Storage URL for outfit image
CREATE OR REPLACE FUNCTION get_outfit_image_url(
  p_user_id UUID,
  p_combination_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_project_url TEXT;
  v_file_path TEXT;
BEGIN
  -- Get project URL from environment or config
  -- Replace 'YOUR_PROJECT_ID' with actual project ID or use environment variable
  v_project_url := 'https://ogrfmapwyxodzhlwygrl.supabase.co';

  -- Build file path
  v_file_path := p_user_id || '/' || p_combination_id || '.png';

  -- Return full storage URL
  RETURN v_project_url || '/storage/v1/object/public/outfit-images/' || v_file_path;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Get outfit with full image URLs (wardrobe items + combination)
CREATE OR REPLACE FUNCTION get_outfit_with_images(
  p_combination_id UUID
)
RETURNS TABLE (
  combination_id UUID,
  occasion TEXT,
  reasoning TEXT,
  style_notes TEXT,
  combination_image_url TEXT,
  items JSONB -- Array of items with their image URLs
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    oc.id AS combination_id,
    oc.occasion,
    oc.reasoning,
    oc.style_notes,
    oc.combination_image_url,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', wi.id,
          'description', wi.description,
          'category', wi.category,
          'subcategory', wi.subcategory,
          'color', wi.color,
          'image_url', wi.image_url,
          'improved_image_url', wi.improved_image_url,
          'reason', oi.reason
        )
        ORDER BY oi.id
      ),
      '[]'::jsonb
    ) AS items
  FROM outfit_combinations oc
  LEFT JOIN outfit_items oi ON oc.id = oi.combination_id
  LEFT JOIN wardrobe_items wi ON oi.item_id = wi.id
  WHERE oc.id = p_combination_id
  GROUP BY oc.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. CLEANUP FUNCTION: Delete Orphaned Images
-- ============================================

-- Function: Delete outfit image from storage when combination is deleted
-- Note: This function requires Supabase Storage functions which may not be directly callable from SQL
-- Implement this logic in application code (API endpoint or edge function)

CREATE OR REPLACE FUNCTION cleanup_outfit_image()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the deletion for manual cleanup or background job
  -- Actual file deletion should be handled in application layer
  RAISE NOTICE 'Outfit combination % deleted. Clean up image at: %',
    OLD.id,
    OLD.combination_image_url;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Log when outfit combination is deleted
CREATE TRIGGER trigger_cleanup_outfit_image
  BEFORE DELETE ON outfit_combinations
  FOR EACH ROW
  WHEN (OLD.combination_image_url IS NOT NULL)
  EXECUTE FUNCTION cleanup_outfit_image();

-- ============================================
-- 7. ANALYTICS: Outfit Image Storage Stats
-- ============================================

-- Function: Get storage usage statistics for user
CREATE OR REPLACE FUNCTION get_user_outfit_storage_stats(
  p_user_id UUID
)
RETURNS TABLE (
  total_outfits INTEGER,
  outfits_with_images INTEGER,
  outfits_without_images INTEGER,
  image_coverage_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_outfits,
    COUNT(combination_image_url)::INTEGER AS outfits_with_images,
    (COUNT(*) - COUNT(combination_image_url))::INTEGER AS outfits_without_images,
    ROUND(
      (COUNT(combination_image_url)::NUMERIC / NULLIF(COUNT(*), 0) * 100),
      2
    ) AS image_coverage_percentage
  FROM outfit_combinations
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. MIGRATION: Backfill Existing Outfits
-- ============================================

-- Optional: Mark existing outfit combinations as needing image generation
-- This allows gradual migration without breaking existing data

-- Add migration flag (optional)
ALTER TABLE outfit_combinations
ADD COLUMN IF NOT EXISTS needs_image_generation BOOLEAN DEFAULT false;

COMMENT ON COLUMN outfit_combinations.needs_image_generation IS 'Flag for background job to generate missing outfit images from wardrobe items';

-- Mark existing outfits without images as needing generation
UPDATE outfit_combinations
SET needs_image_generation = true
WHERE combination_image_url IS NULL;

-- ============================================
-- 9. VERIFICATION QUERIES
-- ============================================

-- Check if columns were added successfully:
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'outfit_combinations'
  AND column_name IN ('combination_image_url', 'prompt_id', 'needs_image_generation')
ORDER BY column_name;

-- Check storage stats for a user (replace with actual UUID):
-- SELECT * FROM get_user_outfit_storage_stats('user-uuid-here');

-- Check outfit with full image data:
-- SELECT * FROM get_outfit_with_images('combination-uuid-here');

-- ============================================
-- USAGE EXAMPLES
-- ============================================

-- Example 1: Save outfit with combination image
-- INSERT INTO outfit_combinations (
--   user_id,
--   occasion,
--   reasoning,
--   style_notes,
--   confidence,
--   background_colors,
--   combination_image_url,
--   prompt_id
-- ) VALUES (
--   auth.uid(),
--   'casual',
--   'Perfect weekend outfit',
--   'Add a watch for polish',
--   'high',
--   '[{"hex": "#F5F5DC", "name": "Beige"}]'::jsonb,
--   'https://ogrfmapwyxodzhlwygrl.supabase.co/storage/v1/object/public/outfit-images/user-id/combo-id.png',
--   'prompt-uuid-here'
-- );

-- Example 2: Update existing outfit with generated image
-- UPDATE outfit_combinations
-- SET
--   combination_image_url = 'https://...storage.../outfit-images/user-id/combo-id.png',
--   needs_image_generation = false
-- WHERE id = 'combination-uuid-here';

-- Example 3: Get all outfits needing image generation
-- SELECT id, occasion, created_at
-- FROM outfit_combinations
-- WHERE needs_image_generation = true
--   AND user_id = auth.uid()
-- ORDER BY created_at DESC;

-- Example 4: Get outfit history with preserved images (even if items deleted)
-- SELECT
--   id,
--   occasion,
--   combination_image_url,
--   created_at
-- FROM outfit_combinations
-- WHERE user_id = auth.uid()
--   AND combination_image_url IS NOT NULL
-- ORDER BY created_at DESC;

-- Example 5: Get storage usage stats
-- SELECT * FROM get_user_outfit_storage_stats(auth.uid());

-- ============================================
-- INTEGRATION GUIDE
-- ============================================

-- Frontend Integration (Canvas Export):
--
-- 1. When user generates outfit combinations:
--    a. Render outfit items on canvas
--    b. Export canvas to PNG blob: canvas.toBlob()
--    c. Upload to Supabase Storage:
--       const filePath = `${userId}/${combinationId}.png`;
--       const { data } = await supabase.storage
--         .from('outfit-images')
--         .upload(filePath, blob);
--    d. Get public URL:
--       const { data: { publicUrl } } = supabase.storage
--         .from('outfit-images')
--         .getPublicUrl(filePath);
--    e. Save to database with combination_image_url
--
-- 2. Display outfit history:
--    - Show combination_image_url instead of rebuilding from wardrobe_items
--    - Fallback to item images if combination_image_url is null
--    - Handle deleted wardrobe items gracefully (image still shows in history)
--
-- 3. Cleanup on outfit deletion:
--    - Delete combination row (cascades to outfit_items)
--    - Delete image from storage:
--       await supabase.storage
--         .from('outfit-images')
--         .remove([filePath]);

-- Backend Integration (API Endpoints):
--
-- 1. POST /api/recommend:
--    - After saving outfit_combinations, return combination_id
--    - Frontend uploads canvas image to storage
--    - Frontend updates combination with image_url
--    - OR: Accept base64 image in API, upload server-side
--
-- 2. DELETE /api/outfits/:id:
--    - Delete from database (triggers CASCADE)
--    - Delete from storage bucket
--    - Return success
--
-- 3. Background Job (Optional):
--    - Process outfits where needs_image_generation = true
--    - Regenerate outfit images from wardrobe items
--    - Update combination_image_url and set needs_image_generation = false

-- ============================================
-- EXECUTION NOTES
-- ============================================

-- 1. Execute this SQL in Supabase SQL Editor
-- 2. Manually create 'outfit-images' bucket in Dashboard > Storage
-- 3. Apply RLS policies (copy from section 3 above)
-- 4. Update API endpoints to handle image uploads
-- 5. Update frontend to export and upload canvas images
-- 6. Test with a sample outfit generation
-- 7. Verify storage policies work correctly (authenticated users only)
-- 8. Implement cleanup logic for deleted outfits

-- Storage Bucket Configuration Checklist:
-- [ ] Bucket name: outfit-images
-- [ ] Public: NO (require authentication)
-- [ ] File size limit: 5 MB
-- [ ] Allowed MIME types: image/png, image/jpeg, image/webp
-- [ ] SELECT policy: authenticated users, own folder only
-- [ ] INSERT policy: authenticated users, own folder only
-- [ ] DELETE policy: authenticated users, own folder only

-- Last Updated: 2025-11-12
