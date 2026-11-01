import { fail, redirect } from '@sveltejs/kit';
import { flash, requireUser } from '../../../lib/server/auth.js';
import { createFood } from '../../../lib/server/data.js';

export async function load({ cookies, url }) {
	await requireUser(cookies);
	// Coming from "Product not found": the barcode is already filled in
	return { barcode: url.searchParams.get('barcode') ?? '' };
}

export const actions = {
	default: async ({ request, cookies }) => {
		const user = await requireUser(cookies);
		const form = await request.formData();
		const text = (name) => String(form.get(name) ?? '').trim();
		// Empty required number -> NaN (invalid), empty optional number -> 0
		const required = (name) => (text(name) === '' ? NaN : Number(text(name)));
		const optional = (name) => Number(text(name) || 0);

		const values = Object.fromEntries(form);
		const result = await createFood(user.id, {
			name: text('name'),
			brand: text('brand'),
			barcode: text('barcode'),
			serving: required('serving'),
			kcal: required('kcal'),
			protein: required('protein'),
			carbs: required('carbs'),
			fat: required('fat'),
			fiber: optional('fiber'),
			sugar: optional('sugar')
		});
		if (result.error) return fail(400, { error: result.error, values });

		flash(cookies, 'Custom food saved');
		redirect(303, `/app/food/${result.id}`);
	}
};