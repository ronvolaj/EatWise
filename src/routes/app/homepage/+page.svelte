<script>
	import { enhance } from '$app/forms';
	import Icon from '../../../lib/components/Icon.svelte';
	import Ring from '../../../lib/components/Ring.svelte';
	import MacroRow from '../../../lib/components/MacroRow.svelte';
	import { MEALS, longDate, num, round, sumEntries, weekdayLetter } from '../../../lib/nutrition.js';
	import { m } from '../../../lib/paraglide/messages.js';

	// data.user comes from +layout.server.js, the rest from +page.server.js
	let { data } = $props();

	let quickOpen = $state(false);
	let savingWater = $state(false);

	// Blocks the water buttons until the last tap is saved
	function waterEnhance() {
		savingWater = true;
		return async ({ update }) => {
			await update();
			savingWater = false;
		};
	}

	const user = $derived(data.user);
	const totals = $derived(sumEntries(data.entries));
	const remaining = $derived(Math.max(0, round(user.kcal_target - totals.kcal)));
	const over = $derived(totals.kcal > user.kcal_target);

	// A day is "on track" when something was logged and the goal was not exceeded by more than 10%
	const onTrackDays = $derived(
		data.week.filter((d) => d.kcal > 0 && d.kcal <= user.kcal_target * 1.1).length
	);
	const weekMax = $derived(Math.max(user.kcal_target, ...data.week.map((d) => d.kcal)));

	function mealKcal(meal) {
		return round(sumEntries(data.entries.filter((e) => e.meal === meal)).kcal);
	}
</script>

<div class="screen home-screen">
	<header class="home-header">
		<div>
			<p>{longDate(data.date)}</p>
			<h1>{m.home_greeting({ name: user.username })} <span>👋</span></h1>
		</div>
		<a class="avatar" href="/app/profile" aria-label={m.nav_profile()}>{user.username[0]}</a>
	</header>

	<div class="card calorie-card">
		<div>
			<span class="eyebrow">{m.home_daily_calories()}</span>
			<Ring value={totals.kcal} max={user.kcal_target} color="orange">
				<strong>{num(remaining)}</strong><small>{m.common_remaining()}</small>
			</Ring>
		</div>
		<div class="calorie-stats">
			<div>
				<span class="orange-dot"></span>
				<p>{m.home_eaten()}<strong>{num(round(totals.kcal))}</strong></p>
			</div>
			<div>
				<span class="target-dot"></span>
				<p>{m.home_daily_goal()}<strong>{num(user.kcal_target)}</strong></p>
			</div>
		</div>
	</div>

	<div class="card">
		<div class="card-title">
			<h2>{m.home_todays_macros()}</h2>
			<a href="/app/diary">{m.home_view_diary()} <Icon name="next" size={16} /></a>
		</div>
		<MacroRow label={m.common_protein()} color="blue" value={totals.protein} max={user.protein_target_g} />
		<MacroRow label={m.common_carbs()} color="amber" value={totals.carbs} max={user.carbs_target_g} />
		<MacroRow label={m.common_fat()} color="purple" value={totals.fat} max={user.fat_target_g} />
	</div>

	<section>
		<div class="section-title">
			<h2>{m.home_meals()}</h2>
			<span>{round(totals.kcal)} kcal</span>
		</div>
		<div class="meal-grid">
			{#each MEALS as meal}
				<div class="card meal-card">
					<span class="meal-icon">{meal.icon}</span>
					<div><strong>{meal.label}</strong><small>{mealKcal(meal.id)} kcal</small></div>
					<a
						class="icon-button"
						href="/app/search?meal={meal.id}&from=home"
						aria-label={m.common_add_item({ item: meal.label })}><Icon name="plus" /></a
					>
				</div>
			{/each}
		</div>
	</section>

	<div class="card water-card">
		<div class="water-icon"><Icon name="droplet" /></div>
		<div>
			<h2>{m.home_water()}</h2>
			<p>{m.home_water_count({ count: data.water })}</p>
			<div class="water-dots">
				{#each Array(8) as _, i}<span class:filled={i < data.water}></span>{/each}
			</div>
		</div>
		<form class="water-actions" method="POST" action="?/water" use:enhance={waterEnhance}>
			<button
				class="icon-button"
				name="delta"
				value="-1"
				aria-label={m.home_water_remove()}
				disabled={savingWater || data.water === 0}><Icon name="minus" /></button
			>
			<button
				class="icon-button"
				name="delta"
				value="1"
				aria-label={m.home_water_add()}
				disabled={savingWater || data.water === 8}><Icon name="plus" /></button
			>
		</form>
	</div>

	<div class="on-track" class:over>
		{#if over}
			{m.home_over({ kcal: round(totals.kcal - user.kcal_target) })}
		{:else if data.entries.length === 0}
			{m.home_nothing()}
		{:else}
			<Icon name="check" size={16} /> {m.home_on_track()}
		{/if}
	</div>

	<a class="card weekly" href="/app/statistics">
		<div>
			<span class="eyebrow">{m.home_weekly()}</span>
			<h2>{m.home_days_on_track({ count: onTrackDays })}</h2>
			<p>
				{onTrackDays >= 4
					? m.home_routine()
					: m.home_log_every_day()}
			</p>
		</div>
		<div class="mini-bars">
			{#each data.week as day, i}
				<div>
					<span style="height: {(day.kcal / weekMax) * 75}%" class:today={i === 6}></span>
					<small class:today={i === 6}>{weekdayLetter(day.date)}</small>
				</div>
			{/each}
		</div>
		<Icon name="next" />
	</a>

	{#if quickOpen}
		<!-- Tapping anywhere outside the menu closes it -->
		<button class="quick-backdrop" aria-label={m.home_close_menu()} onclick={() => (quickOpen = false)}></button>
		<div class="quick-menu">
			<a href="/app/search?from=home"><Icon name="search" />{m.common_add_food()}</a>
			<a href="/app/scan"><Icon name="barcode" />{m.home_scan_barcode()}</a>
			<a href="/app/scan?mode=photo"><Icon name="camera" />{m.home_take_photo()}</a>
		</div>
	{/if}
	<button
		class="fab"
		class:open={quickOpen}
		aria-label={m.common_add()}
		aria-expanded={quickOpen}
		onclick={() => (quickOpen = !quickOpen)}
	>
		<Icon name={quickOpen ? 'close' : 'plus'} />
	</button>
</div>
