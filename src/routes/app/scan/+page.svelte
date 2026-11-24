<script>
	import { enhance } from '$app/forms';
		import { goto } from '$app/navigation';
	import Icon from '../../../lib/components/Icon.svelte';
	import { cameraErrorMessage, capturePhoto, openCamera } from '../../../lib/camera.js';
	import { scanBarcode } from '../../../lib/barcode.js';
	import { MEALS, round } from '../../../lib/nutrition.js';
	import { m } from '../../../lib/paraglide/messages.js';

	let { data, form } = $props();

	// Photo mode: ready (live camera) -> analyzing -> result (photo + recognized food)
	let status = $state('ready');
	let quantity = $state(0);
	let saving = $state(false);

	// Demo result until the CNN model is ready (Milestone 2)
	const food = $derived(data.photoFood);
	const per = (value) => round((value * quantity) / 100);

	let video = $state(); // the <video> element with the live camera image
	let cameraError = $state('');
	let photoUrl = $state(''); // preview URL of the taken/uploaded photo

	// Barcode scanner (Capacitor plugin): the live camera is turned off while it is open
	let scanning = $state(false);
	let scanError = $state('');

	// Opens the scanner, then looks the code up like the "Look up" button does:
	// known product -> food page, unknown product -> "Product not found"
	async function startScan() {
		scanError = '';
		scanning = true;
		try {
			const result = await scanBarcode();
			if (result) await goto(`/app/scan?code=${encodeURIComponent(result.code)}`);
		} catch (error) {
			scanError = m.scan_scanner_error();
			console.error(error);
		} finally {
			scanning = false;
		}
	}

	// The camera is on while scanning a barcode or before a photo is taken
	const cameraOn = $derived(
		(data.mode === 'barcode' && !data.notFound && !scanning) || (data.mode === 'photo' && status === 'ready')
	);

	// Switching the mode resets the photo flow
	$effect(() => {
		data.mode;
		status = 'ready';
	});

	// Starts the camera when it is needed and turns it off again afterwards
	$effect(() => {
		if (!cameraOn || !video) return;

		let stopped = false;
		let stopCamera = () => {};
		cameraError = '';

		openCamera(video)
			.then((stop) => {
				if (stopped) stop(); // page was left before the camera was ready
				else stopCamera = stop;
			})
			.catch((error) => {
				if (!stopped) cameraError = cameraErrorMessage(error);
			});

		return () => {
			stopped = true;
			stopCamera();
		};
	});

	// Shutter button: take a picture of the live camera image
	async function takePhoto() {
		if (!video?.videoWidth) return;
		showPhoto(await capturePhoto(video));
	}

	// Upload button: use a photo from the gallery
	function uploadPhoto(event) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = ''; // allows choosing the same file again
		if (file) showPhoto(file);
	}

	function showPhoto(blob) {
		if (photoUrl) URL.revokeObjectURL(photoUrl);
		photoUrl = URL.createObjectURL(blob);
		status = 'analyzing';
		quantity = food?.serving ?? 100;
		// Later (M2): send the photo to the food recognition model here
		setTimeout(() => {
			if (status === 'analyzing') status = 'result';
		}, 1200);
	}
</script>

<div class="scan-screen">
	<div class="scan-top">
		<h1>{m.scan_title()}</h1>
		<p>{m.scan_subtitle()}</p>
		<div class="scan-switch">
			<a href="/app/scan" class:active={data.mode === 'barcode'}><Icon name="barcode" />{m.common_barcode()}</a>
			<a href="/app/scan?mode=photo" class:active={data.mode === 'photo'}
				><Icon name="camera" />{m.scan_photo_tab()}</a
			>
		</div>
	</div>

	<div class="camera-view">
		<div class="camera-noise"></div>

		<!-- Live camera image (playsinline is needed on iPhone) -->
		<video
			bind:this={video}
			class="camera-feed"
			class:hidden={!cameraOn || cameraError}
			playsinline
			muted
			autoplay
		></video>

		{#if data.mode === 'barcode'}
			{#if data.notFound}
								<div class="scan-result overlay-card">
					<span>?</span>
					{#if data.offStatus === 'not-product'}
						<!-- e.g. a QR code with a website or text instead of a product barcode -->
						<h2>{m.scan_not_product()}</h2>
						<p>{m.scan_not_product_text()}</p>
						<a class="button primary" href="/app/scan">{m.scan_again()}</a>
					{:else if data.offStatus === 'error'}
						<h2>{m.scan_no_connection()}</h2>
						<p>{m.scan_no_connection_text()}</p>
						<a class="button primary" href="/app/scan?code={encodeURIComponent(data.notFound)}">{m.common_try_again_button()}</a>
						<a class="button ghost" href="/app/custom?barcode={encodeURIComponent(data.barcode)}"
							>{m.scan_add_manually()}</a
						>
					{:else}
						<h2>{m.scan_not_found()}</h2>
						{#if data.offStatus === 'incomplete'}
							<p>
								{m.scan_incomplete({ name: data.offProduct?.name || m.scan_barcode_name({ code: data.barcode }) })}
							</p>
						{:else}
							<p>{m.scan_unknown({ code: data.barcode })}</p>
						{/if}
						<a
							class="button primary"
							href="/app/custom?{new URLSearchParams({
								barcode: data.barcode,
								name: data.offProduct?.name ?? '',
								brand: data.offProduct?.brand ?? ''
							})}">{m.scan_add_manually()}</a
						>
						<a class="button ghost" href="/app/scan">{m.common_try_again_button()}</a>
					{/if}
				</div>
			{:else}
				<div class="scan-frame"><span></span><span></span><span></span><span></span><i></i></div>
				<p>{cameraError || m.scan_point_barcode()}</p>
			{/if}
		{:else if status === 'ready'}
			<div class="photo-guide" class:live={!cameraError}>{cameraError ? '🥗' : ''}</div>
			<p>{cameraError || m.scan_center_meal()}</p>
		{:else}
			<!-- The photo that was taken -->
			<img class="camera-feed" src={photoUrl} alt={m.scan_your_meal()} />
			{#if status === 'analyzing'}
				<div class="analyzing">
					<div class="spinner"></div>
					<h2>{m.scan_analyzing()}</h2>
					<p>{m.scan_recognizing()}</p>
				</div>
			{:else if food}
				<form
					class="scan-result overlay-card"
					method="POST"
					action="?/photo"
					use:enhance={() => {
						saving = true;
						return async ({ update }) => {
							await update();
							saving = false;
						};
					}}
				>
					<span>{food.icon}</span>
					<h2>{food.name}<span class="confidence">Demo</span></h2>
					<div class="ai-macros">
						<strong>{per(food.kcal)}<small> kcal</small></strong>
						<span>{m.common_p()} {per(food.protein)}g</span>
						<span>{m.common_c()} {per(food.carbs)}g</span>
						<span>{m.common_f()} {per(food.fat)}g</span>
					</div>
					<label class="field">
						<span>{m.common_quantity_g()}</span>
						<input name="quantity" type="number" min="1" step="any" required bind:value={quantity} />
					</label>
					<label class="field">
						<span>{m.common_add_to_meal()}</span>
						<select name="meal" value="lunch">
							{#each MEALS as meal}<option value={meal.id}>{meal.label}</option>{/each}
						</select>
					</label>
					{#if form?.error}<p class="form-error" role="alert">{form.error}</p>{/if}
					<button class="button primary" disabled={saving}>
						{saving ? m.scan_adding() : m.scan_add_to_diary()}
					</button>
					<p class="estimate">{m.scan_demo_note()}</p>
				</form>
			{/if}
		{/if}
	</div>

	{#if data.mode === 'barcode' && !data.notFound}
		<div class="camera-controls barcode">
						<button class="button primary scan-button" onclick={startScan} disabled={scanning}>
				<Icon name="barcode" />
				{scanning ? m.scan_scanning() : m.home_scan_barcode()}
			</button>
			{#if scanError}<p class="form-error" role="alert">{scanError}</p>{/if}
			<form class="barcode-form" method="GET" action="/app/scan">
				<input
					name="code"
					inputmode="numeric"
					placeholder={m.scan_barcode_number()}
					aria-label={m.scan_barcode_number()}
					required
				/>
				<button class="button primary">{m.scan_look_up()}</button>
			</form>
			<a class="button ghost" href="/app/scan?code={data.sampleBarcode}">{m.scan_sample()}</a>
		</div>
	{:else if data.mode === 'photo' && status === 'ready'}
		<div class="camera-controls">
			<label class="upload-button">
				<Icon name="camera" /><small>{m.scan_upload()}</small>
				<input type="file" accept="image/*" onchange={uploadPhoto} />
			</label>
			<button
				class="shutter"
				aria-label={m.home_take_photo()}
				onclick={takePhoto}
				disabled={!!cameraError}><span></span></button
			>
			<span class="upload-button"></span>
		</div>
	{:else if data.mode === 'photo' && status === 'result'}
		<div class="camera-controls">
			<button class="button primary" onclick={() => (status = 'ready')}>{m.scan_retake()}</button>
		</div>
	{/if}
</div>