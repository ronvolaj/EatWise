<script>
	import { enhance } from '$app/forms';
	import Icon from '../../../lib/components/Icon.svelte';
	import PageHeader from '../../../lib/components/PageHeader.svelte';
	import { m } from '../../../lib/paraglide/messages.js';

	// data.users comes from +page.server.js, data.user from +layout.server.js
	let { data, form } = $props();

	let query = $state('');
	let tab = $state('users');
	let addingFood = $state(false);

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
			if (!confirm(m.admin_delete_user_confirm({ name }))) cancel();
		};
	}

	function confirmFoodDelete(food) {
		return ({ cancel }) => {
			const note = food.uses > 0 ? ' ' + m.admin_delete_food_uses({ count: food.uses }) : '';
			if (!confirm(m.admin_delete_food_confirm({ name: food.name }) + note)) cancel();
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
	<PageHeader title={m.admin_role_admin()} subtitle={m.admin_subtitle()} back="/app/profile" />

	<div class="admin-stats">
		<div class="card"><small>{m.admin_users()}</small><strong>{data.users.length}</strong></div>
		<div class="card"><small>{m.admin_foods_in_db()}</small><strong>{data.foodCount}</strong></div>
	</div>

	<div class="segmented admin-tabs">
		<button class:active={tab === 'users'} onclick={() => (tab = 'users')}>{m.admin_users()}</button>
		<button class:active={tab === 'foods'} onclick={() => (tab = 'foods')}>{m.admin_foods()}</button>
	</div>

	<label class="search-box">
		<Icon name="search" />
		<input bind:value={query} placeholder={tab === 'users' ? m.admin_search_users() : m.search_label()} aria-label={m.common_search()} />
	</label>

	{#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}

	{#if tab === 'users'}
	<div class="list-heading" style="margin-top: 16px">
		<h2>{m.admin_users()}</h2>
		<span>{m.admin_shown({ count: filtered.length })}</span>
	</div>

	<div class="user-list">
		{#each filtered as u (u.id)}
			{@const self = u.id === data.user.id}
			<div class="card user-row">
				<div>
					<span class="avatar">{u.username[0]}</span>
					<div class="who">
						<strong>{self ? m.admin_you({ name: u.username }) : u.username}</strong>
						<small>{u.email} · {m.admin_diary_entries({ count: u.entries })}</small>
					</div>
					<span class="role-tag" class:admin={u.role === 'admin'}>{u.role === 'admin' ? m.admin_role_admin() : m.admin_role_user()}</span>
				</div>
				{#if !self}
					<div class="user-actions">
						<form method="POST" action="?/role" use:enhance>
							<input type="hidden" name="id" value={u.id} />
							<input type="hidden" name="role" value={u.role === 'admin' ? 'user' : 'admin'} />
							<button class="button secondary">{u.role === 'admin' ? m.admin_remove_admin() : m.admin_make_admin()}</button>
						</form>
						<form method="POST" action="?/delete" use:enhance={confirmDelete(u.username)}>
							<input type="hidden" name="id" value={u.id} />
							<button class="button danger">{m.common_delete()}</button>
						</form>
					</div>
				{/if}
			</div>
		{:else}
			<p class="chart-empty">{m.admin_no_user({ query })}</p>
		{/each}
	</div>
	{:else}
	<div class="list-heading" style="margin-top: 16px">
		<h2>{m.admin_builtin()}</h2>
		<span>{m.admin_shown({ count: filteredFoods.length })}</span>
	</div>
	<button class="button secondary add-custom admin-add" onclick={() => (addingFood = true)}><Icon name="plus" /> {m.common_add_food()}</button>

	<div class="food-list">
		{#each filteredFoods as f (f.id)}
			<div class="food-row admin-food">
				<span class="food-emoji">{f.icon}</span>
				<div>
					<strong>{f.name}</strong>
					<small>{f.brand} · {f.category} · {f.kcal} kcal / 100g</small>
					<p>{m.admin_used_in({ count: f.uses })}{f.barcode ? ` · ${m.common_barcode()} ${f.barcode}` : ''}</p>
				</div>
				<form method="POST" action="?/deleteFood" use:enhance={confirmFoodDelete(f)}>
					<input type="hidden" name="id" value={f.id} />
					<button class="icon-button" aria-label={m.admin_delete_name({ name: f.name })}><Icon name="trash" /></button>
				</form>
			</div>
		{:else}
			<p class="chart-empty">{m.admin_no_food({ query })}</p>
		{/each}
	</div>
	{/if}

	{#if addingFood}
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={(e) => e.target === e.currentTarget && (addingFood = false)}>
			<form class="card edit-modal admin-food-form" method="POST" action="?/addFood" use:enhance={closeAfter}>
				<div class="modal-title">
					<div><div><h2>{m.admin_add_builtin()}</h2><p>{m.admin_add_note()}</p></div></div>
					<button type="button" class="icon-button" aria-label={m.common_close()} onclick={() => (addingFood = false)}><Icon name="close" /></button>
				</div>
				<div class="nutrient-inputs">
					<label class="field"><span>{m.admin_name()}</span><input name="name" required value={old.name ?? ''} /></label>
					<label class="field"><span>{m.common_brand()}</span><input name="brand" placeholder={m.common_optional()} value={old.brand ?? ''} /></label>
					<label class="field"><span>{m.admin_icon()}</span><input name="icon" placeholder="🥘" value={old.icon ?? ''} /></label>
					<label class="field"><span>{m.admin_category()}</span><input name="category" placeholder={m.admin_category_placeholder()} value={old.category ?? ''} /></label>
					<label class="field"><span>{m.common_barcode()}</span><input name="barcode" inputmode="numeric" placeholder={m.common_optional()} value={old.barcode ?? ''} /></label>
					<label class="field"><span>{m.admin_serving()}</span><input name="serving" type="number" min="1" step="any" required value={old.serving ?? '100'} /></label>
					{#each nutrients as n}
						<label class="field">
							<span>{n.label}{n.required ? ' *' : ''}</span>
							<input name={n.name} type="number" min="0" step="any" placeholder="0" required={n.required} value={old[n.name] ?? ''} />
						</label>
					{/each}
				</div>
				{#if form?.foodError}<p class="form-error" role="alert">{form.foodError}</p>{/if}
				<button class="button primary">{m.common_save_food()}</button>
			</form>
		</div>
	{/if}
</div>