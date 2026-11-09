import { json } from '@sveltejs/kit';
import { recentFoods } from '#lib/server/data.js';
import { foodJson, requireApiUser } from '#lib/server/api.js';

// GET /api/v1/foods/recent?limit=5
// Foods the user added to the diary lately, newest first (limit 1 to 20)
export async function GET({ request, url }) {
	const user = await requireApiUser(request);
	const limit = Math.min(20, Math.max(1, Math.floor(Number(url.searchParams.get('limit')) || 5)));
	const foods = await recentFoods(user.id, limit);
	return json(foods.map(foodJson));
}