import { error, json } from '@sveltejs/kit';
import { getUser, login } from '#lib/server/auth.js';
import { queryOne } from '#lib/server/db.js';
import { publicUser, readJson, tokenJar } from '#lib/server/api.js';

// POST /api/v1/auth/login
// Body: { login, password } (login = email or username). Answer: { token, user }
export async function POST({ request }) {
	const body = await readJson(request);
	let email = String(body.login ?? body.email ?? '').trim();
	const password = String(body.password ?? '');
	if (!email || !password) error(400, 'Enter your email or username and your password.');

	// Without "@" it is a username: find the email of that user
	if (!email.includes('@')) {
		const row = await queryOne('SELECT email FROM users WHERE username = ?', [email]);
		email = row?.email ?? '';
	}

	const jar = tokenJar();
	const result = await login(jar, email, password);
	if (result.error) error(401, 'Email/username or password is incorrect.');

	const user = await getUser(jar);
	return json({ token: jar.token, user: publicUser(user) });
}