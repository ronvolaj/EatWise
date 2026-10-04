<script>
	import { enhance } from '$app/forms';
	import Icon from '../../../lib/components/Icon.svelte';
	import MacroRow from '../../../lib/components/MacroRow.svelte';
	import Progress from '../../../lib/components/Progress.svelte';
	import { MEALS, longDate, round, sumEntries } from '../../../lib/nutrition.js';

	let { data, form } = $props();

	const user = $derived(data.user);
	const totals = $derived(sumEntries(data.entries));
	const left = $derived(round(user.kcal_target - totals.kcal));

	const entriesOf = (meal) => data.entries.filter((e) => e.meal === meal);
	const kcalOf = (meal) => round(sumEntries(entriesOf(meal)).kcal);
	const addLink = (meal) => `/app/search?meal=${meal}${data.isToday ? '' : `&date=${data.date}`}`;
</script>

<svelte:head><title>Diary · EatWise</title></svelte:head>

<div class="screen">
	<header class="day-switch">
		<a class="icon-button" href="?date={data.prev}" aria-label="Previous day"><Icon name="back" /></a>
		<div>
			<h1>{data.isToday ? 'Today' : longDate(data.date, { weekday: 'long' })}</h1>
			<p>{longDate(data.date, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
		</div>
		{#if data.next}
			<a class="icon-button" href="?date={data.next}" aria-label="Next day"><Icon name="next" /></a>
		{:else}
			<span class="icon-button disabled" aria-hidden="true"><Icon name="next" /></span>
		{/if}
	</header>

	<div class="card summary-card">
		<div class="summary-numbers">
			<div><strong>{user.kcal_target.toLocaleString('en-US')}</strong><small>Goal</small></div>
			<span>−</span>
			<div><strong>{round(totals.kcal).toLocaleString('en-US')}</strong><small>Eaten</small></div>
			<span>=</span>
			<div class:negative={left < 0}><strong>{left.toLocaleString('en-US')}</strong><small>{left < 0 ? 'Over' : 'Left'}</small></div>
		</div>
		<Progress value={totals.kcal} max={user.kcal_target} color={left < 0 ? 'red' : 'orange'} />
		<MacroRow label="Protein" color="blue" value={totals.protein} max={user.protein_target_g} />
		<MacroRow label="Carbs" color="amber" value={totals.carbs} max={user.carbs_target_g} />
		<MacroRow label="Fat" color="purple" value={totals.fat} max={user.fat_target_g} />
	</div>

	{#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}

	{#each MEALS as meal}
		<section class="card diary-meal">
			<div class="card-title">
				<h2><span>{meal.icon}</span> {meal.label}</h2>
				<span>{kcalOf(meal.id)} kcal</span>
			</div>

			{#each entriesOf(meal.id) as entry (entry.id)}
				<div class="food-item">
					<span class="food-icon">{entry.icon}</span>
					<a href="/app/food/{entry.food_id}?meal={meal.id}">
						<strong>{entry.name}</strong>
						<small>{round(entry.quantity)} g · P {round(entry.protein)} · C {round(entry.carbs)} · F {round(entry.fat)}</small>
					</a>
					<span class="food-kcal">{round(entry.kcal)}</span>
					<form method="POST" action="?/delete" use:enhance>
						<input type="hidden" name="id" value={entry.id} />
						<button class="icon-button small" aria-label="Remove {entry.name}" title="Remove"><Icon name="trash" size={18} /></button>
					</form>
				</div>
			{:else}
				<p class="muted small-text">Nothing logged yet.</p>
			{/each}

			<a class="add-link" href={addLink(meal.id)}><Icon name="plus" size={18} />Add food</a>
		</section>
	{/each}

	<div class="card water-summary">
		<Icon name="droplet" />
		<p><strong>{data.water}</strong> of 8 glasses of water</p>
	</div>
</div>