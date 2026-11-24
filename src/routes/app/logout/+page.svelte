<script>
	import { enhance } from '$app/forms';
	import Icon from '../../../lib/components/Icon.svelte';
	import { m } from '../../../lib/paraglide/messages.js';

	let { data } = $props();
</script>

<svelte:head><title>{m.logout_button()} · EatWise</title></svelte:head>

<div class="auth-screen">
	<div class="card auth-card center">
		<div class="big-icon"><Icon name="logout" size={32} /></div>
		<h1>{m.logout_question()}</h1>
		<p class="muted">{m.logout_logged_in_as()} <strong>{data.user.username}</strong>.</p>
		<form method="POST" use:enhance>
			<button class="button primary">{m.logout_button()}</button>
		</form>
		<a class="button ghost" href="/app/profile">{m.common_cancel()}</a>
	</div>
</div>
