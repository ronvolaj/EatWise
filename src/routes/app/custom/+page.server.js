import { fail, redirect } from '@sveltejs/kit';
import { flash, requireUser } from '../../../lib/server/auth.js';
import { createFood, parseFood } from '../../../lib/server/data.js';

export async function load({ cookies, url }) {
	await requireUser(cookies);
	return {
		// Filled in when you come from "Product not found" (scan) or from an empty search
		barcode: (url.searchParams.get('barcode') ?? '').replace(/\D/g, '').slice(0, 14),
		name: (url.searchParams.get('name') ?? '').slice(0, 100)
	};
}

export const actions = {
	default: async ({ request, cookies }) => {
		const user = await requireUser(cookies);
		const form = await request.formData();
		const values = Object.fromEntries(form);

		const food = parseFood(form);
		if (food.error) return fail(400, { values, error: food.error });

		const result = await createFood(food.values, user.id);
		if (result.error) return fail(400, { values, error: result.error });

		flash(cookies, `${food.values.name} created`);
		redirect(303, `/app/food/${result.id}?from=${food.values.barcode ? 'scan' : 'custom'}`);
	}
};