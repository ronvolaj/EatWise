<script>
	let { value, max, color } = $props();
</script>

<div class="progress">
	<span class={color} style="width: {Math.min(100, max > 0 ? (value / max) * 100 : 0)}%"></span>
</div>
