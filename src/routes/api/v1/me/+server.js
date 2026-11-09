import { json } from '@sveltejs/kit';
import { listWeights } from '#lib/server/data.js';
import { publicUser, requireApiUser } from '#lib/server/api.js';

// GET /api/v1/me
// The logged-in user with profile, daily targets, settings and current weight (kg)
export async function GET({ request }) {
	const user = await requireApiUser(request);
	const weights = await listWeights(user.id);
	const last = weights.at(-1);
	return json({ ...publicUser(user), weight_kg: last ? Number(last.weight) : null });
}