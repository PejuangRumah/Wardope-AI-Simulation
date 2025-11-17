-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.colors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  hex_code text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT colors_pkey PRIMARY KEY (id)
);
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
CREATE TABLE public.item_embeddings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL UNIQUE,
  embedding USER-DEFINED NOT NULL,
  model text NOT NULL DEFAULT 'text-embedding-3-small'::text,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT item_embeddings_pkey PRIMARY KEY (id),
  CONSTRAINT item_embeddings_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.wardrobe_items(id)
);
CREATE TABLE public.occasions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT occasions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.outfit_combinations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  occasion text NOT NULL,
  note text,
  reasoning text NOT NULL,
  style_notes text NOT NULL,
  confidence text NOT NULL CHECK (confidence = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  background_colors jsonb NOT NULL,
  api_cost_rp numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  combination_image_url text,
  prompt_id uuid,
  needs_image_generation boolean DEFAULT false,
  CONSTRAINT outfit_combinations_pkey PRIMARY KEY (id),
  CONSTRAINT outfit_combinations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT outfit_combinations_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES public.prompts(id)
);
CREATE TABLE public.outfit_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  combination_id uuid NOT NULL,
  item_id uuid NOT NULL,
  reason text NOT NULL,
  CONSTRAINT outfit_items_pkey PRIMARY KEY (id),
  CONSTRAINT outfit_items_combination_id_fkey FOREIGN KEY (combination_id) REFERENCES public.outfit_combinations(id),
  CONSTRAINT outfit_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.wardrobe_items(id)
);
CREATE TABLE public.prompt_usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  prompt_id uuid NOT NULL,
  user_id uuid NOT NULL,
  used_at timestamp with time zone NOT NULL DEFAULT now(),
  prompt_version integer NOT NULL,
  outfit_combination_id uuid,
  execution_time_ms integer,
  tokens_used integer,
  api_cost_rp numeric,
  success boolean DEFAULT true,
  error_message text,
  CONSTRAINT prompt_usage_logs_pkey PRIMARY KEY (id),
  CONSTRAINT prompt_usage_logs_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES public.prompts(id),
  CONSTRAINT prompt_usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT prompt_usage_logs_outfit_combination_id_fkey FOREIGN KEY (outfit_combination_id) REFERENCES public.outfit_combinations(id)
);
CREATE TABLE public.prompt_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  prompt_id uuid NOT NULL,
  version integer NOT NULL,
  content text NOT NULL,
  template_variables jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  change_summary text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT prompt_versions_pkey PRIMARY KEY (id),
  CONSTRAINT prompt_versions_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES public.prompts(id),
  CONSTRAINT prompt_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (length(TRIM(BOTH FROM name)) > 0),
  description text,
  type USER-DEFINED NOT NULL,
  content text NOT NULL CHECK (length(TRIM(BOTH FROM content)) > 0),
  template_variables jsonb DEFAULT '[]'::jsonb,
  version integer NOT NULL DEFAULT 1,
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  last_used_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  tags ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT prompts_pkey PRIMARY KEY (id),
  CONSTRAINT prompts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.subcategories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  name text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT subcategories_pkey PRIMARY KEY (id),
  CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.wardrobe_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category = ANY (ARRAY['Top'::text, 'Bottom'::text, 'Footwear'::text, 'Outerwear'::text, 'Accessory'::text])),
  subcategory text NOT NULL,
  color text NOT NULL,
  fit text,
  brand text,
  occasion text,
  image_url text,
  improved_image_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  analysis_confidence numeric,
  analysis_metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT wardrobe_items_pkey PRIMARY KEY (id),
  CONSTRAINT wardrobe_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);