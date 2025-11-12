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

CREATE POLICY "Users can insert their own prompts"
  ON prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

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

-- Note: These are template defaults. Each user can clone/customize them.
-- You may want to create a separate "system_user" account for default prompts
-- or implement a "is_system_default" boolean flag in the prompts table.

-- For now, this section is left empty. Default prompts are still hardcoded
-- in the application (src/lib/services/outfit-generator.ts).

-- To implement system defaults in DB:
-- 1. Add column: is_system_default BOOLEAN DEFAULT false
-- 2. Create a system user or use special UUID for system prompts
-- 3. Seed default prompts here with that user_id
-- 4. Update RLS to allow all users to READ system defaults

-- ============================================
-- 10. VERIFICATION QUERIES
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

-- ============================================
-- USAGE EXAMPLES
-- ============================================

-- Example 1: Create a new prompt
-- INSERT INTO prompts (user_id, name, description, type, content, template_variables)
-- VALUES (
--   auth.uid(),
--   'My Casual Style',
--   'Optimized for casual everyday outfits',
--   'outfit_recommendation',
--   'You are a fashion stylist. Create {{num_combinations}} casual outfit combinations for {{occasion}}. User note: {{note}}',
--   '[{"name": "occasion", "required": true}, {"name": "note", "required": false}, {"name": "num_combinations", "required": true}]'::jsonb
-- );

-- Example 2: Get user's active prompt for outfit recommendation
-- SELECT * FROM get_user_active_prompt(auth.uid(), 'outfit_recommendation');

-- Example 3: Log prompt usage
-- INSERT INTO prompt_usage_logs (prompt_id, user_id, prompt_version, outfit_combination_id, tokens_used, api_cost_rp)
-- VALUES (
--   'prompt-uuid-here',
--   auth.uid(),
--   3,
--   'outfit-combo-uuid-here',
--   1500,
--   150.00
-- );

-- Example 4: Rollback prompt to version 2
-- SELECT rollback_prompt_to_version('prompt-uuid-here', 2);

-- Example 5: View prompt version history
-- SELECT pv.version, pv.content, pv.created_at, pv.change_summary
-- FROM prompt_versions pv
-- WHERE pv.prompt_id = 'your-prompt-uuid'
-- ORDER BY pv.version DESC;

-- Example 6: Get usage analytics for a prompt
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
-- EXECUTION NOTES
-- ============================================

-- 1. Execute this script in Supabase SQL Editor
-- 2. Verify tables created with verification queries above
-- 3. Test RLS policies by querying as authenticated user
-- 4. Integrate with application:
--    - Update API endpoints to save/load prompts from DB
--    - Add UI for prompt management (CRUD operations)
--    - Log prompt usage in /api/recommend endpoint
--    - Implement rollback functionality in frontend

-- Last Updated: 2025-11-12
