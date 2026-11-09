import { error } from '@sveltejs/kit';
import { deleteBuiltInFood } from '#lib/server/data.js';
import { idParam, requireApiAdmin } from '#lib/server/api.js';

// DELETE /api/v1/admin/foods/12
// Deletes a built-in food (and the diary entries that use it). Answer: 204
export async function DELETE({ request, params }) {
	await requireApiAdmin(request);
	if (!(await deleteBuiltInFood(idParam(params.id)))) error(404, 'Food not found');
	return new Response(null, { status: 204 });
}