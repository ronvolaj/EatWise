// All database queries for foods, diary, water, weight and profile.
import { isId, query, queryOne } from './db.js';
import { calculatePlan } from '../nutrition.js';

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

const FOOD_COLUMNS = `id, name, brand, icon, barcode, category, serving_size_g AS serving,
	kcal, protein_g AS protein, carbs_g AS carbs, fat_g AS fat, fiber_g AS fiber, sugar_g AS sugar, created_by`;

// Built-in foods plus the user's own foods
export async function listFoods(userId) {
	return query(
		`SELECT ${FOOD_COLUMNS} FROM foods WHERE created_by IS NULL OR created_by = ? ORDER BY created_by IS NULL, id`,
		[userId]
	);
}

export async function getFood(id, userId) {
	if (!isId(id)) return null;
	return queryOne(`SELECT ${FOOD_COLUMNS} FROM foods WHERE id = ? AND (created_by IS NULL OR created_by = ?)`, [id, userId]);
}

export async function findByBarcode(barcode, userId) {
	return queryOne(`SELECT ${FOOD_COLUMNS} FROM foods WHERE barcode = ? AND (created_by IS NULL OR created_by = ?)`, [
		barcode,
		userId
	]);
}

export async function findByName(name) {
	return queryOne(`SELECT ${FOOD_COLUMNS} FROM foods WHERE name = ? AND created_by IS NULL`, [name]);
}

// userId = null creates a built-in food (admin), otherwise the user's own food
export async function createFood(userId, food) {
	if (!food.name) return { error: 'Food name is required.' };
	if (food.name.length > 100 || food.brand.length > 100) return { error: 'Name and brand can have at most 100 characters.' };
	if (food.barcode.length > 32) return { error: 'The barcode can have at most 32 characters.' };
	if (!(food.serving > 0)) return { error: 'Serving size must be greater than 0.' };
	for (const key of ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar']) {
		if (!(food[key] >= 0)) return { error: 'Please complete required fields with non-negative values.' };
	}
	if (food.barcode && (await queryOne('SELECT id FROM foods WHERE barcode = ?', [food.barcode]))) {
		return { error: 'A food with this barcode already exists.' };
	}
	if ((food.icon ?? '').length > 16 || (food.category ?? '').length > 50) return { error: 'Icon or category is too long.' };
	const result = await query(
		`INSERT INTO foods (name, brand, icon, category, barcode, serving_size_g, kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, created_by)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			food.name, food.brand || 'Custom', food.icon || '🥘', food.category || 'Custom', food.barcode || null,
			food.serving, food.kcal, food.protein, food.carbs, food.fat, food.fiber, food.sugar, userId
		]
	);
	return { id: result.insertId };
}

// Foods the user added to the diary lately (newest first)
export async function recentFoods(userId, limit = 5) {
	return query(
		`SELECT ${FOOD_COLUMNS} FROM foods f
		 JOIN (SELECT food_id, MAX(id) AS last_entry FROM diary_entries WHERE user_id = ? GROUP BY food_id) r ON r.food_id = f.id
		 WHERE f.created_by IS NULL OR f.created_by = ?
		 ORDER BY r.last_entry DESC LIMIT ?`,
		[userId, userId, limit]
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
		`SELECT ${FOOD_COLUMNS}, (SELECT COUNT(*) FROM diary_entries d WHERE d.food_id = foods.id) AS uses
		 FROM foods WHERE created_by IS NULL ORDER BY name`
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
		`SELECT d.id, d.meal, d.quantity_g AS quantity, f.name, f.icon,
		        f.kcal * d.quantity_g / 100      AS kcal,
		        f.protein_g * d.quantity_g / 100 AS protein,
		        f.carbs_g * d.quantity_g / 100   AS carbs,
		        f.fat_g * d.quantity_g / 100     AS fat
		 FROM diary_entries d JOIN foods f ON f.id = d.food_id
		 WHERE d.user_id = ? AND d.entry_date = ?
		 ORDER BY d.id`,
		[userId, date]
	);
}

const MEAL_IDS = ['breakfast', 'lunch', 'dinner', 'snack'];

export async function addEntry(userId, foodId, date, meal, quantity, source = 'search') {
	if (!MEAL_IDS.includes(meal)) return { error: 'Choose a meal.' };
	if (!(quantity > 0)) return { error: 'Quantity must be greater than 0.' };
	await query('INSERT INTO diary_entries (user_id, food_id, entry_date, meal, quantity_g, source) VALUES (?, ?, ?, ?, ?, ?)', [
		userId,
		foodId,
		date,
		meal,
		quantity,
		source
	]);
	return {};
}

export async function updateEntry(userId, entryId, quantity, meal) {
	if (!isId(entryId)) return { error: 'This entry does not exist.' };
	if (!MEAL_IDS.includes(meal)) return { error: 'Choose a meal.' };
	if (!(quantity > 0)) return { error: 'Quantity must be greater than 0.' };
	await query('UPDATE diary_entries SET quantity_g = ?, meal = ? WHERE id = ? AND user_id = ?', [quantity, meal, entryId, userId]);
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
	const row = await queryOne('SELECT glasses FROM water_logs WHERE user_id = ? AND log_date = ?', [userId, date]);
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
	const rows = await query('SELECT weight_kg, logged_on FROM weight_entries WHERE user_id = ? ORDER BY logged_on', [userId]);
	return rows.map((r) => ({ weight: r.weight_kg, date: r.logged_on }));
}

// One weight per day: logging again on the same day replaces the value
export async function logWeight(userId, weight) {
	if (!(weight >= 30 && weight <= 400)) return { error: 'Enter a weight between 30 and 400 kg.' };
	await query(
		`INSERT INTO weight_entries (user_id, weight_kg, logged_on) VALUES (?, ?, ?)
		 ON DUPLICATE KEY UPDATE weight_kg = VALUES(weight_kg)`,
		[userId, weight, today()]
	);
	return {};
}

// ---------- Profile ----------

export async function updateTargets(userId, t) {
	if (!(t.kcal >= 800 && t.kcal <= 6000)) return { error: 'Calories must be between 800 and 6,000.' };
	for (const key of ['protein', 'carbs', 'fat']) {
		if (!(t[key] >= 0 && t[key] <= 1000)) return { error: 'Macro targets must be between 0 and 1,000 g.' };
	}
	await query('UPDATE profiles SET kcal_target = ?, protein_target_g = ?, carbs_target_g = ?, fat_target_g = ? WHERE user_id = ?', [
		Math.round(t.kcal),
		Math.round(t.protein),
		Math.round(t.carbs),
		Math.round(t.fat),
		userId
	]);
	return {};
}

// Switches one setting to its other value
export async function toggleSetting(user, name) {
	if (name === 'units') {
		await query('UPDATE profiles SET units = ? WHERE user_id = ?', [user.units === 'metric' ? 'imperial' : 'metric', user.id]);
	} else if (name === 'theme') {
		await query('UPDATE profiles SET theme = ? WHERE user_id = ?', [user.theme === 'dark' ? 'light' : 'dark', user.id]);
	} else if (name === 'notifications') {
		await query('UPDATE profiles SET notifications = ? WHERE user_id = ?', [user.notifications ? 0 : 1, user.id]);
	}
}

// Goal, activity, height and target weight. The daily targets are calculated again.
export async function updateProfile(user, values, currentWeight) {
	if (!['lose', 'maintain', 'gain'].includes(values.goal)) return { error: 'Choose a goal.' };
	if (!['low', 'medium', 'high'].includes(values.activity)) return { error: 'Choose your activity level.' };
	if (!(values.height >= 80 && values.height <= 260)) return { error: 'Enter a height between 80 and 260 cm.' };
	if (!(values.target >= 30 && values.target <= 400)) return { error: 'Enter a target weight between 30 and 400 kg.' };

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
		[values.goal, values.activity, values.height, values.target, plan.kcal, plan.protein, plan.carbs, plan.fat, user.id]
	);
	return { plan };
}