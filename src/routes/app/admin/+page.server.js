import { fail } from '@sveltejs/kit';
import { flash, requireAdmin } from '../../../lib/server/auth.js';
import { isId } from '../../../lib/server/db.js';
import {
	adminStats,
	createFood,
	deleteAnyFood,
	deleteUser,
	listBuiltInFoods,
	listUsers,
	parseFood,
	setRole
} from '../../../lib/server/data.js';

export async function load({ cookies }) {
	await requireAdmin(cookies);
	return {
		stats: await adminStats(),
		users: await listUsers(),
		foods: await listBuiltInFoods()
	};
}

// Reads the id from the form. Admins can not change or delete themselves.
async function targetId(request, admin) {
	const form = await request.formData();
	const id = Number(form.get('id'));
	if (!isId(id)) return { form, error: 'Invalid id.' };
	return { form, id, isSelf: id === admin.id };
}

export const actions = {
	role: async ({ request, cookies }) => {
		const admin = await requireAdmin(cookies);
		const { form, id, isSelf, error } = await targetId(request, admin);
		if (error) return fail(400, { error });
		if (isSelf) return fail(400, { error: 'You can not change your own role.' });

		await setRole(id, form.get('role') === 'admin' ? 'admin' : 'user');
		flash(cookies, 'Role changed');
	},

	deleteUser: async ({ request, cookies }) => {
		const admin = await requireAdmin(cookies);
		const { id, isSelf, error } = await targetId(request, admin);
		if (error) return fail(400, { error });
		if (isSelf) return fail(400, { error: 'You can not delete your own account here.' });

		await deleteUser(id);
		flash(cookies, 'User deleted');
	},

	// New built-in food (visible for everybody)
	addFood: async ({ request, cookies }) => {
		await requireAdmin(cookies);
		const form = await request.formData();
		const food = parseFood(form);
		if (food.error) return fail(400, { foodError: food.error, values: Object.fromEntries(form) });

		const result = await createFood(food.values, null);
		if (result.error) return fail(400, { foodError: result.error, values: Object.fromEntries(form) });
		flash(cookies, `${food.values.name} added`);
	},

	deleteFood: async ({ request, cookies }) => {
		const admin = await requireAdmin(cookies);
		const { id, error } = await targetId(request, admin);
		if (error) return fail(400, { error });

		await deleteAnyFood(id);
		flash(cookies, 'Food deleted');
	}
};