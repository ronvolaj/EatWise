import { json } from '@sveltejs/kit';
import { dailyKcal } from '#lib/server/data.js';
import { requireApiUser } from '#lib/server/api.js';

// GET /api/v1/stats/kcal?days=7
// Calories per day, oldest first. Days without entries have 0. days: 1 to 90
export async function GET({ request, url }) {
	const user = await requireApiUser(request);
	const days = Math.min(90, Math.max(1, Math.floor(Number(url.searchParams.get('days')) || 7)));
	return json(await dailyKcal(user.id, days));
}