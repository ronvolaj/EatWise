<script>
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Icon from '../../../lib/components/Icon.svelte';
	import Logo from '../../../lib/components/Logo.svelte';
	import logoMark from '../../../lib/assets/logo-mark.png';
	import logoFull from '../../../lib/assets/logo-full.png';
	import Ring from '../../../lib/components/Ring.svelte';
	import MacroBadge from '../../../lib/components/MacroBadge.svelte';
	import { calculatePlan, GOALS, round } from '../../../lib/nutrition.js';

	// step 0-6: questions, 7: results, 8: create account, 9: loading screen
	let step = $state(0);
	let plan = $state({ goal: '', sex: '', height: 178, weight: 78, target: 74, birth: '2000-05-14', activity: '' });
	let unit = $state('metric');
	let account = $state({ email: '', username: '', password: '', confirm: '' });
	let showPassword = $state(false);
	let serverError = $state('');
	let loadingMessage = $state(0);

	const todayDate = new Date().toISOString().split('T')[0];
	const loadingMessages = ['Calculating your daily targets', 'Personalizing your experience', 'Preparing your food diary'];

	const goalCards = [
		{ icon: '↘', title: 'Lose Weight', note: 'A steady, sustainable approach', value: 'lose' },
		{ icon: '＝', title: 'Maintain Weight', note: 'Build healthy, lasting habits', value: 'maintain' },
		{ icon: '↗', title: 'Gain Weight', note: 'Fuel strength and growth', value: 'gain' }
	];
	const sexCards = [
		{ icon: '♂', title: 'Male', value: 'male' },
		{ icon: '♀', title: 'Female', value: 'female' }
	];
	const activityCards = [
		{ icon: '🪑', title: 'Low', note: 'Mostly sitting', value: 'low' },
		{ icon: '🚶', title: 'Medium', note: 'Sitting plus regular walking', value: 'medium' },
		{ icon: '🏃', title: 'A lot', note: 'Physically demanding days', value: 'high' }
	];

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
			emailOk && account.username.trim().length > 2 && account.password.length >= 6 && account.password === account.confirm
		][step]
	);

	const targetQuestion = $derived(
		plan.goal === 'lose'
			? 'How much weight do you want to lose?'
			: plan.goal === 'gain'
				? 'How much weight do you want to gain?'
				: 'Do you have a target weight?'
	);
	const explanation = $derived(
		nutrition.age < 18
			? 'Your plan supports healthy daily energy needs without a calorie deficit or surplus.'
			: plan.goal === 'lose'
				? 'This balanced plan creates a gentle calorie deficit to support steady, sustainable progress.'
				: plan.goal === 'gain'
					? 'This balanced plan adds a moderate calorie surplus to support gradual, sustainable growth.'
					: 'This balanced plan supports your current weight and helps build consistent habits.'
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
			else if (result.type === 'failure') serverError = result.data?.error ?? 'Something went wrong.';
			// The real reason comes from src/hooks.server.js (also printed in the terminal)
			else if (result.type === 'error') serverError = result.error?.message ?? 'Something went wrong. Please try again.';
			else serverError = 'Something went wrong. Please try again.';
		};
	}
</script>

{#snippet cards(items, key)}
	<div class="choice-list">
		{#each items as item}
			<button type="button" class="choice-card" class:selected={plan[key] === item.value} onclick={() => (plan[key] = item.value)}>
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
		<button type="button" class:active={unit === 'metric'} onclick={() => (unit = 'metric')}>{a}</button>
		<button type="button" class:active={unit === 'imperial'} onclick={() => (unit = 'imperial')}>{b}</button>
	</div>
{/snippet}

{#if step === 9}
	<div class="loading-page">
		<img class="loader-logo" src={logoFull} alt="EatWise" />
		<div class="orbit"><span>🥑</span></div>
		<h1>Creating your profile...</h1>
		<p>We're setting up your personal nutrition plan.<br />Just a moment!</p>
		<div class="loading-message">{loadingMessages[loadingMessage]}</div>
	</div>
{:else}
	<div class="onboarding">
		{#if step < 8}
			<div class="onboarding-top">
				{#if step > 0}
					<button type="button" class="icon-button" aria-label="Back" onclick={() => (step -= 1)}><Icon name="back" /></button>
				{:else}
					<Logo />
				{/if}
				<span>Step {step + 1} of 9</span>
				<div class="step-track"><span style="width: {((step + 1) / 9) * 100}%"></span></div>
			</div>
		{/if}

		<main class="onboarding-content">
			{#if step === 0}
				<img class="welcome-mark" src={logoMark} alt="EatWise logo" />
				<h1>Eat better.<br />Feel better.</h1>
				<p>Personalized nutrition made simple, one meal at a time.</p>
				<h2>What's your goal?</h2>
				{@render cards(goalCards, 'goal')}
				<a class="text-link" href="/app/login">Already have an account? <strong>Sign In</strong></a>
			{:else if step === 1}
				{@render question("What's your biological sex?", 'Used to estimate your daily calorie requirements.')}
				{@render cards(sexCards, 'sex')}
			{:else if step === 2}
				{@render question('How tall are you?', 'This helps us calculate your daily energy needs.')}
				{@render unitSwitch('cm', 'ft / in')}
				<div class="big-input">
					{#if unit === 'metric'}
						<input type="number" aria-label="Height in centimeters" bind:value={plan.height} /><span>cm</span>
					{:else}
						<input
							type="number"
							aria-label="Height in inches"
							value={round(plan.height / 2.54)}
							oninput={(e) => (plan.height = round(Number(e.currentTarget.value) * 2.54))}
						/><span>in</span>
					{/if}
				</div>
				<div class="height-visual">
					↕
					<span>
						{unit === 'metric'
							? `${plan.height} centimeters`
							: `${Math.floor(round(plan.height / 2.54) / 12)}′ ${round(plan.height / 2.54) % 12}″`}
					</span>
				</div>
			{:else if step === 3}
				{@render question("What's your current weight?", 'You can update this anytime in your profile.')}
				{@render unitSwitch('kg', 'lb')}
				<div class="big-input">
					{#if unit === 'metric'}
						<input type="number" aria-label="Weight in kilograms" bind:value={plan.weight} /><span>kg</span>
					{:else}
						<input
							type="number"
							aria-label="Weight in pounds"
							value={round(plan.weight * 2.205)}
							oninput={(e) => (plan.weight = round(Number(e.currentTarget.value) / 2.205))}
						/><span>lb</span>
					{/if}
				</div>
			{:else if step === 4}
				{@render question(targetQuestion, 'A realistic pace makes progress easier to maintain.')}
				<div class="big-input">
					<input type="number" aria-label="Target weight in kilograms" bind:value={plan.target} /><span>kg</span>
				</div>
				<div class="weight-compare">
					<div class="card"><small>Current</small><strong>{plan.weight} kg</strong></div>
					<Icon name="next" />
					<div class="card"><small>Target</small><strong>{plan.target} kg</strong></div>
				</div>
			{:else if step === 5}
				{@render question('When were you born?', 'Your age helps us personalize your nutrition plan.')}
				<label class="field">
					<span>Date of birth</span>
					<input type="date" max={todayDate} bind:value={plan.birth} />
				</label>
				<div class="birthday-art">🎂</div>
			{:else if step === 6}
				{@render question('How active are you in your everyday life?', 'Think about your typical week, excluding planned workouts.')}
				{@render cards(activityCards, 'activity')}
			{:else if step === 7}
				<div class="results">
					<div class="success-badge"><Icon name="check" /></div>
					<h1>Your daily nutrition<br />plan is ready!</h1>
					<p>Built around your body, lifestyle and goal.</p>
					<Ring value={nutrition.kcal} max={Math.max(2600, nutrition.kcal + 400)} color="orange" size={164}>
						<strong>{nutrition.kcal.toLocaleString('en-US')}</strong><small>kcal / day</small>
					</Ring>
					<div class="result-macros">
						<MacroBadge color="blue" label="Protein" value="{nutrition.protein}g" />
						<MacroBadge color="amber" label="Carbs" value="{nutrition.carbs}g" />
						<MacroBadge color="purple" label="Fat" value="{nutrition.fat}g" />
					</div>
					<div class="card plan-summary">
						<div><span>Current</span><strong>{plan.weight} kg</strong></div>
						<div><span>Goal</span><strong>{GOALS[plan.goal]}</strong></div>
						<div><span>Target</span><strong>{plan.target} kg</strong></div>
					</div>
					<p class="explain">{explanation}</p>
					<small class="medical">This is an estimate, not medical advice.</small>
				</div>
			{:else if step === 8}
				<header class="page-header">
					<button type="button" class="icon-button" aria-label="Back" onclick={() => (step = 7)}><Icon name="back" /></button>
					<div>
						<h1>Create your account</h1>
						<p>Save your goals, track your progress, and access your nutrition plan anytime.</p>
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
						<span>Email</span>
						<input name="email" type="email" autocomplete="email" placeholder="alex@example.com" bind:value={account.email} />
						{#if account.email && !emailOk}<small class="error">Enter a valid email</small>{/if}
					</label>
					<label class="field">
						<span>Username</span>
						<input name="username" autocomplete="username" placeholder="alexwise" bind:value={account.username} />
						{#if account.username && account.username.trim().length < 3}<small class="error">Use at least 3 characters</small>{/if}
					</label>
					<div class="password-field">
						<label class="field">
							<span>Password</span>
							<input name="password" type={showPassword ? 'text' : 'password'} autocomplete="new-password" placeholder="At least 6 characters" bind:value={account.password} />
							{#if account.password && account.password.length < 6}<small class="error">Use at least 6 characters</small>{/if}
						</label>
						<button type="button" class="icon-button" aria-label={showPassword ? 'Hide password' : 'Show password'} onclick={() => (showPassword = !showPassword)}>
							<Icon name="eye" />
						</button>
					</div>
					<label class="field">
						<span>Confirm password</span>
						<input name="confirm" type={showPassword ? 'text' : 'password'} autocomplete="new-password" placeholder="Repeat your password" bind:value={account.confirm} />
						{#if account.confirm && account.confirm !== account.password}<small class="error">Passwords don't match</small>{/if}
					</label>

					{#if serverError}<p class="form-error" role="alert">{serverError}</p>{/if}
					<p class="terms">Your account and your nutrition plan are saved in the EatWise database.</p>
				</form>
			{/if}
		</main>

		<div class="onboarding-footer">
			{#if step === 8}
				<button class="button primary" form="account-form" disabled={!answered}>Create Account <Icon name="next" /></button>
			{:else}
				<button type="button" class="button primary" disabled={!answered} onclick={() => (step += 1)}>
					{step === 7 ? 'Get Started' : 'Continue'} <Icon name="next" />
				</button>
			{/if}
		</div>
	</div>
{/if}