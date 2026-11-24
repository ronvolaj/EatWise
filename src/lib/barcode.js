// Barcode scanning with the official Capacitor plugin.
// In the iOS/Android app it opens the native scanner, in the browser it uses the web camera.
// The plugin is loaded only when needed, so the server never imports it.
import { m } from './paraglide/messages.js';

// Opens the scanner and returns { code, format }, or null when the user cancels.
export async function scanBarcode() {
	const { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint, CapacitorBarcodeScannerCameraDirection } =
		await import('@capacitor/barcode-scanner');

	try {
		const result = await CapacitorBarcodeScanner.scanBarcode({
			hint: CapacitorBarcodeScannerTypeHint.ALL, // EAN-13, QR codes and all other formats
			cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
			scanInstructions: m.scan_instructions()
		});
		const code = result.ScanResult?.trim();
		return code ? { code, format: result.format } : null;
	} catch (error) {
		// Closing the scanner counts as "cancelled", not as an error
		if (/cancel/i.test(String(error?.message ?? error))) return null;
		throw error;
	}
}