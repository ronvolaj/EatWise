import { fail, redirect } from '@sveltejs/kit';
import { createSession, flash, getUser, verifyPassword } from '../../../lib/server/auth.js';
import { queryOne } from '../../../lib/server/db.js';

export async function load({ cookies }) {
	// Already logged in: go straight to the app
	if (await getUser(cookies)) redirect(303, '/app/homepage');
}

export const actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const login = String(form.get('login') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (!login || !password) {
			return fail(400, { login, error: 'Please enter your email or username and your password.' });
		}

		// You can log in with your email OR your username
		const user = await queryOne('SELECT id, username, password_hash FROM users WHERE email = ? OR username = ?', [
			login,
			login
		]);

		// Same message for both cases, so nobody can find out which emails are registered
		if (!user || !(await verifyPassword(password, user.password_hash))) {
			return fail(400, { login, error: 'Email/username or password is wrong.' });
		}

		await createSession(cookies, user.id);
		flash(cookies, `Welcome back, ${user.username}!`);
		redirect(303, '/app/homepage');
	}
};