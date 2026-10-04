<script>
	import MacroBadge from '../../../lib/components/MacroBadge.svelte';
	import MacroRow from '../../../lib/components/MacroRow.svelte';
	import PageHeader from '../../../lib/components/PageHeader.svelte';
	import { formatWeight, longDate, round, sumEntries } from '../../../lib/nutrition.js';

	let { data } = $props();

	let range = $state('Week');

	const user = $derived(data.user);
	const totals = $derived(sumEntries(data.entries));

	// ----- Calorie bar chart -----
	const shown = $derived(range === 'Day' ? data.days.slice(-1) : range === 'Week' ? data.days.slice(-7) : data.days);
	const logged = $derived(shown.filter((d) => d.kcal > 0));
	const average = $derived(logged.length ? round(logged.reduce((sum, d) => sum + d.kcal, 0) / logged.length) : 0);
	const chartMax = $derived(Math.max(user.kcal_target * 1.15, ...shown.map((d) => d.kcal)));
	// Bars use up to 88% of the 140px column, the label below needs 16px
	const barHeight = (kcal) => (kcal / chartMax) * 88;
	const goalTop = $derived(154 - barHeight(user.kcal_target) * 1.4);
	const status = $derived(
		!logged.length ? null : average > user.kcal_target * 1.05 ? 'Over goal' : average < user.kcal_target * 0.8 ? 'Under goal' : 'On target'
	);

	function barLabel(day, i) {
		const d = new Date(day.date + 'T12:00:00');
		if (range === 'Month') return i % 5 === 4 || i === shown.length - 1 ? d.getDate() : '';
		return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
	}

	// ----- Macro donut: share of today's calories (protein and carbs 4 kcal/g, fat 9 kcal/g) -----
	const macroKcal = $derived({ protein: totals.protein * 4, carbs: totals.carbs * 4, fat: totals.fat * 9 });
	const macroSum = $derived(macroKcal.protein + macroKcal.carbs + macroKcal.fat);
	const share = $derived({
		protein: macroSum ? round((macroKcal.protein / macroSum) * 100) : 0,
		carbs: macroSum ? round((macroKcal.carbs / macroSum) * 100) : 0,
		fat: macroSum ? round((macroKcal.fat / macroSum) * 100) : 0
	});
	const donut = $derived(
		macroSum
			? `conic-gradient(#3b82f6 0 ${share.protein}%, #f59e0b ${share.protein}% ${share.protein + share.carbs}%, #a855f7 ${share.protein + share.carbs}%)`
			: 'var(--soft)'
	);

	// ----- Weight line chart (last 8 entries) -----
	const weights = $derived(data.weights.slice(-8));
	const points = $derived.by(() => {
		if (!weights.length) return [];
		const values = weights.map((w) => w.weight);
		const min = Math.min(...values);
		const max = Math.max(...values);
		return weights.map((w, i) => ({
			x: weights.length === 1 ? 160 : 8 + (i * 304) / (weights.length - 1),
			y: max === min ? 60 : 20 + ((max - w.weight) / (max - min)) * 80
		}));
	});
	const linePath = $derived(points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' '));
	const change = $derived(weights.length > 1 ? weights.at(-1).weight - weights[0].weight : 0);
	const changeText = $derived.by(() => {
		const amount = formatWeight(Math.abs(change), user.units);
		return `${change < 0 ? '−' : change > 0 ? '+' : ''}${amount}`;
	});
	const shortDate = (date) => longDate(date, { month: 'short', day: 'numeric' });
</script>

<div class="screen stats-screen">
	<PageHeader title="Statistics" subtitle="Your progress at a glance" back="/app/homepage" />

	<div class="segmented">
		{#each ['Day', 'Week', 'Month'] as r}
			<button class:active={range === r} onclick={() => (range = r)}>{r}</button>
		{/each}
	</div>

	<div class="card">
		<div class="card-title">
			<div>
				<span class="eyebrow">CALORIE INTAKE</span>
				<h2>{average.toLocaleString('en-US')} <small>{range === 'Day' ? 'kcal today' : 'avg kcal'}</small></h2>
			</div>
			{#if status}<span class="positive" class:warn={status !== 'On target'}>{status}</span>{/if}
		</div>
		<div class="bar-chart" class:month={range === 'Month'}>
			<div class="goal-line" style="top: {goalTop}px"><span>{user.kcal_target.toLocaleString('en-US')} goal</span></div>
			{#each shown as day, i}
				<div title="{shortDate(day.date)}: {round(day.kcal)} kcal">
					<span style="height: {day.kcal > 0 ? Math.max(3, barHeight(day.kcal)) : 0}%" class:active={i === shown.length - 1}></span>
					<small>{barLabel(day, i)}</small>
				</div>
			{/each}
		</div>
	</div>

	<div class="card">
		<span class="eyebrow">MACRO DISTRIBUTION · TODAY</span>
		<div class="donut-layout">
			<div class="donut" style="background: {donut}">
				<div><strong>{round(totals.kcal).toLocaleString('en-US')}</strong><small>kcal</small></div>
			</div>
			<div class="donut-legend">
				<MacroBadge color="blue" label="Protein · {share.protein}%" value="{round(totals.protein)}g" />
				<MacroBadge color="amber" label="Carbs · {share.carbs}%" value="{round(totals.carbs)}g" />
				<MacroBadge color="purple" label="Fat · {share.fat}%" value="{round(totals.fat)}g" />
			</div>
		</div>
	</div>

	<div class="card">
		<div class="card-title"><h2>Goal vs actual</h2><span>Today</span></div>
		<MacroRow label="Protein" color="blue" value={totals.protein} max={user.protein_target_g} />
		<MacroRow label="Carbs" color="amber" value={totals.carbs} max={user.carbs_target_g} />
		<MacroRow label="Fat" color="purple" value={totals.fat} max={user.fat_target_g} />
	</div>

	<div class="card">
		<div class="card-title">
			<div>
				<span class="eyebrow">WEIGHT HISTORY</span>
				{#if weights.length > 1}
					<h2>{changeText} <small>since {shortDate(weights[0].date)}</small></h2>
				{:else if weights.length === 1}
					<h2>{formatWeight(weights[0].weight, user.units)}</h2>
				{/if}
			</div>
		</div>
		{#if weights.length > 1}
			<div class="line-chart">
				<svg viewBox="0 0 320 120" preserveAspectRatio="none" aria-hidden="true">
					<defs>
						<linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0" stop-color="#22c55e" stop-opacity=".24" />
							<stop offset="1" stop-color="#22c55e" stop-opacity="0" />
						</linearGradient>
					</defs>
					<path class="area" d="{linePath} L{points.at(-1).x} 120 L{points[0].x} 120Z" />
					<path class="line" d={linePath} />
					{#each points as p}<circle cx={p.x} cy={p.y} r="4" />{/each}
				</svg>
				<div>
					{#each weights as w}<small>{shortDate(w.date)}</small>{/each}
				</div>
			</div>
		{:else}
			<p class="chart-empty">Log your weight on another day to see your trend. You can do that in your profile.</p>
		{/if}
	</div>
</div>
