import { requireUser } from '../../../lib/server/auth.js';
import { dailyKcal, getEntries, listWeights, today } from '../../../lib/server/data.js';

export async function load({ cookies }) {
	const user = await requireUser(cookies);
	return {
		days: await dailyKcal(user.id, 30), // oldest first, last one is today
		entries: await getEntries(user.id, today()),
		weights: await listWeights(user.id)
	};
}
