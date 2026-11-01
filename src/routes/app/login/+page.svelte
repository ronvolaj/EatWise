<script>
	import { enhance } from '$app/forms';
	import logoFull from '../../../lib/assets/logo-full.png';
	import PageHeader from '../../../lib/components/PageHeader.svelte';

	// form = answer from the server when something was wrong
	let { form } = $props();
</script>

<form class="onboarding signin" method="POST" use:enhance>
	<PageHeader title="Welcome back" subtitle="Sign in to continue your journey" back="/app/register" />
	<div class="auth-logo"><img src={logoFull} alt="EatWise" /></div>

	<label class="field">
		<span>Email</span>
		<input name="email" type="email" autocomplete="email" placeholder="alex@example.com" required value={form?.email ?? ''} />
	</label>
	<label class="field">
		<span>Password</span>
		<input name="password" type="password" autocomplete="current-password" placeholder="Your password" required />
	</label>

	{#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}

	<button class="button primary">Sign In</button>
	<a class="text-link" href="/app/register">New here? <strong>Create an account</strong></a>
</form>