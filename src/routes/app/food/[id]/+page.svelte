<script>
	import { enhance } from '$app/forms';
	import Icon from '../../../../lib/components/Icon.svelte';
	import MacroBadge from '../../../../lib/components/MacroBadge.svelte';
	import PageHeader from '../../../../lib/components/PageHeader.svelte';
	import { MEALS, round } from '../../../../lib/nutrition.js';
	import { m } from '../../../../lib/paraglide/messages.js';

	let { data, form } = $props();

	const food = $derived(data.food);
	// svelte-ignore state_referenced_locally
	let quantity = $state(data.food.serving);

	const scaled = (value) => round((value * quantity) / 100);
	const back = $derived(
		data.from === 'home' ? '/app/homepage' : data.from === 'scan' ? '/app/scan' : `/app/search?meal=${data.meal}&date=${data.date}`
	);
	const servings = $derived([
		{ label: m.food_half(), grams: food.serving / 2 },
		{ label: m.food_one(), grams: food.serving },
		{ label: m.food_one_half(), grams: food.serving * 1.5 }
	]);

	let saving = $state(false);

	// Ask before "Delete food" (the "Add to Diary" button needs no question)
	// and block the buttons while the form is sending (no double entries)
	function confirmDelete({ action, cancel }) {
		if (action.search === '?/delete' && !confirm(m.food_delete_confirm({ name: food.name }))) {
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
	<PageHeader title={m.food_title()} {back} />
	<input type="hidden" name="date" value={data.date} />
	<input type="hidden" name="from" value={data.from} />

	<div class="food-hero">
		<span>{food.icon}</span>
		<h1>{food.name}</h1>
		<p>{food.brand}</p>
				{#if food.category === 'Scanned'}
			<!-- Required by the Open Food Facts license (ODbL) -->
			<small class="data-source">{m.food_source()}</small>
		{/if}
	</div>

	<div class="card nutrition-hero">
		<div><strong>{scaled(food.kcal)}</strong><span>kcal</span></div>
		<MacroBadge color="blue" label={m.common_protein()} value="{scaled(food.protein)}g" />
		<MacroBadge color="amber" label={m.common_carbs()} value="{scaled(food.carbs)}g" />
		<MacroBadge color="purple" label={m.common_fat()} value="{scaled(food.fat)}g" />
	</div>

	<div class="form-section">
		<h2>{m.food_serving()}</h2>
		<div class="quantity-control">
			<button type="button" class="icon-button" aria-label={m.food_decrease()} onclick={() => (quantity = Math.max(1, quantity - 10))}><Icon name="minus" /></button>
			<div>
				<input type="number" name="quantity" min="1" step="any" aria-label={m.food_quantity_label()} bind:value={quantity} />
				<span>{m.food_grams()}</span>
			</div>
			<button type="button" class="icon-button" aria-label={m.food_increase()} onclick={() => (quantity = quantity + 10)}><Icon name="plus" /></button>
		</div>
		<div class="serving-chips">
			{#each servings as s}
				<button type="button" class:active={quantity === s.grams} onclick={() => (quantity = s.grams)}>{s.label}</button>
			{/each}
		</div>
	</div>

	<div class="card detail-grid">
		<div><span>{m.common_fiber()}</span><strong>{scaled(food.fiber)}g</strong></div>
		<div><span>{m.common_sugar()}</span><strong>{scaled(food.sugar)}g</strong></div>
		<div><span>{m.food_serving()}</span><strong>{quantity}g</strong></div>
		<div><span>{m.food_per_100()}</span><strong>{food.kcal} kcal</strong></div>
	</div>

	<label class="field">
		<span>{m.common_add_to_meal()}</span>
		<select name="meal" value={data.meal}>
			{#each MEALS as meal}<option value={meal.id}>{meal.label}</option>{/each}
		</select>
	</label>

	{#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}

	<button class="button primary sticky-action" disabled={saving || !(quantity > 0)}>
		<Icon name="plus" /> {m.food_add_to_diary({ kcal: scaled(food.kcal) })}
	</button>

	{#if data.isOwn}
		<button class="button danger delete-food" formaction="?/delete" formnovalidate><Icon name="trash" /> {m.food_delete()}</button>
	{/if}
</form>