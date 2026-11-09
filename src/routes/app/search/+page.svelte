<script>
	import { page } from '$app/state';
	import Icon from '../../../lib/components/Icon.svelte';
	import PageHeader from '../../../lib/components/PageHeader.svelte';
	import { round } from '../../../lib/nutrition.js';

	let { data } = $props();

	let query = $state('');
	let category = $state('All');

	// Chips: "All" plus every category that exists in the database
	const categories = $derived(['All', ...new Set(data.foods.map((f) => f.category))]);
	const filtered = $derived(
		data.foods.filter(
			(f) => (category === 'All' || f.category === category) && f.name.toLowerCase().includes(query.trim().toLowerCase())
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
			<small>{food.brand} · {food.serving}g serving</small>
			<p>
				<b>{scaled(food.protein, food.serving)}g</b> P&nbsp; <b>{scaled(food.carbs, food.serving)}g</b> C&nbsp;
				<b>{scaled(food.fat, food.serving)}g</b> F
			</p>
		</div>
		<div>
			<strong>{scaled(food.kcal, food.serving)}</strong><small>kcal</small>
			<Icon name="plus" size={18} />
		</div>
	</a>
{/snippet}

<div class="screen">
		<PageHeader title="Find food" subtitle="What are you eating today?">
		{#snippet action()}
			<a class="icon-button header-add" href="/app/custom{extra}" aria-label="Add your own food" title="Add your own food">
				<Icon name="plus" />
			</a>
		{/snippet}
	</PageHeader>

	<label class="search-box">
		<Icon name="search" />
		<input bind:value={query} placeholder="Search {data.foods.length} foods" aria-label="Search foods" />
		{#if query}
			<button class="icon-button" aria-label="Clear" onclick={() => (query = '')}><Icon name="close" /></button>
		{/if}
	</label>

	<div class="chips">
		{#each categories as c}
			<button class:active={category === c} onclick={() => (category = c)}>{c}</button>
		{/each}
	</div>

	<!-- Recently used: only when nothing is searched and no category is chosen -->
	{#if !query && category === 'All' && data.recent.length}
		<div class="list-heading">
			<h2>Recently used</h2>
			<span>{data.recent.length} items</span>
		</div>
		<div class="food-list recent-list">
			{#each data.recent as food (food.id)}
				{@render foodRow(food)}
			{/each}
		</div>
	{/if}

	{#if filtered.length}
		<div class="list-heading">
			<h2>{query ? 'Results' : 'Popular foods'}</h2>
			<span>{filtered.length} items</span>
		</div>
		<div class="food-list">
			{#each filtered as food (food.id)}
				{@render foodRow(food)}
			{/each}
		</div>
	{:else}
		<div class="empty-state">
			<div>🔎</div>
			<h2>Food not found</h2>
			<p>We couldn't find “{query}”. Add it to your foods and track it anytime.</p>
			<a class="button primary" href="/app/custom">Add Your Own Food</a>
		</div>
	{/if}

	<a class="button secondary add-custom" href="/app/custom"><Icon name="plus" /> Add your own food</a>
</div>