<script>
	import { enhance } from '$app/forms';
	import PageHeader from '../../../lib/components/PageHeader.svelte';

	let { data, form } = $props();

	const nutrients = [
		{ name: 'kcal', label: 'Calories *' },
		{ name: 'protein', label: 'Protein *' },
		{ name: 'carbs', label: 'Carbs *' },
		{ name: 'fat', label: 'Fat *' },
		{ name: 'fiber', label: 'Fiber' },
		{ name: 'sugar', label: 'Sugar' }
	];
	// After an error the server sends the typed values back
	const old = $derived(form?.values ?? {});
</script>

<form class="screen custom-screen" method="POST" use:enhance>
	<PageHeader title="Add your own food" subtitle="Nutrition values per 100 grams" back="/app/search" />

	<div class="form-stack">
		<label class="field">
			<span>Food name *</span>
			<input name="name" placeholder="e.g. Homemade granola" required value={old.name ?? ''} />
		</label>
		<label class="field">
			<span>Brand</span>
			<input name="brand" placeholder="Optional" value={old.brand ?? ''} />
		</label>
		<label class="field">
			<span>Barcode</span>
			<input name="barcode" inputmode="numeric" placeholder="Optional" value={old.barcode ?? data.barcode} />
		</label>
		<label class="field">
			<span>Serving size (g) *</span>
			<input name="serving" type="number" min="1" step="any" required value={old.serving ?? '100'} />
		</label>
		<div class="nutrient-inputs">
			{#each nutrients as n}
				<label class="field">
					<span>{n.label}</span>
					<input name={n.name} type="number" min="0" step="any" placeholder="0" required={n.label.endsWith('*')} value={old[n.name] ?? ''} />
				</label>
			{/each}
		</div>
	</div>

	{#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}
	<button class="button primary">Save Food</button>
</form>