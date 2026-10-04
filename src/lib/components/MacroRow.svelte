<script>
	import Progress from './Progress.svelte';

	let { label, color, value, max } = $props();
</script>

<div class="macro-row">
	<div>
		<span class="macro-dot {color}"></span><strong>{label}</strong>
		<span><b>{Math.round(value)}g</b> / {max}g</span>
	</div>
	<Progress {value} {max} {color} />
</div>
