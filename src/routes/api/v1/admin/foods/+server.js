import { json } from '@sveltejs/kit';
import { createFood, listBuiltInFoods } from '#lib/server/data.js';
import { check, foodInput, foodJson, readJson, requireApiAdmin } from '#lib/server/api.js';

// GET /api/v1/admin/foods -> all built-in foods, each with "uses" (how often it was logged)
export async function GET({ request }) {
	await requireApiAdmin(request);
	const foods = await listBuiltInFoods();
	return json(foods.map(foodJson));
}

// POST /api/v1/admin/foods
// Body: { name, brand, icon, category, barcode, serving, kcal, protein, carbs, fat, fiber, sugar }
// The food is built-in (everybody can find it). Answer 201: { id }
export async function POST({ request }) {
	await requireApiAdmin(request);
	const body = await readJson(request);
	const result = check(await createFood(null, foodInput(body)));
	return json({ id: result.id }, { status: 201 });
}