<script>
	import MacroBadge from '../../../lib/components/MacroBadge.svelte';
	import MacroRow from '../../../lib/components/MacroRow.svelte';
	import PageHeader from '../../../lib/components/PageHeader.svelte';
	import {
		formatWeight,
		longDate,
		num,
		round,
		sumEntries,
		weekdayLetter
	} from '../../../lib/nutrition.js';
	import { m } from '../../../lib/paraglide/messages.js';

	let { data } = $props();

	let range = $state('Week');
	// The range stays 'Day' / 'Week' / 'Month' in the code, only the button text is translated
	const ranges = [
		{ value: 'Day', label: m.stats_day() },
		{ value: 'Week', label: m.stats_week() },
		{ value: 'Month', label: m.stats_month() }
	];

	const user = $derived(data.user);
	const totals = $derived(sumEntries(data.entries));

	// ----- Calorie bar chart -----
	const shown = $derived(
		range === 'Day' ? data.days.slice(-1) : range === 'Week' ? data.days.slice(-7) : data.days
	);
	const logged = $derived(shown.filter((d) => d.entries > 0)); // days with at least one entry
	const average = $derived(
		logged.length ? round(logged.reduce((sum, d) => sum + d.kcal, 0) / logged.length) : 0
	);
	const chartMax = $derived(Math.max(user.kcal_target * 1.15, ...shown.map((d) => d.kcal)));
	// Bars use up to 88% of the 140px column, the label below needs 16px
	const barHeight = (kcal) => (kcal / chartMax) * 88;
	const goalTop = $derived(154 - barHeight(user.kcal_target) * 1.4);
	// 'over', 'under' or 'ok' (null = nothing logged)
	const status = $derived(
		!logged.length
			? null
			: average > user.kcal_target * 1.05
				? 'over'
				: average < user.kcal_target * 0.8
					? 'under'
					: 'ok'
	);
	const statusText = $derived(
		status === 'over' ? m.stats_over() : status === 'under' ? m.stats_under() : m.stats_on_target()
	);

	function barLabel(day, i) {
		const d = new Date(day.date + 'T12:00:00');
		if (range === 'Month') return i % 5 === 4 || i === shown.length - 1 ? d.getDate() : '';
		return weekdayLetter(day.date);
	}

	// ----- Macros of the chosen range -----
	// Day: today's totals. Week/Month: average per day, counting only days with entries
	// (an empty day would pull the average down although nothing was eaten that was not logged).
	const macros = $derived.by(() => {
		if (range === 'Day') return totals;
		const n = logged.length || 1;
		const sum = (key) => logged.reduce((total, d) => total + d[key], 0) / n;
		return { kcal: sum('kcal'), protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat') };
	});

	// ----- Macro donut: share of the calories (protein and carbs 4 kcal/g, fat 9 kcal/g) -----
	const macroKcal = $derived({
		protein: macros.protein * 4,
		carbs: macros.carbs * 4,
		fat: macros.fat * 9
	});
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
	<PageHeader title={m.stats_title()} subtitle={m.stats_subtitle()} back="/app/homepage" />

	<div class="segmented">
		{#each ranges as r}
			<button class:active={range === r.value} onclick={() => (range = r.value)}>{r.label}</button>
		{/each}
	</div>

	<div class="card">
		<div class="card-title">
			<div>
				<span class="eyebrow">{m.stats_calorie_intake()}</span>
				<h2>
					{num(average)}
					<small>{range === 'Day' ? m.stats_kcal_today() : m.stats_avg_kcal()}</small>
				</h2>
			</div>
			{#if status}<span class="positive" class:warn={status !== 'ok'}>{statusText}</span>{/if}
		</div>
		{#if logged.length}
			<div class="bar-chart" class:month={range === 'Month'}>
				<div class="goal-line" style="top: {goalTop}px">
					<span>{m.stats_goal_line({ kcal: num(user.kcal_target) })}</span>
				</div>
				{#each shown as day, i}
					<div title="{shortDate(day.date)}: {round(day.kcal)} kcal">
						<span
							style="height: {day.kcal > 0 ? Math.max(3, barHeight(day.kcal)) : 0}%"
							class:active={i === shown.length - 1}
						></span>
						<small>{barLabel(day, i)}</small>
					</div>
				{/each}
			</div>
		{:else}
			<p class="chart-empty">
				{range === 'Day'
					? m.stats_empty_today()
					: m.stats_empty_days({ days: range === 'Week' ? 7 : 30 })}
				<a href="/app/search">{m.stats_log_first()}</a>
				{m.stats_to_see()}
			</p>
		{/if}
	</div>

	<div class="card">
		<span class="eyebrow">{range === 'Day' ? m.stats_macro_today() : m.stats_macro_avg()}</span>
		<div class="donut-layout">
			<div class="donut" style="background: {donut}">
				<div><strong>{num(round(macros.kcal))}</strong><small>kcal</small></div>
			</div>
			<div class="donut-legend">
				<MacroBadge
					color="blue"
					label="{m.common_protein()} · {share.protein}%"
					value="{round(macros.protein)}g"
				/>
				<MacroBadge
					color="amber"
					label="{m.common_carbs()} · {share.carbs}%"
					value="{round(macros.carbs)}g"
				/>
				<MacroBadge
					color="purple"
					label="{m.common_fat()} · {share.fat}%"
					value="{round(macros.fat)}g"
				/>
			</div>
		</div>
	</div>

	<div class="card">
		<div class="card-title">
			<h2>{m.stats_goal_vs_actual()}</h2>
			<span>{range === 'Day' ? m.common_today() : m.stats_avg_per_day()}</span>
		</div>
		<MacroRow
			label={m.common_protein()}
			color="blue"
			value={macros.protein}
			max={user.protein_target_g}
		/>
		<MacroRow
			label={m.common_carbs()}
			color="amber"
			value={macros.carbs}
			max={user.carbs_target_g}
		/>
		<MacroRow label={m.common_fat()} color="purple" value={macros.fat} max={user.fat_target_g} />
		{#if range !== 'Day' && logged.length}
			<p class="stats-note">{m.stats_days_logged({ count: logged.length, total: shown.length })}</p>
		{/if}
	</div>

	<div class="card">
		<div class="card-title">
			<div>
				<span class="eyebrow">{m.stats_weight_history()}</span>
				{#if weights.length > 1}
					<h2>{changeText} <small>{m.stats_since({ date: shortDate(weights[0].date) })}</small></h2>
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
			<p class="chart-empty">
				{m.stats_weight_empty()}
			</p>
		{/if}
	</div>
</div>
