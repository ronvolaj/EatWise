// Camera helpers for the scan page.
// Uses the browser camera API (getUserMedia), so the same code works
// on the website (Vercel, HTTPS) and later inside the Capacitor app.
import { m } from './paraglide/messages.js';

const BACK_CAMERA = {
	audio: false,
	video: {
		facingMode: { ideal: 'environment' }, // back camera on phones
		width: { ideal: 1280 },
		height: { ideal: 720 }
	}
};

// Starts the camera and shows the live image in the <video> element.
// Returns a function that turns the camera off again.
export async function openCamera(video) {
	if (!navigator.mediaDevices?.getUserMedia) {
		throw new Error('unsupported');
	}

	const stream = await navigator.mediaDevices.getUserMedia(BACK_CAMERA);
	video.srcObject = stream;
	await video.play();

	return () => {
		stream.getTracks().forEach((track) => track.stop());
		video.srcObject = null;
	};
}

// Takes a picture of the current camera image and returns it as a JPEG file (Blob).
export function capturePhoto(video) {
	const canvas = document.createElement('canvas');
	canvas.width = video.videoWidth;
	canvas.height = video.videoHeight;
	canvas.getContext('2d').drawImage(video, 0, 0);

	return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
}

// Turns a camera error into a message for the user
export function cameraErrorMessage(error) {
	if (error?.name === 'NotAllowedError') return m.camera_blocked();
	if (error?.name === 'NotFoundError') return m.camera_not_found();
	if (error?.message === 'unsupported' || !window.isSecureContext) {
		return m.camera_https();
	}
	return m.camera_failed();
}
