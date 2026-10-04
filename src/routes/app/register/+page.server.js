import { fail, redirect } from '@sveltejs/kit';
import { createSession, flash, getUser, hashPassword } from '../../../lib/server/auth.js';
import { createUser, parseProfile } from '../../../lib/server/data.js';

export async function load({ cookies }) {
	if (await getUser(cookies)) redirect(303, '/app/homepage');
}

export const actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const password2 = String(form.get('password2') ?? '');

		// Sent back on errors so the form stays filled in (never the password)
		const values = Object.fromEntries([...form.entries()].filter(([key]) => !key.startsWith('password')));
		const error = (message) => fail(400, { values, error: message });

		// ----- Account -----
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) return error('Please enter a valid email.');
		if (!/^[A-Za-z0-9_.]{3,50}$/.test(username)) {
			return error('Username: 3 to 50 characters, only letters, numbers, _ and .');
		}
		if (password.length < 8) return error('The password needs at least 8 characters.');
		if (password.length > 200) return error('The password is too long.');
		if (password !== password2) return error('The passwords do not match.');

		// ----- Profile (used to calculate the daily targets) -----
		const profile = parseProfile(form);
		if (profile.error) return error(profile.error);

		const result = await createUser({ email, username, passwordHash: await hashPassword(password) }, profile.values);
		if (result.error) return error(result.error);

		await createSession(cookies, result.id);
		flash(cookies, `Welcome to EatWise, ${username}!`);
		redirect(303, '/app/homepage');
	}
};