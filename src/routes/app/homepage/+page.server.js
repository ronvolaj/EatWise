import { requireUser } from '../../../lib/server/auth.js';
import { changeWater, dailyKcal, getEntries, getWater, today } from '../../../lib/server/data.js';

export async function load({ cookies }) {
	const user = await requireUser(cookies);
	const date = today();
	return {
		date,
		entries: await getEntries(user.id, date),
		water: await getWater(user.id, date),
		week: await dailyKcal(user.id, 7)
	};
}

export const actions = {
	// Plus and minus buttons of the water card
	water: async ({ request, cookies }) => {
		const user = await requireUser(cookies);
		const form = await request.formData();
		await changeWater(user.id, today(), Number(form.get('delta')) > 0 ? 1 : -1);
	}
};
