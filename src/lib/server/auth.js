// Login, register, sessions and flash messages.
// Passwords are hashed with scrypt (built into Node.js, no extra package needed).
// The session token is only stored in the cookie. The database keeps its SHA-256 hash.
import { redirect } from '@sveltejs/kit';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { query, queryOne } from './db.js';

const scryptAsync = promisify(scrypt);

const SESSION_COOKIE = 'session';
const FLASH_COOKIE = 'flash';
const SESSION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const cookieOptions = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax',
	secure: process.env.NODE_ENV === 'production'
};

// ----- Passwords -----

// Result looks like "scrypt$<salt>$<hash>"
export async function hashPassword(password) {
	const salt = randomBytes(16).toString('hex');
	const hash = await scryptAsync(password, salt, 64);
	return `scrypt$${salt}$${hash.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
	const [type, salt, hashHex] = String(stored).split('$');
	if (type !== 'scrypt' || !salt || !hashHex) return false;
	const expected = Buffer.from(hashHex, 'hex');
	const actual = await scryptAsync(password, salt, expected.length);
	return timingSafeEqual(actual, expected);
}

// ----- Sessions -----

const hashToken = (token) => createHash('sha256').update(token).digest('hex');

// Logs the user in: saves a session and sets the cookie
export async function createSession(cookies, userId) {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = Date.now() + SESSION_DAYS * DAY_MS;

	// Remove old expired sessions of this user
	await query('DELETE FROM sessions WHERE user_id = ? AND expires_at < ?', [userId, Date.now()]);
	await query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', [
		hashToken(token),
		userId,
		expiresAt
	]);

	cookies.set(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_DAYS * 24 * 60 * 60 });
}

// Logs the user out: deletes the session and the cookie
export async function deleteSession(cookies) {
	const token = cookies.get(SESSION_COOKIE);
	if (token) await query('DELETE FROM sessions WHERE token_hash = ?', [hashToken(token)]);
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

// The logged in user with profile (targets and settings), or null
export async function getUser(cookies) {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return null;

	const user = await queryOne(
		`SELECT u.id, u.email, u.username, u.role, u.created_at,
		        p.sex, p.birth_date, p.height_cm, p.goal, p.activity, p.target_weight_kg,
		        p.kcal_target, p.protein_target_g, p.carbs_target_g, p.fat_target_g,
		        p.units, p.theme, p.notifications
		 FROM sessions s
		 JOIN users u ON u.id = s.user_id
		 JOIN profiles p ON p.user_id = u.id
		 WHERE s.token_hash = ? AND s.expires_at > ?`,
		[hashToken(token), Date.now()]
	);

	if (!user) {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return null;
	}
	user.notifications = Boolean(user.notifications);
	return user;
}

// For pages that need a login. Sends guests to the login page.
export async function requireUser(cookies) {
	const user = await getUser(cookies);
	if (!user) redirect(303, '/app/login');
	return user;
}

// For the admin page. Normal users are sent back to the home page.
export async function requireAdmin(cookies) {
	const user = await requireUser(cookies);
	if (user.role !== 'admin') redirect(303, '/app/homepage');
	return user;
}

// ----- Flash messages (a short message shown once after a redirect) -----

export function flash(cookies, message) {
	cookies.set(FLASH_COOKIE, message, { ...cookieOptions, httpOnly: false, maxAge: 60 });
}

// Reads the message and removes it, so it is only shown once
export function takeFlash(cookies) {
	const message = cookies.get(FLASH_COOKIE) ?? null;
	if (message) cookies.delete(FLASH_COOKIE, { path: '/' });
	return message;
}