import { requireUser } from '../../../lib/server/auth.js';
import { isDate, listCategories, recentFoods, searchFoods, today } from '../../../lib/server/data.js';
import { MEALS } from '../../../lib/nutrition.js';

export async function load({ cookies, url }) {
	const user = await requireUser(cookies);
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
	const category = url.searchParams.get('category') ?? '';
	const meal = url.searchParams.get('meal') ?? '';
	const date = url.searchParams.get('date') ?? '';

	return {
		q,
		category,
		// Passed on to the food page, so the food lands in the right meal and day
		meal: MEALS.some((m) => m.id === meal) ? meal : '',
		date: isDate(date) && date <= today() ? date : '',
		foods: await searchFoods(user.id, q, category),
		categories: await listCategories(user.id),
		recent: q || category ? [] : await recentFoods(user.id)
	};
}