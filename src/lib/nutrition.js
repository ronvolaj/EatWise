// Shared helpers. This file is used in the browser AND on the server.
import { m } from './paraglide/messages.js';
import { getLocale } from './paraglide/runtime.js';

// The labels are getters: they are read when they are shown,
// so they are always in the user's current language
export const MEALS = [
	{ id: 'breakfast', icon: '🍳', get label() { return m.meal_breakfast(); } },
	{ id: 'lunch', icon: '🥗', get label() { return m.meal_lunch(); } },
	{ id: 'dinner', icon: '🍲', get label() { return m.meal_dinner(); } },
	{ id: 'snack', icon: '🍓', get label() { return m.meal_snack(); } }
];

export const GOALS = {
	get lose() { return m.goal_lose(); },
	get maintain() { return m.goal_maintain(); },
	get gain() { return m.goal_gain(); }
};
export const ACTIVITIES = {
	get low() { return m.activity_low(); },
	get medium() { return m.activity_medium(); },
	get high() { return m.activity_high(); }
};

// Number with the separators of the current language (1,850 / 1.850)
export const num = (n) => Number(n).toLocaleString(getLocale());

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
		now.getMonth() > b.getMonth() ||
		(now.getMonth() === b.getMonth() && now.getDate() >= b.getDate());
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

// Albanian names. Some browsers have no Albanian date format and would show English,
// so the app formats Albanian dates itself (same result on the server and in the browser).
const SQ_DAYS = ['e diel', 'e hënë', 'e martë', 'e mërkurë', 'e enjte', 'e premte', 'e shtunë'];
const SQ_DAY_LETTERS = ['D', 'H', 'M', 'M', 'E', 'P', 'Sh'];
const SQ_MONTHS = ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'];
const SQ_MONTHS_SHORT = ['jan', 'shk', 'mar', 'pri', 'maj', 'qer', 'korr', 'gush', 'sht', 'tet', 'nën', 'dhj'];

function albanianDate(d, options) {
	const month = options.month === 'short' ? SQ_MONTHS_SHORT[d.getMonth()] : SQ_MONTHS[d.getMonth()];
	let text = `${d.getDate()} ${month}`;
	if (options.year) text += ` ${d.getFullYear()}`;
	if (options.weekday) text = `${SQ_DAYS[d.getDay()]}, ${text}`;
	return text;
}

// "2026-10-04" -> "Sunday, October 4" / "Sonntag, 4. Oktober" / "e diel, 4 tetor"
export function longDate(date, options = { weekday: 'long', month: 'long', day: 'numeric' }) {
	const d = new Date(date + 'T12:00:00');
	if (getLocale() === 'sq') return albanianDate(d, options);
	return d.toLocaleDateString(getLocale(), options);
}

// First letter of the weekday for charts (S, M, T ... / S, M, D ... / D, H, M ...)
export function weekdayLetter(date) {
	const d = new Date(date + 'T12:00:00');
	if (getLocale() === 'sq') return SQ_DAY_LETTERS[d.getDay()];
	return d.toLocaleDateString(getLocale(), { weekday: 'narrow' });
}
