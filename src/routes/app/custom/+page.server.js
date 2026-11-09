import { fail, redirect } from '@sveltejs/kit';
import { flash, requireUser } from '../../../lib/server/auth.js';
import { createFood } from '../../../lib/server/data.js';

export async function load({ cookies, url }) {
	await requireUser(cookies);
	// Coming from "Product not found": the barcode is already filled in
	return { barcode: url.searchParams.get('barcode') ?? '' };
}

export const actions = {
	default: async ({ request, cookies, url }) => {
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

		// Keep meal and date (e.g. coming from "+" on the Lunch card)
		const next = new URLSearchParams();
		for (const key of ['meal', 'date']) {
			if (url.searchParams.get(key)) next.set(key, url.searchParams.get(key));
		}

		flash(cookies, 'Custom food saved');
		redirect(303, `/app/food/${result.id}${next.size ? '?' + next : ''}`);
	}
};