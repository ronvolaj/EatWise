import { json } from '@sveltejs/kit';
import { createFood, getFood, listFoods } from '#lib/server/data.js';
import { check, foodInput, foodJson, readJson, requireApiUser } from '#lib/server/api.js';

// GET /api/v1/foods?search=apple&category=Fruit
// Built-in foods + the user's own foods. Both parameters are optional.
export async function GET({ request, url }) {
	const user = await requireApiUser(request);
	const search = (url.searchParams.get('search') ?? '').trim().toLowerCase();
	const category = (url.searchParams.get('category') ?? '').trim();

	let foods = await listFoods(user.id);
	if (search) foods = foods.filter((f) => `${f.name} ${f.brand}`.toLowerCase().includes(search));
	if (category) foods = foods.filter((f) => f.category === category);
	return json(foods.map(foodJson));
}

// POST /api/v1/foods
// Body: { name, brand, barcode, serving, kcal, protein, carbs, fat, fiber, sugar }
// Values per 100 g. Creates an own food. Answer 201: the new food
export async function POST({ request }) {
	const user = await requireApiUser(request);
	const body = await readJson(request);
	const result = check(await createFood(user.id, foodInput(body)));
	return json(foodJson(await getFood(result.id, user.id)), { status: 201 });
}