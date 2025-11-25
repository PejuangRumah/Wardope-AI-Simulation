import type { SupabaseClient, Session } from '@supabase/supabase-js';

/**
 * Validates a Supabase session by verifying the JWT token.
 * This is more secure than just using getSession() which doesn't validate the JWT.
 *
 * @param supabase - The Supabase client instance
 * @returns Validated session object or null if invalid
 */
export const getValidatedSession = async (
	supabase: SupabaseClient
): Promise<Session | null> => {

	const {
		data: { session }
	} = await supabase.auth.getSession();

	try {
		// Validate the JWT by calling getClaims
		const { data, error } = await supabase.auth.getClaims(session.access_token);


		const { claims } = data;
		// Return a validated session object
		return {
			access_token: session.access_token,
			refresh_token: session.refresh_token,
			expires_at: claims.exp,
			expires_in: claims.exp - Math.round(Date.now() / 1000),
			token_type: 'bearer',
			user: {
				app_metadata: claims.app_metadata ?? {},
				aud: 'authenticated',
				created_at: '',
				id: claims.sub,
				email: claims.email,
				phone: claims.phone,
				user_metadata: claims.user_metadata ?? {},
				is_anonymous: claims.is_anonymous
			}
		};
	} catch (err) {
		console.error('[AUTH] ❌ Session validation error:', err);
		return null;
	}
};
