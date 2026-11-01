import { fail } from '@sveltejs/kit';
import { flash, requireUser } from '../../../lib/server/auth.js';
import { cleanDate, getEntries, removeEntry, shiftDate, today, updateEntry } from '../../../lib/server/data.js';

export async function load({ cookies, url }) {
	const user = await requireUser(cookies);
	const date = cleanDate(url.searchParams.get('date'));
	return {
		date,
		today: today(),
		previous: shiftDate(date, -1),
		next: shiftDate(date, 1),
		entries: await getEntries(user.id, date)
	};
}

export const actions = {
	// Change quantity or move the entry to another meal
	update: async ({ request, cookies }) => {
		const user = await requireUser(cookies);
		const form = await request.formData();
		const result = await updateEntry(user.id, Number(form.get('id')), Number(form.get('quantity')), String(form.get('meal')));
		if (result.error) return fail(400, { error: result.error });
		flash(cookies, 'Entry updated');
	},

	remove: async ({ request, cookies }) => {
		const user = await requireUser(cookies);
		const form = await request.formData();
		await removeEntry(user.id, Number(form.get('id')));
		flash(cookies, 'Entry removed');
	}
};