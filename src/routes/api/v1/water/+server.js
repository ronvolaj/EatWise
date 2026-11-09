import { json } from '@sveltejs/kit';
import { changeWater, getWater, today } from '#lib/server/data.js';
import { readJson, requireApiUser } from '#lib/server/api.js';

// GET /api/v1/water -> { date, glasses, max } for today
export async function GET({ request }) {
	const user = await requireApiUser(request);
	const date = today();
	return json({ date, glasses: await getWater(user.id, date), max: 8 });
}

// POST /api/v1/water
// Body: { delta: 1 } or { delta: -1 }. Stays between 0 and 8. Answer: the new value
export async function POST({ request }) {
	const user = await requireApiUser(request);
	const body = await readJson(request);
	const date = today();
	await changeWater(user.id, date, Number(body.delta) > 0 ? 1 : -1);
	return json({ date, glasses: await getWater(user.id, date), max: 8 });
}