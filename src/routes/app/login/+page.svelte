<script>
	import { enhance } from '$app/forms';
	import logo from '../../../lib/assets/logo-full.png';

	let { form } = $props();
	let loading = $state(false);
</script>

<svelte:head><title>Log in · EatWise</title></svelte:head>

<div class="auth-screen">
	<img class="auth-logo" src={logo} alt="EatWise" />
	<h1>Welcome back</h1>
	<p class="muted">Log in to track your meals.</p>

	<form
		class="card auth-card"
		method="POST"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
		}}
	>
		<label class="field">
			<span>Email or username</span>
			<input name="login" autocomplete="username" value={form?.login ?? ''} required />
		</label>
		<label class="field">
			<span>Password</span>
			<input name="password" type="password" autocomplete="current-password" required />
		</label>

		{#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}

		<button class="button primary" disabled={loading}>{loading ? 'Logging in...' : 'Log in'}</button>
	</form>

	<p class="auth-switch">No account yet? <a href="/app/register">Create one</a></p>
</div>