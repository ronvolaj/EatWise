<script>
	import Icon from '../../../lib/components/Icon.svelte';
	import PageHeader from '../../../lib/components/PageHeader.svelte';
	import { mealLabel, round } from '../../../lib/nutrition.js';

	let { data } = $props();

	// Keeps meal and date in every link
	function link(params) {
		const p = new URLSearchParams();
		if (data.meal) p.set('meal', data.meal);
		if (data.date) p.set('date', data.date);
		for (const [key, value] of Object.entries(params)) if (value) p.set(key, value);
		return `?${p}`;
	}

	const foodLink = (food) => `/app/food/${food.id}${link({})}`;
</script>

<svelte:head><title>Search · EatWise</title></svelte:head>

{#snippet foodItem(food)}
	<a class="food-item" href={foodLink(food)}>
		<span class="food-icon">{food.icon}</span>
		<div>
			<strong>{food.name}</strong>
			<small>{food.brand || food.category} · {food.serving} g{#if food.created_by} · <em>My food</em>{/if}</small>
		</div>
		<span class="food-kcal">{round((food.kcal * food.serving) / 100)} <small>kcal</small></span>
	</a>
{/snippet}

<div class="screen">
	<PageHeader
		title="Add food"
		subtitle={data.meal ? `to ${mealLabel(data.meal)}` : 'Search our food database'}
		back={data.date ? `/app/diary?date=${data.date}` : '/app/homepage'}
	/>

	<form class="search-bar" method="GET">
		<Icon name="search" />
		<input name="q" type="search" placeholder="Search food or brand" value={data.q} aria-label="Search food" />
		{#if data.meal}<input type="hidden" name="meal" value={data.meal} />{/if}
		{#if data.date}<input type="hidden" name="date" value={data.date} />{/if}
		{#if data.category}<input type="hidden" name="category" value={data.category} />{/if}
	</form>

	<div class="chips">
		<a class="chip" class:active={!data.category} href={link({ q: data.q })}>All</a>
		{#each data.categories as category}
			<a class="chip" class:active={data.category === category} href={link({ q: data.q, category })}>{category}</a>
		{/each}
	</div>

	<div class="quick-actions">
		<a class="card quick-action" href="/app/scan"><Icon name="barcode" /><span>Scan barcode</span></a>
		<a class="card quick-action" href="/app/custom"><Icon name="plus" /><span>Create food</span></a>
	</div>

	{#if data.recent.length}
		<section>
			<div class="section-title"><h2>Recently eaten</h2></div>
			<div class="card list-card">
				{#each data.recent as food (food.id)}{@render foodItem(food)}{/each}
			</div>
		</section>
	{/if}

	<section>
		<div class="section-title">
			<h2>{data.q ? `Results for "${data.q}"` : 'All foods'}</h2>
			<span>{data.foods.length}</span>
		</div>
		{#if data.foods.length}
			<div class="card list-card">
				{#each data.foods as food (food.id)}{@render foodItem(food)}{/each}
			</div>
		{:else}
			<div class="card empty">
				<p>No food found.</p>
				<a class="button primary" href="/app/custom{data.q ? `?name=${encodeURIComponent(data.q)}` : ''}">
					{data.q ? `Create "${data.q}" yourself` : 'Create a food'}
				</a>
			</div>
		{/if}
	</section>
</div>