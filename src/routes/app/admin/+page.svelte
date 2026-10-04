<script>
	import { enhance } from '$app/forms';
	import Icon from '../../../lib/components/Icon.svelte';
	import PageHeader from '../../../lib/components/PageHeader.svelte';
	import { longDate } from '../../../lib/nutrition.js';

	let { data, form } = $props();

	let tab = $state('users');
	let filter = $state('');
	let showFoodForm = $state(false);

	const old = $derived(form?.values ?? {});
	const foods = $derived(
		data.foods.filter((f) => `${f.name} ${f.brand} ${f.category}`.toLowerCase().includes(filter.toLowerCase()))
	);

	// Asks before deleting
	const confirmFirst = (message) => ({ cancel }) => {
		if (!confirm(message)) cancel();
	};
</script>

<svelte:head><title>Admin · EatWise</title></svelte:head>

<div class="screen">
	<PageHeader title="Admin panel" subtitle="Manage users and foods" back="/app/profile" />

	<div class="stat-grid four">
		<div class="card stat"><strong>{data.stats.users}</strong><small>Users</small></div>
		<div class="card stat"><strong>{data.stats.foods}</strong><small>Foods</small></div>
		<div class="card stat"><strong>{data.stats.custom_foods}</strong><small>Custom</small></div>
		<div class="card stat"><strong>{data.stats.entries_today}</strong><small>Logs today</small></div>
	</div>

	<div class="segmented">
		<button class:active={tab === 'users'} onclick={() => (tab = 'users')}>Users</button>
		<button class:active={tab === 'foods'} onclick={() => (tab = 'foods')}>Foods</button>
	</div>

	{#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}

	{#if tab === 'users'}
		<div class="card list-card">
			{#each data.users as u (u.id)}
				<div class="admin-row">
					<div class="avatar">{u.username[0]}</div>
					<div class="admin-info">
						<strong>{u.username} {#if u.id === data.user.id}<em>(you)</em>{/if}</strong>
						<small>{u.email}</small>
						<small>Joined {longDate(u.created_at.slice(0, 10), { month: 'short', day: 'numeric', year: 'numeric' })} · {u.entries} entries</small>
					</div>
					{#if u.id !== data.user.id}
						<div class="admin-actions">
							<form method="POST" action="?/role" use:enhance>
								<input type="hidden" name="id" value={u.id} />
								<input type="hidden" name="role" value={u.role === 'admin' ? 'user' : 'admin'} />
								<button class="badge-button" class:admin={u.role === 'admin'} title="Change role">{u.role}</button>
							</form>
							<form method="POST" action="?/deleteUser" use:enhance={confirmFirst(`Delete ${u.username} and all their data?`)}>
								<input type="hidden" name="id" value={u.id} />
								<button class="icon-button small" aria-label="Delete {u.username}"><Icon name="trash" size={18} /></button>
							</form>
						</div>
					{:else}
						<span class="badge">{u.role}</span>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<button class="button secondary" onclick={() => (showFoodForm = !showFoodForm)}>
			<Icon name={showFoodForm ? 'close' : 'plus'} size={18} />{showFoodForm ? 'Close' : 'Add built-in food'}
		</button>

		{#if showFoodForm || form?.foodError}
			<form class="card" method="POST" action="?/addFood" use:enhance={() => async ({ result, update }) => {
				await update({ reset: result.type === 'success' });
				if (result.type === 'success') showFoodForm = false;
			}}>
				<span class="eyebrow">NEW FOOD · VALUES PER 100 G</span>
				<div class="field-row">
					<label class="field"><span>Icon</span><input name="icon" maxlength="4" value={old.icon ?? '🥘'} /></label>
					<label class="field grow"><span>Name *</span><input name="name" maxlength="100" value={old.name ?? ''} required /></label>
				</div>
				<div class="field-row">
					<label class="field"><span>Brand</span><input name="brand" maxlength="100" value={old.brand ?? ''} /></label>
					<label class="field"><span>Category</span><input name="category" maxlength="50" value={old.category ?? 'Custom'} /></label>
				</div>
				<div class="field-row">
					<label class="field"><span>Serving (g) *</span><input name="serving" type="number" min="1" step="any" value={old.serving ?? 100} required /></label>
					<label class="field"><span>Barcode</span><input name="barcode" inputmode="numeric" value={old.barcode ?? ''} /></label>
				</div>
				<div class="field-row">
					<label class="field"><span>kcal *</span><input name="kcal" type="number" min="0" step="any" value={old.kcal ?? ''} required /></label>
					<label class="field"><span>Protein</span><input name="protein" type="number" min="0" step="any" value={old.protein ?? ''} /></label>
					<label class="field"><span>Carbs</span><input name="carbs" type="number" min="0" step="any" value={old.carbs ?? ''} /></label>
				</div>
				<div class="field-row">
					<label class="field"><span>Fat</span><input name="fat" type="number" min="0" step="any" value={old.fat ?? ''} /></label>
					<label class="field"><span>Fiber</span><input name="fiber" type="number" min="0" step="any" value={old.fiber ?? ''} /></label>
					<label class="field"><span>Sugar</span><input name="sugar" type="number" min="0" step="any" value={old.sugar ?? ''} /></label>
				</div>
				{#if form?.foodError}<p class="form-error" role="alert">{form.foodError}</p>{/if}
				<button class="button primary">Add food</button>
			</form>
		{/if}

		<div class="search-bar">
			<Icon name="search" />
			<input type="search" placeholder="Filter foods" bind:value={filter} aria-label="Filter foods" />
		</div>

		<div class="card list-card">
			{#each foods as food (food.id)}
				<div class="admin-row">
					<span class="food-icon">{food.icon}</span>
					<a class="admin-info" href="/app/food/{food.id}">
						<strong>{food.name}</strong>
						<small>{food.brand} · {food.category} · {Math.round(food.kcal)} kcal/100 g{food.barcode ? ` · ${food.barcode}` : ''}</small>
					</a>
					<form method="POST" action="?/deleteFood" use:enhance={confirmFirst(`Delete ${food.name}? It is also removed from every diary.`)}>
						<input type="hidden" name="id" value={food.id} />
						<button class="icon-button small" aria-label="Delete {food.name}"><Icon name="trash" size={18} /></button>
					</form>
				</div>
			{:else}
				<p class="muted small-text">No food found.</p>
			{/each}
		</div>
	{/if}
</div>