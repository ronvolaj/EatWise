import { error, json } from '@sveltejs/kit';
import { addEntry, cleanDate, getFood } from '#lib/server/data.js';
import { check, diaryDay, readJson, requireApiUser } from '#lib/server/api.js';

// GET /api/v1/diary?date=2026-10-25
// One day: { date, entries, total, water }. Without date (or a date in the future): today
export async function GET({ request, url }) {
	const user = await requireApiUser(request);
	const date = cleanDate(url.searchParams.get('date'));
	return json(await diaryDay(user.id, date));
}

// POST /api/v1/diary
// Body: { food_id, meal, quantity, date, source }
// meal: breakfast | lunch | dinner | snack, quantity in g, date optional (today),
// source: search | barcode (optional). Answer 201: the whole day, like GET
export async function POST({ request }) {
	const user = await requireApiUser(request);
	const body = await readJson(request);

	const food = await getFood(Number(body.food_id), user.id);
	if (!food) error(404, 'Food not found');

	const date = cleanDate(body.date == null ? null : String(body.date));
	const source = body.source === 'barcode' ? 'barcode' : 'search';
	check(await addEntry(user.id, food.id, date, String(body.meal ?? ''), Number(body.quantity), source));
	return json(await diaryDay(user.id, date), { status: 201 });
}