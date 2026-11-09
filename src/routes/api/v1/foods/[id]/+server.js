import { error, json } from '@sveltejs/kit';
import { deleteOwnFood, getFood } from '#lib/server/data.js';
import { foodJson, idParam, requireApiUser } from '#lib/server/api.js';

// GET /api/v1/foods/12
export async function GET({ request, params }) {
	const user = await requireApiUser(request);
	const food = await getFood(idParam(params.id), user.id);
	if (!food) error(404, 'Food not found');
	return json({ ...foodJson(food), is_own: food.created_by === user.id });
}

// DELETE /api/v1/foods/12
// Only the user's own foods. Their diary entries are deleted too. Answer: 204
export async function DELETE({ request, params }) {
	const user = await requireApiUser(request);
	const id = idParam(params.id);
	if (!(await getFood(id, user.id))) error(404, 'Food not found');
	if (!(await deleteOwnFood(user.id, id))) error(403, 'You can only delete foods you created.');
	return new Response(null, { status: 204 });
}