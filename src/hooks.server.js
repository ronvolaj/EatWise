// Runs on the server when a page or form crashes.
// It prints a clear hint in the terminal and (during "npm run dev") also shows it on the page.
import { dev } from '$app/environment';
import { dbConfig } from './lib/server/db.js';

const HINTS = {
	ECONNREFUSED: `MySQL is not reachable at ${dbConfig.host}:${dbConfig.port}. Is MySQL running? Are DB_HOST and DB_PORT in .env right?`,
	ENOTFOUND: `The host "${dbConfig.host}" was not found. Check DB_HOST in .env.`,
	ETIMEDOUT: `MySQL at ${dbConfig.host}:${dbConfig.port} did not answer. Check DB_HOST, DB_PORT and your internet connection.`,
	ER_ACCESS_DENIED_ERROR: 'MySQL refused the login. Check DB_USER and DB_PASSWORD in .env.',
	ER_DBACCESS_DENIED_ERROR: `Your MySQL user has no access to the database "${dbConfig.database}". Check DB_NAME and DB_USER in .env.`,
	ER_BAD_DB_ERROR: `The database "${dbConfig.database}" does not exist. Check DB_NAME in .env.`,
	ER_NO_SUCH_TABLE: 'A table is missing in the database. Check the tables in DataGrip.',
	ER_BAD_FIELD_ERROR: 'A column is missing - the tables in the database are different from what the app expects. Check the tables in DataGrip.'
};

/** @type {import('@sveltejs/kit').HandleServerError} */
export function handleError({ error }) {
	const err = /** @type {any} */ (error);
	const code = err?.code;
	const isDbError = HINTS[code] || String(code ?? '').startsWith('ER_');

	if (isDbError) {
		const hint = HINTS[code] ?? 'MySQL rejected the query.';
		console.error(`\n[EatWise] Database problem (${code}): ${hint}\n  MySQL says: ${err.sqlMessage ?? err.message}\n`);
		return { message: dev ? `Database problem (${code}): ${hint} — MySQL says: ${err.sqlMessage ?? err.message}` : 'Database problem - see the server terminal.' };
	}

	console.error(error);
	return { message: dev ? `Error: ${err?.message ?? error}` : 'Something went wrong.' };
}