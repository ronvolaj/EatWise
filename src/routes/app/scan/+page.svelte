<script>
	import Icon from '../../../lib/components/Icon.svelte';
	import { cameraErrorMessage, capturePhoto, openCamera } from '../../../lib/camera.js';

	let { data } = $props();

	// Photo mode: ready (live camera) -> taken (photo is shown)
	let status = $state('ready');

	let video = $state(); // the <video> element with the live camera image
	let cameraError = $state('');
	let photoUrl = $state(''); // preview URL of the taken/uploaded photo

	// The camera is on while scanning a barcode or before a photo is taken
	const cameraOn = $derived(
		(data.mode === 'barcode' && !data.notFound) || (data.mode === 'photo' && status === 'ready')
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
		status = 'taken';
		// Later (M2): send the photo to the food recognition model here
	}
</script>

<div class="scan-screen">
	<div class="scan-top">
		<h1>Scan food</h1>
		<p>Point, capture, track</p>
		<div class="scan-switch">
			<a href="/app/scan" class:active={data.mode === 'barcode'}><Icon name="barcode" />Barcode</a>
			<a href="/app/scan?mode=photo" class:active={data.mode === 'photo'}
				><Icon name="camera" />Food Photo</a
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
					<h2>Product not found</h2>
					<p>Barcode {data.notFound} isn't in our database yet.</p>
					<a class="button primary" href="/app/custom?barcode={encodeURIComponent(data.notFound)}"
						>Add product manually</a
					>
					<a class="button ghost" href="/app/scan">Try again</a>
				</div>
			{:else}
				<div class="scan-frame"><span></span><span></span><span></span><span></span><i></i></div>
				<p>{cameraError || 'Point the camera at a barcode'}</p>
			{/if}
		{:else if status === 'ready'}
			<div class="photo-guide" class:live={!cameraError}>{cameraError ? '🥗' : ''}</div>
			<p>{cameraError || 'Center your meal in the frame'}</p>
		{:else}
			<!-- The photo that was taken -->
			<img class="camera-feed" src={photoUrl} alt="Your meal" />
		{/if}
	</div>

	{#if data.mode === 'barcode' && !data.notFound}
		<div class="camera-controls barcode">
			<form class="barcode-form" method="GET" action="/app/scan">
				<input
					name="code"
					inputmode="numeric"
					placeholder="Barcode number"
					aria-label="Barcode number"
					required
				/>
				<button class="button primary">Look up</button>
			</form>
		</div>
	{:else if data.mode === 'photo' && status === 'ready'}
		<div class="camera-controls">
			<label class="upload-button">
				<Icon name="camera" /><small>Upload</small>
				<input type="file" accept="image/*" onchange={uploadPhoto} />
			</label>
			<button
				class="shutter"
				aria-label="Take photo"
				onclick={takePhoto}
				disabled={!!cameraError}><span></span></button
			>
			<span class="upload-button"></span>
		</div>
	{:else if data.mode === 'photo'}
		<div class="camera-controls">
			<button class="button primary" onclick={() => (status = 'ready')}>Retake</button>
		</div>
	{/if}
</div>