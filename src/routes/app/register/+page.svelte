<script>
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Icon from '../../../lib/components/Icon.svelte';
	import Logo from '../../../lib/components/Logo.svelte';
	import logoMark from '../../../lib/assets/logo-mark.png';
	import logoFull from '../../../lib/assets/logo-full.png';
	import Ring from '../../../lib/components/Ring.svelte';
	import MacroBadge from '../../../lib/components/MacroBadge.svelte';
	import LanguageSwitch from '../../../lib/components/LanguageSwitch.svelte';
	import { calculatePlan, round } from '../../../lib/nutrition.js';
	import { m } from '../../../lib/paraglide/messages.js';
	import { getLocale } from '../../../lib/paraglide/runtime.js';

	// step 0-6: questions, 7: results, 8: create account, 9: loading screen
	let step = $state(0);
	let plan = $state({
		goal: '',
		sex: '',
		height: 178,
		weight: 78,
		target: 74,
		birth: '2000-05-14',
		activity: ''
	});
	let unit = $state('metric');
	let account = $state({ email: '', username: '', password: '', confirm: '' });
	let showPassword = $state(false);
	let serverError = $state('');
	let loadingMessage = $state(0);

	const todayDate = new Date().toISOString().split('T')[0];
	const loadingMessages = [m.register_loading_1(), m.register_loading_2(), m.register_loading_3()];

	const goalCards = [
		{ icon: '↘', title: m.goal_lose(), note: m.register_goal_lose_note(), value: 'lose' },
		{
			icon: '＝',
			title: m.goal_maintain(),
			note: m.register_goal_maintain_note(),
			value: 'maintain'
		},
		{ icon: '↗', title: m.goal_gain(), note: m.register_goal_gain_note(), value: 'gain' }
	];
	const sexCards = [
		{ icon: '♂', title: m.register_sex_male(), value: 'male' },
		{ icon: '♀', title: m.register_sex_female(), value: 'female' }
	];
	const activityCards = [
		{ icon: '🪑', title: m.activity_low(), note: m.register_activity_low_note(), value: 'low' },
		{
			icon: '🚶',
			title: m.activity_medium(),
			note: m.register_activity_medium_note(),
			value: 'medium'
		},
		{ icon: '🏃', title: m.activity_high(), note: m.register_activity_high_note(), value: 'high' }
	];
	// Goal name in the chosen language for the results summary
	const goalNames = { lose: m.goal_lose(), maintain: m.goal_maintain(), gain: m.goal_gain() };

	const nutrition = $derived(calculatePlan(plan));

	const emailOk = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email));
	// Continue is only enabled when the current step is answered
	const answered = $derived(
		[
			!!plan.goal,
			!!plan.sex,
			plan.height >= 80 && plan.height <= 260,
			plan.weight >= 30 && plan.weight <= 400,
			plan.target >= 30 && plan.target <= 400,
			!!plan.birth && plan.birth <= todayDate,
			!!plan.activity,
			true,
			emailOk &&
				account.username.trim().length > 2 &&
				account.password.length >= 6 &&
				account.password === account.confirm
		][step]
	);

	const targetQuestion = $derived(
		plan.goal === 'lose'
			? m.register_target_lose()
			: plan.goal === 'gain'
				? m.register_target_gain()
				: m.register_target_maintain()
	);
	const explanation = $derived(
		nutrition.age < 18
			? m.register_explain_young()
			: plan.goal === 'lose'
				? m.register_explain_lose()
				: plan.goal === 'gain'
					? m.register_explain_gain()
					: m.register_explain_maintain()
	);

	// Loading screen: rotate the messages, then open Home
	$effect(() => {
		if (step !== 9) return;
		const messageTimer = setInterval(() => (loadingMessage = (loadingMessage + 1) % 3), 700);
		const doneTimer = setTimeout(() => goto('/app/homepage', { invalidateAll: true }), 2600);
		return () => {
			clearInterval(messageTimer);
			clearTimeout(doneTimer);
		};
	});

	// Called when the "Create Account" form was sent
	function onCreate() {
		serverError = '';
		return async ({ result }) => {
			if (result.type === 'success') step = 9;
			else if (result.type === 'failure')
				serverError = result.data?.error ?? m.common_something_wrong();
			// The real reason comes from src/hooks.server.js (also printed in the terminal)
			else if (result.type === 'error') serverError = result.error?.message ?? m.common_try_again();
			else serverError = m.common_try_again();
		};
	}
</script>

{#snippet cards(items, key)}
	<div class="choice-list">
		{#each items as item}
			<button
				type="button"
				class="choice-card"
				class:selected={plan[key] === item.value}
				onclick={() => (plan[key] = item.value)}
			>
				<span class="choice-icon">{item.icon}</span>
				<span>
					<strong>{item.title}</strong>
					{#if item.note}<small>{item.note}</small>{/if}
				</span>
				{#if plan[key] === item.value}
					<span class="selected-check"><Icon name="check" size={16} /></span>
				{/if}
			</button>
		{/each}
	</div>
{/snippet}

{#snippet question(title, note)}
	<div class="question">
		<h1>{title}</h1>
		<p>{note}</p>
	</div>
{/snippet}

{#snippet unitSwitch(a, b)}
	<div class="segmented">
		<button type="button" class:active={unit === 'metric'} onclick={() => (unit = 'metric')}
			>{a}</button
		>
		<button type="button" class:active={unit === 'imperial'} onclick={() => (unit = 'imperial')}
			>{b}</button
		>
	</div>
{/snippet}

{#if step === 9}
	<div class="loading-page">
		<img class="loader-logo" src={logoFull} alt="EatWise" />
		<div class="orbit"><span>🥑</span></div>
		<h1>{m.register_loading_title()}</h1>
		<p>{m.register_loading_text_1()}<br />{m.register_loading_text_2()}</p>
		<div class="loading-message">{loadingMessages[loadingMessage]}</div>
	</div>
{:else}
	<div class="onboarding">
		{#if step < 8}
			<div class="onboarding-top">
				{#if step > 0}
					<button
						type="button"
						class="icon-button"
						aria-label={m.common_back()}
						onclick={() => (step -= 1)}><Icon name="back" /></button
					>
				{:else}
					<Logo />
				{/if}
				{#if step === 0}
					<LanguageSwitch />
				{:else}
					<span>{m.register_step({ current: step + 1, total: 9 })}</span>
				{/if}
				<div class="step-track"><span style="width: {((step + 1) / 9) * 100}%"></span></div>
			</div>
		{/if}

		<main class="onboarding-content">
			{#if step === 0}
				<img class="welcome-mark" src={logoMark} alt="EatWise logo" />
				<h1>{m.register_welcome_title_1()}<br />{m.register_welcome_title_2()}</h1>
				<p>{m.register_welcome_text()}</p>
				<h2>{m.register_goal_question()}</h2>
				{@render cards(goalCards, 'goal')}
				<a class="text-link" href="/app/login"
					>{m.register_have_account()} <strong>{m.common_sign_in()}</strong></a
				>
			{:else if step === 1}
				{@render question(m.register_sex_question(), m.register_sex_note())}
				{@render cards(sexCards, 'sex')}
			{:else if step === 2}
				{@render question(m.register_height_question(), m.register_height_note())}
				{@render unitSwitch('cm', 'ft / in')}
				<div class="big-input">
					{#if unit === 'metric'}
						<input
							type="number"
							aria-label={m.register_height_cm_label()}
							bind:value={plan.height}
						/><span>cm</span>
					{:else}
						<input
							type="number"
							aria-label={m.register_height_in_label()}
							value={round(plan.height / 2.54)}
							oninput={(e) => (plan.height = round(Number(e.currentTarget.value) * 2.54))}
						/><span>in</span>
					{/if}
				</div>
				<div class="height-visual">
					↕
					<span>
						{unit === 'metric'
							? m.register_height_cm_text({ value: plan.height })
							: `${Math.floor(round(plan.height / 2.54) / 12)}′ ${round(plan.height / 2.54) % 12}″`}
					</span>
				</div>
			{:else if step === 3}
				{@render question(m.register_weight_question(), m.register_weight_note())}
				{@render unitSwitch('kg', 'lb')}
				<div class="big-input">
					{#if unit === 'metric'}
						<input
							type="number"
							aria-label={m.register_weight_kg_label()}
							bind:value={plan.weight}
						/><span>kg</span>
					{:else}
						<input
							type="number"
							aria-label={m.register_weight_lb_label()}
							value={round(plan.weight * 2.205)}
							oninput={(e) => (plan.weight = round(Number(e.currentTarget.value) / 2.205))}
						/><span>lb</span>
					{/if}
				</div>
			{:else if step === 4}
				{@render question(targetQuestion, m.register_target_note())}
				<div class="big-input">
					<input
						type="number"
						aria-label={m.register_target_label()}
						bind:value={plan.target}
					/><span>kg</span>
				</div>
				<div class="weight-compare">
					<div class="card">
						<small>{m.common_current()}</small><strong>{plan.weight} kg</strong>
					</div>
					<Icon name="next" />
					<div class="card">
						<small>{m.common_target()}</small><strong>{plan.target} kg</strong>
					</div>
				</div>
			{:else if step === 5}
				{@render question(m.register_birth_question(), m.register_birth_note())}
				<label class="field">
					<span>{m.register_birth_label()}</span>
					<input type="date" max={todayDate} bind:value={plan.birth} />
				</label>
				<div class="birthday-art">🎂</div>
			{:else if step === 6}
				{@render question(m.register_activity_question(), m.register_activity_note())}
				{@render cards(activityCards, 'activity')}
			{:else if step === 7}
				<div class="results">
					<div class="success-badge"><Icon name="check" /></div>
					<h1>{m.register_result_title_1()}<br />{m.register_result_title_2()}</h1>
					<p>{m.register_result_subtitle()}</p>
					<Ring
						value={nutrition.kcal}
						max={Math.max(2600, nutrition.kcal + 400)}
						color="orange"
						size={164}
					>
						<strong>{nutrition.kcal.toLocaleString(getLocale())}</strong><small
							>{m.register_result_kcal()}</small
						>
					</Ring>
					<div class="result-macros">
						<MacroBadge color="blue" label={m.common_protein()} value="{nutrition.protein}g" />
						<MacroBadge color="amber" label={m.common_carbs()} value="{nutrition.carbs}g" />
						<MacroBadge color="purple" label={m.common_fat()} value="{nutrition.fat}g" />
					</div>
					<div class="card plan-summary">
						<div><span>{m.common_current()}</span><strong>{plan.weight} kg</strong></div>
						<div><span>{m.common_goal()}</span><strong>{goalNames[plan.goal]}</strong></div>
						<div><span>{m.common_target()}</span><strong>{plan.target} kg</strong></div>
					</div>
					<p class="explain">{explanation}</p>
					<small class="medical">{m.register_medical()}</small>
				</div>
			{:else if step === 8}
				<header class="page-header">
					<button
						type="button"
						class="icon-button"
						aria-label={m.common_back()}
						onclick={() => (step = 7)}><Icon name="back" /></button
					>
					<div>
						<h1>{m.register_account_title()}</h1>
						<p>{m.register_account_text()}</p>
					</div>
				</header>

				<form id="account-form" class="form-stack" method="POST" use:enhance={onCreate}>
					<!-- The onboarding answers are sent together with the account -->
					<input type="hidden" name="goal" value={plan.goal} />
					<input type="hidden" name="sex" value={plan.sex} />
					<input type="hidden" name="height" value={plan.height} />
					<input type="hidden" name="weight" value={plan.weight} />
					<input type="hidden" name="target" value={plan.target} />
					<input type="hidden" name="birth" value={plan.birth} />
					<input type="hidden" name="activity" value={plan.activity} />

					<label class="field">
						<span>{m.common_email()}</span>
						<input
							name="email"
							type="email"
							autocomplete="email"
							placeholder="alex@example.com"
							bind:value={account.email}
						/>
						{#if account.email && !emailOk}<small class="error">{m.register_error_email()}</small
							>{/if}
					</label>
					<label class="field">
						<span>{m.register_username()}</span>
						<input
							name="username"
							autocomplete="username"
							placeholder="alexwise"
							bind:value={account.username}
						/>
						{#if account.username && account.username.trim().length < 3}<small class="error"
								>{m.register_error_username()}</small
							>{/if}
					</label>
					<div class="password-field">
						<label class="field">
							<span>{m.common_password()}</span>
							<input
								name="password"
								type={showPassword ? 'text' : 'password'}
								autocomplete="new-password"
								placeholder={m.register_password_placeholder()}
								bind:value={account.password}
							/>
							{#if account.password && account.password.length < 6}<small class="error"
									>{m.register_error_password()}</small
								>{/if}
						</label>
						<button
							type="button"
							class="icon-button"
							aria-label={showPassword ? m.register_hide_password() : m.register_show_password()}
							onclick={() => (showPassword = !showPassword)}
						>
							<Icon name="eye" />
						</button>
					</div>
					<label class="field">
						<span>{m.register_confirm()}</span>
						<input
							name="confirm"
							type={showPassword ? 'text' : 'password'}
							autocomplete="new-password"
							placeholder={m.register_confirm_placeholder()}
							bind:value={account.confirm}
						/>
						{#if account.confirm && account.confirm !== account.password}<small class="error"
								>{m.register_error_confirm()}</small
							>{/if}
					</label>

					{#if serverError}<p class="form-error" role="alert">{serverError}</p>{/if}
					<p class="terms">{m.register_terms()}</p>
				</form>
			{/if}
		</main>

		<div class="onboarding-footer">
			{#if step === 8}
				<button class="button primary" form="account-form" disabled={!answered}
					>{m.register_create_button()} <Icon name="next" /></button
				>
			{:else}
				<button
					type="button"
					class="button primary"
					disabled={!answered}
					onclick={() => (step += 1)}
				>
					{step === 7 ? m.register_get_started() : m.common_continue()}
					<Icon name="next" />
				</button>
			{/if}
		</div>
	</div>
{/if}
