<script>
	import { enhance } from '$app/forms';
	import Icon from '../../../../lib/components/Icon.svelte';
	import MacroBadge from '../../../../lib/components/MacroBadge.svelte';
	import PageHeader from '../../../../lib/components/PageHeader.svelte';
	import { MEALS, round } from '../../../../lib/nutrition.js';

	let { data, form } = $props();

	const food = $derived(data.food);
	// svelte-ignore state_referenced_locally
	let quantity = $state(data.food.serving);

	const scaled = (value) => round((value * quantity) / 100);
	const back = $derived(
		data.from === 'home' ? '/app/homepage' : data.from === 'scan' ? '/app/scan' : `/app/search?meal=${data.meal}&date=${data.date}`
	);
	const servings = $derived([
		{ label: '½ serving', grams: food.serving / 2 },
		{ label: '1 serving', grams: food.serving },
		{ label: '1½ servings', grams: food.serving * 1.5 }
	]);

	let saving = $state(false);

	// Ask before "Delete food" (the "Add to Diary" button needs no question)
	// and block the buttons while the form is sending (no double entries)
	function confirmDelete({ action, cancel }) {
		if (action.search === '?/delete' && !confirm(`Delete ${food.name}? It is also removed from your diary.`)) {
			cancel();
			return;
		}
		saving = true;
		return async ({ update }) => {
			await update();
			saving = false;
		};
	}
</script>

<form class="screen detail-screen" method="POST" action="?/add" use:enhance={confirmDelete}>
	<PageHeader title="Food details" {back} />
	<input type="hidden" name="date" value={data.date} />
	<input type="hidden" name="from" value={data.from} />

	<div class="food-hero">
		<span>{food.icon}</span>
		<h1>{food.name}</h1>
		<p>{food.brand}</p>
	</div>

	<div class="card nutrition-hero">
		<div><strong>{scaled(food.kcal)}</strong><span>kcal</span></div>
		<MacroBadge color="blue" label="Protein" value="{scaled(food.protein)}g" />
		<MacroBadge color="amber" label="Carbs" value="{scaled(food.carbs)}g" />
		<MacroBadge color="purple" label="Fat" value="{scaled(food.fat)}g" />
	</div>

	<div class="form-section">
		<h2>Serving</h2>
		<div class="quantity-control">
			<button type="button" class="icon-button" aria-label="Decrease" onclick={() => (quantity = Math.max(1, quantity - 10))}><Icon name="minus" /></button>
			<div>
				<input type="number" name="quantity" min="1" step="any" aria-label="Quantity in grams" bind:value={quantity} />
				<span>grams</span>
			</div>
			<button type="button" class="icon-button" aria-label="Increase" onclick={() => (quantity = quantity + 10)}><Icon name="plus" /></button>
		</div>
		<div class="serving-chips">
			{#each servings as s}
				<button type="button" class:active={quantity === s.grams} onclick={() => (quantity = s.grams)}>{s.label}</button>
			{/each}
		</div>
	</div>

	<div class="card detail-grid">
		<div><span>Fiber</span><strong>{scaled(food.fiber)}g</strong></div>
		<div><span>Sugar</span><strong>{scaled(food.sugar)}g</strong></div>
		<div><span>Serving</span><strong>{quantity}g</strong></div>
		<div><span>Per 100g</span><strong>{food.kcal} kcal</strong></div>
	</div>

	<label class="field">
		<span>Add to meal</span>
		<select name="meal" value={data.meal}>
			{#each MEALS as meal}<option value={meal.id}>{meal.label}</option>{/each}
		</select>
	</label>

	{#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}

	<button class="button primary sticky-action" disabled={saving || !(quantity > 0)}>
		<Icon name="plus" /> Add to Diary · {scaled(food.kcal)} kcal
	</button>

	{#if data.isOwn}
		<button class="button danger delete-food" formaction="?/delete" formnovalidate><Icon name="trash" /> Delete food</button>
	{/if}
</form>