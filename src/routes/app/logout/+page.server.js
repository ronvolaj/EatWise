import { redirect } from '@sveltejs/kit';
import { deleteSession, flash, requireUser } from '../../../lib/server/auth.js';

export async function load({ cookies }) {
	await requireUser(cookies);
}

export const actions = {
	// Logging out is a POST (a form button), so a link or preload can not log you out by accident
	default: async ({ cookies }) => {
		await deleteSession(cookies);
		flash(cookies, 'You are logged out.');
		redirect(303, '/app/login');
	}
};