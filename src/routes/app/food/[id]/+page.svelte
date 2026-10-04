<script>
	import { enhance } from '$app/forms';
	import Icon from '../../../../lib/components/Icon.svelte';
	import MacroBadge from '../../../../lib/components/MacroBadge.svelte';
	import PageHeader from '../../../../lib/components/PageHeader.svelte';
	import { MEALS, round } from '../../../../lib/nutrition.js';

	let { data, form } = $props();

	// svelte-ignore state_referenced_locally
	let quantity = $state(data.food.serving);
	// svelte-ignore state_referenced_locally
	let meal = $state(data.meal);
	let confirmDelete = $state(false);

	const food = $derived(data.food);
	// Values in the database are per 100 g
	const amount = (value) => (value * (Number(quantity) || 0)) / 100;

	const back = $derived(
		data.from === 'scan' ? '/app/scan' : data.from === 'custom' ? '/app/search' : `/app/search?meal=${data.meal}`
	);
</script>

<svelte:head><title>{food.name} · EatWise</title></svelte:head>

<div class="screen">
	<PageHeader title={food.name} subtitle={food.brand || food.category} {back} />

	<div class="card food-hero">
		<span class="food-hero-icon">{food.icon}</span>
		<strong>{round(amount(food.kcal))} <small>kcal</small></strong>
		<p>in {Number(quantity) || 0} g</p>
		<div class="food-macros">
			<MacroBadge color="blue" label="Protein" value="{round(amount(food.protein))}g" />
			<MacroBadge color="amber" label="Carbs" value="{round(amount(food.carbs))}g" />
			<MacroBadge color="purple" label="Fat" value="{round(amount(food.fat))}g" />
		</div>
	</div>

	<form class="card" method="POST" action="?/add" use:enhance>
		<input type="hidden" name="from" value={data.from} />

		<div class="field">
			<label for="quantity">Amount (grams)</label>
			<div class="amount-row">
				<button type="button" class="icon-button" aria-label="Less" onclick={() => (quantity = Math.max(1, (Number(quantity) || 0) - 10))}><Icon name="minus" /></button>
				<input id="quantity" name="quantity" type="number" min="1" max="5000" step="any" inputmode="decimal" bind:value={quantity} required />
				<button type="button" class="icon-button" aria-label="More" onclick={() => (quantity = (Number(quantity) || 0) + 10)}><Icon name="plus" /></button>
			</div>
		</div>
		<div class="chips">
			<button type="button" class="chip" class:active={quantity == food.serving} onclick={() => (quantity = food.serving)}>1 serving ({food.serving} g)</button>
			<button type="button" class="chip" class:active={quantity == 100} onclick={() => (quantity = 100)}>100 g</button>
		</div>

		<div class="field">
			<span>Meal</span>
			<div class="choice-row">
				{#each MEALS as m}
					<label class="choice"><input type="radio" name="meal" value={m.id} bind:group={meal} />{m.icon} {m.label}</label>
				{/each}
			</div>
		</div>

		<label class="field">
			<span>Day</span>
			<input name="date" type="date" max={data.today} value={data.date} required />
		</label>

		{#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}

		<button class="button primary">Add to Diary</button>
	</form>

	<div class="card">
		<div class="card-title"><h2>Nutrition facts</h2><span>per 100 g</span></div>
		<table class="facts">
			<tbody>
				<tr><td>Calories</td><td>{round(food.kcal)} kcal</td></tr>
				<tr><td>Protein</td><td>{food.protein} g</td></tr>
				<tr><td>Carbs</td><td>{food.carbs} g</td></tr>
				<tr class="sub"><td>of which sugar</td><td>{food.sugar} g</td></tr>
				<tr><td>Fat</td><td>{food.fat} g</td></tr>
				<tr><td>Fiber</td><td>{food.fiber} g</td></tr>
				{#if food.barcode}<tr><td>Barcode</td><td>{food.barcode}</td></tr>{/if}
			</tbody>
		</table>
	</div>

	{#if data.isOwn}
		<form class="danger-zone" method="POST" action="?/delete" use:enhance>
			{#if confirmDelete}
				<p>Delete this food? It is also removed from your diary.</p>
				<button class="button danger">Yes, delete</button>
				<button type="button" class="button ghost" onclick={() => (confirmDelete = false)}>Cancel</button>
			{:else}
				<button type="button" class="button ghost danger-text" onclick={() => (confirmDelete = true)}><Icon name="trash" size={18} />Delete my food</button>
			{/if}
		</form>
	{/if}
</div>