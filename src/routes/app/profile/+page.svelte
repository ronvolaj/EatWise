<script>
	import { enhance } from '$app/forms';
	import Icon from '../../../lib/components/Icon.svelte';
	import MacroBadge from '../../../lib/components/MacroBadge.svelte';
	import PageHeader from '../../../lib/components/PageHeader.svelte';
	import Progress from '../../../lib/components/Progress.svelte';
	import { ACTIVITIES, GOALS, ageFrom, formatHeight, formatWeight, round } from '../../../lib/nutrition.js';

	let { data, form } = $props();

	let editGoal = $state(false);
	let editTargets = $state(false);
	let weightModal = $state(false);
	let confirmDelete = $state(false);

	const user = $derived(data.user);
	const startWeight = $derived(data.weights[0]?.weight);
	const currentWeight = $derived(data.weights.at(-1)?.weight);

	// Progress from the first logged weight towards the target weight
	const progress = $derived.by(() => {
		const total = startWeight - user.target_weight_kg;
		if (!total) return 100;
		return Math.min(100, Math.max(0, round(((startWeight - currentWeight) / total) * 100)));
	});

	// Height and target weight in the user's unit (for the edit form)
	const heightInput = $derived(user.units === 'imperial' ? round(user.height_cm / 2.54) : round(user.height_cm));
	const targetInput = $derived(
		user.units === 'imperial' ? round(user.target_weight_kg * 2.205) : Math.round(user.target_weight_kg * 10) / 10
	);

	const weightInput = $derived(
		user.units === 'imperial' ? round(currentWeight * 2.205) : Math.round(currentWeight * 10) / 10
	);

	// Close a window after its form was saved
	function closeAfter(close) {
		return () =>
			async ({ result, update }) => {
				await update();
				if (result.type === 'success') close();
			};
	}
</script>

<div class="screen profile-screen">
	<PageHeader title="Profile" subtitle="Your plan, preferences and progress" />

	<div class="profile-card">
		<div class="profile-avatar">{user.username[0]}</div>
		<h1>{user.username}</h1>
		<p>{user.email}</p>
		<div>
			<span><strong>{ageFrom(user.birth_date)}</strong><small>Age</small></span>
			<span><strong>{formatHeight(user.height_cm, user.units)}</strong><small>Height</small></span>
			<span><strong>{formatWeight(currentWeight, user.units)}</strong><small>Weight</small></span>
		</div>
	</div>

	<div class="card goal-card">
		<div class="card-title">
			<div><span class="eyebrow">MY GOAL</span><h2>{GOALS[user.goal]}</h2></div>
			<button class="icon-button" aria-label="Edit goal" aria-expanded={editGoal} onclick={() => (editGoal = !editGoal)}>
				<Icon name="edit" />
			</button>
		</div>
		<div class="goal-data">
			<span><small>Target</small><strong>{formatWeight(user.target_weight_kg, user.units)}</strong></span>
			<span><small>Activity</small><strong>{ACTIVITIES[user.activity]}</strong></span>
			<span><small>Progress</small><strong>{progress}%</strong></span>
		</div>
		<Progress value={progress} max={100} color="green" />
		{#if editGoal}
			<form class="inline-edit" method="POST" action="?/profile" use:enhance={closeAfter(() => (editGoal = false))}>
				<label class="field">
					<span>Goal</span>
					<select name="goal" value={user.goal}>
						{#each Object.entries(GOALS) as [value, label]}<option {value}>{label}</option>{/each}
					</select>
				</label>
				<label class="field">
					<span>Activity</span>
					<select name="activity" value={user.activity}>
						{#each Object.entries(ACTIVITIES) as [value, label]}<option {value}>{label}</option>{/each}
					</select>
				</label>
				<label class="field">
					<span>Height ({user.units === 'imperial' ? 'in' : 'cm'})</span>
					<input name="height" type="number" step="any" min="1" required value={heightInput} />
				</label>
				<label class="field">
					<span>Target weight ({user.units === 'imperial' ? 'lb' : 'kg'})</span>
					<input name="target" type="number" step="0.1" min="1" required value={targetInput} />
				</label>
				{#if form?.profileError}<p class="form-error" role="alert">{form.profileError}</p>{/if}
				<p class="edit-note">Your daily calorie and macro targets are calculated again.</p>
				<button class="button primary">Save goal</button>
			</form>
		{/if}
	</div>

	<div class="card">
		<div class="card-title">
			<div><span class="eyebrow">DAILY TARGETS</span><h2>{user.kcal_target.toLocaleString('en-US')} kcal</h2></div>
			<button class="icon-button" aria-label="Edit targets" aria-expanded={editTargets} onclick={() => (editTargets = !editTargets)}>
				<Icon name="edit" />
			</button>
		</div>
		<div class="profile-macros">
			<MacroBadge color="blue" label="Protein" value="{user.protein_target_g}g" />
			<MacroBadge color="amber" label="Carbs" value="{user.carbs_target_g}g" />
			<MacroBadge color="purple" label="Fat" value="{user.fat_target_g}g" />
		</div>
		{#if editTargets}
			<form class="inline-edit" method="POST" action="?/targets" use:enhance={closeAfter(() => (editTargets = false))}>
				<label class="field"><span>Calories</span><input name="kcal" type="number" min="800" max="6000" required value={user.kcal_target} /></label>
				<label class="field"><span>Protein (g)</span><input name="protein" type="number" min="0" required value={user.protein_target_g} /></label>
				<label class="field"><span>Carbs (g)</span><input name="carbs" type="number" min="0" required value={user.carbs_target_g} /></label>
				<label class="field"><span>Fat (g)</span><input name="fat" type="number" min="0" required value={user.fat_target_g} /></label>
				{#if form?.targetsError}<p class="form-error" role="alert">{form.targetsError}</p>{/if}
				<button class="button primary">Save targets</button>
			</form>
		{/if}
	</div>

	<div class="profile-actions">
		<button class="button primary" onclick={() => (weightModal = true)}>Log weight</button>
		<a class="button secondary" href="/app/statistics"><Icon name="trend" /> Statistics</a>
	</div>

	<section class="settings">
		<h2>Settings</h2>
		<form class="card" method="POST" action="?/setting" use:enhance>
			<div class="setting-row">
				<span><Icon name="settings" /></span>
				<div><strong>Units</strong><small>Weight and height</small></div>
				<button class="setting-value" name="name" value="units">{user.units}<Icon name="next" size={16} /></button>
			</div>
			<div class="setting-row">
				<span><Icon name="bell" /></span>
				<div><strong>Notifications</strong><small>Meals and reminders</small></div>
				<button class="toggle" class:on={user.notifications} name="name" value="notifications" aria-label="Notifications" aria-pressed={!!user.notifications}><span></span></button>
			</div>
			<div class="setting-row">
				<span><Icon name="moon" /></span>
				<div><strong>Dark mode</strong><small>Change app appearance</small></div>
				<button class="toggle" class:on={user.theme === 'dark'} name="name" value="theme" aria-label="Dark mode" aria-pressed={user.theme === 'dark'}><span></span></button>
			</div>
		</form>
	</section>

	<div class="card account-actions">
		{#if user.role === 'admin'}
			<a href="/app/admin"><Icon name="shield" />Admin area<Icon name="next" /></a>
		{/if}
		<form method="POST" action="/app/logout" use:enhance>
			<button><Icon name="logout" />Log out<Icon name="next" /></button>
		</form>
		<button class="delete" onclick={() => (confirmDelete = true)}><Icon name="trash" />Delete account<Icon name="next" /></button>
	</div>
	<p class="version">EatWise 1.0 · Made for healthier days</p>

	{#if weightModal}
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={(e) => e.target === e.currentTarget && (weightModal = false)}>
			<form class="card edit-modal" method="POST" action="?/weight" use:enhance={closeAfter(() => (weightModal = false))}>
				<div class="modal-title">
					<h2>Log your weight</h2>
					<button type="button" class="icon-button" aria-label="Close" onclick={() => (weightModal = false)}><Icon name="close" /></button>
				</div>
				<label class="field">
					<span>Today's weight ({user.units === 'imperial' ? 'lb' : 'kg'})</span>
					<input name="weight" type="number" step="0.1" min="1" required value={weightInput} />
				</label>
				{#if form?.weightError}<p class="form-error" role="alert">{form.weightError}</p>{/if}
				<button class="button primary">Save weight</button>
			</form>
		</div>
	{/if}

	{#if confirmDelete}
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={(e) => e.target === e.currentTarget && (confirmDelete = false)}>
			<form class="card edit-modal" method="POST" action="?/delete" use:enhance>
				<div class="modal-title">
					<h2>Delete your account?</h2>
					<button type="button" class="icon-button" aria-label="Close" onclick={() => (confirmDelete = false)}><Icon name="close" /></button>
				</div>
				<p>This permanently removes your profile, your own foods and your diary history. This action can't be undone.</p>
				<button class="button danger">Delete account</button>
				<button type="button" class="button ghost" onclick={() => (confirmDelete = false)}>Keep my account</button>
			</form>
		</div>
	{/if}
</div>