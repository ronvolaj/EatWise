<script>
	import Icon from './Icon.svelte';
	import { m } from '../paraglide/messages.js';

	let { path } = $props();

	const tabs = [
		{ href: '/app/homepage', icon: 'home', label: m.nav_home() },
		{ href: '/app/search', icon: 'search', label: m.nav_search() },
		{ href: '/app/scan', icon: 'scan', label: m.nav_scan() },
		{ href: '/app/diary', icon: 'diary', label: m.nav_diary() },
		{ href: '/app/profile', icon: 'user', label: m.nav_profile() }
	];
</script>

<nav class="bottom-nav" aria-label={m.nav_label()}>
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
