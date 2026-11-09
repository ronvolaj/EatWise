import { error, json } from '@sveltejs/kit';
import { getUser, register } from '#lib/server/auth.js';
import { publicUser, readJson, tokenJar } from '#lib/server/api.js';

// POST /api/v1/auth/register
// Body: { email, username, password, sex, birth_date, height, weight, target_weight, goal, activity }
// Height in cm, weights in kg, birth_date like "2006-05-10". Answer 201: { token, user }
export async function POST({ request }) {
	const body = await readJson(request);
	const text = (name) => String(body[name] ?? '');

	// register() in auth.js checks everything and saves user, profile and first weight.
	// It "sets a cookie" with the token. The jar catches that token for the app.
	const jar = tokenJar();
	const result = await register(jar, {
		email: text('email'),
		username: text('username'),
		password: text('password'),
		confirm: text('password'),
		goal: text('goal'),
		sex: text('sex'),
		height: text('height'),
		weight: text('weight'),
		target: text('target_weight'),
		birth: text('birth_date'),
		activity: text('activity')
	});
	if (result.error) error(400, result.error);

	const user = await getUser(jar);
	return json({ token: jar.token, user: publicUser(user) }, { status: 201 });
}