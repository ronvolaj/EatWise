<script>
	import Icon from './Icon.svelte';
	import { m } from '../paraglide/messages.js';

	// back = link of the back button (optional)
	let { title, subtitle = '', back = '', action = null } = $props();
</script>

<header class="page-header">
	{#if back}
		<a class="icon-button" href={back} aria-label={m.common_back()} title={m.common_back()}
			><Icon name="back" /></a
		>
	{/if}
	<div>
		<h1>{title}</h1>
		{#if subtitle}<p>{subtitle}</p>{/if}
	</div>
	{#if action}{@render action()}{/if}
</header>
