import { fail } from '@sveltejs/kit';
import { flash, requireUser } from '../../../lib/server/auth.js';
import { addDays, deleteEntry, getEntries, getWater, isDate, today } from '../../../lib/server/data.js';

export async function load({ cookies, url }) {
	const user = await requireUser(cookies);
	const now = today();
	const asked = url.searchParams.get('date');
	// Only real days, and not in the future
	const date = isDate(asked) && asked <= now ? asked : now;

	return {
		date,
		isToday: date === now,
		prev: addDays(date, -1),
		next: date < now ? addDays(date, 1) : null,
		entries: await getEntries(user.id, date),
		water: await getWater(user.id, date)
	};
}

export const actions = {
	delete: async ({ request, cookies }) => {
		const user = await requireUser(cookies);
		const form = await request.formData();
		const deleted = await deleteEntry(user.id, Number(form.get('id')));
		if (!deleted) return fail(404, { error: 'Entry not found.' });
		flash(cookies, 'Entry removed');
	}
};