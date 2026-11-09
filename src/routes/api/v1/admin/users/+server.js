import { json } from '@sveltejs/kit';
import { listUsers } from '#lib/server/auth.js';
import { requireApiAdmin } from '#lib/server/api.js';

// GET /api/v1/admin/users -> [{ id, email, username, role, created_at, entries }]
export async function GET({ request }) {
	await requireApiAdmin(request);
	return json(await listUsers());
}