// Helpers for the REST API in src/routes/api/v1 (used by the Android app).
// The app sends and receives JSON. It logs in with a token instead of a cookie:
// every request has the header "Authorization: Bearer <token>".
// The API reuses the functions of auth.js and data.js, so the rules are the same as on the website.
import { error } from '@sveltejs/kit';
import { getUser } from './auth.js';
import { getEntries, getWater } from './data.js';
import { sumEntries } from '../nutrition.js';

// ---------- Token instead of cookie ----------

// The token from the header "Authorization: Bearer <token>", or null
export function bearerToken(request) {
	const match = (request.headers.get('authorization') ?? '').match(/^Bearer\s+(\S+)$/i);
	return match ? match[1] : null;
}

// auth.js works with cookies (cookies.get, cookies.set, cookies.delete).
// This object looks like the cookies to auth.js, but it just keeps the token in a variable.
// So register, login, logout and getUser from auth.js can be used by the API without changes.
export function tokenJar(token = null) {
	return {
		token,
		get() {
			return this.token;
		},
		set(name, value) {
			this.token = value;
		},
		delete() {
			this.token = null;
		}
	};
}

// The logged-in user of the request. Answers 401 when the token is missing, wrong or expired.
export async function requireApiUser(request) {
	const user = await getUser(tokenJar(bearerToken(request)));
	if (!user) error(401, 'Not logged in');
	return user;
}

// Like requireApiUser, but only for admins (403 for normal users)
export async function requireApiAdmin(request) {
	const user = await requireApiUser(request);
	if (user.role !== 'admin') error(403, 'Only admins can do this');
	return user;
}

// ---------- Reading the request ----------

// The JSON body of the request. Answers 400 when it is not a JSON object.
export async function readJson(request) {
	let body = null;
	try {
		body = await request.json();
	} catch {
		// handled below
	}
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		error(400, 'The request body must be a JSON object.');
	}
	return body;
}

// A number from the URL like /foods/12. Answers 404 for things like /foods/abc
export function idParam(value) {
	const id = Number(value);
	if (!Number.isInteger(id) || id <= 0) error(404, 'Not found');
	return id;
}

// data.js returns { error: '...' } when the input is wrong. This answers 400 with that message.
export function check(result) {
	if (result?.error) error(400, result.error);
	return result;
}

// The food fields from a JSON body, in the form that createFood in data.js expects
export function foodInput(body) {
	const text = (name) => String(body[name] ?? '').trim();
	// Empty required number -> NaN (invalid), empty optional number -> 0
	const required = (name) => (text(name) === '' ? NaN : Number(text(name)));
	const optional = (name) => Number(text(name) || 0);
	return {
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
	};
}

// ---------- Answers ----------

// The user as the app gets it (never the password hash)
export function publicUser(user) {
	return {
		id: user.id,
		email: user.email,
		username: user.username,
		role: user.role,
		created_at: user.created_at,
		profile: {
			sex: user.sex,
			birth_date: user.birth_date,
			height_cm: Number(user.height_cm),
			goal: user.goal,
			activity: user.activity,
			target_weight_kg: Number(user.target_weight_kg)
		},
		targets: {
			kcal: Number(user.kcal_target),
			protein: Number(user.protein_target_g),
			carbs: Number(user.carbs_target_g),
			fat: Number(user.fat_target_g)
		},
		settings: {
			units: user.units,
			theme: user.theme,
			notifications: Boolean(user.notifications)
		}
	};
}

// MySQL sends DECIMAL columns as text ("12.5"). The app gets real numbers.
export function foodJson(food) {
	const result = { ...food };
	for (const key of ['serving', 'kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar']) {
		result[key] = Number(food[key]);
	}
	return result;
}

export function entryJson(entry) {
	const result = { ...entry };
	for (const key of ['quantity', 'kcal', 'protein', 'carbs', 'fat']) result[key] = Number(entry[key]);
	return result;
}

export function weightJson(row) {
	return { date: row.date, weight: Number(row.weight) };
}

// One day of the diary: the entries (kcal and macros for the eaten amount), the totals and the water
export async function diaryDay(userId, date) {
	const entries = (await getEntries(userId, date)).map(entryJson);
	return { date, entries, total: sumEntries(entries), water: await getWater(userId, date) };
}