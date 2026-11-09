<script>
	import { enhance } from '$app/forms';
	import Icon from '../../../lib/components/Icon.svelte';
	import PageHeader from '../../../lib/components/PageHeader.svelte';
	import Ring from '../../../lib/components/Ring.svelte';
	import { MEALS, longDate, round, sumEntries } from '../../../lib/nutrition.js';

	let { data, form } = $props();

	// The entry that is open in the edit window (null = closed)
	let editing = $state(null);
	let saving = $state(false);

	const user = $derived(data.user);
	const totals = $derived(sumEntries(data.entries));
	const isToday = $derived(data.date === data.today);

	const daysAgo = $derived(Math.round((new Date(data.today) - new Date(data.date)) / 86400000));
	const dayLabel = $derived(daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`);

	// Close the edit window after saving
	function closeAfter() {
		saving = true;
		return async ({ result, update }) => {
			await update();
			saving = false;
			if (result.type === 'success') editing = null;
		};
	}
</script>

<div class="screen diary-screen">
	<PageHeader title="Food diary" subtitle="Track every meal, see your progress" />

	<div class="date-selector">
		<a class="icon-button" href="/app/diary?date={data.previous}" aria-label="Previous day"><Icon name="back" /></a>
		<a href="/app/diary">
			<strong>{dayLabel}</strong>
			<small>{longDate(data.date, { month: 'long', day: 'numeric', year: 'numeric' })}</small>
		</a>
		<a class="icon-button" class:disabled={isToday} href="/app/diary?date={data.next}" aria-label="Next day" aria-disabled={isToday}>
			<Icon name="next" />
		</a>
	</div>

	<div class="card daily-totals">
		<div>
			<Ring value={totals.kcal} max={user.kcal_target} size={74} color="orange">
				<strong>{round(totals.kcal)}</strong><small>kcal</small>
			</Ring>
			<p><strong>{Math.max(0, round(user.kcal_target - totals.kcal))}</strong><span>remaining</span></p>
		</div>
		<div class="totals-macros">
			<span><i class="blue"></i> P <b>{round(totals.protein)}g</b></span>
			<span><i class="amber"></i> C <b>{round(totals.carbs)}g</b></span>
			<span><i class="purple"></i> F <b>{round(totals.fat)}g</b></span>
		</div>
	</div>

	{#each MEALS as meal}
		{@const list = data.entries.filter((e) => e.meal === meal.id)}
		<section class="diary-meal">
			<div class="meal-heading">
				<div>
					<span>{meal.icon}</span>
					<h2>{meal.label}</h2>
					<small>{round(sumEntries(list).kcal)} kcal</small>
				</div>
				<a class="icon-button" href="/app/search?meal={meal.id}&date={data.date}" aria-label="Add {meal.label}"><Icon name="plus" /></a>
			</div>

			{#each list as e (e.id)}
				<button class="diary-entry" onclick={() => (editing = { ...e })}>
					<span>{e.icon}</span>
					<div>
						<strong>{e.name}</strong>
						<small>{e.quantity}g · P {round(e.protein)}g · C {round(e.carbs)}g · F {round(e.fat)}g</small>
					</div>
					<b>{round(e.kcal)}<small> kcal</small></b>
					<Icon name="more" size={18} />
				</button>
			{:else}
				<div class="meal-empty">
					<span>No {meal.label.toLowerCase()} logged</span>
					<a href="/app/search?meal={meal.id}&date={data.date}">Add food</a>
				</div>
			{/each}
		</section>
	{/each}

	{#if editing}
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={(e) => e.target === e.currentTarget && (editing = null)}>
			<form class="card edit-modal" method="POST" action="?/update" use:enhance={closeAfter}>
				<div class="modal-title">
					<div>
						<span>{editing.icon}</span>
						<div><h2>{editing.name}</h2><p>Edit diary entry</p></div>
					</div>
					<button type="button" class="icon-button" aria-label="Close" onclick={() => (editing = null)}><Icon name="close" /></button>
				</div>
				<input type="hidden" name="id" value={editing.id} />
				<label class="field">
					<span>Quantity (g)</span>
					<input name="quantity" type="number" min="1" step="any" required bind:value={editing.quantity} />
				</label>
				<label class="field">
					<span>Move to meal</span>
					<select name="meal" bind:value={editing.meal}>
						{#each MEALS as meal}<option value={meal.id}>{meal.label}</option>{/each}
					</select>
				</label>
				{#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}
				<button class="button primary" disabled={saving}>Save changes</button>
				<button class="button danger" formaction="?/remove" formnovalidate disabled={saving}><Icon name="trash" /> Remove entry</button>
			</form>
		</div>
	{/if}
</div>