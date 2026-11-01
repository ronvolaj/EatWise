import { fail, redirect } from '@sveltejs/kit';
import { getUser, register } from '../../../lib/server/auth.js';

// Logged-in users do not need the onboarding
export async function load({ cookies }) {
	if (await getUser(cookies)) redirect(303, '/app/homepage');
}

export const actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const text = (name) => String(form.get(name) ?? '');

		const result = await register(cookies, {
			email: text('email'),
			username: text('username'),
			password: text('password'),
			confirm: text('confirm'),
			goal: text('goal'),
			sex: text('sex'),
			height: text('height'),
			weight: text('weight'),
			target: text('target'),
			birth: text('birth'),
			activity: text('activity')
		});
		if (result.error) return fail(400, { error: result.error });

		// No redirect here: the page shows "Creating your profile..." first
		return { created: true };
	}
};