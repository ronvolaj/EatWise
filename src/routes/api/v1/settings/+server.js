import { error, json } from '@sveltejs/kit';
import { toggleSetting } from '#lib/server/data.js';
import { readJson, requireApiUser } from '#lib/server/api.js';

// PUT /api/v1/settings
// Body: { units: "metric" | "imperial", theme: "light" | "dark", notifications: true | false }
// Every field is optional. Answer: the saved settings
export async function PUT({ request }) {
	const user = await requireApiUser(request);
	const body = await readJson(request);

	const settings = {
		units: user.units,
		theme: user.theme,
		notifications: Boolean(user.notifications)
	};
	if (body.units !== undefined && !['metric', 'imperial'].includes(body.units)) {
		error(400, 'units must be "metric" or "imperial".');
	}
	if (body.theme !== undefined && !['light', 'dark'].includes(body.theme)) {
		error(400, 'theme must be "light" or "dark".');
	}
	if (body.notifications !== undefined && typeof body.notifications !== 'boolean') {
		error(400, 'notifications must be true or false.');
	}

	// toggleSetting in data.js switches a setting to its other value.
	// So it is only called for the settings that really change.
	for (const name of ['units', 'theme', 'notifications']) {
		if (body[name] !== undefined && body[name] !== settings[name]) {
			await toggleSetting(user, name);
			settings[name] = body[name];
		}
	}
	return json(settings);
}