import { json } from '@sveltejs/kit';
import { updateTargets } from '#lib/server/data.js';
import { check, readJson, requireApiUser } from '#lib/server/api.js';

// PUT /api/v1/targets
// Body: { kcal, protein, carbs, fat } (kcal 800 to 6000, macros in g). Answer: the saved targets
export async function PUT({ request }) {
	const user = await requireApiUser(request);
	const body = await readJson(request);
	const targets = {
		kcal: Number(body.kcal),
		protein: Number(body.protein),
		carbs: Number(body.carbs),
		fat: Number(body.fat)
	};
	check(await updateTargets(user.id, targets));
	return json({
		kcal: Math.round(targets.kcal),
		protein: Math.round(targets.protein),
		carbs: Math.round(targets.carbs),
		fat: Math.round(targets.fat)
	});
}