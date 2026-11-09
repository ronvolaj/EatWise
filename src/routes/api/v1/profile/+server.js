import { json } from '@sveltejs/kit';
import { listWeights, updateProfile } from '#lib/server/data.js';
import { check, readJson, requireApiUser } from '#lib/server/api.js';

// PUT /api/v1/profile
// Body: { goal, activity, height, target_weight } (height in cm, target_weight in kg)
// The daily targets are calculated again. Answer: { age, kcal, protein, carbs, fat }
export async function PUT({ request }) {
	const user = await requireApiUser(request);
	const body = await readJson(request);
	const weights = await listWeights(user.id);
	const currentWeight = Number(weights.at(-1)?.weight ?? user.target_weight_kg);

	const result = check(
		await updateProfile(
			user,
			{
				goal: String(body.goal ?? ''),
				activity: String(body.activity ?? ''),
				height: Math.round(Number(body.height)),
				target: Math.round(Number(body.target_weight) * 10) / 10
			},
			currentWeight
		)
	);
	return json(result.plan);
}