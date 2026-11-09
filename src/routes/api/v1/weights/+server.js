import { json } from '@sveltejs/kit';
import { listWeights, logWeight } from '#lib/server/data.js';
import { check, readJson, requireApiUser, weightJson } from '#lib/server/api.js';

// GET /api/v1/weights -> [{ date, weight }] oldest first, weight in kg
export async function GET({ request }) {
	const user = await requireApiUser(request);
	const weights = await listWeights(user.id);
	return json(weights.map(weightJson));
}

// POST /api/v1/weights
// Body: { weight } in kg (the app converts pounds). One entry per day. Answer 201: all entries
export async function POST({ request }) {
	const user = await requireApiUser(request);
	const kg = Number((await readJson(request)).weight);
	check(await logWeight(user.id, Math.round(kg * 10) / 10));
	const weights = await listWeights(user.id);
	return json(weights.map(weightJson), { status: 201 });
}