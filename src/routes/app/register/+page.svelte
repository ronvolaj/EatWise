<script>
	import { enhance } from '$app/forms';
	import logo from '../../../lib/assets/logo-full.png';
	import { ACTIVITIES, GOALS, ageFrom, calculatePlan } from '../../../lib/nutrition.js';

	let { form } = $props();

	// Filled in again after an error from the server
	const old = $derived(form?.values ?? {});

	let sex = $state('female');
	let birth = $state('');
	let height = $state('');
	let weight = $state('');
	let target = $state('');
	let goal = $state('lose');
	let activity = $state('medium');
	let loading = $state(false);

	const todayText = new Date().toISOString().slice(0, 10);

	// Live preview of the daily targets (the server calculates them again when saving)
	const plan = $derived.by(() => {
		const h = Number(height);
		const w = Number(weight);
		if (!birth || !(h > 0) || !(w > 0)) return null;
		if (ageFrom(birth) < 13) return null;
		return calculatePlan({ sex, height: h, weight: w, birth, activity, goal });
	});
</script>

<svelte:head><title>Create account · EatWise</title></svelte:head>

<div class="auth-screen">
	<img class="auth-logo small" src={logo} alt="EatWise" />
	<h1>Create your account</h1>
	<p class="muted">We use your answers to calculate your daily goals.</p>

	<form
		method="POST"
		class="register-form"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update({ reset: false });
				loading = false;
			};
		}}
	>
		<div class="card">
			<span class="eyebrow">1 · ACCOUNT</span>
			<label class="field">
				<span>Email</span>
				<input name="email" type="email" autocomplete="email" value={old.email ?? ''} required />
			</label>
			<label class="field">
				<span>Username</span>
				<input name="username" autocomplete="username" minlength="3" maxlength="50" pattern="[A-Za-z0-9_.]+" value={old.username ?? ''} required />
			</label>
			<label class="field">
				<span>Password</span>
				<input name="password" type="password" autocomplete="new-password" minlength="8" required />
			</label>
			<label class="field">
				<span>Repeat password</span>
				<input name="password2" type="password" autocomplete="new-password" minlength="8" required />
			</label>
		</div>

		<div class="card">
			<span class="eyebrow">2 · ABOUT YOU</span>
			<div class="field">
				<span>Sex</span>
				<div class="choice-row">
					<label class="choice"><input type="radio" name="sex" value="female" bind:group={sex} />Female</label>
					<label class="choice"><input type="radio" name="sex" value="male" bind:group={sex} />Male</label>
				</div>
			</div>
			<label class="field">
				<span>Birth date</span>
				<input name="birth_date" type="date" max={todayText} bind:value={birth} required />
			</label>
			<div class="field-row">
				<label class="field">
					<span>Height (cm)</span>
					<input name="height" type="number" min="100" max="250" step="0.1" inputmode="decimal" bind:value={height} required />
				</label>
				<label class="field">
					<span>Weight (kg)</span>
					<input name="weight" type="number" min="30" max="300" step="0.1" inputmode="decimal" bind:value={weight} required />
				</label>
			</div>
		</div>

		<div class="card">
			<span class="eyebrow">3 · YOUR GOAL</span>
			<div class="field">
				<span>Goal</span>
				<div class="choice-row">
					{#each Object.entries(GOALS) as [id, label]}
						<label class="choice"><input type="radio" name="goal" value={id} bind:group={goal} />{label}</label>
					{/each}
				</div>
			</div>
			<label class="field">
				<span>Target weight (kg)</span>
				<input name="target_weight" type="number" min="30" max="300" step="0.1" inputmode="decimal" bind:value={target} required />
			</label>
			<div class="field">
				<span>How active are you?</span>
				<div class="choice-row">
					{#each Object.entries(ACTIVITIES) as [id, label]}
						<label class="choice"><input type="radio" name="activity" value={id} bind:group={activity} />{label}</label>
					{/each}
				</div>
			</div>
		</div>

		{#if plan}
			<div class="card plan-preview">
				<span class="eyebrow">YOUR DAILY GOAL</span>
				<h2>{plan.kcal.toLocaleString('en-US')} <small>kcal</small></h2>
				<p>{plan.protein}g protein · {plan.carbs}g carbs · {plan.fat}g fat</p>
				{#if plan.age < 18}<p class="muted">Under 18: your goal is set to keep your weight healthy, without a diet.</p>{/if}
			</div>
		{/if}

		{#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}

		<button class="button primary" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button>
	</form>

	<p class="auth-switch">Already have an account? <a href="/app/login">Log in</a></p>
</div>