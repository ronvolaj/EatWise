import { fail } from '@sveltejs/kit';
import { countFoods, deleteUser, flash, listUsers, requireAdmin, setRole } from '../../../lib/server/auth.js';
import { createFood, deleteBuiltInFood, listBuiltInFoods } from '../../../lib/server/data.js';

// Only admins get here
export async function load({ cookies }) {
	await requireAdmin(cookies);
	return {
		users: await listUsers(),
		foodCount: await countFoods(),
		foods: await listBuiltInFoods()
	};
}

export const actions = {
	role: async ({ request, cookies }) => {
		const admin = await requireAdmin(cookies);
		const form = await request.formData();
		const id = Number(form.get('id'));

		if (id === admin.id) return fail(400, { error: "You can't change your own role." });
		const result = await setRole(id, String(form.get('role')));
		if (result.error) return fail(400, { error: result.error });
		flash(cookies, 'Role updated');
	},

	delete: async ({ request, cookies }) => {
		const admin = await requireAdmin(cookies);
		const form = await request.formData();
		const id = Number(form.get('id'));

		if (id === admin.id) return fail(400, { error: "You can't delete your own account here." });
		await deleteUser(id);
		flash(cookies, 'User deleted');
	},

	// New built-in food: everybody can find it in Search
	addFood: async ({ request, cookies }) => {
		await requireAdmin(cookies);
		const form = await request.formData();
		const text = (name) => String(form.get(name) ?? '').trim();
		// Empty required number -> NaN (invalid), empty optional number -> 0
		const required = (name) => (text(name) === '' ? NaN : Number(text(name)));
		const optional = (name) => Number(text(name) || 0);

		const result = await createFood(null, {
			name: text('name'),
			brand: text('brand'),
			icon: text('icon'),
			category: text('category'),
			barcode: text('barcode'),
			serving: required('serving'),
			kcal: required('kcal'),
			protein: required('protein'),
			carbs: required('carbs'),
			fat: required('fat'),
			fiber: optional('fiber'),
			sugar: optional('sugar')
		});
		if (result.error) return fail(400, { foodError: result.error, values: Object.fromEntries(form) });
		flash(cookies, `${text('name')} added`);
	},

	// Deletes a built-in food (and the diary entries that use it)
	deleteFood: async ({ request, cookies }) => {
		await requireAdmin(cookies);
		const form = await request.formData();
		if (!(await deleteBuiltInFood(Number(form.get('id'))))) return fail(404, { error: 'This food does not exist.' });
		flash(cookies, 'Food deleted');
	}
};