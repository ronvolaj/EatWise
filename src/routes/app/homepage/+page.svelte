<script>
	import { enhance } from '$app/forms';
	import Icon from '../../../lib/components/Icon.svelte';
	import Ring from '../../../lib/components/Ring.svelte';
	import MacroRow from '../../../lib/components/MacroRow.svelte';
	import { MEALS, longDate, round, sumEntries } from '../../../lib/nutrition.js';

	// data.user comes from +layout.server.js, the rest from +page.server.js
	let { data } = $props();

	let quickOpen = $state(false);

	const user = $derived(data.user);
	const totals = $derived(sumEntries(data.entries));
	const remaining = $derived(Math.max(0, round(user.kcal_target - totals.kcal)));
	const over = $derived(totals.kcal > user.kcal_target);

	// A day is "on track" when something was logged and the goal was not exceeded by more than 10%
	const onTrackDays = $derived(data.week.filter((d) => d.kcal > 0 && d.kcal <= user.kcal_target * 1.1).length);
	const weekMax = $derived(Math.max(user.kcal_target, ...data.week.map((d) => d.kcal)));

	function mealKcal(meal) {
		return round(sumEntries(data.entries.filter((e) => e.meal === meal)).kcal);
	}
</script>

<div class="screen home-screen">
	<header class="home-header">
		<div>
			<p>{longDate(data.date)}</p>
			<h1>Hi, {user.username} <span>👋</span></h1>
		</div>
		<a class="avatar" href="/app/profile" aria-label="Profile">{user.username[0]}</a>
	</header>

	<div class="card calorie-card">
		<div>
			<span class="eyebrow">DAILY CALORIES</span>
			<Ring value={totals.kcal} max={user.kcal_target} color="orange">
				<strong>{remaining.toLocaleString('en-US')}</strong><small>remaining</small>
			</Ring>
		</div>
		<div class="calorie-stats">
			<div><span class="orange-dot"></span><p>Eaten<strong>{round(totals.kcal).toLocaleString('en-US')}</strong></p></div>
			<div><span class="target-dot"></span><p>Daily goal<strong>{user.kcal_target.toLocaleString('en-US')}</strong></p></div>
		</div>
	</div>

	<div class="card">
		<div class="card-title">
			<h2>Today's macros</h2>
			<a href="/app/diary">View diary <Icon name="next" size={16} /></a>
		</div>
		<MacroRow label="Protein" color="blue" value={totals.protein} max={user.protein_target_g} />
		<MacroRow label="Carbs" color="amber" value={totals.carbs} max={user.carbs_target_g} />
		<MacroRow label="Fat" color="purple" value={totals.fat} max={user.fat_target_g} />
	</div>

	<section>
		<div class="section-title"><h2>Meals</h2><span>{round(totals.kcal)} kcal</span></div>
		<div class="meal-grid">
			{#each MEALS as meal}
				<div class="card meal-card">
					<span class="meal-icon">{meal.icon}</span>
					<div><strong>{meal.label}</strong><small>{mealKcal(meal.id)} kcal</small></div>
					<a class="icon-button" href="/app/search?meal={meal.id}&from=home" aria-label="Add {meal.label}"><Icon name="plus" /></a>
				</div>
			{/each}
		</div>
	</section>

	<div class="card water-card">
		<div class="water-icon"><Icon name="droplet" /></div>
		<div>
			<h2>Water</h2>
			<p>{data.water} of 8 glasses</p>
			<div class="water-dots">
				{#each Array(8) as _, i}<span class:filled={i < data.water}></span>{/each}
			</div>
		</div>
		<form class="water-actions" method="POST" action="?/water" use:enhance>
			<button class="icon-button" name="delta" value="-1" aria-label="Remove water" disabled={data.water === 0}><Icon name="minus" /></button>
			<button class="icon-button" name="delta" value="1" aria-label="Add water" disabled={data.water === 8}><Icon name="plus" /></button>
		</form>
	</div>

	<div class="on-track" class:over>
		{#if over}
			You're {round(totals.kcal - user.kcal_target)} kcal over your goal today.
		{:else if data.entries.length === 0}
			Nothing logged yet. Add your first meal.
		{:else}
			<Icon name="check" size={16} /> You're on track today. Keep it up!
		{/if}
	</div>

	<a class="card weekly" href="/app/statistics">
		<div>
			<span class="eyebrow">WEEKLY PROGRESS</span>
			<h2>{onTrackDays} of 7 days on track</h2>
			<p>{onTrackDays >= 4 ? "You're building a great routine." : 'Log your meals every day to see your progress.'}</p>
		</div>
		<div class="mini-bars">
			{#each data.week as day, i}
				<span style="height: {(day.kcal / weekMax) * 100}%" class:today={i === 6}></span>
			{/each}
		</div>
		<Icon name="next" />
	</a>

	{#if quickOpen}
		<div class="quick-menu">
			<a href="/app/search?from=home"><Icon name="search" />Add food</a>
			<a href="/app/scan"><Icon name="barcode" />Scan barcode</a>
			<a href="/app/scan?mode=photo"><Icon name="camera" />Take photo</a>
		</div>
	{/if}
	<button class="fab" class:open={quickOpen} aria-label="Add" aria-expanded={quickOpen} onclick={() => (quickOpen = !quickOpen)}>
		<Icon name={quickOpen ? 'close' : 'plus'} />
	</button>
</div>
