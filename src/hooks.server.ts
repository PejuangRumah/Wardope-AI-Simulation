import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Create Supabase client for this request
	event.locals.supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		global: {
			headers: { Authorization: event.request.headers.get('Authorization') || '' }
		}
	});

	// Get session from request cookies
	const {
		data: { session }
	} = await event.locals.supabase.auth.getSession();

	event.locals.session = session;

	return resolve(event);
};
