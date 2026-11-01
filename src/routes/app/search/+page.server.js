import { requireUser } from '../../../lib/server/auth.js';
import { listFoods, recentFoods } from '../../../lib/server/data.js';

export async function load({ cookies }) {
	const user = await requireUser(cookies);
	return {
		foods: await listFoods(user.id),
		// The last foods this user added to the diary
		recent: await recentFoods(user.id)
	};
}