import { getUser, readFlash } from '../lib/server/auth.js';

// Runs for every page: who is logged in? (null = nobody)
export async function load({ cookies }) {
	return { user: await getUser(cookies), flash: readFlash(cookies) };
}