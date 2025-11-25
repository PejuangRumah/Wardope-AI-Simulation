import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { email, password } = await request.json();

		// Validate input
		if (!email || !password) {
			return json(
				{ error: 'Email dan password harus diisi' },
				{ status: 400 }
			);
		}

		// Validate password length
		if (password.length < 6) {
			return json(
				{ error: 'Password minimal 6 karakter' },
				{ status: 400 }
			);
		}

		// Create admin client to check for existing users
		// Using process.env for Netlify compatibility during SSR build
		const supabaseAdmin = createClient(
			process.env.PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!,
			{
				auth: {
					autoRefreshToken: false,
					persistSession: false
				}
			}
		);

		// Check if email already exists
		const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

		if (listError) {
			console.error('Error checking existing users:', listError);
			return json(
				{ error: 'Terjadi kesalahan saat memeriksa email' },
				{ status: 500 }
			);
		}

		// Check if email is already registered
		const emailExists = existingUsers.users.some(
			(user) => user.email?.toLowerCase() === email.toLowerCase()
		);

		if (emailExists) {
			return json(
				{ error: 'Email sudah terdaftar. Silakan gunakan email lain atau login.' },
				{ status: 400 }
			);
		}

		// Email doesn't exist, proceed with registration using the regular client
		const { data, error: signUpError } = await locals.supabase.auth.signUp({
			email,
			password
		});

		if (signUpError) {
			return json(
				{ error: signUpError.message },
				{ status: 400 }
			);
		}

		// Check if email confirmation is required
		if (data.user && !data.session) {
			return json({
				success: true,
				message: 'Silakan cek email Anda untuk konfirmasi akun.',
				requiresConfirmation: true
			});
		}

		// Auto-login successful
		return json({
			success: true,
			message: 'Registrasi berhasil!',
			requiresConfirmation: false
		});

	} catch (err) {
		console.error('Registration error:', err);
		return json(
			{ error: 'Terjadi kesalahan saat registrasi' },
			{ status: 500 }
		);
	}
};
