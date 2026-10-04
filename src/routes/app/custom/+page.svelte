<script>
	import { enhance } from '$app/forms';
	import PageHeader from '../../../lib/components/PageHeader.svelte';

	let { data, form } = $props();

	const ICONS = ['🥘', '🍎', '🍌', '🥑', '🥦', '🥗', '🍞', '🥚', '🍗', '🐟', '🥩', '🍚', '🍝', '🍕', '🍔', '🌯', '🥪', '🍲', '🥣', '🧀', '🥜', '🍫', '🍪', '🥤', '☕', '🍺'];
	const CATEGORIES = ['Custom', 'Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Fruit', 'Produce', 'Protein', 'Grains', 'Drinks'];

	// After an error the form keeps what you typed
	const old = $derived(form?.values ?? {});
	// svelte-ignore state_referenced_locally
	let icon = $state(form?.values?.icon ?? '🥘');
</script>

<svelte:head><title>Create food · EatWise</title></svelte:head>

<div class="screen">
	<PageHeader title="Create food" subtitle="Your own food, only visible to you" back="/app/search" />

	<form class="custom-form" method="POST" use:enhance={() => async ({ update }) => update({ reset: false })}>
		<div class="card">
			<span class="eyebrow">PRODUCT</span>
			<div class="field">
				<span>Icon</span>
				<div class="icon-picker">
					{#each ICONS as emoji}
						<label class:active={icon === emoji}><input type="radio" name="icon" value={emoji} bind:group={icon} />{emoji}</label>
					{/each}
				</div>
			</div>
			<label class="field">
				<span>Name *</span>
				<input name="name" maxlength="100" value={old.name ?? data.name} required />
			</label>
			<label class="field">
				<span>Brand</span>
				<input name="brand" maxlength="100" value={old.brand ?? ''} />
			</label>
			<div class="field-row">
				<label class="field">
					<span>Category</span>
					<select name="category" value={old.category ?? 'Custom'}>
						{#each CATEGORIES as category}<option>{category}</option>{/each}
					</select>
				</label>
				<label class="field">
					<span>Serving (g) *</span>
					<input name="serving" type="number" min="1" max="2000" step="any" inputmode="decimal" value={old.serving ?? 100} required />
				</label>
			</div>
			<label class="field">
				<span>Barcode</span>
				<input name="barcode" inputmode="numeric" pattern={'[0-9]{8,14}'} maxlength="14" placeholder="Optional" value={old.barcode ?? data.barcode} />
			</label>
		</div>

		<div class="card">
			<span class="eyebrow">NUTRITION PER 100 G</span>
			<label class="field">
				<span>Calories (kcal) *</span>
				<input name="kcal" type="number" min="0" max="900" step="any" inputmode="decimal" value={old.kcal ?? ''} required />
			</label>
			<div class="field-row">
				<label class="field"><span>Protein (g)</span><input name="protein" type="number" min="0" max="100" step="any" inputmode="decimal" value={old.protein ?? ''} /></label>
				<label class="field"><span>Carbs (g)</span><input name="carbs" type="number" min="0" max="100" step="any" inputmode="decimal" value={old.carbs ?? ''} /></label>
			</div>
			<div class="field-row">
				<label class="field"><span>Fat (g)</span><input name="fat" type="number" min="0" max="100" step="any" inputmode="decimal" value={old.fat ?? ''} /></label>
				<label class="field"><span>Fiber (g)</span><input name="fiber" type="number" min="0" max="100" step="any" inputmode="decimal" value={old.fiber ?? ''} /></label>
			</div>
			<label class="field"><span>Sugar (g)</span><input name="sugar" type="number" min="0" max="100" step="any" inputmode="decimal" value={old.sugar ?? ''} /></label>
		</div>

		{#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}

		<button class="button primary">Save food</button>
	</form>
</div>