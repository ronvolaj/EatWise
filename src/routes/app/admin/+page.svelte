<script>
	import { enhance } from '$app/forms';
	import Icon from '../../../lib/components/Icon.svelte';
	import PageHeader from '../../../lib/components/PageHeader.svelte';

	// data.users comes from +page.server.js, data.user from +layout.server.js
	let { data, form } = $props();

	let query = $state('');
	let tab = $state('users');
	let addingFood = $state(false);

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

	const filtered = $derived(
		data.users.filter((u) => `${u.username} ${u.email}`.toLowerCase().includes(query.trim().toLowerCase()))
	);
	const filteredFoods = $derived(
		data.foods.filter((f) => `${f.name} ${f.brand} ${f.category}`.toLowerCase().includes(query.trim().toLowerCase()))
	);

	// Keep the "Add food" window open when the server found a mistake
	$effect(() => {
		if (form?.foodError) addingFood = true;
	});

	function confirmDelete(name) {
		return ({ cancel }) => {
			if (!confirm(`Delete ${name} and all of their data?`)) cancel();
		};
	}

	function confirmFoodDelete(food) {
		return ({ cancel }) => {
			const note = food.uses > 0 ? ` It is also removed from ${food.uses} diary entries.` : '';
			if (!confirm(`Delete ${food.name}?${note}`)) cancel();
		};
	}

	// Close the "Add food" window after saving
	function closeAfter() {
		return async ({ result, update }) => {
			await update();
			if (result.type === 'success') addingFood = false;
		};
	}
</script>

<div class="screen">
	<PageHeader title="Admin" subtitle="Manage users, roles and foods" back="/app/profile" />

	<div class="admin-stats">
		<div class="card"><small>Users</small><strong>{data.users.length}</strong></div>
		<div class="card"><small>Foods in database</small><strong>{data.foodCount}</strong></div>
	</div>

	<div class="segmented admin-tabs">
		<button class:active={tab === 'users'} onclick={() => (tab = 'users')}>Users</button>
		<button class:active={tab === 'foods'} onclick={() => (tab = 'foods')}>Foods</button>
	</div>

	<label class="search-box">
		<Icon name="search" />
		<input bind:value={query} placeholder={tab === 'users' ? 'Search users' : 'Search foods'} aria-label="Search" />
	</label>

	{#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}

	{#if tab === 'users'}
	<div class="list-heading" style="margin-top: 16px">
		<h2>Users</h2>
		<span>{filtered.length} shown</span>
	</div>

	<div class="user-list">
		{#each filtered as u (u.id)}
			{@const self = u.id === data.user.id}
			<div class="card user-row">
				<div>
					<span class="avatar">{u.username[0]}</span>
					<div class="who">
						<strong>{u.username}{self ? ' (you)' : ''}</strong>
						<small>{u.email} · {u.entries} diary entries</small>
					</div>
					<span class="role-tag" class:admin={u.role === 'admin'}>{u.role === 'admin' ? 'Admin' : 'User'}</span>
				</div>
				{#if !self}
					<div class="user-actions">
						<form method="POST" action="?/role" use:enhance>
							<input type="hidden" name="id" value={u.id} />
							<input type="hidden" name="role" value={u.role === 'admin' ? 'user' : 'admin'} />
							<button class="button secondary">{u.role === 'admin' ? 'Remove admin' : 'Make admin'}</button>
						</form>
						<form method="POST" action="?/delete" use:enhance={confirmDelete(u.username)}>
							<input type="hidden" name="id" value={u.id} />
							<button class="button danger">Delete</button>
						</form>
					</div>
				{/if}
			</div>
		{:else}
			<p class="chart-empty">No user matches “{query}”.</p>
		{/each}
	</div>
	{:else}
	<div class="list-heading" style="margin-top: 16px">
		<h2>Built-in foods</h2>
		<span>{filteredFoods.length} shown</span>
	</div>
	<button class="button secondary add-custom admin-add" onclick={() => (addingFood = true)}><Icon name="plus" /> Add food</button>

	<div class="food-list">
		{#each filteredFoods as f (f.id)}
			<div class="food-row admin-food">
				<span class="food-emoji">{f.icon}</span>
				<div>
					<strong>{f.name}</strong>
					<small>{f.brand} · {f.category} · {f.kcal} kcal / 100g</small>
					<p>Used in <b>{f.uses}</b> diary entries{f.barcode ? ` · Barcode ${f.barcode}` : ''}</p>
				</div>
				<form method="POST" action="?/deleteFood" use:enhance={confirmFoodDelete(f)}>
					<input type="hidden" name="id" value={f.id} />
					<button class="icon-button" aria-label="Delete {f.name}"><Icon name="trash" /></button>
				</form>
			</div>
		{:else}
			<p class="chart-empty">No food matches “{query}”.</p>
		{/each}
	</div>
	{/if}

	{#if addingFood}
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={(e) => e.target === e.currentTarget && (addingFood = false)}>
			<form class="card edit-modal admin-food-form" method="POST" action="?/addFood" use:enhance={closeAfter}>
				<div class="modal-title">
					<div><div><h2>Add a built-in food</h2><p>Nutrition values per 100 grams · visible for everybody</p></div></div>
					<button type="button" class="icon-button" aria-label="Close" onclick={() => (addingFood = false)}><Icon name="close" /></button>
				</div>
				<div class="nutrient-inputs">
					<label class="field"><span>Name *</span><input name="name" required value={old.name ?? ''} /></label>
					<label class="field"><span>Brand</span><input name="brand" placeholder="Optional" value={old.brand ?? ''} /></label>
					<label class="field"><span>Icon (emoji)</span><input name="icon" placeholder="🥘" value={old.icon ?? ''} /></label>
					<label class="field"><span>Category</span><input name="category" placeholder="e.g. Snacks" value={old.category ?? ''} /></label>
					<label class="field"><span>Barcode</span><input name="barcode" inputmode="numeric" placeholder="Optional" value={old.barcode ?? ''} /></label>
					<label class="field"><span>Serving (g) *</span><input name="serving" type="number" min="1" step="any" required value={old.serving ?? '100'} /></label>
					{#each nutrients as n}
						<label class="field">
							<span>{n.label}</span>
							<input name={n.name} type="number" min="0" step="any" placeholder="0" required={n.label.endsWith('*')} value={old[n.name] ?? ''} />
						</label>
					{/each}
				</div>
				{#if form?.foodError}<p class="form-error" role="alert">{form.foodError}</p>{/if}
				<button class="button primary">Save food</button>
			</form>
		</div>
	{/if}
</div>