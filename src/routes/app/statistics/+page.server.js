import { requireUser } from '../../../lib/server/auth.js';
import { getEntries, listWeights, today } from '../../../lib/server/data.js';
import { dailyNutrition } from '../../../lib/server/stats.js';

export async function load({ cookies }) {
	const user = await requireUser(cookies);

	// The three queries run at the same time
	const [days, entries, weights] = await Promise.all([
		dailyNutrition(user.id, 30), // kcal + macros per day, oldest first, last one is today
		getEntries(user.id, today()),
		listWeights(user.id)
	]);

	return { days, entries, weights };
}
