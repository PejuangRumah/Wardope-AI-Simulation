import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import type { Session } from '@supabase/supabase-js';
import { getValidatedSession } from '$lib/utils/auth';

export const handle: Handle = async ({ event, resolve }) => {

	// Create a Supabase client specific to this request
	// This client can read and write cookies in server-side code
	// Using process.env for Netlify compatibility during SSR build
	event.locals.supabase = createServerClient(
		process.env.PUBLIC_SUPABASE_URL!,
		process.env.PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll: () => {
					const cookies = event.cookies.getAll();
					return cookies;
				},
				setAll: (cookiesToSet) => {
					cookiesToSet.forEach(({ name, value, options }) => {
						event.cookies.set(name, value, { ...options, path: '/' });
					});
				}
			}
		});

	// Helper function to get validated session (validates JWT)
	event.locals.getSession = async (): Promise<Session | null> => {
		return await getValidatedSession(event.locals.supabase);
	};

	// Resolve the request
	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			// Allow Supabase headers to be sent to the client
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
