<script>
	import { enhance } from '$app/forms';
	import Icon from '../../../lib/components/Icon.svelte';
	import { round } from '../../../lib/nutrition.js';

	let { data, form } = $props();

	// Photo mode: ready -> analyzing -> result
	let status = $state('ready');
	// svelte-ignore state_referenced_locally
	let portion = $state(data.photoFood.serving);

	const food = $derived(data.photoFood);
	const scaled = (value) => round((value * portion) / 100);

	function analyze() {
		status = 'analyzing';
		setTimeout(() => (status = 'result'), 1600);
	}

	// Switching the mode resets the photo flow
	$effect(() => {
		data.mode;
		status = 'ready';
	});
</script>

<div class="scan-screen">
	<div class="scan-top">
		<h1>Scan food</h1>
		<p>Point, capture, track</p>
		<div class="scan-switch">
			<a href="/app/scan" class:active={data.mode === 'barcode'}><Icon name="barcode" />Barcode</a>
			<a href="/app/scan?mode=photo" class:active={data.mode === 'photo'}><Icon name="camera" />Food Photo</a>
		</div>
	</div>

	<div class="camera-view">
		<div class="camera-noise"></div>

		{#if data.mode === 'barcode'}
			{#if data.notFound}
				<div class="scan-result overlay-card">
					<span>?</span>
					<h2>Product not found</h2>
					<p>Barcode {data.notFound} isn't in our database yet.</p>
					<a class="button primary" href="/app/custom?barcode={encodeURIComponent(data.notFound)}">Add product manually</a>
					<a class="button ghost" href="/app/scan">Try again</a>
				</div>
			{:else}
				<div class="scan-frame"><span></span><span></span><span></span><span></span><i></i></div>
				<p>Enter the barcode number below</p>
			{/if}
		{:else if status === 'ready'}
			<div class="photo-guide">🥗</div>
			<p>Center your meal in the frame</p>
		{:else if status === 'analyzing'}
			<div class="analyzing">
				<div class="spinner"></div>
				<h2>Analyzing your meal...</h2>
				<p>Identifying foods and estimating portions</p>
			</div>
		{:else}
			<form class="scan-result overlay-card" method="POST" action="?/photo" use:enhance>
				<span>{food.icon}</span>
				<div class="confidence">Demo result</div>
				<h2>{food.name}</h2>
				<p>Estimated portion · {portion}g</p>
				<div class="ai-macros">
					<strong>{scaled(food.kcal)} <small>kcal</small></strong>
					<span>{scaled(food.protein)}g P</span>
					<span>{scaled(food.carbs)}g C</span>
					<span>{scaled(food.fat)}g F</span>
				</div>
				<label class="field">
					<span>Portion (grams)</span>
					<input name="quantity" type="number" min="1" step="any" required bind:value={portion} />
				</label>
				{#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}
				<p class="estimate">AI values are estimates and may not be exact.</p>
				<button class="button primary">Add to Diary</button>
				<button type="button" class="button ghost" onclick={() => (status = 'ready')}>Retake</button>
			</form>
		{/if}
	</div>

	{#if data.mode === 'barcode' && !data.notFound}
		<div class="camera-controls barcode">
			<form class="barcode-form" method="GET" action="/app/scan">
				<input name="code" inputmode="numeric" placeholder="Barcode number" aria-label="Barcode number" required />
				<button class="button primary">Look up</button>
			</form>
			<a class="button ghost" href="/app/scan?code={data.sampleBarcode}">Simulate scan</a>
		</div>
	{:else if data.mode === 'photo' && status === 'ready'}
		<div class="camera-controls">
			<button class="upload-button" onclick={analyze}><Icon name="camera" /><small>Upload</small></button>
			<button class="shutter" aria-label="Take photo" onclick={analyze}><span></span></button>
			<span class="upload-button"></span>
		</div>
	{/if}
</div>
