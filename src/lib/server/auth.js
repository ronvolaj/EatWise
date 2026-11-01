// Everything about accounts: register, login, logout, sessions, admin.
// This code only runs on the server (folder lib/server).
import { redirect } from '@sveltejs/kit';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { isId, pool, query, queryOne } from './db.js';
import { calculatePlan } from '../nutrition.js';
import { today } from './data.js';

const COOKIE = 'eatwise_session';
const FLASH = 'eatwise_flash';
const SESSION_DAYS = 30;

// ---------- Passwords ----------
// Passwords are never stored as plain text, only as a hash.

function hashPassword(password) {
	const salt = randomBytes(16).toString('hex');
	const hash = scryptSync(password, salt, 64).toString('hex');
	return `${salt}:${hash}`;
}

// Accepts both formats: "salt:hash" (this version) and "scrypt$salt$hash" (accounts made with the older app version)
function checkPassword(password, stored) {
	const parts = String(stored).split(/[:$]/);
	const [salt, hash] = parts[0] === 'scrypt' ? parts.slice(1) : parts;
	if (!salt || !hash) return false;
	const expected = Buffer.from(hash, 'hex');
	const test = scryptSync(password, salt, expected.length);
	return timingSafeEqual(test, expected);
}

// ---------- Sessions (cookie) ----------

function hashToken(token) {
	return createHash('sha256').update(token).digest('hex');
}

async function createSession(cookies, userId) {
	const token = randomBytes(32).toString('hex');
	const maxAge = 60 * 60 * 24 * SESSION_DAYS; // seconds
	await query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', [
		hashToken(token),
		userId,
		Date.now() + maxAge * 1000
	]);
	cookies.set(COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge });
}

// Returns the logged-in user together with the profile, or null
export async function getUser(cookies) {
	const token = cookies.get(COOKIE);
	if (!token) return null;
	return queryOne(
		`SELECT u.id, u.email, u.username, u.role, u.created_at, p.*
		 FROM sessions s
		 JOIN users u ON u.id = s.user_id
		 JOIN profiles p ON p.user_id = u.id
		 WHERE s.token_hash = ? AND s.expires_at > ?`,
		[hashToken(token), Date.now()]
	);
}

// Page only for logged-in users
export async function requireUser(cookies) {
	const user = await getUser(cookies);
	if (!user) redirect(303, '/app/login');
	return user;
}

// Page only for admins
export async function requireAdmin(cookies) {
	const user = await requireUser(cookies);
	if (user.role !== 'admin') redirect(303, '/app/homepage');
	return user;
}

// ---------- Flash message (the toast after an action) ----------

export function flash(cookies, text) {
	cookies.set(FLASH, text, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 30 });
}

export function readFlash(cookies) {
	const text = cookies.get(FLASH);
	if (!text) return null;
	cookies.delete(FLASH, { path: '/' });
	return { text, id: Date.now() };
}

// ---------- Register, login, logout ----------

// "input" holds the onboarding answers and the account fields
export async function register(cookies, input) {
	const email = input.email.trim();
	const username = input.username.trim();
	const height = Number(input.height);
	const weight = Number(input.weight);
	const target = Number(input.target);

	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address.' };
	if (username.length < 3) return { error: 'Use at least 3 characters for your username.' };
	if (username.length > 50) return { error: 'Use at most 50 characters for your username.' };
	if (input.password.length < 6) return { error: 'Use at least 6 characters for your password.' };
	if (input.password !== input.confirm) return { error: "Passwords don't match." };
	if (!['lose', 'maintain', 'gain'].includes(input.goal)) return { error: 'Choose a goal.' };
	if (!['male', 'female'].includes(input.sex)) return { error: 'Choose your biological sex.' };
	if (!['low', 'medium', 'high'].includes(input.activity)) return { error: 'Choose your activity level.' };
	if (!(height >= 80 && height <= 260)) return { error: 'Enter a height between 80 and 260 cm.' };
	if (!(weight >= 30 && weight <= 400)) return { error: 'Enter a weight between 30 and 400 kg.' };
	if (!(target >= 30 && target <= 400)) return { error: 'Enter a target weight between 30 and 400 kg.' };
	if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birth) || input.birth > today()) {
		return { error: 'Enter a valid date of birth.' };
	}

	if (await queryOne('SELECT id FROM users WHERE email = ?', [email])) {
		return { error: 'An account with this email already exists. Sign in instead.' };
	}
	if (await queryOne('SELECT id FROM users WHERE username = ?', [username])) {
		return { error: 'This username is taken. Choose another one.' };
	}

	const plan = calculatePlan({ ...input, height, weight });

	// The very first user becomes admin automatically
	const { n } = await queryOne('SELECT COUNT(*) AS n FROM users');
	const role = n === 0 ? 'admin' : 'user';

	// Transaction: all three inserts succeed together, or none of them
	const connection = await pool.getConnection();
	let userId;
	try {
		await connection.beginTransaction();
		const [result] = await connection.query(
			'INSERT INTO users (email, username, password_hash, role) VALUES (?, ?, ?, ?)',
			[email, username, hashPassword(input.password), role]
		);
		userId = result.insertId;
		await connection.query(
			`INSERT INTO profiles (user_id, sex, birth_date, height_cm, goal, activity, target_weight_kg,
			                       kcal_target, protein_target_g, carbs_target_g, fat_target_g)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[userId, input.sex, input.birth, height, input.goal, input.activity, target, plan.kcal, plan.protein, plan.carbs, plan.fat]
		);
		await connection.query('INSERT INTO weight_entries (user_id, weight_kg, logged_on) VALUES (?, ?, ?)', [
			userId,
			weight,
			today()
		]);
		await connection.commit();
	} catch (error) {
		await connection.rollback();
		if (error.code === 'ER_DUP_ENTRY') return { error: 'This email or username is already in use.' };
		throw error;
	} finally {
		connection.release();
	}

	await createSession(cookies, userId);
	return {};
}

export async function login(cookies, email, password) {
	const user = await queryOne('SELECT id, password_hash FROM users WHERE email = ?', [email]);
	if (!user || !checkPassword(password, user.password_hash)) {
		return { error: 'Email or password is incorrect.' };
	}
	await createSession(cookies, user.id);
	return {};
}

export async function logout(cookies) {
	const token = cookies.get(COOKIE);
	if (token) await query('DELETE FROM sessions WHERE token_hash = ?', [hashToken(token)]);
	cookies.delete(COOKIE, { path: '/' });
}

// Deletes the user and, through ON DELETE CASCADE, all of their data
export async function deleteUser(userId) {
	if (!isId(userId)) return;
	await query('DELETE FROM users WHERE id = ?', [userId]);
}

// ---------- Admin ----------

export async function listUsers() {
	return query(
		`SELECT u.id, u.email, u.username, u.role, u.created_at,
		        (SELECT COUNT(*) FROM diary_entries d WHERE d.user_id = u.id) AS entries
		 FROM users u ORDER BY u.id DESC`
	);
}

export async function countFoods() {
	return (await queryOne('SELECT COUNT(*) AS n FROM foods')).n;
}

export async function setRole(userId, role) {
	if (!isId(userId)) return { error: 'This user does not exist.' };
	if (role !== 'user' && role !== 'admin') return { error: 'This role does not exist.' };
	await query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
	return {};
}