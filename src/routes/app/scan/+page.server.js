import { fail, redirect } from '@sveltejs/kit';
import { flash, requireUser } from '../../../lib/server/auth.js';
import { addEntry, findByBarcode, findByName, today } from '../../../lib/server/data.js';
import { SAMPLE_BARCODE } from '../../../lib/server/db.js';

// The demo result of the Food Photo mode
const PHOTO_FOOD = 'Chicken Grain Bowl';

export async function load({ cookies, url }) {
	const user = await requireUser(cookies);
	const code = (url.searchParams.get('code') ?? '').trim();

	// Barcode entered: look it up in the database
	if (code) {
		const food = await findByBarcode(code, user.id);
		if (food) redirect(303, `/app/food/${food.id}?from=scan`);
	}

	return {
		mode: url.searchParams.get('mode') === 'photo' ? 'photo' : 'barcode',
		notFound: code, // '' = nothing searched yet
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

		const result = await addEntry(user.id, food.id, today(), 'lunch', Number(form.get('quantity')), 'photo');
		if (result.error) return fail(400, { error: result.error });

		flash(cookies, `${food.name} added to Lunch`);
		redirect(303, '/app/diary');
	}
};
