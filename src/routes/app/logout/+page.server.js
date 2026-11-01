import { redirect } from '@sveltejs/kit';
import { logout } from '../../../lib/server/auth.js';

// The page itself shows nothing: opening it directly forwards to Home
export async function load() {
	redirect(303, '/app/homepage');
}

// Called by the "Log out" button (form with action="/app/logout")
export const actions = {
	default: async ({ cookies }) => {
		await logout(cookies);
		redirect(303, '/app/login');
	}
};