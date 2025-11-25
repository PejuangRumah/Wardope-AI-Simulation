-- ========================================
-- Migration: Fix Prompts Table Schema
-- ========================================
-- Purpose: Add missing enum type, RLS policies, and constraints for prompts table
-- Date: 2025-01-17
--
-- Changes:
-- 1. Create prompt_type ENUM
-- 2. Enable Row Level Security (RLS) for user-specific access
-- 3. Add unique constraint for active prompts per user per type
-- 4. Add indexes for better query performance
-- ========================================

-- 1. Create ENUM type for prompt types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prompt_type') THEN
    CREATE TYPE prompt_type AS ENUM (
      'item_analysis',
      'item_improvement',
      'outfit_recommendation'
    );
  END IF;
END $$;

-- 2. Alter prompts table to use the enum type (if column type is not already prompt_type)
DO $$
BEGIN
  -- Check if column type needs to be updated
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prompts'
    AND column_name = 'type'
    AND udt_name != 'prompt_type'
  ) THEN
    ALTER TABLE public.prompts
    ALTER COLUMN type TYPE prompt_type
    USING type::text::prompt_type;
  END IF;
END $$;

-- 3. Enable Row Level Security
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing RLS policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own prompts" ON public.prompts;
DROP POLICY IF EXISTS "Users can insert their own prompts" ON public.prompts;
DROP POLICY IF EXISTS "Users can update their own prompts" ON public.prompts;
DROP POLICY IF EXISTS "Users can delete their own prompts" ON public.prompts;

-- 5. Create RLS policies for user-specific access
CREATE POLICY "Users can view their own prompts"
  ON public.prompts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prompts"
  ON public.prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompts"
  ON public.prompts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prompts"
  ON public.prompts FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Add unique constraint: Only one active prompt per user per type
-- Drop existing constraint if exists
DROP INDEX IF EXISTS idx_prompts_user_active_type;

CREATE UNIQUE INDEX idx_prompts_user_active_type
ON public.prompts (user_id, type)
WHERE is_active = true;

-- 7. Add helpful indexes for common queries
CREATE INDEX IF NOT EXISTS idx_prompts_user_id
ON public.prompts (user_id);

CREATE INDEX IF NOT EXISTS idx_prompts_type
ON public.prompts (type);

CREATE INDEX IF NOT EXISTS idx_prompts_is_active
ON public.prompts (is_active);

CREATE INDEX IF NOT EXISTS idx_prompts_last_used_at
ON public.prompts (last_used_at DESC);

-- 8. Enable RLS for related tables
ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_usage_logs ENABLE ROW LEVEL SECURITY;

-- 9. RLS policies for prompt_versions
DROP POLICY IF EXISTS "Users can view versions of their own prompts" ON public.prompt_versions;
DROP POLICY IF EXISTS "Users can insert versions of their own prompts" ON public.prompt_versions;

CREATE POLICY "Users can view versions of their own prompts"
  ON public.prompt_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.prompts p
      WHERE p.id = prompt_versions.prompt_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert versions of their own prompts"
  ON public.prompt_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.prompts p
      WHERE p.id = prompt_versions.prompt_id
      AND p.user_id = auth.uid()
    )
  );

-- 10. RLS policies for prompt_usage_logs
DROP POLICY IF EXISTS "Users can view their own usage logs" ON public.prompt_usage_logs;
DROP POLICY IF EXISTS "Users can insert their own usage logs" ON public.prompt_usage_logs;

CREATE POLICY "Users can view their own usage logs"
  ON public.prompt_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage logs"
  ON public.prompt_usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 11. Verification queries
-- Show enum values
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'prompt_type'::regtype
ORDER BY enumsortorder;

-- Show RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('prompts', 'prompt_versions', 'prompt_usage_logs')
ORDER BY tablename, policyname;

-- Show indexes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'prompts'
ORDER BY indexname;

-- Show current prompts count per user (should be empty for fresh install)
SELECT
  user_id,
  type,
  COUNT(*) as prompt_count,
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_count
FROM public.prompts
GROUP BY user_id, type
ORDER BY user_id, type;
