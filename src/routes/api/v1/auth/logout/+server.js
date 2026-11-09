import { logout } from '#lib/server/auth.js';
import { bearerToken, requireApiUser, tokenJar } from '#lib/server/api.js';

// POST /api/v1/auth/logout
// The token can not be used anymore. Answer: 204 (no content)
export async function POST({ request }) {
	await requireApiUser(request);
	await logout(tokenJar(bearerToken(request)));
	return new Response(null, { status: 204 });
}