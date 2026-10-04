// All database reads and writes of the app (except login/sessions, see auth.js).
import { pool, query, queryOne, isId } from './db.js';
import { MEALS, ageFrom, calculatePlan } from '../nutrition.js';

// The app counts days in this time zone (Vercel servers run in UTC)
const TIME_ZONE = 'Europe/Tirane';

// ===== Dates =====

// Today as "YYYY-MM-DD"
export function today() {
	return new Date().toLocaleDateString('en-CA', { timeZone: TIME_ZONE });
}

// The meal that fits the current time of day
export function mealForNow() {
	const hour = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: TIME_ZONE }));
	if (hour < 11) return 'breakfast';
	if (hour < 15) return 'lunch';
	if (hour >= 17 && hour < 22) return 'dinner';
	return 'snack';
}

// "2026-10-04" + 1 -> "2026-10-05"
export function addDays(date, days) {
	const d = new Date(date + 'T12:00:00Z');
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

// true for a real date like "2026-10-04"
export function isDate(value) {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const d = new Date(value + 'T12:00:00Z');
	return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

// ===== Small form helpers =====

const text = (form, name) => String(form.get(name) ?? '').trim();

// Number from a form field, or NaN when empty/invalid
function number(form, name) {
	const value = text(form, name).replace(',', '.');
	return value === '' ? NaN : Number(value);
}

const between = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;

// Rounds to 1 decimal
const round1 = (n) => Math.round(n * 10) / 10;

// ===== Foods =====

// Column names are renamed so the pages can use food.protein, food.serving, ...
const FOOD_COLUMNS = `f.id, f.name, f.brand, f.icon, f.barcode, f.category,
	f.serving_size_g AS serving, f.kcal, f.protein_g AS protein, f.carbs_g AS carbs,
	f.fat_g AS fat, f.fiber_g AS fiber, f.sugar_g AS sugar, f.created_by`;

// Built-in foods + the user's own foods
const VISIBLE = '(f.created_by IS NULL OR f.created_by = ?)';

export async function getFood(id, userId) {
	if (!isId(id)) return null;
	return queryOne(`SELECT ${FOOD_COLUMNS} FROM foods f WHERE f.id = ? AND ${VISIBLE}`, [id, userId]);
}

export async function findByBarcode(code, userId) {
	return queryOne(`SELECT ${FOOD_COLUMNS} FROM foods f WHERE f.barcode = ? AND ${VISIBLE}`, [code, userId]);
}

// Built-in food by exact name (used by the photo demo)
export async function findByName(name) {
	return queryOne(`SELECT ${FOOD_COLUMNS} FROM foods f WHERE f.name = ? AND f.created_by IS NULL LIMIT 1`, [name]);
}

// Search by name or brand. Empty search = all foods. Own foods come first.
export async function searchFoods(userId, search = '', category = '') {
	const like = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
	return query(
		`SELECT ${FOOD_COLUMNS} FROM foods f
		 WHERE ${VISIBLE}
		   AND (f.name LIKE ? OR f.brand LIKE ?)
		   AND (? = '' OR f.category = ?)
		 ORDER BY f.created_by IS NULL, f.name
		 LIMIT 60`,
		[userId, like, like, category, category]
	);
}

export async function listCategories(userId) {
	const rows = await query(`SELECT DISTINCT f.category FROM foods f WHERE ${VISIBLE} ORDER BY f.category`, [userId]);
	return rows.map((r) => r.category);
}

// Foods the user logged lately (newest first)
export async function recentFoods(userId, limit = 5) {
	return query(
		`SELECT ${FOOD_COLUMNS} FROM foods f
		 JOIN (SELECT food_id, MAX(id) AS last_id FROM diary_entries WHERE user_id = ? GROUP BY food_id) r
		   ON r.food_id = f.id
		 WHERE ${VISIBLE}
		 ORDER BY r.last_id DESC
		 LIMIT ?`,
		[userId, userId, limit]
	);
}

// Reads and checks the food form (custom food page and admin page).
// Returns { values } or { error }. Nutrition values are per 100 g.
export function parseFood(form) {
	const values = {
		name: text(form, 'name'),
		brand: text(form, 'brand'),
		icon: text(form, 'icon') || '🥘',
		barcode: text(form, 'barcode').replace(/\s/g, '') || null,
		category: text(form, 'category') || 'Custom',
		serving_size_g: number(form, 'serving'),
		kcal: number(form, 'kcal'),
		protein_g: number(form, 'protein') || 0,
		carbs_g: number(form, 'carbs') || 0,
		fat_g: number(form, 'fat') || 0,
		fiber_g: number(form, 'fiber') || 0,
		sugar_g: number(form, 'sugar') || 0
	};

	if (!values.name) return { error: 'Please enter a name.' };
	if (values.name.length > 100) return { error: 'The name can have at most 100 characters.' };
	if (values.brand.length > 100) return { error: 'The brand can have at most 100 characters.' };
	if (values.category.length > 50) return { error: 'The category can have at most 50 characters.' };
	if ([...values.icon].length > 4) return { error: 'Please use one emoji as icon.' };
	if (values.barcode && !/^\d{8,14}$/.test(values.barcode)) return { error: 'A barcode has 8 to 14 digits.' };
	if (!between(values.serving_size_g, 1, 2000)) return { error: 'The serving size must be between 1 and 2000 g.' };
	if (!between(values.kcal, 0, 900)) return { error: 'Calories must be between 0 and 900 per 100 g.' };

	for (const key of ['protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g']) {
		if (!between(values[key], 0, 100)) return { error: 'Nutrient values must be between 0 and 100 g.' };
	}
	if (values.protein_g + values.carbs_g + values.fat_g > 100) {
		return { error: 'Protein, carbs and fat together can not be more than 100 g per 100 g.' };
	}
	if (values.sugar_g > values.carbs_g) return { error: 'Sugar can not be more than carbs.' };
	return { values };
}

// createdBy = user id for an own food, null for a built-in food (admin)
export async function createFood(values, createdBy) {
	try {
		const result = await query(
			`INSERT INTO foods (name, brand, icon, barcode, category, serving_size_g,
			                    kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, created_by)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				values.name, values.brand, values.icon, values.barcode, values.category, values.serving_size_g,
				values.kcal, values.protein_g, values.carbs_g, values.fat_g, values.fiber_g, values.sugar_g,
				createdBy
			]
		);
		return { id: result.insertId };
	} catch (err) {
		if (err.code === 'ER_DUP_ENTRY') return { error: 'A food with this barcode already exists.' };
		throw err;
	}
}

// Users can only delete their own foods. Their diary entries of this food are deleted too.
export async function deleteOwnFood(userId, foodId) {
	const result = await query('DELETE FROM foods WHERE id = ? AND created_by = ?', [foodId, userId]);
	return result.affectedRows > 0;
}

// ===== Diary =====

// Entries of one day, with nutrition already calculated for the eaten amount
export async function getEntries(userId, date) {
	const rows = await query(
		`SELECT d.id, d.meal, d.quantity_g AS quantity, d.source, d.entry_date AS date,
		        f.id AS food_id, f.name, f.brand, f.icon,
		        f.kcal * d.quantity_g / 100 AS kcal,
		        f.protein_g * d.quantity_g / 100 AS protein,
		        f.carbs_g * d.quantity_g / 100 AS carbs,
		        f.fat_g * d.quantity_g / 100 AS fat
		 FROM diary_entries d
		 JOIN foods f ON f.id = d.food_id
		 WHERE d.user_id = ? AND d.entry_date = ?
		 ORDER BY d.id`,
		[userId, date]
	);
	return rows.map((r) => ({
		...r,
		kcal: Number(r.kcal),
		protein: Number(r.protein),
		carbs: Number(r.carbs),
		fat: Number(r.fat)
	}));
}

// Returns { id } or { error }
export async function addEntry(userId, foodId, date, meal, quantity, source = 'search') {
	if (!MEALS.some((m) => m.id === meal)) return { error: 'Please choose a meal.' };
	if (!between(quantity, 1, 5000)) return { error: 'The amount must be between 1 and 5000 g.' };
	if (!isDate(date) || date > today()) return { error: 'Please choose a valid day.' };
	if (!['search', 'barcode', 'photo'].includes(source)) source = 'search';

	const food = await getFood(foodId, userId);
	if (!food) return { error: 'This food does not exist.' };

	const result = await query(
		'INSERT INTO diary_entries (user_id, food_id, entry_date, meal, quantity_g, source) VALUES (?, ?, ?, ?, ?, ?)',
		[userId, food.id, date, meal, round1(quantity), source]
	);
	return { id: result.insertId };
}

export async function deleteEntry(userId, entryId) {
	if (!isId(entryId)) return false;
	const result = await query('DELETE FROM diary_entries WHERE id = ? AND user_id = ?', [entryId, userId]);
	return result.affectedRows > 0;
}

// Calories per day for the last `days` days, oldest first. Days without entries have 0.
export async function dailyKcal(userId, days) {
	const end = today();
	const start = addDays(end, -(days - 1));
	const rows = await query(
		`SELECT d.entry_date AS date, SUM(f.kcal * d.quantity_g / 100) AS kcal
		 FROM diary_entries d
		 JOIN foods f ON f.id = d.food_id
		 WHERE d.user_id = ? AND d.entry_date BETWEEN ? AND ?
		 GROUP BY d.entry_date`,
		[userId, start, end]
	);
	const byDate = new Map(rows.map((r) => [r.date, Number(r.kcal)]));
	return Array.from({ length: days }, (_, i) => {
		const date = addDays(start, i);
		return { date, kcal: byDate.get(date) ?? 0 };
	});
}

// ===== Water =====

export const WATER_MAX = 8;

export async function getWater(userId, date) {
	const row = await queryOne('SELECT glasses FROM water_logs WHERE user_id = ? AND log_date = ?', [userId, date]);
	return row ? Number(row.glasses) : 0;
}

// delta is +1 or -1. The value always stays between 0 and 8.
export async function changeWater(userId, date, delta) {
	await query(
		`INSERT INTO water_logs (user_id, log_date, glasses) VALUES (?, ?, ?)
		 ON DUPLICATE KEY UPDATE glasses = LEAST(?, GREATEST(0, glasses + ?))`,
		[userId, date, Math.max(0, delta), WATER_MAX, delta]
	);
}

// ===== Weight =====

// All entries, oldest first: [{ date, weight }]
export async function listWeights(userId) {
	return query(
		'SELECT logged_on AS date, weight_kg AS weight FROM weight_entries WHERE user_id = ? ORDER BY logged_on',
		[userId]
	);
}

export async function currentWeight(userId) {
	const row = await queryOne(
		'SELECT weight_kg FROM weight_entries WHERE user_id = ? ORDER BY logged_on DESC LIMIT 1',
		[userId]
	);
	return row?.weight_kg ?? null;
}

// One entry per day: logging again on the same day replaces the value
export async function addWeight(userId, weightKg, date = today()) {
	await query(
		`INSERT INTO weight_entries (user_id, weight_kg, logged_on) VALUES (?, ?, ?)
		 ON DUPLICATE KEY UPDATE weight_kg = VALUES(weight_kg)`,
		[userId, round1(weightKg), date]
	);
}

// ===== Profile =====

export const LB_PER_KG = 2.20462;

// Weight from a form field in kg. Imperial users type pounds.
export function weightFromForm(form, name, units) {
	const value = number(form, name);
	return units === 'imperial' ? value / LB_PER_KG : value;
}

// Checks the onboarding/profile answers. Returns { values } or { error }.
export function parseProfile(form, units = 'metric') {
	const values = {
		sex: text(form, 'sex'),
		birth_date: text(form, 'birth_date'),
		height_cm: number(form, 'height'),
		weight_kg: weightFromForm(form, 'weight', units),
		target_weight_kg: weightFromForm(form, 'target_weight', units),
		goal: text(form, 'goal'),
		activity: text(form, 'activity')
	};

	if (!['male', 'female'].includes(values.sex)) return { error: 'Please choose your sex.' };
	if (!isDate(values.birth_date) || values.birth_date > today()) return { error: 'Please enter your birth date.' };
	const age = ageFrom(values.birth_date);
	if (age < 13 || age > 120) return { error: 'You must be at least 13 years old to use EatWise.' };
	if (!between(values.height_cm, 100, 250)) return { error: 'Height must be between 100 and 250 cm.' };
	if (!between(values.weight_kg, 30, 300)) return { error: 'Please enter a weight between 30 and 300 kg.' };
	if (!between(values.target_weight_kg, 30, 300)) return { error: 'Please enter a target weight between 30 and 300 kg.' };
	if (!['lose', 'maintain', 'gain'].includes(values.goal)) return { error: 'Please choose a goal.' };
	if (!['low', 'medium', 'high'].includes(values.activity)) return { error: 'Please choose your activity level.' };

	if (values.goal === 'lose' && values.target_weight_kg >= values.weight_kg) {
		return { error: 'To lose weight, your target must be lower than your current weight.' };
	}
	if (values.goal === 'gain' && values.target_weight_kg <= values.weight_kg) {
		return { error: 'To gain weight, your target must be higher than your current weight.' };
	}
	return { values };
}

// Daily targets from the profile answers
function planFor(values) {
	return calculatePlan({
		sex: values.sex,
		height: values.height_cm,
		weight: values.weight_kg,
		birth: values.birth_date,
		activity: values.activity,
		goal: values.goal
	});
}

// Register: creates the user, the profile and the first weight entry together.
// Returns { id } or { error }.
export async function createUser({ email, username, passwordHash }, profile) {
	const plan = planFor(profile);
	const connection = await pool.getConnection();
	try {
		await connection.beginTransaction();
		const [user] = await connection.query(
			'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)',
			[email, username, passwordHash]
		);
		await connection.query(
			`INSERT INTO profiles (user_id, sex, birth_date, height_cm, goal, activity, target_weight_kg,
			                       kcal_target, protein_target_g, carbs_target_g, fat_target_g)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				user.insertId, profile.sex, profile.birth_date, profile.height_cm, profile.goal, profile.activity,
				round1(profile.target_weight_kg), plan.kcal, plan.protein, plan.carbs, plan.fat
			]
		);
		await connection.query('INSERT INTO weight_entries (user_id, weight_kg, logged_on) VALUES (?, ?, ?)', [
			user.insertId,
			round1(profile.weight_kg),
			today()
		]);
		await connection.commit();
		return { id: user.insertId };
	} catch (err) {
		await connection.rollback();
		if (err.code === 'ER_DUP_ENTRY') {
			return { error: String(err.message).includes('email') ? 'This email is already registered.' : 'This username is already taken.' };
		}
		throw err;
	} finally {
		connection.release();
	}
}

// Saves new profile answers, logs the weight and calculates new daily targets
export async function updateProfile(userId, values) {
	const plan = planFor(values);
	await query(
		`UPDATE profiles SET sex = ?, birth_date = ?, height_cm = ?, goal = ?, activity = ?, target_weight_kg = ?,
		        kcal_target = ?, protein_target_g = ?, carbs_target_g = ?, fat_target_g = ?
		 WHERE user_id = ?`,
		[
			values.sex, values.birth_date, values.height_cm, values.goal, values.activity, round1(values.target_weight_kg),
			plan.kcal, plan.protein, plan.carbs, plan.fat, userId
		]
	);
	await addWeight(userId, values.weight_kg);
	return plan;
}

export async function updateSettings(userId, { units, theme, notifications }) {
	await query('UPDATE profiles SET units = ?, theme = ?, notifications = ? WHERE user_id = ?', [
		units === 'imperial' ? 'imperial' : 'metric',
		theme === 'dark' ? 'dark' : 'light',
		notifications ? 1 : 0,
		userId
	]);
}

// ===== Admin =====

export async function adminStats() {
	const row = await queryOne(
		`SELECT (SELECT COUNT(*) FROM users) AS users,
		        (SELECT COUNT(*) FROM foods WHERE created_by IS NULL) AS foods,
		        (SELECT COUNT(*) FROM foods WHERE created_by IS NOT NULL) AS custom_foods,
		        (SELECT COUNT(*) FROM diary_entries WHERE entry_date = ?) AS entries_today`,
		[today()]
	);
	return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)]));
}

export async function listUsers() {
	const rows = await query(
		`SELECT u.id, u.email, u.username, u.role, u.created_at,
		        (SELECT COUNT(*) FROM diary_entries d WHERE d.user_id = u.id) AS entries
		 FROM users u
		 ORDER BY u.created_at DESC`
	);
	return rows.map((r) => ({ ...r, entries: Number(r.entries) }));
}

export async function setRole(userId, role) {
	if (!['user', 'admin'].includes(role)) return;
	await query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
}

// Deletes the user. Profile, sessions, diary, weights, water and own foods are deleted by ON DELETE CASCADE.
export async function deleteUser(userId) {
	await query('DELETE FROM users WHERE id = ?', [userId]);
}

export async function listBuiltInFoods() {
	return query(`SELECT ${FOOD_COLUMNS} FROM foods f WHERE f.created_by IS NULL ORDER BY f.category, f.name`);
}

// Admins can delete any food
export async function deleteAnyFood(foodId) {
	await query('DELETE FROM foods WHERE id = ?', [foodId]);
}