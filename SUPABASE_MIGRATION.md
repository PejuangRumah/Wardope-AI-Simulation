# Supabase Migration Guide - Wardope AI

Step-by-step checklist untuk migrasi dari CSV-based ke Supabase-based wardrobe system.

## Important Note: Field Name Change

**Database schema menggunakan `description` (bukan `desc`)** karena `desc` adalah reserved keyword di PostgreSQL. Existing codebase masih menggunakan `desc` untuk backward compatibility, dan akan di-refactor secara bertahap saat implementasi Phase 2-3.

**Migration mapping**:
- CSV/TypeScript: `desc` → Database: `description`
- Saat query dari DB, map kembali: `description` → `desc` (untuk existing code)

---

## Overview

**Tujuan**: Migrasi dari data statis (CSV) ke dynamic user wardrobe dengan authentication, database storage, dan vector search.

**Tech Stack**:
- Database: Supabase PostgreSQL + pgvector
- Auth: Supabase Auth (Email/Password)
- Storage: Supabase Storage (images)
- Client: `@supabase/supabase-js`

**Estimasi Waktu**: 2-3 hari untuk MVP

---

## Phase 1: Setup & Infrastructure

### 1.1 Database Setup

- [ ] Open Supabase SQL Editor: https://supabase.com/dashboard/project/ogrfmapwyxodzhlwygrl/sql
- [ ] Copy entire content dari `supabase-schema.sql`
- [ ] Execute di SQL Editor
- [ ] Verify tables created:
  ```sql
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name;
  ```
- [ ] Expected tables: `wardrobe_items`, `item_embeddings`, `outfit_combinations`, `outfit_items`, `categories`, `subcategories`, `colors`, `occasions`, `fits`
- [ ] Verify master data seeded:
  ```sql
  SELECT 'categories' AS table_name, COUNT(*) AS count FROM categories
  UNION ALL
  SELECT 'subcategories', COUNT(*) FROM subcategories
  UNION ALL
  SELECT 'colors', COUNT(*) FROM colors
  UNION ALL
  SELECT 'occasions', COUNT(*) FROM occasions
  UNION ALL
  SELECT 'fits', COUNT(*) FROM fits;
  ```
- [ ] Expected counts: categories (5), subcategories (~40), colors (20), occasions (8), fits (8)

### 1.2 Storage Buckets Setup

- [ ] Buka Dashboard > Storage: https://supabase.com/dashboard/project/ogrfmapwyxodzhlwygrl/storage/buckets
- [ ] Create bucket: `wardrobe-images`
  - Public: **No** (require auth)
  - File size limit: 5 MB
  - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
- [ ] Create bucket: `improved-images`
  - Public: **No** (require auth)
  - File size limit: 10 MB
  - Allowed MIME types: `image/png`

### 1.3 Storage RLS Policies

Untuk setiap bucket, create 3 policies di Dashboard > Storage > Policies:

#### Bucket: `wardrobe-images`

**Policy 1: SELECT (View own images)**
```sql
(bucket_id = 'wardrobe-images' AND (storage.foldername(name))[1] = auth.uid()::text)
```

**Policy 2: INSERT (Upload to own folder)**
```sql
(bucket_id = 'wardrobe-images' AND (storage.foldername(name))[1] = auth.uid()::text)
```

**Policy 3: DELETE (Delete own images)**
```sql
(bucket_id = 'wardrobe-images' AND (storage.foldername(name))[1] = auth.uid()::text)
```

#### Bucket: `improved-images`

- [ ] Repeat 3 policies di atas, ganti `wardrobe-images` dengan `improved-images`

### 1.4 Install Dependencies

- [ ] Install Supabase client:
  ```bash
  npm install @supabase/supabase-js
  ```
- [ ] Install SvelteKit types (if needed):
  ```bash
  npm install -D @sveltejs/adapter-auto
  ```

### 1.5 Environment Variables

- [ ] ✅ Already done: `.env` updated dengan Supabase credentials
- [ ] Verify variables:
  ```
  PUBLIC_SUPABASE_URL=https://ogrfmapwyxodzhlwygrl.supabase.co
  PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

### 1.6 Master Data Management (Internal Use)

**Master data tables** sudah di-create dan di-seed dengan data awal. Tables ini shared untuk semua user dan bisa di-manage oleh siapapun (internal testing only).

**Available Tables:**
- `categories` - Top, Bottom, Footwear, Outerwear, Accessory (5 items)
- `subcategories` - Shirt, Jeans, Sneakers, dll (~40 items, linked to categories)
- `colors` - Black, White, Blue, dll (20 items with hex codes)
- `occasions` - Casual, Formal, Work, Party, dll (8 items)
- `fits` - Regular, Slim, Oversized, dll (8 items)

**Usage:**
- Frontend dapat fetch master data untuk dropdown/autocomplete
- User tetap bisa input custom values (master data hanya suggestion)
- `wardrobe_items` menggunakan TEXT fields (bukan FK) untuk flexibility
- Semua authenticated user bisa CRUD master data (untuk internal management)

**Managing Master Data:**
```sql
-- Add new color
INSERT INTO colors (name, hex_code, display_order)
VALUES ('Burgundy', '#800020', 21);

-- Add new subcategory for Top
INSERT INTO subcategories (category_id, name, display_order)
SELECT id, 'Turtleneck', 11 FROM categories WHERE name = 'Top';

-- View all subcategories for a category
SELECT s.name, s.display_order
FROM subcategories s
JOIN categories c ON s.category_id = c.id
WHERE c.name = 'Top'
ORDER BY s.display_order;
```

**Future: Master Data CRUD UI** (Optional Phase 7)
- Admin page untuk manage master data
- Bulk import from CSV
- Reorder display_order via drag-and-drop

---

## Phase 2: Supabase Client & Auth

### 2.1 Create Supabase Client

- [ ] Create file: `src/lib/supabase.ts`
  ```typescript
  import { createClient } from '@supabase/supabase-js';
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

  export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
  ```

### 2.2 Add Database Types

- [ ] Create file: `src/lib/types/database.ts`
  ```typescript
  // Database types matching supabase-schema.sql
  export interface WardrobeItemDB {
    id: string;
    user_id: string;
    description: string;
    category: 'Top' | 'Bottom' | 'Footwear' | 'Outerwear' | 'Accessory';
    subcategory: string;
    color: string;
    fit?: string;
    brand?: string;
    occasion?: string;
    image_url?: string;
    improved_image_url?: string;
    metadata?: Record<string, any>;
    analysis_confidence?: number;
    analysis_metadata?: any;
    created_at: string;
    updated_at: string;
  }

  export interface ItemEmbeddingDB {
    id: string;
    item_id: string;
    embedding: number[];
    model: string;
    generated_at: string;
  }

  export interface OutfitCombinationDB {
    id: string;
    user_id: string;
    occasion: string;
    note?: string;
    reasoning: string;
    style_notes: string;
    confidence: 'low' | 'medium' | 'high';
    background_colors: Array<{ hex: string; name: string }>;
    api_cost_rp?: number;
    created_at: string;
  }

  export interface OutfitItemDB {
    id: string;
    combination_id: string;
    item_id: string;
    reason: string;
  }

  // Master Data Types
  export interface CategoryDB {
    id: string;
    name: string;
    display_order: number;
    created_at: string;
    updated_at: string;
  }

  export interface SubcategoryDB {
    id: string;
    category_id: string;
    name: string;
    display_order: number;
    created_at: string;
    updated_at: string;
  }

  export interface ColorDB {
    id: string;
    name: string;
    hex_code?: string;
    display_order: number;
    created_at: string;
    updated_at: string;
  }

  export interface OccasionDB {
    id: string;
    name: string;
    description?: string;
    display_order: number;
    created_at: string;
    updated_at: string;
  }

  export interface FitDB {
    id: string;
    name: string;
    display_order: number;
    created_at: string;
    updated_at: string;
  }
  ```

### 2.3 Auth UI Components

- [ ] Create folder: `src/lib/components/auth/`
- [ ] Create `LoginForm.svelte`:
  ```svelte
  <script lang="ts">
    import { supabase } from '$lib/supabase';

    let email = '';
    let password = '';
    let loading = false;
    let error = '';

    async function handleLogin() {
      loading = true;
      error = '';

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        error = signInError.message;
      }

      loading = false;
    }
  </script>

  <form on:submit|preventDefault={handleLogin}>
    <input type="email" bind:value={email} placeholder="Email" required />
    <input type="password" bind:value={password} placeholder="Password" required />
    <button type="submit" disabled={loading}>
      {loading ? 'Logging in...' : 'Login'}
    </button>
    {#if error}
      <p class="error">{error}</p>
    {/if}
  </form>
  ```

- [ ] Create `RegisterForm.svelte` (similar structure untuk sign up)

### 2.4 Auth State Management

- [ ] Create file: `src/lib/stores/auth.ts`
  ```typescript
  import { writable } from 'svelte/store';
  import { supabase } from '$lib/supabase';
  import type { User } from '@supabase/supabase-js';

  export const user = writable<User | null>(null);

  // Initialize auth listener
  supabase.auth.onAuthStateChange((event, session) => {
    user.set(session?.user ?? null);
  });

  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    user.set(session?.user ?? null);
  });
  ```

### 2.5 Protected Routes

- [ ] Create layout: `src/routes/(protected)/+layout.svelte`
  ```svelte
  <script lang="ts">
    import { user } from '$lib/stores/auth';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    onMount(() => {
      if (!$user) {
        goto('/login');
      }
    });
  </script>

  {#if $user}
    <slot />
  {:else}
    <p>Loading...</p>
  {/if}
  ```

---

## Phase 3: Wardrobe Management (Core Feature)

### 3.1 Image Upload Service

- [ ] Create file: `src/lib/services/storage.ts`
  ```typescript
  import { supabase } from '$lib/supabase';

  export async function uploadWardrobeImage(
    userId: string,
    file: File
  ): Promise<{ url: string; path: string } | null> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('wardrobe-images')
      .upload(filePath, file);

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('wardrobe-images')
      .getPublicUrl(filePath);

    return { url: publicUrl, path: filePath };
  }

  export async function deleteWardrobeImage(path: string): Promise<boolean> {
    const { error } = await supabase.storage
      .from('wardrobe-images')
      .remove([path]);

    return !error;
  }
  ```

### 3.2 Wardrobe Item Service

- [ ] Create file: `src/lib/services/wardrobe.ts`
  ```typescript
  import { supabase } from '$lib/supabase';
  import type { WardrobeItemDB } from '$lib/types/database';
  import { generateEmbedding } from './embeddings';

  export async function createWardrobeItem(
    userId: string,
    itemData: Partial<WardrobeItemDB>
  ): Promise<WardrobeItemDB | null> {
    const { data, error } = await supabase
      .from('wardrobe_items')
      .insert({
        user_id: userId,
        ...itemData
      })
      .select()
      .single();

    if (error) {
      console.error('Create item error:', error);
      return null;
    }

    // Generate embedding for semantic search
    if (data) {
      const embeddingText = `${data.description} ${data.category} ${data.subcategory} ${data.color}`;
      const embedding = await generateEmbedding(embeddingText);

      if (embedding) {
        await supabase.from('item_embeddings').insert({
          item_id: data.id,
          embedding,
          model: 'text-embedding-3-small'
        });
      }
    }

    return data;
  }

  export async function getWardrobeItems(userId: string): Promise<WardrobeItemDB[]> {
    const { data, error } = await supabase
      .from('wardrobe_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return data || [];
  }

  export async function deleteWardrobeItem(itemId: string): Promise<boolean> {
    // RLS will ensure user can only delete their own items
    const { error } = await supabase
      .from('wardrobe_items')
      .delete()
      .eq('id', itemId);

    return !error;
  }
  ```

### 3.3 API Endpoint: Add Wardrobe Item

- [ ] Create file: `src/routes/api/wardrobe/add/+server.ts`
  ```typescript
  import { json } from '@sveltejs/kit';
  import type { RequestHandler } from './$types';
  import { supabase } from '$lib/supabase';
  import { uploadWardrobeImage } from '$lib/services/storage';
  import { createWardrobeItem } from '$lib/services/wardrobe';
  import { analyzeItemImage } from '$lib/services/item-analyzer';

  export const POST: RequestHandler = async ({ request }) => {
    // Get user session
    const authHeader = request.headers.get('Authorization');
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '') || ''
    );

    if (authError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return json({ error: 'Image file required' }, { status: 400 });
    }

    // 1. Upload image to storage
    const uploadResult = await uploadWardrobeImage(user.id, imageFile);
    if (!uploadResult) {
      return json({ error: 'Image upload failed' }, { status: 500 });
    }

    // 2. Analyze image with GPT-4o Vision
    const imageBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const analysis = await analyzeItemImage(base64Image);

    if (!analysis) {
      return json({ error: 'Image analysis failed' }, { status: 500 });
    }

    // 3. Create wardrobe item in database
    const item = await createWardrobeItem(user.id, {
      description: analysis.description,
      category: analysis.category,
      subcategory: analysis.subcategory,
      color: analysis.colors.join(', '),
      fit: analysis.fit,
      brand: analysis.brand,
      occasion: analysis.occasions.join(', '),
      image_url: uploadResult.url,
      analysis_confidence: analysis.confidence,
      analysis_metadata: analysis
    });

    if (!item) {
      return json({ error: 'Failed to create wardrobe item' }, { status: 500 });
    }

    return json({ item });
  };
  ```

### 3.4 Frontend: Wardrobe Page

- [ ] Create file: `src/routes/(protected)/wardrobe/+page.svelte`
  ```svelte
  <script lang="ts">
    import { onMount } from 'svelte';
    import { user } from '$lib/stores/auth';
    import { getWardrobeItems } from '$lib/services/wardrobe';
    import type { WardrobeItemDB } from '$lib/types/database';

    let items: WardrobeItemDB[] = [];
    let loading = true;

    onMount(async () => {
      if ($user) {
        items = await getWardrobeItems($user.id);
        loading = false;
      }
    });

    async function handleImageUpload(event: Event) {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/wardrobe/add', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: formData
      });

      if (response.ok) {
        // Refresh items
        items = await getWardrobeItems($user!.id);
      }
    }
  </script>

  <div>
    <h1>My Wardrobe</h1>

    <input type="file" accept="image/*" on:change={handleImageUpload} />

    {#if loading}
      <p>Loading...</p>
    {:else}
      <div class="grid">
        {#each items as item}
          <div class="item-card">
            <img src={item.image_url} alt={item.description} />
            <h3>{item.subcategory}</h3>
            <p>{item.description}</p>
            <span>{item.color}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  ```

---

## Phase 4: Outfit Recommendation (Migration from CSV)

### 4.1 Update Vector Search Service

- [ ] Modify file: `src/lib/services/vector-search.ts`
  - Replace in-memory embeddings dengan Supabase query
  - Use SQL cosine similarity: `embedding <=> query_embedding`

- [ ] New function:
  ```typescript
  export async function searchItemsByEmbedding(
    userId: string,
    queryEmbedding: number[],
    options: {
      category?: string;
      limit?: number;
    } = {}
  ): Promise<WardrobeItemDB[]> {
    const { data, error } = await supabase.rpc('search_items_by_embedding', {
      p_user_id: userId,
      p_embedding: queryEmbedding,
      p_limit: options.limit || 10,
      p_category: options.category || null
    });

    return data || [];
  }
  ```

### 4.2 Update Outfit Generator Service

- [ ] Modify file: `src/lib/services/outfit-generator.ts`
  - Remove CSV parsing logic
  - Replace `parseCSV()` calls dengan `getWardrobeItems(userId)`
  - Update `generateOutfits()` function signature:
    ```typescript
    export async function generateOutfits(
      userId: string,
      occasion: string,
      note?: string
    ): Promise<OutfitCombination[]> {
      // 1. Get user's wardrobe items
      const items = await getWardrobeItems(userId);

      // 2. Generate embeddings for semantic search
      const itemsWithEmbeddings = await getItemsWithEmbeddings(userId, items);

      // 3. Balance categories
      const balancedItems = balanceItemsByCategory(itemsWithEmbeddings);

      // 4. Generate outfits with GPT-4o
      const combinations = await generateOutfitsFromItems(
        balancedItems,
        occasion,
        note
      );

      return combinations;
    }
    ```

### 4.3 Save Outfit History

- [ ] Create file: `src/lib/services/outfit-history.ts`
  ```typescript
  import { supabase } from '$lib/supabase';
  import type { OutfitCombinationDB, OutfitItemDB } from '$lib/types/database';

  export async function saveOutfitCombination(
    userId: string,
    combination: {
      occasion: string;
      note?: string;
      reasoning: string;
      style_notes: string;
      confidence: 'low' | 'medium' | 'high';
      background_colors: Array<{ hex: string; name: string }>;
      items: Array<{ item_id: string; reason: string }>;
      api_cost_rp?: number;
    }
  ): Promise<OutfitCombinationDB | null> {
    // 1. Insert combination
    const { data: combo, error: comboError } = await supabase
      .from('outfit_combinations')
      .insert({
        user_id: userId,
        occasion: combination.occasion,
        note: combination.note,
        reasoning: combination.reasoning,
        style_notes: combination.style_notes,
        confidence: combination.confidence,
        background_colors: combination.background_colors,
        api_cost_rp: combination.api_cost_rp
      })
      .select()
      .single();

    if (comboError || !combo) {
      console.error('Save combination error:', comboError);
      return null;
    }

    // 2. Insert outfit items
    const outfitItems = combination.items.map(item => ({
      combination_id: combo.id,
      item_id: item.item_id,
      reason: item.reason
    }));

    const { error: itemsError } = await supabase
      .from('outfit_items')
      .insert(outfitItems);

    if (itemsError) {
      console.error('Save outfit items error:', itemsError);
    }

    return combo;
  }

  export async function getOutfitHistory(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('outfit_combinations')
      .select(`
        *,
        outfit_items (
          *,
          wardrobe_items:item_id (*)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return data || [];
  }
  ```

### 4.4 Update API Endpoint: Recommend

- [ ] Modify file: `src/routes/api/recommend/+server.ts`
  - Add authentication check
  - Remove CSV upload handling
  - Get user ID from session
  - Call `generateOutfits(userId, occasion, note)`
  - Save results dengan `saveOutfitCombination()`

  ```typescript
  export const POST: RequestHandler = async ({ request }) => {
    // 1. Authenticate user
    const authHeader = request.headers.get('Authorization');
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '') || ''
    );

    if (authError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request
    const { occasion, note } = await request.json();

    // 3. Generate outfits
    const combinations = await generateOutfits(user.id, occasion, note);

    // 4. Save to history
    for (const combo of combinations) {
      await saveOutfitCombination(user.id, {
        occasion,
        note,
        reasoning: combo.reasoning,
        style_notes: combo.style_notes,
        confidence: combo.confidence,
        background_colors: combo.background_colors,
        items: combo.items.map(item => ({
          item_id: item.id,
          reason: item.reason
        }))
      });
    }

    return json({ combinations });
  };
  ```

### 4.5 Update Frontend: Outfit Recommendation Page

- [ ] Modify file: `src/routes/outfit-recommendation/+page.svelte`
  - Remove CSV upload UI
  - Add authentication check
  - Remove gender selector (data sudah di wardrobe user)
  - Update fetch request untuk include auth header
  - Add link ke wardrobe page

---

## Phase 5: Testing & Validation

### 5.1 Manual Testing Checklist

- [ ] **Auth Flow**
  - [ ] Register new account
  - [ ] Login dengan email/password
  - [ ] Logout
  - [ ] Protected routes redirect ke login

- [ ] **Wardrobe Management**
  - [ ] Upload item image
  - [ ] AI analysis works (category, color, desc)
  - [ ] Item saved ke database
  - [ ] Item visible di wardrobe page
  - [ ] Image visible dari Supabase Storage
  - [ ] Delete item works
  - [ ] Image deleted dari storage saat item deleted

- [ ] **Outfit Recommendation**
  - [ ] Generate outfit dari user's wardrobe
  - [ ] Recommendations make sense
  - [ ] Combinations saved ke history
  - [ ] Can view past recommendations

- [ ] **RLS (Row Level Security)**
  - [ ] User A cannot see User B's items
  - [ ] User A cannot delete User B's items
  - [ ] User A cannot see User B's outfit history

### 5.2 Supabase Dashboard Checks

- [ ] Check Tables > wardrobe_items: ada data
- [ ] Check Tables > item_embeddings: ada vectors
- [ ] Check Tables > outfit_combinations: ada history
- [ ] Check Storage > wardrobe-images: ada images
- [ ] Check Auth > Users: ada registered users

### 5.3 Performance Testing

- [ ] Upload 10+ items: speed acceptable?
- [ ] Generate outfit dengan 50+ items: works?
- [ ] Vector search performance: < 1 second?

---

## Phase 6: Optimization & Polish (Post-MVP)

### 6.1 Vector Index (After Data Available)

- [ ] After inserting 100+ items, build vector index:
  ```sql
  CREATE INDEX idx_item_embeddings_vector ON item_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
  ```
- [ ] Run `ANALYZE item_embeddings;` untuk update stats

### 6.2 Caching Strategy

- [ ] Implement Redis/KV cache untuk embeddings
- [ ] Cache user wardrobe items (invalidate on update)
- [ ] Cache outfit recommendations (1 hour)

### 6.3 UI/UX Improvements

- [ ] Add loading states
- [ ] Add error toasts
- [ ] Add skeleton loaders
- [ ] Add image preview sebelum upload
- [ ] Add batch delete items
- [ ] Add search/filter wardrobe
- [ ] Add outfit favorites

### 6.4 Cost Tracking

- [ ] Add usage_logs table untuk track API costs per user
- [ ] Display cost stats di dashboard
- [ ] Add usage limits per user

---

## Common Issues & Solutions

### Issue: RLS Policy Prevents Insert

**Symptom**: `new row violates row-level security policy`

**Solution**: Check user_id matches `auth.uid()` in INSERT statement

---

### Issue: Storage Upload Returns 403

**Symptom**: `Storage upload failed with 403 Forbidden`

**Solution**:
1. Verify bucket RLS policies are created
2. Check file path format: `userId/filename.ext`
3. Verify user is authenticated

---

### Issue: Vector Search Returns No Results

**Symptom**: `search_items_by_embedding()` returns empty

**Solution**:
1. Check embeddings are generated: `SELECT COUNT(*) FROM item_embeddings`
2. Verify user_id matches in wardrobe_items
3. Check RLS policies on item_embeddings

---

### Issue: Auth Session Expired

**Symptom**: Requests return 401 after some time

**Solution**:
1. Implement token refresh in `auth.ts` store
2. Use `supabase.auth.onAuthStateChange()` to detect expiry
3. Add refresh token logic:
   ```typescript
   const { data, error } = await supabase.auth.refreshSession();
   ```

---

## Success Criteria

MVP is complete when:

- [x] User can register/login
- [x] User can upload wardrobe items
- [x] AI analysis works for uploaded items
- [x] Items stored in Supabase with embeddings
- [x] Outfit recommendations work from user's wardrobe
- [x] Outfit history is saved and viewable
- [x] RLS policies protect user data
- [x] Basic error handling exists

---

## Next Steps After MVP

1. **Social Features**: Share outfits dengan friends
2. **Affiliate Integration**: Suggest items user doesn't have (from CSV catalog)
3. **AI Styling Tips**: Generate personalized styling advice
4. **Calendar Integration**: Schedule outfits untuk upcoming events
5. **Mobile App**: React Native/Flutter wrapper
6. **Image Improvement**: Integrate `gpt-image-1` untuk better product photos

---

**Questions?** Check:
- Supabase Docs: https://supabase.com/docs
- SvelteKit Docs: https://kit.svelte.dev/docs
- OpenAI Embeddings: https://platform.openai.com/docs/guides/embeddings

**Last Updated**: 2025-01-12
