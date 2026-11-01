import { fail, redirect } from '@sveltejs/kit';
import { deleteUser, flash, logout, requireUser } from '../../../lib/server/auth.js';
import { listWeights, logWeight, toggleSetting, updateProfile, updateTargets } from '../../../lib/server/data.js';

export async function load({ cookies }) {
	const user = await requireUser(cookies);
	return { weights: await listWeights(user.id) };
}

export const actions = {
	// Goal, activity, height and target weight -> the daily targets are calculated again
	profile: async ({ request, cookies }) => {
		const user = await requireUser(cookies);
		const form = await request.formData();
		const imperial = user.units === 'imperial';
		// The form uses the user's unit, the database stores cm and kg
		const height = Number(form.get('height')) * (imperial ? 2.54 : 1);
		const target = Number(form.get('target')) / (imperial ? 2.205 : 1);
		const weights = await listWeights(user.id);

		const result = await updateProfile(
			user,
			{
				goal: String(form.get('goal')),
				activity: String(form.get('activity')),
				height: Math.round(height),
				target: Math.round(target * 10) / 10
			},
			weights.at(-1)?.weight ?? user.target_weight_kg
		);
		if (result.error) return fail(400, { profileError: result.error });
		flash(cookies, `Saved. Your new daily goal is ${result.plan.kcal} kcal.`);
	},

	// Daily calorie and macro targets
	targets: async ({ request, cookies }) => {
		const user = await requireUser(cookies);
		const form = await request.formData();
		const result = await updateTargets(user.id, {
			kcal: Number(form.get('kcal')),
			protein: Number(form.get('protein')),
			carbs: Number(form.get('carbs')),
			fat: Number(form.get('fat'))
		});
		if (result.error) return fail(400, { targetsError: result.error });
		flash(cookies, 'Targets updated');
	},

	weight: async ({ request, cookies }) => {
		const user = await requireUser(cookies);
		const form = await request.formData();
		let weight = Number(form.get('weight'));
		// The form uses the user's unit, the database stores kg
		if (user.units === 'imperial') weight = weight / 2.205;
		const result = await logWeight(user.id, Math.round(weight * 10) / 10);
		if (result.error) return fail(400, { weightError: result.error });
		flash(cookies, 'Weight logged successfully');
	},

	// Units, notifications and dark mode
	setting: async ({ request, cookies }) => {
		const user = await requireUser(cookies);
		const form = await request.formData();
		await toggleSetting(user, String(form.get('name')));
	},

	delete: async ({ cookies }) => {
		const user = await requireUser(cookies);
		await logout(cookies);
		await deleteUser(user.id);
		redirect(303, '/app/register');
	}
};