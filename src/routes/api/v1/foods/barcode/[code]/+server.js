import { error, json } from '@sveltejs/kit';
import { findByBarcode } from '#lib/server/data.js';
import { foodJson, requireApiUser } from '#lib/server/api.js';

// GET /api/v1/foods/barcode/9001234500307
// 404 when the product is not in the database (the app can then offer "Create food")
export async function GET({ request, params }) {
	const user = await requireApiUser(request);
	const food = await findByBarcode(params.code, user.id);
	if (!food) error(404, 'Product not found');
	return json(foodJson(food));
}