-- ============================================
-- Wardope AI - Prompt Management Schema
-- ============================================
-- Purpose: User-specific prompt templates with versioning and usage tracking
-- Features: Multi-type prompts, version history, audit trail, usage analytics
-- Execute this in Supabase SQL Editor after main schema (supabase-schema.sql)
-- ============================================

-- ============================================
-- 1. PROMPT TYPES ENUM
-- ============================================

-- Create enum for prompt types (PostgreSQL custom type)
DO $$ BEGIN
  CREATE TYPE prompt_type AS ENUM (
    'outfit_recommendation',
    'item_analysis',
    'item_improvement'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. MAIN PROMPTS TABLE
-- ============================================

CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Prompt metadata
  name TEXT NOT NULL, -- User-friendly name (e.g., "My Casual Style Prompt")
  description TEXT, -- What this prompt is optimized for
  type prompt_type NOT NULL, -- outfit_recommendation, item_analysis, item_improvement

  -- Prompt content
  content TEXT NOT NULL, -- Full prompt template with {{variables}}
  template_variables JSONB DEFAULT '[]', -- Array of required variables: [{"name": "occasion", "required": true}, ...]

  -- Versioning
  version INTEGER NOT NULL DEFAULT 1, -- Current version number (auto-incremented on update)
  is_active BOOLEAN DEFAULT true, -- User can deactivate old prompts

  -- Usage metadata
  usage_count INTEGER DEFAULT 0, -- How many times this prompt was used
  last_used_at TIMESTAMPTZ, -- When it was last used

  -- Additional metadata
  metadata JSONB DEFAULT '{}', -- Flexible storage for model settings, temperature, etc.
  tags TEXT[] DEFAULT '{}', -- For organization/filtering (e.g., ['formal', 'business'])

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT prompts_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT prompts_content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

-- ============================================
-- 3. PROMPT VERSION HISTORY TABLE
-- ============================================

CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,

  -- Snapshot of prompt at this version
  version INTEGER NOT NULL, -- Version number (1, 2, 3, ...)
  content TEXT NOT NULL, -- Prompt content at this version
  template_variables JSONB DEFAULT '[]', -- Variables at this version
  metadata JSONB DEFAULT '{}', -- Settings at this version

  -- Version metadata
  change_summary TEXT, -- Optional: What changed in this version
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Who created this version
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(prompt_id, version) -- Prevent duplicate version numbers for same prompt
);

-- ============================================
-- 4. PROMPT USAGE LOGS (Optional Analytics)
-- ============================================

CREATE TABLE prompt_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Usage context
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prompt_version INTEGER NOT NULL, -- Which version was used

  -- Link to generated content (optional)
  outfit_combination_id UUID REFERENCES outfit_combinations(id) ON DELETE SET NULL, -- For outfit prompts

  -- Performance metrics (optional)
  execution_time_ms INTEGER, -- How long did the AI take
  tokens_used INTEGER, -- OpenAI token count
  api_cost_rp NUMERIC(10,2), -- Cost in Rupiah

  -- Result metadata
  success BOOLEAN DEFAULT true, -- Did the generation succeed
  error_message TEXT -- If failed, why?
);

-- ============================================
-- 5. INDEXES (Performance Optimization)
-- ============================================

-- Prompts indexes
CREATE INDEX idx_prompts_user_id ON prompts(user_id);
CREATE INDEX idx_prompts_type ON prompts(type);
CREATE INDEX idx_prompts_is_active ON prompts(is_active) WHERE is_active = true;
CREATE INDEX idx_prompts_created_at ON prompts(created_at DESC);
CREATE INDEX idx_prompts_tags ON prompts USING GIN(tags); -- For array search

-- Prompt versions indexes
CREATE INDEX idx_prompt_versions_prompt_id ON prompt_versions(prompt_id);
CREATE INDEX idx_prompt_versions_created_at ON prompt_versions(created_at DESC);

-- Prompt usage logs indexes
CREATE INDEX idx_prompt_usage_logs_prompt_id ON prompt_usage_logs(prompt_id);
CREATE INDEX idx_prompt_usage_logs_user_id ON prompt_usage_logs(user_id);
CREATE INDEX idx_prompt_usage_logs_used_at ON prompt_usage_logs(used_at DESC);
CREATE INDEX idx_prompt_usage_logs_outfit_id ON prompt_usage_logs(outfit_combination_id) WHERE outfit_combination_id IS NOT NULL;

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_usage_logs ENABLE ROW LEVEL SECURITY;

-- Prompts Policies (Users manage their own prompts)
CREATE POLICY "Users can view their own prompts"
  ON prompts FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT policy allows both user inserts AND trigger (system) inserts
-- IMPORTANT: auth.uid() IS NULL check is required for trigger_create_default_prompts
-- When trigger runs, auth.uid() returns NULL (system context), not the new user's ID
CREATE POLICY "Users can insert their own prompts"
  ON prompts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR   -- Normal user insert via API
    auth.uid() IS NULL         -- Allow trigger (system context) insert
  );

CREATE POLICY "Users can update their own prompts"
  ON prompts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prompts"
  ON prompts FOR DELETE
  USING (auth.uid() = user_id);

-- Prompt Versions Policies (Read-only access via parent prompt)
CREATE POLICY "Users can view versions of their prompts"
  ON prompt_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = prompt_versions.prompt_id
      AND prompts.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert prompt versions"
  ON prompt_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = prompt_versions.prompt_id
      AND prompts.user_id = auth.uid()
    )
  );

-- Prompt Usage Logs Policies (Users view their own usage)
CREATE POLICY "Users can view their own prompt usage"
  ON prompt_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage logs"
  ON prompt_usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 7. TRIGGERS & FUNCTIONS
-- ============================================

-- Function: Auto-create version history on prompt update
CREATE OR REPLACE FUNCTION create_prompt_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create version if content actually changed
  IF (OLD.content IS DISTINCT FROM NEW.content) OR
     (OLD.template_variables IS DISTINCT FROM NEW.template_variables) OR
     (OLD.metadata IS DISTINCT FROM NEW.metadata) THEN

    -- Increment version number
    NEW.version = OLD.version + 1;

    -- Insert into version history
    INSERT INTO prompt_versions (
      prompt_id,
      version,
      content,
      template_variables,
      metadata,
      created_by,
      change_summary
    ) VALUES (
      NEW.id,
      OLD.version, -- Save the OLD version before update
      OLD.content,
      OLD.template_variables,
      OLD.metadata,
      auth.uid(),
      'Auto-versioned on update'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Version history on update
CREATE TRIGGER trigger_create_prompt_version
  BEFORE UPDATE ON prompts
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content OR
        OLD.template_variables IS DISTINCT FROM NEW.template_variables OR
        OLD.metadata IS DISTINCT FROM NEW.metadata)
  EXECUTE FUNCTION create_prompt_version();

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update timestamp
CREATE TRIGGER trigger_update_prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_prompts_updated_at();

-- Function: Increment usage count on prompt use
CREATE OR REPLACE FUNCTION increment_prompt_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE prompts
  SET
    usage_count = usage_count + 1,
    last_used_at = NEW.used_at
  WHERE id = NEW.prompt_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Increment usage count
CREATE TRIGGER trigger_increment_prompt_usage
  AFTER INSERT ON prompt_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION increment_prompt_usage();

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Function: Get latest active prompt by type for user
CREATE OR REPLACE FUNCTION get_user_active_prompt(
  p_user_id UUID,
  p_type prompt_type
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  content TEXT,
  version INTEGER,
  template_variables JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.content,
    p.version,
    p.template_variables
  FROM prompts p
  WHERE p.user_id = p_user_id
    AND p.type = p_type
    AND p.is_active = true
  ORDER BY p.updated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Rollback prompt to previous version
CREATE OR REPLACE FUNCTION rollback_prompt_to_version(
  p_prompt_id UUID,
  p_target_version INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_old_version RECORD;
  v_prompt_user_id UUID;
BEGIN
  -- Check prompt ownership
  SELECT user_id INTO v_prompt_user_id
  FROM prompts
  WHERE id = p_prompt_id;

  IF v_prompt_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: You can only rollback your own prompts';
  END IF;

  -- Get the target version
  SELECT * INTO v_old_version
  FROM prompt_versions
  WHERE prompt_id = p_prompt_id
    AND version = p_target_version;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version % not found for prompt %', p_target_version, p_prompt_id;
  END IF;

  -- Update prompt with old version content (this will trigger versioning)
  UPDATE prompts
  SET
    content = v_old_version.content,
    template_variables = v_old_version.template_variables,
    metadata = v_old_version.metadata
  WHERE id = p_prompt_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. SEED DATA (Default System Prompts)
-- ============================================

-- Note: Default prompts are now auto-generated for each user on signup.
-- See section 10 below for the trigger implementation.

-- ============================================
-- 10. AUTO-GENERATE DEFAULT PROMPTS ON USER SIGNUP
-- ============================================

-- Function: Create 3 default prompts for new user
-- This function is triggered automatically when a user registers
CREATE OR REPLACE FUNCTION create_default_prompts_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Outfit Recommendation Prompt (from src/lib/services/outfit-generator.ts)
  INSERT INTO prompts (
    user_id,
    name,
    description,
    type,
    content,
    template_variables,
    is_active,
    version,
    metadata
  ) VALUES (
    NEW.id, -- New user's UUID
    'Default Outfit Stylist',
    'Professional fashion stylist for creating outfit combinations',
    'outfit_recommendation',
    'You are a professional fashion stylist AI.

Your task: Create outfit combinations (1-5) from the provided wardrobe items for the occasion: "{{occasion}}".

IMPORTANT: Prioritize quality over quantity. If only 1 great combination exists, return just that one. If no items match the occasion or user preferences well, return an empty combinations array. Don''t force mismatched outfits.

COMBINATION RULES:
1. Full Body items (Dress/Jumpsuit): Can be standalone OR can be layered with outerwear/accessories
2. Regular outfit: Must include at minimum:
   - Top (or Outerwear as top layer)
   - Bottom
   - Footwear
3. Optional additions: Outerwear, Accessories (recommended for completeness)

STYLE GUIDELINES:
- Color harmony: Consider complementary, analogous, or monochromatic color schemes
- Occasion appropriateness: Match formality level to "{{occasion}}"
- Practical combinations: Ensure items work together functionally
- Style coherence: Maintain consistent aesthetic (casual, formal, sporty, etc.)
{{note}}

BACKGROUND COLOR RECOMMENDATIONS:
For each combination, recommend 3-5 background colors suitable for Instagram Story (1080x1920) that:
- Complement the outfit''s color palette
- Enhance visual appeal without overwhelming the outfit
- Consider contrast for better product visibility
- Provide variety (neutral, bold, soft options)

For each combination, provide:
1. Reasoning as bullet points (2-4 concise points explaining why items work together)
2. Background color recommendations with hex codes and descriptive names

Example reasoning format:
- Color harmony: Navy blazer complements beige chinos for balanced contrast
- Occasion fit: Professional polish suitable for work/office settings
- Style coherence: Clean lines maintain minimalist aesthetic',
    '[{"name": "occasion", "required": true}, {"name": "note", "required": false}]'::jsonb,
    true, -- is_active
    1, -- version
    '{"source": "default", "model": "gpt-4o-2024-08-06"}'::jsonb
  );

  -- 2. Item Analysis Prompt (from src/lib/constants/item-master.ts)
  INSERT INTO prompts (
    user_id,
    name,
    description,
    type,
    content,
    template_variables,
    is_active,
    version,
    metadata
  ) VALUES (
    NEW.id,
    'Default Item Analyzer',
    'Professional fashion item analyzer for e-commerce',
    'item_analysis',
    'You are a professional fashion item analyzer for an e-commerce platform.

Analyze the uploaded fashion item image and extract:

1. **Category**: Identify the main category (fullbodies, tops, outerwears, bottoms, accessories, footwears)
2. **Subcategory**: Identify the specific type (e.g., Shirt, Jeans, Sneaker)
3. **Colors**: List all visible colors in the item (primary and secondary)
4. **Fit**: Determine the fit style (oversized, regular, slim, etc.)
5. **Occasions**: Suggest suitable occasions for wearing this item
6. **Description**: Provide a detailed description including:
   - Brand identification if visible
   - Material estimation (cotton, denim, leather, etc.)
   - Style characteristics (casual, formal, sporty, etc.)
   - Unique design features
   - Overall aesthetic

**IMPORTANT**: Only use values from the provided category, color, fit, and occasion lists.

Be accurate, specific, and professional in your analysis.',
    '[]'::jsonb, -- No template variables
    true,
    1,
    '{"source": "default", "model": "gpt-4o"}'::jsonb
  );

  -- 3. Item Improvement Prompt (from src/lib/constants/item-master.ts)
  INSERT INTO prompts (
    user_id,
    name,
    description,
    type,
    content,
    template_variables,
    is_active,
    version,
    metadata
  ) VALUES (
    NEW.id,
    'Default Image Improver',
    'Professional e-commerce product photo enhancement',
    'item_improvement',
    'Professional e-commerce product photo

Requirements:
- Clean, white or light neutral background (studio-style)
- Front-facing view, centered composition
- Professional lighting with no harsh shadows
- Remove any other objects, people, hangers, or distractions from the background
- High-quality product photography style
- Suitable for premium online fashion retail
- Item should look pristine, well-pressed, and professionally presented
- Sharp focus, high resolution appearance
- IMPORTANT: Maintain the original design, colors, patterns, and shape of the clothing item

The result should look like a professional catalog photo from a premium fashion brand website or high-end e-commerce store.',
    '[]'::jsonb, -- No template variables
    true,
    1,
    '{"source": "default", "model": "gpt-image-1"}'::jsonb
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-create default prompts when user registers
CREATE OR REPLACE TRIGGER trigger_create_default_prompts
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_prompts_for_new_user();

-- ============================================
-- 11. BACKFILL EXISTING USERS (Manual Execution)
-- ============================================

-- If you already have existing users without default prompts, run this:
-- WARNING: This will create 3 prompts for ALL users who don't have any prompts yet

-- DO $$
-- DECLARE
--   user_record RECORD;
-- BEGIN
--   FOR user_record IN
--     SELECT id FROM auth.users
--     WHERE NOT EXISTS (
--       SELECT 1 FROM prompts WHERE user_id = auth.users.id
--     )
--   LOOP
--     PERFORM create_default_prompts_for_new_user_manual(user_record.id);
--   END LOOP;
-- END $$;

-- Helper function for manual backfill (bypasses trigger)
CREATE OR REPLACE FUNCTION create_default_prompts_for_new_user_manual(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Same logic as trigger, but accepts user_id parameter
  -- (Copy-paste INSERT statements from above with NEW.id replaced by p_user_id)

  -- 1. Outfit Recommendation
  INSERT INTO prompts (user_id, name, description, type, content, template_variables, is_active, version, metadata)
  VALUES (
    p_user_id,
    'Default Outfit Stylist',
    'Professional fashion stylist for creating outfit combinations',
    'outfit_recommendation',
    'You are a professional fashion stylist AI.

Your task: Create outfit combinations (1-5) from the provided wardrobe items for the occasion: "{{occasion}}".

IMPORTANT: Prioritize quality over quantity. If only 1 great combination exists, return just that one. If no items match the occasion or user preferences well, return an empty combinations array. Don''t force mismatched outfits.

COMBINATION RULES:
1. Full Body items (Dress/Jumpsuit): Can be standalone OR can be layered with outerwear/accessories
2. Regular outfit: Must include at minimum:
   - Top (or Outerwear as top layer)
   - Bottom
   - Footwear
3. Optional additions: Outerwear, Accessories (recommended for completeness)

STYLE GUIDELINES:
- Color harmony: Consider complementary, analogous, or monochromatic color schemes
- Occasion appropriateness: Match formality level to "{{occasion}}"
- Practical combinations: Ensure items work together functionally
- Style coherence: Maintain consistent aesthetic (casual, formal, sporty, etc.)
{{note}}

BACKGROUND COLOR RECOMMENDATIONS:
For each combination, recommend 3-5 background colors suitable for Instagram Story (1080x1920) that:
- Complement the outfit''s color palette
- Enhance visual appeal without overwhelming the outfit
- Consider contrast for better product visibility
- Provide variety (neutral, bold, soft options)

For each combination, provide:
1. Reasoning as bullet points (2-4 concise points explaining why items work together)
2. Background color recommendations with hex codes and descriptive names

Example reasoning format:
- Color harmony: Navy blazer complements beige chinos for balanced contrast
- Occasion fit: Professional polish suitable for work/office settings
- Style coherence: Clean lines maintain minimalist aesthetic',
    '[{"name": "occasion", "required": true}, {"name": "note", "required": false}]'::jsonb,
    true, 1, '{"source": "default", "model": "gpt-4o-2024-08-06"}'::jsonb
  );

  -- 2. Item Analysis
  INSERT INTO prompts (user_id, name, description, type, content, template_variables, is_active, version, metadata)
  VALUES (
    p_user_id,
    'Default Item Analyzer',
    'Professional fashion item analyzer for e-commerce',
    'item_analysis',
    'You are a professional fashion item analyzer for an e-commerce platform.

Analyze the uploaded fashion item image and extract:

1. **Category**: Identify the main category (fullbodies, tops, outerwears, bottoms, accessories, footwears)
2. **Subcategory**: Identify the specific type (e.g., Shirt, Jeans, Sneaker)
3. **Colors**: List all visible colors in the item (primary and secondary)
4. **Fit**: Determine the fit style (oversized, regular, slim, etc.)
5. **Occasions**: Suggest suitable occasions for wearing this item
6. **Description**: Provide a detailed description including:
   - Brand identification if visible
   - Material estimation (cotton, denim, leather, etc.)
   - Style characteristics (casual, formal, sporty, etc.)
   - Unique design features
   - Overall aesthetic

**IMPORTANT**: Only use values from the provided category, color, fit, and occasion lists.

Be accurate, specific, and professional in your analysis.',
    '[]'::jsonb, true, 1, '{"source": "default", "model": "gpt-4o"}'::jsonb
  );

  -- 3. Item Improvement
  INSERT INTO prompts (user_id, name, description, type, content, template_variables, is_active, version, metadata)
  VALUES (
    p_user_id,
    'Default Image Improver',
    'Professional e-commerce product photo enhancement',
    'item_improvement',
    'Professional e-commerce product photo

Requirements:
- Clean, white or light neutral background (studio-style)
- Front-facing view, centered composition
- Professional lighting with no harsh shadows
- Remove any other objects, people, hangers, or distractions from the background
- High-quality product photography style
- Suitable for premium online fashion retail
- Item should look pristine, well-pressed, and professionally presented
- Sharp focus, high resolution appearance
- IMPORTANT: Maintain the original design, colors, patterns, and shape of the clothing item

The result should look like a professional catalog photo from a premium fashion brand website or high-end e-commerce store.',
    '[]'::jsonb, true, 1, '{"source": "default", "model": "gpt-image-1"}'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 12. VERIFICATION QUERIES
-- ============================================

-- Check if tables were created successfully:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('prompts', 'prompt_versions', 'prompt_usage_logs')
ORDER BY table_name;

-- Check if enum type was created:
SELECT typname, enumlabel
FROM pg_type
JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid
WHERE typname = 'prompt_type'
ORDER BY enumsortorder;

-- Check if trigger was created:
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_default_prompts';

-- Verify default prompts exist for a user (replace with actual user_id):
-- SELECT id, name, type, is_active, version, created_at
-- FROM prompts
-- WHERE user_id = 'your-user-uuid-here'
-- ORDER BY type;

-- ============================================
-- 13. USAGE EXAMPLES
-- ============================================

-- Example 1: Backfill existing users with default prompts
-- Run this to create default prompts for users who registered before the trigger was added:
-- DO $$
-- DECLARE
--   user_record RECORD;
--   prompt_count INT;
-- BEGIN
--   FOR user_record IN SELECT id FROM auth.users LOOP
--     -- Check if user already has prompts
--     SELECT COUNT(*) INTO prompt_count FROM prompts WHERE user_id = user_record.id;
--
--     IF prompt_count = 0 THEN
--       -- Create default prompts
--       PERFORM create_default_prompts_for_new_user_manual(user_record.id);
--       RAISE NOTICE 'Created default prompts for user: %', user_record.id;
--     END IF;
--   END LOOP;
-- END $$;

-- Example 2: Create a new custom prompt (user can have multiple prompts)
-- INSERT INTO prompts (user_id, name, description, type, content, template_variables)
-- VALUES (
--   auth.uid(),
--   'My Casual Style',
--   'Optimized for casual everyday outfits',
--   'outfit_recommendation',
--   'You are a fashion stylist. Create {{num_combinations}} casual outfit combinations for {{occasion}}. User note: {{note}}',
--   '[{"name": "occasion", "required": true}, {"name": "note", "required": false}, {"name": "num_combinations", "required": true}]'::jsonb
-- );

-- Example 3: Get user's active prompt for outfit recommendation
-- SELECT * FROM get_user_active_prompt(auth.uid(), 'outfit_recommendation');

-- Example 4: Get all prompts for current user
-- SELECT id, name, type, is_active, usage_count, last_used_at, created_at
-- FROM prompts
-- WHERE user_id = auth.uid()
-- ORDER BY type, created_at DESC;

-- Example 5: Log prompt usage
-- INSERT INTO prompt_usage_logs (prompt_id, user_id, prompt_version, outfit_combination_id, tokens_used, api_cost_rp)
-- VALUES (
--   'prompt-uuid-here',
--   auth.uid(),
--   3,
--   'outfit-combo-uuid-here',
--   1500,
--   150.00
-- );

-- Example 6: Rollback prompt to version 2
-- SELECT rollback_prompt_to_version('prompt-uuid-here', 2);

-- Example 7: View prompt version history
-- SELECT pv.version, pv.content, pv.created_at, pv.change_summary
-- FROM prompt_versions pv
-- WHERE pv.prompt_id = 'your-prompt-uuid'
-- ORDER BY pv.version DESC;

-- Example 8: Get usage analytics for a prompt
-- SELECT
--   DATE_TRUNC('day', used_at) AS day,
--   COUNT(*) AS usage_count,
--   AVG(execution_time_ms) AS avg_time_ms,
--   SUM(api_cost_rp) AS total_cost
-- FROM prompt_usage_logs
-- WHERE prompt_id = 'your-prompt-uuid'
-- GROUP BY day
-- ORDER BY day DESC;

-- ============================================
-- 14. EXECUTION NOTES
-- ============================================

-- 1. Execute this script in Supabase SQL Editor
-- 2. Verify tables created with verification queries in section 12
-- 3. Verify trigger created (check query in section 12)
-- 4. Test RLS policies by querying as authenticated user
-- 5. **For existing users**: Run backfill query (Example 1 in section 13) to create default prompts
-- 6. Test trigger: Create a new test user and verify 3 default prompts are auto-generated
-- 7. Integrate with application:
--    - Update API endpoints to save/load prompts from DB instead of hardcoded defaults
--    - Add UI for prompt management (CRUD operations)
--    - Log prompt usage in /api/recommend endpoint
--    - Implement rollback functionality in frontend

-- ============================================
-- KEY FEATURES SUMMARY
-- ============================================

-- ✅ Auto-generate 3 default prompts on user registration:
--    1. Default Outfit Stylist (outfit_recommendation)
--    2. Default Item Analyzer (item_analysis)
--    3. Default Image Improver (item_improvement)
--
-- ✅ Users can edit prompts (auto-versioned via trigger)
-- ✅ Rollback to previous versions via helper function
-- ✅ Usage tracking linked to outfit_combinations
-- ✅ RLS policies ensure users only manage their own prompts

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- Issue: User registration fails with "Database error saving new user"
-- Cause: RLS policy blocks trigger inserts because auth.uid() returns NULL in trigger context
-- Solution: Ensure INSERT policy allows NULL auth.uid() (see section 6, line 149-154)
--
-- Verify fix:
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'prompts' AND policyname LIKE '%insert%';
--
-- Expected: WITH CHECK should include "OR auth.uid() IS NULL"

-- Issue: Default prompts not created for new users
-- Cause: Trigger not installed or disabled
-- Solution: Check trigger exists:
-- SELECT trigger_name FROM information_schema.triggers
-- WHERE trigger_name = 'trigger_create_default_prompts';
--
-- Reinstall if missing: Execute section 10 again

-- Issue: Existing users don't have default prompts
-- Cause: They registered before trigger was added
-- Solution: Run backfill query in Example 1, section 13

-- Last Updated: 2025-11-12
