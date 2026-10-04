import { fail } from '@sveltejs/kit';
import { flash, requireUser } from '../../../lib/server/auth.js';
import {
	addWeight,
	currentWeight,
	parseProfile,
	updateProfile,
	updateSettings,
	weightFromForm
} from '../../../lib/server/data.js';

export async function load({ cookies }) {
	const user = await requireUser(cookies);
	return { weight: await currentWeight(user.id) };
}

export const actions = {
	// Goal, body data and activity. The daily targets are calculated again.
	profile: async ({ request, cookies }) => {
		const user = await requireUser(cookies);
		const form = await request.formData();
		const profile = parseProfile(form, user.units);
		if (profile.error) return fail(400, { section: 'profile', error: profile.error });

		const plan = await updateProfile(user.id, profile.values);
		flash(cookies, `Saved. Your new daily goal is ${plan.kcal} kcal.`);
	},

	// Quick weight entry for today
	weight: async ({ request, cookies }) => {
		const user = await requireUser(cookies);
		const form = await request.formData();
		const kg = weightFromForm(form, 'weight', user.units);
		if (!Number.isFinite(kg) || kg < 30 || kg > 300) {
			return fail(400, { section: 'weight', error: 'Please enter a weight between 30 and 300 kg.' });
		}
		await addWeight(user.id, kg);
		flash(cookies, 'Weight saved');
	},

	settings: async ({ request, cookies }) => {
		const user = await requireUser(cookies);
		const form = await request.formData();
		await updateSettings(user.id, {
			units: form.get('units'),
			theme: form.get('theme'),
			notifications: form.get('notifications') === 'on'
		});
		flash(cookies, 'Settings saved');
	}
};