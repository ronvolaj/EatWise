<script>
	import { enhance } from '$app/forms';
	import Icon from '../../../lib/components/Icon.svelte';
	import { ACTIVITIES, GOALS, ageFrom, formatHeight, formatWeight } from '../../../lib/nutrition.js';

	let { data, form } = $props();

	let editing = $state(false);

	const user = $derived(data.user);
	const imperial = $derived(user.units === 'imperial');
	const weightUnit = $derived(imperial ? 'lb' : 'kg');
	// Value for weight inputs in the user's unit
	const inUnit = (kg) => (kg == null ? '' : imperial ? Math.round(kg * 2.20462 * 10) / 10 : kg);
	const bmi = $derived(data.weight ? Math.round((data.weight / (user.height_cm / 100) ** 2) * 10) / 10 : null);
	const todayText = new Date().toISOString().slice(0, 10);

	// Keeps the forms open/closed after saving
	const keep = () => async ({ result, update }) => {
		await update({ reset: false });
		if (result.type === 'success') editing = false;
	};
</script>

<svelte:head><title>Profile · EatWise</title></svelte:head>

<div class="screen">
	<div class="profile-head">
		<div class="avatar big">{user.username[0]}</div>
		<h1>{user.username}</h1>
		<p class="muted">{user.email}</p>
		{#if user.role === 'admin'}<span class="badge">Admin</span>{/if}
	</div>

	<div class="stat-grid">
		<div class="card stat"><strong>{user.kcal_target.toLocaleString('en-US')}</strong><small>kcal goal</small></div>
		<div class="card stat"><strong>{formatWeight(data.weight, user.units)}</strong><small>Weight</small></div>
		<div class="card stat"><strong>{bmi ?? '–'}</strong><small>BMI</small></div>
	</div>

	<!-- Log weight -->
	<form class="card weight-form" method="POST" action="?/weight" use:enhance>
		<label class="field">
			<span>Log today's weight ({weightUnit})</span>
			<div class="inline-form">
				<input name="weight" type="number" min="1" step="0.1" inputmode="decimal" placeholder={String(inUnit(data.weight))} required />
				<button class="button primary">Save</button>
			</div>
		</label>
		{#if form?.section === 'weight'}<p class="form-error" role="alert">{form.error}</p>{/if}
	</form>

	<!-- Goals and body data -->
	<div class="card">
		<div class="card-title">
			<h2>My goal</h2>
			<button class="link-button" onclick={() => (editing = !editing)}>{editing ? 'Cancel' : 'Edit'}</button>
		</div>

		{#if !editing}
			<dl class="info-list">
				<div><dt>Goal</dt><dd>{GOALS[user.goal]}</dd></div>
				<div><dt>Target weight</dt><dd>{formatWeight(user.target_weight_kg, user.units)}</dd></div>
				<div><dt>Activity</dt><dd>{ACTIVITIES[user.activity]}</dd></div>
				<div><dt>Height</dt><dd>{formatHeight(user.height_cm, user.units)}</dd></div>
				<div><dt>Age</dt><dd>{ageFrom(user.birth_date)}</dd></div>
				<div><dt>Daily macros</dt><dd>P {user.protein_target_g}g · C {user.carbs_target_g}g · F {user.fat_target_g}g</dd></div>
			</dl>
		{:else}
			<form method="POST" action="?/profile" use:enhance={keep}>
				<div class="field">
					<span>Sex</span>
					<div class="choice-row">
						<label class="choice"><input type="radio" name="sex" value="female" checked={user.sex === 'female'} />Female</label>
						<label class="choice"><input type="radio" name="sex" value="male" checked={user.sex === 'male'} />Male</label>
					</div>
				</div>
				<label class="field">
					<span>Birth date</span>
					<input name="birth_date" type="date" max={todayText} value={user.birth_date} required />
				</label>
				<div class="field-row">
					<label class="field">
						<span>Height (cm)</span>
						<input name="height" type="number" min="100" max="250" step="0.1" value={user.height_cm} required />
					</label>
					<label class="field">
						<span>Weight ({weightUnit})</span>
						<input name="weight" type="number" min="1" step="0.1" value={inUnit(data.weight)} required />
					</label>
				</div>
				<div class="field">
					<span>Goal</span>
					<div class="choice-row">
						{#each Object.entries(GOALS) as [id, label]}
							<label class="choice"><input type="radio" name="goal" value={id} checked={user.goal === id} />{label}</label>
						{/each}
					</div>
				</div>
				<label class="field">
					<span>Target weight ({weightUnit})</span>
					<input name="target_weight" type="number" min="1" step="0.1" value={inUnit(user.target_weight_kg)} required />
				</label>
				<div class="field">
					<span>Activity</span>
					<div class="choice-row">
						{#each Object.entries(ACTIVITIES) as [id, label]}
							<label class="choice"><input type="radio" name="activity" value={id} checked={user.activity === id} />{label}</label>
						{/each}
					</div>
				</div>
				{#if form?.section === 'profile'}<p class="form-error" role="alert">{form.error}</p>{/if}
				<button class="button primary">Save and recalculate</button>
			</form>
		{/if}
	</div>

	<!-- Settings -->
	<form class="card" method="POST" action="?/settings" use:enhance={() => async ({ update }) => update({ reset: false })}>
		<div class="card-title"><h2>Settings</h2></div>
		<div class="field">
			<span>Units</span>
			<div class="choice-row">
				<label class="choice"><input type="radio" name="units" value="metric" checked={user.units === 'metric'} />kg / cm</label>
				<label class="choice"><input type="radio" name="units" value="imperial" checked={user.units === 'imperial'} />lb / ft</label>
			</div>
		</div>
		<div class="field">
			<span>Theme</span>
			<div class="choice-row">
				<label class="choice"><input type="radio" name="theme" value="light" checked={user.theme === 'light'} />Light</label>
				<label class="choice"><input type="radio" name="theme" value="dark" checked={user.theme === 'dark'} /><Icon name="moon" size={16} />Dark</label>
			</div>
		</div>
		<label class="switch-row">
			<span><Icon name="bell" size={18} />Reminders</span>
			<input type="checkbox" name="notifications" checked={user.notifications} />
		</label>
		<button class="button secondary">Save settings</button>
	</form>

	<div class="card list-card menu">
		<a href="/app/statistics"><Icon name="trend" /><span>Statistics</span><Icon name="next" size={18} /></a>
		{#if user.role === 'admin'}
			<a href="/app/admin"><Icon name="shield" /><span>Admin panel</span><Icon name="next" size={18} /></a>
		{/if}
		<a href="/app/logout" class="danger-text"><Icon name="logout" /><span>Log out</span><Icon name="next" size={18} /></a>
	</div>
</div>