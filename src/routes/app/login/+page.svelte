<script>
	import { enhance } from '$app/forms';
	import logoFull from '../../../lib/assets/logo-full.png';
	import PageHeader from '../../../lib/components/PageHeader.svelte';
	import LanguageSwitch from '../../../lib/components/LanguageSwitch.svelte';
	import { m } from '../../../lib/paraglide/messages.js';

	// form = answer from the server when something was wrong
	let { form } = $props();
</script>

<form class="onboarding signin" method="POST" use:enhance>
	<LanguageSwitch />
	<PageHeader title={m.login_title()} subtitle={m.login_subtitle()} back="/app/register" />
	<div class="auth-logo"><img src={logoFull} alt="EatWise" /></div>

	<label class="field">
		<span>{m.common_email()}</span>
		<input name="email" type="email" autocomplete="email" placeholder="alex@example.com" required value={form?.email ?? ''} />
	</label>
	<label class="field">
		<span>{m.common_password()}</span>
		<input name="password" type="password" autocomplete="current-password" placeholder={m.login_password_placeholder()} required />
	</label>

	{#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}

	<button class="button primary">{m.common_sign_in()}</button>
	<a class="text-link" href="/app/register">{m.login_new_here()} <strong>{m.login_create_account()}</strong></a>
</form>