<script>
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import BottomNav from '../lib/components/BottomNav.svelte';

	let { data, children } = $props();

	// Pages without the bottom navigation
	const noNav = ['/app/login', '/app/register', '/app/logout'];
	const showNav = $derived(data.user && data.path.startsWith('/app') && !noNav.includes(data.path));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>EatWise</title>
</svelte:head>

<div class="app" data-theme={data.user?.theme ?? 'light'}>
	<main class:with-nav={showNav}>
		{@render children()}
	</main>

	{#if showNav}<BottomNav path={data.path} />{/if}

	{#if data.flash}
		{#key data.flash}<div class="toast" role="status">{data.flash}</div>{/key}
	{/if}
</div>
