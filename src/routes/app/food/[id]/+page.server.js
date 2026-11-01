import { error, fail, redirect } from '@sveltejs/kit';
import { flash, requireUser } from '../../../../lib/server/auth.js';
import { addEntry, cleanDate, deleteOwnFood, getFood } from '../../../../lib/server/data.js';
import { mealLabel } from '../../../../lib/nutrition.js';

export async function load({ cookies, params, url }) {
	const user = await requireUser(cookies);
	const food = await getFood(Number(params.id), user.id);
	if (!food) error(404, 'Food not found');

	return {
		food,
		meal: url.searchParams.get('meal') ?? 'lunch',
		date: cleanDate(url.searchParams.get('date')),
		from: url.searchParams.get('from') ?? 'search',
		// Only foods the user created can be deleted
		isOwn: food.created_by === user.id
	};
}

export const actions = {
	// "Add to Diary"
	add: async ({ request, cookies, params }) => {
		const user = await requireUser(cookies);
		const food = await getFood(Number(params.id), user.id);
		if (!food) error(404, 'Food not found');

		const form = await request.formData();
		const meal = String(form.get('meal'));
		const date = cleanDate(String(form.get('date')));
		const from = String(form.get('from'));

		const result = await addEntry(user.id, food.id, date, meal, Number(form.get('quantity')), from === 'scan' ? 'barcode' : 'search');
		if (result.error) return fail(400, { error: result.error });

		flash(cookies, `${food.name} added to ${mealLabel(meal)}`);
		redirect(303, from === 'home' ? '/app/homepage' : `/app/diary?date=${date}`);
	},

	// "Delete food" - only for the user's own foods
	delete: async ({ cookies, params }) => {
		const user = await requireUser(cookies);
		const food = await getFood(Number(params.id), user.id);
		if (!food) error(404, 'Food not found');
		if (!(await deleteOwnFood(user.id, Number(params.id)))) {
			return fail(403, { error: 'You can only delete foods you created.' });
		}
		flash(cookies, `${food.name} deleted`);
		redirect(303, '/app/search');
	}
};