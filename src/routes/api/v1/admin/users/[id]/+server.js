import { error, json } from '@sveltejs/kit';
import { deleteUser, setRole } from '#lib/server/auth.js';
import { queryOne } from '#lib/server/db.js';
import { check, idParam, readJson, requireApiAdmin } from '#lib/server/api.js';

// The user of the URL. Admins can not change or delete themselves here.
async function targetUser(request, params) {
	const admin = await requireApiAdmin(request);
	const id = idParam(params.id);
	if (id === admin.id) error(400, "You can't change your own account here.");
	if (!(await queryOne('SELECT id FROM users WHERE id = ?', [id]))) error(404, 'User not found');
	return id;
}

// PATCH /api/v1/admin/users/5
// Body: { role: "user" | "admin" }
export async function PATCH({ request, params }) {
	const id = await targetUser(request, params);
	const role = String((await readJson(request)).role ?? '');
	check(await setRole(id, role));
	return json({ id, role });
}

// DELETE /api/v1/admin/users/5
// Deletes the user with all of their data. Answer: 204
export async function DELETE({ request, params }) {
	const id = await targetUser(request, params);
	await deleteUser(id);
	return new Response(null, { status: 204 });
}