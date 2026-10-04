<script>
	// Progress ring. The content between the tags is shown in the middle.
	let { value, max, color = 'green', size = 132, children } = $props();

	const percent = $derived(Math.min(100, Math.max(0, (value / max) * 100)));
</script>

<div class="ring {color}" style="--progress: {percent * 3.6}deg; width: {size}px; height: {size}px">
	<div class="ring-inner">{@render children()}</div>
</div>
