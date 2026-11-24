<script>
	import { page } from '$app/state';
	import Icon from '../../../lib/components/Icon.svelte';
	import PageHeader from '../../../lib/components/PageHeader.svelte';
	import { round } from '../../../lib/nutrition.js';
	import { m } from '../../../lib/paraglide/messages.js';

	let { data } = $props();

	let query = $state('');
	let category = $state('All');

	// Chips: "All" plus every category that exists in the database ("All" is shown translated)
	const categories = $derived(['All', ...new Set(data.foods.map((f) => f.category))]);
	const filtered = $derived(
		data.foods.filter(
			(f) =>
				(category === 'All' || f.category === category) &&
				f.name.toLowerCase().includes(query.trim().toLowerCase())
		)
	);

	// meal, date and from are passed on to the food page (e.g. "+" on the Lunch card)
	const extra = $derived(page.url.search);
	const scaled = (value, quantity) => round((value * quantity) / 100);
</script>

{#snippet foodRow(food)}
	<a class="food-row" href="/app/food/{food.id}{extra}">
		<span class="food-emoji">{food.icon}</span>
		<div>
			<strong>{food.name}</strong>
			<small>{food.brand} · {m.common_serving_g({ grams: food.serving })}</small>
			<p>
				<b>{scaled(food.protein, food.serving)}g</b>
				{m.common_p()}&nbsp; <b>{scaled(food.carbs, food.serving)}g</b>
				{m.common_c()}&nbsp;
				<b>{scaled(food.fat, food.serving)}g</b>
				{m.common_f()}
			</p>
		</div>
		<div>
			<strong>{scaled(food.kcal, food.serving)}</strong><small>kcal</small>
			<Icon name="plus" size={18} />
		</div>
	</a>
{/snippet}

<div class="screen">
	<PageHeader title={m.search_title()} subtitle={m.search_subtitle()}>
		{#snippet action()}
			<a
				class="icon-button header-add"
				href="/app/custom{extra}"
				aria-label={m.common_add_own_food()}
				title={m.common_add_own_food()}
			>
				<Icon name="plus" />
			</a>
		{/snippet}
	</PageHeader>

	<label class="search-box">
		<Icon name="search" />
		<input
			bind:value={query}
			placeholder={m.search_placeholder({ count: data.foods.length })}
			aria-label={m.search_label()}
		/>
		{#if query}
			<button class="icon-button" aria-label={m.common_clear()} onclick={() => (query = '')}
				><Icon name="close" /></button
			>
		{/if}
	</label>

	<div class="chips">
		{#each categories as c}
			<button class:active={category === c} onclick={() => (category = c)}
				>{c === 'All' ? m.search_all() : c}</button
			>
		{/each}
	</div>

	<!-- Recently used: only when nothing is searched and no category is chosen -->
	{#if !query && category === 'All' && data.recent.length}
		<div class="list-heading">
			<h2>{m.search_recent()}</h2>
			<span>{m.common_items({ count: data.recent.length })}</span>
		</div>
		<div class="food-list recent-list">
			{#each data.recent as food (food.id)}
				{@render foodRow(food)}
			{/each}
		</div>
	{/if}

	{#if filtered.length}
		<div class="list-heading">
			<h2>{query ? m.search_results() : m.search_popular()}</h2>
			<span>{m.common_items({ count: filtered.length })}</span>
		</div>
		<div class="food-list">
			{#each filtered as food (food.id)}
				{@render foodRow(food)}
			{/each}
		</div>
	{:else}
		<div class="empty-state">
			<div>🔎</div>
			<h2>{m.search_not_found()}</h2>
			{#if query.trim()}
				<p>{m.search_not_found_query({ query: query.trim() })}</p>
			{:else}
				<p>{m.search_empty_category()}</p>
			{/if}
			<a class="button primary" href="/app/custom{extra}">{m.common_add_own_food()}</a>
		</div>
	{/if}

	{#if filtered.length}
		<a class="button secondary add-custom" href="/app/custom{extra}"
			><Icon name="plus" /> {m.common_add_own_food()}</a
		>
	{/if}
</div>
