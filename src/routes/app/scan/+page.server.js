import { fail, redirect } from '@sveltejs/kit';
import { flash, requireUser } from '../../../lib/server/auth.js';
import { addEntry, createFood, findByBarcode, findByName, today } from '../../../lib/server/data.js';
import { lookupBarcode, productCode } from '../../../lib/server/openfoodfacts.js';
import { SAMPLE_BARCODE } from '../../../lib/server/db.js';
import { mealLabel } from '../../../lib/nutrition.js';
import { m } from '../../../lib/paraglide/messages.js';

// The demo result of the Food Photo mode
const PHOTO_FOOD = 'Chicken Grain Bowl';

export async function load({ cookies, url }) {
	const user = await requireUser(cookies);
	const code = (url.searchParams.get('code') ?? '').trim();

	// Why a barcode was not found: '' | 'unknown' | 'incomplete' | 'error' | 'not-product'
	let offStatus = '';
	let offProduct = null; // name and brand from Open Food Facts when values are missing

	// Barcode entered or scanned: look it up in our database first
	if (code) {
		const food = await findByBarcode(code, user.id);
		if (food) redirect(303, `/app/food/${food.id}?from=scan`);

		// The product barcode inside the scan (also from QR codes); null = no product code
		const barcode = productCode(code);

		if (!barcode) {
			offStatus = 'not-product';
		} else {
			if (barcode !== code) {
				const same = await findByBarcode(barcode, user.id);
				if (same) redirect(303, `/app/food/${same.id}?from=scan`);
			}

			// Not in our database: ask Open Food Facts.
			// A product found there is saved as a built-in food, so the next scan finds it in our database.
			const result = await lookupBarcode(barcode);
			if (result.food) {
				const saved = await createFood(null, result.food);
				if (saved.id) redirect(303, `/app/food/${saved.id}?from=scan`);
			}
			offStatus = result.error ? 'error' : result.incomplete ? 'incomplete' : 'unknown';
			if (result.incomplete) offProduct = { name: result.name, brand: result.brand };
		}
	}

	return {
		mode: url.searchParams.get('mode') === 'photo' ? 'photo' : 'barcode',
		notFound: code, // '' = nothing searched yet
		offStatus,
		offProduct,
		barcode: productCode(code) ?? '',
		sampleBarcode: SAMPLE_BARCODE,
		photoFood: await findByName(PHOTO_FOOD)
	};
}

export const actions = {
	// "Add to Diary" of the photo result
	photo: async ({ request, cookies }) => {
		const user = await requireUser(cookies);
		const form = await request.formData();
		const food = await findByName(PHOTO_FOOD);

		const meal = String(form.get('meal') ?? 'lunch');

		const result = await addEntry(
			user.id,
			food.id,
			today(),
			meal,
			Number(form.get('quantity')),
			'photo'
		);
		if (result.error) return fail(400, { error: result.error });

		flash(cookies, m.flash_added_to({ food: food.name, meal: mealLabel(meal) }));
		redirect(303, '/app/diary');
	}
};
