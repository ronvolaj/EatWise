<script>
	import Icon from './Icon.svelte';

	// back = link of the back button (optional)
	let { title, subtitle = '', back = '', action = null } = $props();
</script>

<header class="page-header">
	{#if back}
		<a class="icon-button" href={back} aria-label="Back" title="Back"><Icon name="back" /></a>
	{/if}
	<div>
		<h1>{title}</h1>
		{#if subtitle}<p>{subtitle}</p>{/if}
	</div>
	{#if action}{@render action()}{/if}
</header>
