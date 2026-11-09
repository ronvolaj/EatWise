import { json } from '@sveltejs/kit';
import { removeEntry, updateEntry } from '#lib/server/data.js';
import { check, idParam, readJson, requireApiUser } from '#lib/server/api.js';

// PUT /api/v1/diary/34
// Body: { quantity, meal }. Users can only change their own entries.
export async function PUT({ request, params }) {
	const user = await requireApiUser(request);
	const id = idParam(params.id);
	const body = await readJson(request);
	const quantity = Number(body.quantity);
	const meal = String(body.meal ?? '');
	check(await updateEntry(user.id, id, quantity, meal));
	return json({ id, quantity, meal });
}

// DELETE /api/v1/diary/34
// Users can only delete their own entries. Answer: 204
export async function DELETE({ request, params }) {
	const user = await requireApiUser(request);
	await removeEntry(user.id, idParam(params.id));
	return new Response(null, { status: 204 });
}