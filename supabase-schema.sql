-- ============================================
-- Wardope AI - Supabase Database Schema
-- ============================================
-- This schema supports personal wardrobe management with AI-powered outfit recommendations
-- Features: User authentication, item storage, vector embeddings, outfit history
-- Execute this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- ============================================
-- 1. EXTENSIONS
-- ============================================

-- Enable pgvector for semantic search with embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 2. CORE TABLES
-- ============================================

-- Wardrobe Items: User's personal clothing items
CREATE TABLE wardrobe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core item information (from WardrobeItem type)
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Top', 'Bottom', 'Footwear', 'Outerwear', 'Accessory')),
  subcategory TEXT NOT NULL, -- e.g., 'Shirt', 'Jeans', 'Sneakers'
  color TEXT NOT NULL,

  -- Optional attributes
  fit TEXT, -- e.g., 'Regular', 'Slim', 'Oversized'
  brand TEXT,
  occasion TEXT, -- e.g., 'casual', 'formal', 'work'

  -- Image URLs (Supabase Storage)
  image_url TEXT, -- Original uploaded image
  improved_image_url TEXT, -- AI-improved image from gpt-image-1

  -- Metadata
  metadata JSONB DEFAULT '{}', -- Flexible storage for additional CSV columns or future fields

  -- AI Analysis metadata
  analysis_confidence NUMERIC(3,2), -- 0.00 to 1.00 from Vision API
  analysis_metadata JSONB, -- Store full ItemAnalysis response

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Item Embeddings: Vector embeddings for semantic search
CREATE TABLE item_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES wardrobe_items(id) ON DELETE CASCADE,

  -- OpenAI text-embedding-3-small produces 1536-dimensional vectors
  embedding vector(1536) NOT NULL,

  -- Track embedding generation
  model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One embedding per item (enforce with unique constraint)
  UNIQUE(item_id)
);

-- Outfit Combinations: AI-generated outfit recommendations
CREATE TABLE outfit_combinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Request context
  occasion TEXT NOT NULL, -- e.g., 'casual', 'formal', 'work'
  note TEXT, -- User preferences from request

  -- AI response (from OutfitCombination type)
  reasoning TEXT NOT NULL, -- Overall outfit explanation
  style_notes TEXT NOT NULL, -- Styling tips
  confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),

  -- Background colors for Instagram Story (JSON array)
  -- Format: [{"hex": "#F5F5DC", "name": "Soft Beige"}, ...]
  background_colors JSONB NOT NULL,

  -- Metadata
  api_cost_rp NUMERIC(10,2), -- Track OpenAI API cost for this generation

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Outfit Items: Items included in each outfit combination (junction table)
CREATE TABLE outfit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combination_id UUID NOT NULL REFERENCES outfit_combinations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES wardrobe_items(id) ON DELETE CASCADE,

  -- Per-item reasoning (from OutfitItem type)
  reason TEXT NOT NULL, -- Why this specific item works in the combination

  -- Enforce no duplicate items in same combination
  UNIQUE(combination_id, item_id)
);

-- ============================================
-- 2.5 MASTER DATA TABLES (Shared Reference Data)
-- ============================================

-- Categories: Main clothing categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subcategories: Specific item types within categories
CREATE TABLE subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, name)
);

-- Colors: Available color options
CREATE TABLE colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  hex_code TEXT, -- Optional hex color code (e.g., '#FFFFFF')
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Occasions: Event/situation types
CREATE TABLE occasions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fits: Clothing fit types
CREATE TABLE fits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3. INDEXES (Performance Optimization)
-- ============================================

-- Wardrobe Items indexes
CREATE INDEX idx_wardrobe_items_user_id ON wardrobe_items(user_id);
CREATE INDEX idx_wardrobe_items_category ON wardrobe_items(category);
CREATE INDEX idx_wardrobe_items_occasion ON wardrobe_items(occasion);
CREATE INDEX idx_wardrobe_items_created_at ON wardrobe_items(created_at DESC);

-- Item Embeddings indexes
CREATE INDEX idx_item_embeddings_item_id ON item_embeddings(item_id);

-- Vector similarity search index (IVFFlat for fast approximate nearest neighbor)
-- Note: Build this index AFTER inserting initial data (requires training data)
-- CREATE INDEX idx_item_embeddings_vector ON item_embeddings
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- Outfit Combinations indexes
CREATE INDEX idx_outfit_combinations_user_id ON outfit_combinations(user_id);
CREATE INDEX idx_outfit_combinations_occasion ON outfit_combinations(occasion);
CREATE INDEX idx_outfit_combinations_created_at ON outfit_combinations(created_at DESC);

-- Outfit Items indexes
CREATE INDEX idx_outfit_items_combination_id ON outfit_items(combination_id);
CREATE INDEX idx_outfit_items_item_id ON outfit_items(item_id);

-- Master Data indexes
CREATE INDEX idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX idx_categories_display_order ON categories(display_order);
CREATE INDEX idx_subcategories_display_order ON subcategories(display_order);
CREATE INDEX idx_colors_display_order ON colors(display_order);
CREATE INDEX idx_occasions_display_order ON occasions(display_order);
CREATE INDEX idx_fits_display_order ON fits(display_order);

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE wardrobe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE occasions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fits ENABLE ROW LEVEL SECURITY;

-- Wardrobe Items Policies
CREATE POLICY "Users can view their own wardrobe items"
  ON wardrobe_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wardrobe items"
  ON wardrobe_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wardrobe items"
  ON wardrobe_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wardrobe items"
  ON wardrobe_items FOR DELETE
  USING (auth.uid() = user_id);

-- Item Embeddings Policies (accessed via wardrobe_items)
CREATE POLICY "Users can view embeddings for their items"
  ON item_embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wardrobe_items
      WHERE wardrobe_items.id = item_embeddings.item_id
      AND wardrobe_items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert embeddings for their items"
  ON item_embeddings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wardrobe_items
      WHERE wardrobe_items.id = item_embeddings.item_id
      AND wardrobe_items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update embeddings for their items"
  ON item_embeddings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM wardrobe_items
      WHERE wardrobe_items.id = item_embeddings.item_id
      AND wardrobe_items.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wardrobe_items
      WHERE wardrobe_items.id = item_embeddings.item_id
      AND wardrobe_items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete embeddings for their items"
  ON item_embeddings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM wardrobe_items
      WHERE wardrobe_items.id = item_embeddings.item_id
      AND wardrobe_items.user_id = auth.uid()
    )
  );

-- Outfit Combinations Policies
CREATE POLICY "Users can view their own outfit combinations"
  ON outfit_combinations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outfit combinations"
  ON outfit_combinations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own outfit combinations"
  ON outfit_combinations FOR DELETE
  USING (auth.uid() = user_id);

-- Outfit Items Policies (accessed via outfit_combinations)
CREATE POLICY "Users can view outfit items for their combinations"
  ON outfit_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM outfit_combinations
      WHERE outfit_combinations.id = outfit_items.combination_id
      AND outfit_combinations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert outfit items for their combinations"
  ON outfit_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM outfit_combinations
      WHERE outfit_combinations.id = outfit_items.combination_id
      AND outfit_combinations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete outfit items for their combinations"
  ON outfit_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM outfit_combinations
      WHERE outfit_combinations.id = outfit_items.combination_id
      AND outfit_combinations.user_id = auth.uid()
    )
  );

-- Master Data Policies (Permissive for Internal Use)
-- All authenticated users can manage master data

CREATE POLICY "Anyone authenticated can view categories"
  ON categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can manage categories"
  ON categories FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can view subcategories"
  ON subcategories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can manage subcategories"
  ON subcategories FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can view colors"
  ON colors FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can manage colors"
  ON colors FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can view occasions"
  ON occasions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can manage occasions"
  ON occasions FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can view fits"
  ON fits FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can manage fits"
  ON fits FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 5. TRIGGERS & FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wardrobe_items_updated_at
  BEFORE UPDATE ON wardrobe_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers for master data tables
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subcategories_updated_at
  BEFORE UPDATE ON subcategories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_colors_updated_at
  BEFORE UPDATE ON colors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_occasions_updated_at
  BEFORE UPDATE ON occasions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fits_updated_at
  BEFORE UPDATE ON fits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. STORAGE BUCKETS
-- ============================================

-- Note: Storage buckets must be created via Supabase Dashboard or Storage API
-- This SQL is for reference only (not executable in SQL Editor)

-- Bucket: wardrobe-images (original uploaded images)
-- Configuration:
--   - Public: false (require authentication)
--   - File size limit: 5MB
--   - Allowed MIME types: image/jpeg, image/png, image/webp
--   - RLS Policy: Users can upload/view/delete their own images

-- Bucket: improved-images (AI-generated improved images)
-- Configuration:
--   - Public: false (require authentication)
--   - File size limit: 10MB
--   - Allowed MIME types: image/png
--   - RLS Policy: Users can view/delete their own improved images

-- ============================================
-- STORAGE RLS POLICIES (Execute in Dashboard)
-- ============================================

-- These policies need to be created in Supabase Dashboard > Storage > Policies

-- For 'wardrobe-images' bucket:
-- 1. SELECT: Allow users to view their own images
--    Policy: (bucket_id = 'wardrobe-images' AND (storage.foldername(name))[1] = auth.uid()::text)
--
-- 2. INSERT: Allow users to upload to their own folder
--    Policy: (bucket_id = 'wardrobe-images' AND (storage.foldername(name))[1] = auth.uid()::text)
--
-- 3. DELETE: Allow users to delete their own images
--    Policy: (bucket_id = 'wardrobe-images' AND (storage.foldername(name))[1] = auth.uid()::text)

-- For 'improved-images' bucket:
-- Same policies as above, but with bucket_id = 'improved-images'

-- ============================================
-- 7. HELPER FUNCTIONS (Optional - For Future Use)
-- ============================================

-- Function: Search items by semantic similarity
-- Usage: SELECT * FROM search_items_by_embedding(user_id, query_embedding, top_k, category_filter)
CREATE OR REPLACE FUNCTION search_items_by_embedding(
  p_user_id UUID,
  p_embedding vector(1536),
  p_limit INT DEFAULT 10,
  p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  color TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wi.id,
    wi.description,
    wi.category,
    wi.subcategory,
    wi.color,
    1 - (ie.embedding <=> p_embedding) AS similarity
  FROM wardrobe_items wi
  JOIN item_embeddings ie ON wi.id = ie.item_id
  WHERE wi.user_id = p_user_id
    AND (p_category IS NULL OR wi.category = p_category)
  ORDER BY ie.embedding <=> p_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. SEED DATA (Optional - For Testing)
-- ============================================

-- Master Data: Categories
INSERT INTO categories (name, display_order) VALUES
  ('Top', 1),
  ('Bottom', 2),
  ('Footwear', 3),
  ('Outerwear', 4),
  ('Accessory', 5)
ON CONFLICT (name) DO NOTHING;

-- Master Data: Subcategories (linked to categories)
-- Top subcategories
INSERT INTO subcategories (category_id, name, display_order)
SELECT c.id, s.name, s.display_order
FROM categories c
CROSS JOIN (VALUES
  ('T-Shirt', 1),
  ('Shirt', 2),
  ('Polo Shirt', 3),
  ('Blouse', 4),
  ('Tank Top', 5),
  ('Sweater', 6),
  ('Hoodie', 7),
  ('Sweatshirt', 8),
  ('Cardigan', 9),
  ('Jersey', 10)
) AS s(name, display_order)
WHERE c.name = 'Top'
ON CONFLICT (category_id, name) DO NOTHING;

-- Bottom subcategories
INSERT INTO subcategories (category_id, name, display_order)
SELECT c.id, s.name, s.display_order
FROM categories c
CROSS JOIN (VALUES
  ('Jeans', 1),
  ('Trousers', 2),
  ('Chinos', 3),
  ('Pants', 4),
  ('Shorts', 5),
  ('Skirt', 6),
  ('Leggings', 7),
  ('Joggers', 8)
) AS s(name, display_order)
WHERE c.name = 'Bottom'
ON CONFLICT (category_id, name) DO NOTHING;

-- Footwear subcategories
INSERT INTO subcategories (category_id, name, display_order)
SELECT c.id, s.name, s.display_order
FROM categories c
CROSS JOIN (VALUES
  ('Sneakers', 1),
  ('Running Shoes', 2),
  ('Boots', 3),
  ('Loafers', 4),
  ('Sandals', 5),
  ('Heels', 6),
  ('Flats', 7),
  ('Slip-Ons', 8)
) AS s(name, display_order)
WHERE c.name = 'Footwear'
ON CONFLICT (category_id, name) DO NOTHING;

-- Outerwear subcategories
INSERT INTO subcategories (category_id, name, display_order)
SELECT c.id, s.name, s.display_order
FROM categories c
CROSS JOIN (VALUES
  ('Jacket', 1),
  ('Blazer', 2),
  ('Coat', 3),
  ('Windbreaker', 4),
  ('Vest', 5),
  ('Parka', 6)
) AS s(name, display_order)
WHERE c.name = 'Outerwear'
ON CONFLICT (category_id, name) DO NOTHING;

-- Accessory subcategories
INSERT INTO subcategories (category_id, name, display_order)
SELECT c.id, s.name, s.display_order
FROM categories c
CROSS JOIN (VALUES
  ('Bag', 1),
  ('Backpack', 2),
  ('Hat', 3),
  ('Cap', 4),
  ('Scarf', 5),
  ('Belt', 6),
  ('Watch', 7),
  ('Sunglasses', 8),
  ('Jewelry', 9),
  ('Socks', 10)
) AS s(name, display_order)
WHERE c.name = 'Accessory'
ON CONFLICT (category_id, name) DO NOTHING;

-- Master Data: Colors
INSERT INTO colors (name, hex_code, display_order) VALUES
  ('Black', '#000000', 1),
  ('White', '#FFFFFF', 2),
  ('Grey', '#808080', 3),
  ('Navy', '#000080', 4),
  ('Blue', '#0000FF', 5),
  ('Light Blue', '#ADD8E6', 6),
  ('Red', '#FF0000', 7),
  ('Pink', '#FFC0CB', 8),
  ('Green', '#008000', 9),
  ('Olive', '#808000', 10),
  ('Brown', '#A52A2A', 11),
  ('Beige', '#F5F5DC', 12),
  ('Tan', '#D2B48C', 13),
  ('Orange', '#FFA500', 14),
  ('Yellow', '#FFFF00', 15),
  ('Purple', '#800080', 16),
  ('Maroon', '#800000', 17),
  ('Cream', '#FFFDD0', 18),
  ('Khaki', '#F0E68C', 19),
  ('Denim', '#1560BD', 20)
ON CONFLICT (name) DO NOTHING;

-- Master Data: Occasions
INSERT INTO occasions (name, description, display_order) VALUES
  ('Casual', 'Everyday relaxed wear', 1),
  ('Formal', 'Business formal, weddings, black-tie events', 2),
  ('Work', 'Professional office attire', 3),
  ('Party', 'Social gatherings, celebrations', 4),
  ('Sport', 'Athletic activities, gym wear', 5),
  ('Outdoor', 'Hiking, camping, outdoor activities', 6),
  ('Beach', 'Beach, pool, summer vacation', 7),
  ('Lounge', 'Home comfort, relaxation', 8)
ON CONFLICT (name) DO NOTHING;

-- Master Data: Fits
INSERT INTO fits (name, display_order) VALUES
  ('Regular', 1),
  ('Slim', 2),
  ('Oversized', 3),
  ('Relaxed', 4),
  ('Tight', 5),
  ('Loose', 6),
  ('Athletic', 7),
  ('Tailored', 8)
ON CONFLICT (name) DO NOTHING;

-- Example: Insert a test user wardrobe item (replace user_id with actual UUID)
-- INSERT INTO wardrobe_items (user_id, description, category, subcategory, color, fit, brand, occasion)
-- VALUES (
--   'YOUR_USER_UUID_HERE',
--   'Classic white cotton shirt with button-down collar',
--   'Top',
--   'Shirt',
--   'White',
--   'Regular',
--   'Uniqlo',
--   'work'
-- );

-- ============================================
-- EXECUTION NOTES
-- ============================================

-- 1. Execute this entire script in Supabase SQL Editor
-- 2. Verify all tables are created: https://supabase.com/dashboard/project/_/editor
-- 3. Create storage buckets manually in Dashboard > Storage
-- 4. Set up storage policies in Dashboard > Storage > Policies
-- 5. After inserting items, build the vector index (uncomment line 94-96)
-- 6. Test RLS policies by querying as authenticated user

-- Check if schema was created successfully:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'wardrobe_items',
    'item_embeddings',
    'outfit_combinations',
    'outfit_items',
    'categories',
    'subcategories',
    'colors',
    'occasions',
    'fits'
  )
ORDER BY table_name;

-- Verify master data was seeded:
SELECT 'categories' AS table_name, COUNT(*) AS count FROM categories
UNION ALL
SELECT 'subcategories', COUNT(*) FROM subcategories
UNION ALL
SELECT 'colors', COUNT(*) FROM colors
UNION ALL
SELECT 'occasions', COUNT(*) FROM occasions
UNION ALL
SELECT 'fits', COUNT(*) FROM fits;
