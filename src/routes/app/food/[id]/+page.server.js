import { error, fail, redirect } from '@sveltejs/kit';
import { flash, requireUser } from '../../../../lib/server/auth.js';
import { addEntry, deleteOwnFood, getFood, isDate, mealForNow, today } from '../../../../lib/server/data.js';
import { MEALS, mealLabel } from '../../../../lib/nutrition.js';

export async function load({ cookies, params, url }) {
	const user = await requireUser(cookies);
	const food = await getFood(Number(params.id), user.id);
	if (!food) error(404, 'Food not found');

	const meal = url.searchParams.get('meal');
	const date = url.searchParams.get('date');
	const from = url.searchParams.get('from') ?? '';

	return {
		food,
		meal: MEALS.some((m) => m.id === meal) ? meal : mealForNow(),
		date: isDate(date) && date <= today() ? date : today(),
		today: today(),
		from,
		isOwn: food.created_by === user.id
	};
}

export const actions = {
	add: async ({ request, cookies, params }) => {
		const user = await requireUser(cookies);
		const form = await request.formData();
		const meal = String(form.get('meal') ?? '');
		const date = String(form.get('date') ?? '');
		const source = form.get('from') === 'scan' ? 'barcode' : 'search';

		const result = await addEntry(user.id, Number(params.id), date, meal, Number(form.get('quantity')), source);
		if (result.error) return fail(400, { error: result.error });

		const food = await getFood(Number(params.id), user.id);
		flash(cookies, `${food.name} added to ${mealLabel(meal)}`);
		redirect(303, `/app/diary?date=${date}`);
	},

	// Only for the user's own foods
	delete: async ({ cookies, params }) => {
		const user = await requireUser(cookies);
		const deleted = await deleteOwnFood(user.id, Number(params.id));
		if (!deleted) return fail(403, { error: 'You can only delete foods you created.' });

		flash(cookies, 'Food deleted');
		redirect(303, '/app/search');
	}
};