// Data for the statistics dashboard (Rei): calories and macros per day.
// Kept in its own file so the shared data.js stays unchanged.
import { query } from './db.js';
import { shiftDate, today } from './data.js';

// Calories, protein, carbs and fat per day for the last `days` days, oldest first.
// Nutrition values in foods are per 100 g, so each entry counts with quantity_g / 100.
// Days without entries are included with 0 (entries: 0), so charts always have one bar per day.
export async function dailyNutrition(userId, days) {
	const end = today();
	const start = shiftDate(end, -(days - 1));

	const rows = await query(
		`SELECT d.entry_date AS day,
		        COUNT(*)                            AS entries,
		        SUM(f.kcal      * d.quantity_g / 100) AS kcal,
		        SUM(f.protein_g * d.quantity_g / 100) AS protein,
		        SUM(f.carbs_g   * d.quantity_g / 100) AS carbs,
		        SUM(f.fat_g     * d.quantity_g / 100) AS fat
		 FROM diary_entries d JOIN foods f ON f.id = d.food_id
		 WHERE d.user_id = ? AND d.entry_date BETWEEN ? AND ?
		 GROUP BY d.entry_date`,
		[userId, start, end]
	);

	const byDate = new Map(rows.map((r) => [r.day, r]));
	return Array.from({ length: days }, (_, i) => {
		const date = shiftDate(start, i);
		const r = byDate.get(date);
		return {
			date,
			entries: Number(r?.entries ?? 0),
			kcal: Number(r?.kcal ?? 0),
			protein: Number(r?.protein ?? 0),
			carbs: Number(r?.carbs ?? 0),
			fat: Number(r?.fat ?? 0)
		};
	});
}
