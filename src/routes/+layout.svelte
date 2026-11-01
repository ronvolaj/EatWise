<script>
	import './layout.css';
	import { page } from '$app/state';
	import BottomNav from '../lib/components/BottomNav.svelte';
	import Icon from '../lib/components/Icon.svelte';

	// data.user and data.flash come from +layout.server.js
	let { data, children } = $props();

	const path = $derived(page.url.pathname);
	const tabs = ['/app/homepage', '/app/search', '/app/scan', '/app/diary', '/app/profile'];
	// Onboarding and Sign In fill the whole phone and have no navigation
	const fullScreen = $derived(!data.user || path === '/' || path === '/app/login' || path === '/app/register');
	const showNav = $derived(tabs.includes(path));

	// Green message at the top after an action ("Banana added to Lunch")
	let toast = $state('');
	$effect(() => {
		if (!data.flash) return;
		toast = data.flash.text;
		const timer = setTimeout(() => (toast = ''), 2200);
		return () => clearTimeout(timer);
	});
</script>

<svelte:head>
	<title>EatWise</title>
</svelte:head>

<div class="stage">
	<div class="phone" class:dark={data.user?.theme === 'dark'}>
		{#if fullScreen}
			{@render children()}
		{:else}
			<div class="app-scroll" class:no-nav={!showNav}>
				{@render children()}
			</div>
			{#if showNav}<BottomNav {path} />{/if}
		{/if}

		{#if toast}
			<div class="toast" role="status"><Icon name="check" />{toast}</div>
		{/if}
	</div>
</div>