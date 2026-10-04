import { getUser, takeFlash } from '../lib/server/auth.js';

// Runs for every page. data.user is null when nobody is logged in.
export async function load({ cookies, url }) {
	return {
		user: await getUser(cookies),
		flash: takeFlash(cookies),
		path: url.pathname
	};
}