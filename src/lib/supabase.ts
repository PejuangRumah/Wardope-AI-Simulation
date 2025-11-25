import { createBrowserClient } from '@supabase/ssr';

// Browser client for client-side operations
// Uses singleton pattern - only creates one instance
// Using import.meta.env for Netlify compatibility during SSR build
export const supabase = createBrowserClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);
