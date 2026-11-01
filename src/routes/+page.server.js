import { redirect } from '@sveltejs/kit';
import { getUser } from '../lib/server/auth.js';

// The start page only forwards: logged in -> Home, otherwise -> Onboarding
export async function load({ cookies }) {
	redirect(303, (await getUser(cookies)) ? '/app/homepage' : '/app/register');
}