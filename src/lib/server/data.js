// All database queries for foods, diary, water, weight and profile.
import { isId, query, queryOne } from './db.js';
import { calculatePlan } from '../nutrition.js';
// Error texts in the user's language
import { m } from '../paraglide/messages.js';
import { getLocale } from '../paraglide/runtime.js';

// ---------- Dates (always YYYY-MM-DD) ----------

function format(d) {
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${month}-${day}`;
}

export function today() {
	return format(new Date());
}

export function shiftDate(date, days) {
	const d = new Date(date + 'T12:00:00');
	d.setDate(d.getDate() + days);
	return format(d);
}

// Returns a valid date that is not in the future (otherwise today)
export function cleanDate(value) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return today();
	if (Number.isNaN(new Date(value + 'T12:00:00').getTime())) return today();
	return value > today() ? today() : value;
}

// ---------- Foods ----------

// Food names, brands and categories come in the user's language (de, en or sq)
// from the table food_translations. Foods without a translation (the users' own foods)
// keep the text from the foods table.
const FOOD_COLUMNS = `f.id, COALESCE(t.name, f.name) AS name, COALESCE(t.brand, f.brand) AS brand, f.icon, f.barcode,
	COALESCE(t.category, f.category) AS category, f.serving_size_g AS serving, f.kcal, f.protein_g AS protein,
	f.carbs_g AS carbs, f.fat_g AS fat, f.fiber_g AS fiber, f.sugar_g AS sugar, f.created_by`;

// The "?" is the language, so every food query starts with lang() in its params
const FOOD_TABLE = 'foods f LEFT JOIN food_translations t ON t.food_id = f.id AND t.lang = ?';

// The language the user chose in the app (cookie), or English
function lang() {
	try {
		const locale = getLocale();
		return ['de', 'en', 'sq'].includes(locale) ? locale : 'en';
	} catch {
		return 'en'; // outside of a request (e.g. a script)
	}
}

// Built-in foods plus the user's own foods
export async function listFoods(userId) {
	return query(
		`SELECT ${FOOD_COLUMNS} FROM ${FOOD_TABLE} WHERE f.created_by IS NULL OR f.created_by = ? ORDER BY f.created_by IS NULL, f.id`,
		[lang(), userId]
	);
}

export async function getFood(id, userId) {
	if (!isId(id)) return null;
	return queryOne(
		`SELECT ${FOOD_COLUMNS} FROM ${FOOD_TABLE} WHERE f.id = ? AND (f.created_by IS NULL OR f.created_by = ?)`,
		[lang(), id, userId]
	);
}

export async function findByBarcode(barcode, userId) {
	return queryOne(
		`SELECT ${FOOD_COLUMNS} FROM ${FOOD_TABLE} WHERE f.barcode = ? AND (f.created_by IS NULL OR f.created_by = ?)`,
		[lang(), barcode, userId]
	);
}

export async function findByName(name) {
	// The name is the English name from the foods table
	return queryOne(
		`SELECT ${FOOD_COLUMNS} FROM ${FOOD_TABLE} WHERE f.name = ? AND f.created_by IS NULL`,
		[lang(), name]
	);
}

// userId = null creates a built-in food (admin), otherwise the user's own food
export async function createFood(userId, food) {
	if (!food.name) return { error: m.error_food_name() };
	if (food.name.length > 100 || food.brand.length > 100) return { error: m.error_name_long() };
	if (food.barcode.length > 32) return { error: m.error_barcode_long() };
	if (!(food.serving > 0)) return { error: m.error_serving() };
	for (const key of ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar']) {
		if (!(food[key] >= 0)) return { error: m.error_required() };
	}
	if (food.barcode && (await queryOne('SELECT id FROM foods WHERE barcode = ?', [food.barcode]))) {
		return { error: m.error_barcode_exists() };
	}
	if ((food.icon ?? '').length > 16 || (food.category ?? '').length > 50)
		return { error: m.error_icon_long() };
	const result = await query(
		`INSERT INTO foods (name, brand, icon, category, barcode, serving_size_g, kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, created_by)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			food.name,
			food.brand || 'Custom',
			food.icon || '🥘',
			food.category || 'Custom',
			food.barcode || null,
			food.serving,
			food.kcal,
			food.protein,
			food.carbs,
			food.fat,
			food.fiber,
			food.sugar,
			userId
		]
	);
	return { id: result.insertId };
}

// Foods the user added to the diary lately (newest first)
export async function recentFoods(userId, limit = 5) {
	return query(
		`SELECT ${FOOD_COLUMNS} FROM ${FOOD_TABLE}
		 JOIN (SELECT food_id, MAX(id) AS last_entry FROM diary_entries WHERE user_id = ? GROUP BY food_id) r ON r.food_id = f.id
		 WHERE f.created_by IS NULL OR f.created_by = ?
		 ORDER BY r.last_entry DESC LIMIT ?`,
		[lang(), userId, userId, limit]
	);
}

// Only the user's own foods can be deleted. Their diary entries are deleted too (ON DELETE CASCADE).
export async function deleteOwnFood(userId, foodId) {
	if (!isId(foodId)) return false;
	const result = await query('DELETE FROM foods WHERE id = ? AND created_by = ?', [foodId, userId]);
	return result.affectedRows > 0;
}

// ---------- Admin: built-in foods ----------

// All built-in foods and how often they were logged
export async function listBuiltInFoods() {
	return query(
		`SELECT ${FOOD_COLUMNS}, (SELECT COUNT(*) FROM diary_entries d WHERE d.food_id = f.id) AS uses
		 FROM ${FOOD_TABLE} WHERE f.created_by IS NULL ORDER BY name`,
		[lang()]
	);
}

export async function deleteBuiltInFood(foodId) {
	if (!isId(foodId)) return false;
	const result = await query('DELETE FROM foods WHERE id = ? AND created_by IS NULL', [foodId]);
	return result.affectedRows > 0;
}

// ---------- Diary ----------

// Entries of one day. kcal and macros are already calculated for the quantity.
export async function getEntries(userId, date) {
	return query(
		`SELECT d.id, d.meal, d.quantity_g AS quantity, COALESCE(t.name, f.name) AS name, f.icon,
		        f.kcal * d.quantity_g / 100      AS kcal,
		        f.protein_g * d.quantity_g / 100 AS protein,
		        f.carbs_g * d.quantity_g / 100   AS carbs,
		        f.fat_g * d.quantity_g / 100     AS fat
		 FROM diary_entries d
		 JOIN foods f ON f.id = d.food_id
		 LEFT JOIN food_translations t ON t.food_id = f.id AND t.lang = ?
		 WHERE d.user_id = ? AND d.entry_date = ?
		 ORDER BY d.id`,
		[lang(), userId, date]
	);
}

const MEAL_IDS = ['breakfast', 'lunch', 'dinner', 'snack'];

export async function addEntry(userId, foodId, date, meal, quantity, source = 'search') {
	if (!MEAL_IDS.includes(meal)) return { error: m.error_choose_meal() };
	if (!(quantity > 0)) return { error: m.error_quantity() };
	await query(
		'INSERT INTO diary_entries (user_id, food_id, entry_date, meal, quantity_g, source) VALUES (?, ?, ?, ?, ?, ?)',
		[userId, foodId, date, meal, quantity, source]
	);
	return {};
}

export async function updateEntry(userId, entryId, quantity, meal) {
	if (!isId(entryId)) return { error: m.error_entry_missing() };
	if (!MEAL_IDS.includes(meal)) return { error: m.error_choose_meal() };
	if (!(quantity > 0)) return { error: m.error_quantity() };
	await query('UPDATE diary_entries SET quantity_g = ?, meal = ? WHERE id = ? AND user_id = ?', [
		quantity,
		meal,
		entryId,
		userId
	]);
	return {};
}

export async function removeEntry(userId, entryId) {
	if (!isId(entryId)) return;
	await query('DELETE FROM diary_entries WHERE id = ? AND user_id = ?', [entryId, userId]);
}

// Calories per day for the last "days" days (oldest first, days without entries = 0)
export async function dailyKcal(userId, days) {
	const end = today();
	const start = shiftDate(end, -(days - 1));
	const rows = await query(
		`SELECT d.entry_date AS day, SUM(f.kcal * d.quantity_g / 100) AS kcal
		 FROM diary_entries d JOIN foods f ON f.id = d.food_id
		 WHERE d.user_id = ? AND d.entry_date BETWEEN ? AND ?
		 GROUP BY d.entry_date`,
		[userId, start, end]
	);
	const byDate = new Map(rows.map((r) => [r.day, Number(r.kcal)]));
	return Array.from({ length: days }, (_, i) => {
		const date = shiftDate(start, i);
		return { date, kcal: byDate.get(date) ?? 0 };
	});
}

// ---------- Water ----------

export async function getWater(userId, date) {
	const row = await queryOne('SELECT glasses FROM water_logs WHERE user_id = ? AND log_date = ?', [
		userId,
		date
	]);
	return row?.glasses ?? 0;
}

export async function changeWater(userId, date, delta) {
	const glasses = Math.min(8, Math.max(0, (await getWater(userId, date)) + delta));
	await query(
		`INSERT INTO water_logs (user_id, log_date, glasses) VALUES (?, ?, ?)
		 ON DUPLICATE KEY UPDATE glasses = VALUES(glasses)`,
		[userId, date, glasses]
	);
}

// ---------- Weight ----------

export async function listWeights(userId) {
	const rows = await query(
		'SELECT weight_kg, logged_on FROM weight_entries WHERE user_id = ? ORDER BY logged_on',
		[userId]
	);
	return rows.map((r) => ({ weight: r.weight_kg, date: r.logged_on }));
}

// One weight per day: logging again on the same day replaces the value
export async function logWeight(userId, weight) {
	if (!(weight >= 30 && weight <= 400)) return { error: m.auth_error_weight() };
	await query(
		`INSERT INTO weight_entries (user_id, weight_kg, logged_on) VALUES (?, ?, ?)
		 ON DUPLICATE KEY UPDATE weight_kg = VALUES(weight_kg)`,
		[userId, weight, today()]
	);
	return {};
}

// ---------- Profile ----------

export async function updateTargets(userId, t) {
	if (!(t.kcal >= 800 && t.kcal <= 6000)) return { error: m.error_kcal_range() };
	for (const key of ['protein', 'carbs', 'fat']) {
		if (!(t[key] >= 0 && t[key] <= 1000)) return { error: m.error_macro_range() };
	}
	await query(
		'UPDATE profiles SET kcal_target = ?, protein_target_g = ?, carbs_target_g = ?, fat_target_g = ? WHERE user_id = ?',
		[Math.round(t.kcal), Math.round(t.protein), Math.round(t.carbs), Math.round(t.fat), userId]
	);
	return {};
}

// Switches one setting to its other value
export async function toggleSetting(user, name) {
	if (name === 'units') {
		await query('UPDATE profiles SET units = ? WHERE user_id = ?', [
			user.units === 'metric' ? 'imperial' : 'metric',
			user.id
		]);
	} else if (name === 'theme') {
		await query('UPDATE profiles SET theme = ? WHERE user_id = ?', [
			user.theme === 'dark' ? 'light' : 'dark',
			user.id
		]);
	} else if (name === 'notifications') {
		await query('UPDATE profiles SET notifications = ? WHERE user_id = ?', [
			user.notifications ? 0 : 1,
			user.id
		]);
	}
}

// Goal, activity, height and target weight. The daily targets are calculated again.
export async function updateProfile(user, values, currentWeight) {
	if (!['lose', 'maintain', 'gain'].includes(values.goal)) return { error: m.auth_error_goal() };
	if (!['low', 'medium', 'high'].includes(values.activity))
		return { error: m.auth_error_activity() };
	if (!(values.height >= 80 && values.height <= 260)) return { error: m.auth_error_height() };
	if (!(values.target >= 30 && values.target <= 400)) return { error: m.auth_error_target() };

	const plan = calculatePlan({
		sex: user.sex,
		birth: user.birth_date,
		weight: currentWeight,
		height: values.height,
		activity: values.activity,
		goal: values.goal
	});
	await query(
		`UPDATE profiles SET goal = ?, activity = ?, height_cm = ?, target_weight_kg = ?,
		        kcal_target = ?, protein_target_g = ?, carbs_target_g = ?, fat_target_g = ?
		 WHERE user_id = ?`,
		[
			values.goal,
			values.activity,
			values.height,
			values.target,
			plan.kcal,
			plan.protein,
			plan.carbs,
			plan.fat,
			user.id
		]
	);
	return { plan };
}
