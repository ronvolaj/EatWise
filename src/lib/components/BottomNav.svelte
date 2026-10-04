<script>
	import Icon from './Icon.svelte';

	let { path } = $props();

	const tabs = [
		{ href: '/app/homepage', icon: 'home', label: 'Home' },
		{ href: '/app/search', icon: 'search', label: 'Search' },
		{ href: '/app/scan', icon: 'scan', label: 'Scan' },
		{ href: '/app/diary', icon: 'diary', label: 'Diary' },
		{ href: '/app/profile', icon: 'user', label: 'Profile' }
	];
</script>

<nav class="bottom-nav" aria-label="Main navigation">
	{#each tabs as tab}
		<a
			href={tab.href}
			class:active={path === tab.href}
			class:scan-tab={tab.icon === 'scan'}
			aria-current={path === tab.href ? 'page' : undefined}
		>
			<span><Icon name={tab.icon} /></span>
			<small>{tab.label}</small>
		</a>
	{/each}
</nav>
