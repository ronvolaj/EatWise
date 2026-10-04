import { redirect } from '@sveltejs/kit';
import { getUser } from '../lib/server/auth.js';

// "/" sends you to the app, or to the login page when you are not logged in
export async function load({ cookies }) {
	const user = await getUser(cookies);
	redirect(303, user ? '/app/homepage' : '/app/login');
}