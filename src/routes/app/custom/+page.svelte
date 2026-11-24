<script>
	import { enhance } from '$app/forms';
	import PageHeader from '../../../lib/components/PageHeader.svelte';
	import { m } from '../../../lib/paraglide/messages.js';

	let { data, form } = $props();

	const nutrients = [
		{ name: 'kcal', label: m.common_calories(), required: true },
		{ name: 'protein', label: m.common_protein(), required: true },
		{ name: 'carbs', label: m.common_carbs(), required: true },
		{ name: 'fat', label: m.common_fat(), required: true },
		{ name: 'fiber', label: m.common_fiber() },
		{ name: 'sugar', label: m.common_sugar() }
	];
	// After an error the server sends the typed values back
	const old = $derived(form?.values ?? {});
</script>

<form class="screen custom-screen" method="POST" use:enhance>
	<PageHeader title={m.common_add_own_food()} subtitle={m.custom_subtitle()} back="/app/search" />

	<div class="form-stack">
		<label class="field">
			<span>{m.custom_name()}</span>
			<input
				name="name"
				placeholder={m.custom_name_placeholder()}
				required
				value={old.name ?? data.name}
			/>
		</label>
		<label class="field">
			<span>{m.common_brand()}</span>
			<input name="brand" placeholder={m.common_optional()} value={old.brand ?? data.brand} />
		</label>
		<label class="field">
			<span>{m.common_barcode()}</span>
			<input
				name="barcode"
				inputmode="numeric"
				placeholder={m.common_optional()}
				value={old.barcode ?? data.barcode}
			/>
		</label>
		<label class="field">
			<span>{m.custom_serving()}</span>
			<input
				name="serving"
				type="number"
				min="1"
				step="any"
				required
				value={old.serving ?? '100'}
			/>
		</label>
		<div class="nutrient-inputs">
			{#each nutrients as n}
				<label class="field">
					<span>{n.label}{n.required ? ' *' : ''}</span>
					<input
						name={n.name}
						type="number"
						min="0"
						step="any"
						placeholder="0"
						required={n.required}
						value={old[n.name] ?? ''}
					/>
				</label>
			{/each}
		</div>
	</div>

	{#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}
	<button class="button primary">{m.common_save_food()}</button>
</form>
