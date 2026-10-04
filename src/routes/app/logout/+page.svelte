<script>
	import { enhance } from '$app/forms';
	import Icon from '../../../lib/components/Icon.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Log out · EatWise</title></svelte:head>

<div class="auth-screen">
	<div class="card auth-card center">
		<div class="big-icon"><Icon name="logout" size={32} /></div>
		<h1>Log out?</h1>
		<p class="muted">You are logged in as <strong>{data.user.username}</strong>.</p>
		<form method="POST" use:enhance>
			<button class="button primary">Log out</button>
		</form>
		<a class="button ghost" href="/app/profile">Cancel</a>
	</div>
</div>