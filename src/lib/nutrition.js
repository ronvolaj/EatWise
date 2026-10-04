// Shared helpers. This file is used in the browser AND on the server.

export const MEALS = [
	{ id: 'breakfast', label: 'Breakfast', icon: '🍳' },
	{ id: 'lunch', label: 'Lunch', icon: '🥗' },
	{ id: 'dinner', label: 'Dinner', icon: '🍲' },
	{ id: 'snack', label: 'Snacks', icon: '🍓' }
];

export const GOALS = { lose: 'Lose Weight', maintain: 'Maintain Weight', gain: 'Gain Weight' };
export const ACTIVITIES = { low: 'Low', medium: 'Medium', high: 'A lot' };

export const round = (n) => Math.round(n);

export function mealLabel(id) {
	return MEALS.find((m) => m.id === id)?.label ?? id;
}

// Age in full years from a date string YYYY-MM-DD
export function ageFrom(birth) {
	const b = new Date(birth + 'T12:00:00');
	const now = new Date();
	let age = now.getFullYear() - b.getFullYear();
	const hadBirthday =
		now.getMonth() > b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() >= b.getDate());
	if (!hadBirthday) age -= 1;
	return Math.max(0, age);
}

// Daily calorie and macro targets (Mifflin-St Jeor)
export function calculatePlan({ sex, height, weight, birth, activity, goal }) {
	const age = ageFrom(birth);
	const bmr = 10 * weight + 6.25 * height - 5 * age + (sex === 'female' ? -161 : 5);
	const factor = activity === 'low' ? 1.2 : activity === 'high' ? 1.75 : 1.5;
	// Under 18: no deficit and no surplus
	const adjustment = age < 18 ? 0 : goal === 'lose' ? -500 : goal === 'gain' ? 400 : 0;
	const minimum = sex === 'female' ? 1200 : 1500;
	const kcal = Math.round(Math.max(minimum, bmr * factor + adjustment) / 10) * 10;
	return {
		age,
		kcal,
		protein: round((kcal * 0.25) / 4),
		carbs: round((kcal * 0.45) / 4),
		fat: round((kcal * 0.3) / 9)
	};
}

// Adds up diary entries. Home, Diary and Statistics all use this function.
export function sumEntries(entries) {
	const total = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
	for (const e of entries) {
		total.kcal += e.kcal;
		total.protein += e.protein;
		total.carbs += e.carbs;
		total.fat += e.fat;
	}
	return total;
}

// Display helpers. The database always stores kg and cm.
export function formatWeight(kg, units) {
	if (kg == null) return '–';
	return units === 'imperial' ? `${round(kg * 2.205)} lb` : `${Math.round(kg * 10) / 10} kg`;
}

export function formatHeight(cm, units) {
	if (units !== 'imperial') return `${round(cm)} cm`;
	const inches = round(cm / 2.54);
	return `${Math.floor(inches / 12)}′ ${inches % 12}″`;
}

// "2026-10-04" -> "Sunday, October 4"
export function longDate(date, options = { weekday: 'long', month: 'long', day: 'numeric' }) {
	return new Date(date + 'T12:00:00').toLocaleDateString('en-US', options);
}
