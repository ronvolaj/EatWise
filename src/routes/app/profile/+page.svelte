<script>
	import { enhance } from '$app/forms';
	import Icon from '../../../lib/components/Icon.svelte';
	import MacroBadge from '../../../lib/components/MacroBadge.svelte';
	import PageHeader from '../../../lib/components/PageHeader.svelte';
	import Progress from '../../../lib/components/Progress.svelte';
	import LanguageSwitch from '../../../lib/components/LanguageSwitch.svelte';
	import { ACTIVITIES, GOALS, ageFrom, formatHeight, formatWeight, num, round } from '../../../lib/nutrition.js';
	import { m } from '../../../lib/paraglide/messages.js';

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
	<PageHeader title={m.nav_profile()} subtitle={m.profile_subtitle()} />

	<div class="profile-card">
		<div class="profile-avatar">{user.username[0]}</div>
		<h1>{user.username}</h1>
		<p>{user.email}</p>
		<div>
			<span><strong>{ageFrom(user.birth_date)}</strong><small>{m.profile_age()}</small></span>
			<span><strong>{formatHeight(user.height_cm, user.units)}</strong><small>{m.profile_height()}</small></span>
			<span><strong>{formatWeight(currentWeight, user.units)}</strong><small>{m.profile_weight()}</small></span>
		</div>
	</div>

	<div class="card goal-card">
		<div class="card-title">
			<div><span class="eyebrow">{m.profile_my_goal()}</span><h2>{GOALS[user.goal]}</h2></div>
			<button class="icon-button" aria-label={m.profile_edit_goal()} aria-expanded={editGoal} onclick={() => (editGoal = !editGoal)}>
				<Icon name="edit" />
			</button>
		</div>
		<div class="goal-data">
			<span><small>{m.common_target()}</small><strong>{formatWeight(user.target_weight_kg, user.units)}</strong></span>
			<span><small>{m.profile_activity()}</small><strong>{ACTIVITIES[user.activity]}</strong></span>
			<span><small>{m.profile_progress()}</small><strong>{progress}%</strong></span>
		</div>
		<Progress value={progress} max={100} color="green" />
		{#if editGoal}
			<form class="inline-edit" method="POST" action="?/profile" use:enhance={closeAfter(() => (editGoal = false))}>
				<label class="field">
					<span>{m.common_goal()}</span>
					<select name="goal" value={user.goal}>
						{#each Object.entries(GOALS) as [value, label]}<option {value}>{label}</option>{/each}
					</select>
				</label>
				<label class="field">
					<span>{m.profile_activity()}</span>
					<select name="activity" value={user.activity}>
						{#each Object.entries(ACTIVITIES) as [value, label]}<option {value}>{label}</option>{/each}
					</select>
				</label>
				<label class="field">
					<span>{m.profile_height_unit({ unit: user.units === 'imperial' ? 'in' : 'cm' })}</span>
					<input name="height" type="number" step="any" min="1" required value={heightInput} />
				</label>
				<label class="field">
					<span>{m.profile_target_unit({ unit: user.units === 'imperial' ? 'lb' : 'kg' })}</span>
					<input name="target" type="number" step="0.1" min="1" required value={targetInput} />
				</label>
				{#if form?.profileError}<p class="form-error" role="alert">{form.profileError}</p>{/if}
				<p class="edit-note">{m.profile_recalc()}</p>
				<button class="button primary">{m.profile_save_goal()}</button>
			</form>
		{/if}
	</div>

	<div class="card">
		<div class="card-title">
			<div><span class="eyebrow">{m.profile_daily_targets()}</span><h2>{num(user.kcal_target)} kcal</h2></div>
			<button class="icon-button" aria-label={m.profile_edit_targets()} aria-expanded={editTargets} onclick={() => (editTargets = !editTargets)}>
				<Icon name="edit" />
			</button>
		</div>
		<div class="profile-macros">
			<MacroBadge color="blue" label={m.common_protein()} value="{user.protein_target_g}g" />
			<MacroBadge color="amber" label={m.common_carbs()} value="{user.carbs_target_g}g" />
			<MacroBadge color="purple" label={m.common_fat()} value="{user.fat_target_g}g" />
		</div>
		{#if editTargets}
			<form class="inline-edit" method="POST" action="?/targets" use:enhance={closeAfter(() => (editTargets = false))}>
				<label class="field"><span>{m.common_calories()}</span><input name="kcal" type="number" min="800" max="6000" required value={user.kcal_target} /></label>
				<label class="field"><span>{m.common_protein()} (g)</span><input name="protein" type="number" min="0" required value={user.protein_target_g} /></label>
				<label class="field"><span>{m.common_carbs()} (g)</span><input name="carbs" type="number" min="0" required value={user.carbs_target_g} /></label>
				<label class="field"><span>{m.common_fat()} (g)</span><input name="fat" type="number" min="0" required value={user.fat_target_g} /></label>
				{#if form?.targetsError}<p class="form-error" role="alert">{form.targetsError}</p>{/if}
				<button class="button primary">{m.profile_save_targets()}</button>
			</form>
		{/if}
	</div>

	<div class="profile-actions">
		<button class="button primary" onclick={() => (weightModal = true)}>{m.profile_log_weight()}</button>
		<a class="button secondary" href="/app/statistics"><Icon name="trend" /> {m.stats_title()}</a>
	</div>

	<section class="settings">
		<h2>{m.profile_settings()}</h2>
		<form class="card" method="POST" action="?/setting" use:enhance>
			<!-- Language: saved in a cookie, the page reloads in the new language -->
			<div class="setting-row">
				<span><Icon name="settings" /></span>
				<div><strong>{m.lang_switch_label()}</strong><small>{m.profile_language_note()}</small></div>
				<LanguageSwitch />
			</div>
			<div class="setting-row">
				<span><Icon name="settings" /></span>
				<div><strong>{m.profile_units()}</strong><small>{m.profile_units_note()}</small></div>
				<button class="setting-value" name="name" value="units">{user.units === 'imperial' ? m.profile_imperial() : m.profile_metric()}<Icon name="next" size={16} /></button>
			</div>
			<div class="setting-row">
				<span><Icon name="bell" /></span>
				<div><strong>{m.profile_notifications()}</strong><small>{m.profile_notifications_note()}</small></div>
				<button class="toggle" class:on={user.notifications} name="name" value="notifications" aria-label={m.profile_notifications()} aria-pressed={!!user.notifications}><span></span></button>
			</div>
			<div class="setting-row">
				<span><Icon name="moon" /></span>
				<div><strong>{m.profile_dark()}</strong><small>{m.profile_dark_note()}</small></div>
				<button class="toggle" class:on={user.theme === 'dark'} name="name" value="theme" aria-label={m.profile_dark()} aria-pressed={user.theme === 'dark'}><span></span></button>
			</div>
		</form>
	</section>

	<div class="card account-actions">
		{#if user.role === 'admin'}
			<a href="/app/admin"><Icon name="shield" />{m.profile_admin()}<Icon name="next" /></a>
		{/if}
		<form method="POST" action="/app/logout" use:enhance>
			<button><Icon name="logout" />{m.logout_button()}<Icon name="next" /></button>
		</form>
		<button class="delete" onclick={() => (confirmDelete = true)}><Icon name="trash" />{m.profile_delete_account()}<Icon name="next" /></button>
	</div>
	<p class="version">{m.profile_version()}</p>

	{#if weightModal}
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={(e) => e.target === e.currentTarget && (weightModal = false)}>
			<form class="card edit-modal" method="POST" action="?/weight" use:enhance={closeAfter(() => (weightModal = false))}>
				<div class="modal-title">
					<h2>{m.profile_log_your_weight()}</h2>
					<button type="button" class="icon-button" aria-label={m.common_close()} onclick={() => (weightModal = false)}><Icon name="close" /></button>
				</div>
				<label class="field">
					<span>{m.profile_todays_weight({ unit: user.units === 'imperial' ? 'lb' : 'kg' })}</span>
					<input name="weight" type="number" step="0.1" min="1" required value={weightInput} />
				</label>
				{#if form?.weightError}<p class="form-error" role="alert">{form.weightError}</p>{/if}
				<button class="button primary">{m.profile_save_weight()}</button>
			</form>
		</div>
	{/if}

	{#if confirmDelete}
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={(e) => e.target === e.currentTarget && (confirmDelete = false)}>
			<form class="card edit-modal" method="POST" action="?/delete" use:enhance>
				<div class="modal-title">
					<h2>{m.profile_delete_question()}</h2>
					<button type="button" class="icon-button" aria-label={m.common_close()} onclick={() => (confirmDelete = false)}><Icon name="close" /></button>
				</div>
				<p>{m.profile_delete_text()}</p>
				<button class="button danger">{m.profile_delete_account()}</button>
				<button type="button" class="button ghost" onclick={() => (confirmDelete = false)}>{m.profile_keep()}</button>
			</form>
		</div>
	{/if}
</div>