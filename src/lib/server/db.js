// Database connection (MySQL).
// The tables are created with the script eatwise-mysql.sql (run it once in DataGrip).
// The login data for MySQL is read from the file ".env" in the project folder.
import mysql from 'mysql2/promise';
import { existsSync, readFileSync } from 'node:fs';

// Reads lines like DB_PASSWORD=secret from the .env file
function readEnvFile() {
	const values = {};
	if (!existsSync('.env')) return values;
	for (const line of readFileSync('.env', 'utf8').split('\n')) {
		const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
		if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, '');
	}
	return values;
}

const env = { ...readEnvFile(), ...process.env };

export const pool = mysql.createPool({
	host: env.DB_HOST ?? 'localhost',
	port: Number(env.DB_PORT ?? 28474),
	user: env.DB_USER ?? 'root',
	password: env.DB_PASSWORD ?? '',
	database: env.DB_NAME ?? 'ronvol20_eatwise',
	charset: 'utf8mb4', // needed for the food emojis
	dateStrings: true, // dates come back as text: "2026-10-04"
	connectionLimit: 5
});

// Runs one SQL statement. The "?" in the SQL are replaced by the params, safely.
// SELECT returns a list of rows. INSERT returns an object with insertId.
export async function query(sql, params = []) {
	const [rows] = await pool.query(sql, params);
	return Array.isArray(rows) ? rows.map((row) => ({ ...row })) : rows;
}

// Like query, but returns only the first row (or null)
export async function queryOne(sql, params = []) {
	const rows = await query(sql, params);
	return rows[0] ?? null;
}

// true for a valid row id (1, 2, 3, ...)
export function isId(value) {
	return Number.isInteger(value) && value > 0;
}

// Barcode of the sample product that "Simulate scan" uses
export const SAMPLE_BARCODE = '9001234500307';