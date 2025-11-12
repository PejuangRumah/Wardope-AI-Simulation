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
