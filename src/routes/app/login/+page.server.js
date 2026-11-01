import { fail, redirect } from '@sveltejs/kit';
import { getUser, login } from '../../../lib/server/auth.js';

export async function load({ cookies }) {
	if (await getUser(cookies)) redirect(303, '/app/homepage');
}

export const actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');

		const result = await login(cookies, email, password);
		if (result.error) return fail(400, { error: result.error, email });

		redirect(303, '/app/homepage');
	}
};