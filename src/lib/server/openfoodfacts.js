// Looks up packaged products by barcode in Open Food Facts (https://world.openfoodfacts.org).
// Reading needs no account, only our own User-Agent. Data license: Open Database License (ODbL).
// Limit: 15 product requests per minute per IP, so every product found is saved in our database
// and fetched from Open Food Facts only once.
// Real data: world.openfoodfacts.org. Test server: world.openfoodfacts.net (needs the login off/off).
// For tests the server can be changed with the environment variable OFF_BASE_URL.
const BASE_URL = process.env.OFF_BASE_URL || 'https://world.openfoodfacts.org';

// Open Food Facts asks every app to send its name and a contact email (not a secret)
const CONTACT_EMAIL = 'ReiAli19@htl-shkoder.com'; // TODO: put your real contact email here
const USER_AGENT = `EatWise/1.0 (${CONTACT_EMAIL})`;
const TIMEOUT_MS = 4000;

const FIELDS =
	'code,product_name,product_name_en,product_name_de,generic_name,brands,serving_quantity,nutriments';

// Finds the product barcode in what the scanner read, or returns null when it is not a product code:
// - a plain barcode with 8-14 digits (EAN-8, EAN-13, UPC, GTIN-14)
// - a GS1 Digital Link QR code, e.g. https://id.gs1.org/01/04012345678901
// A 14-digit GTIN that starts with 0 is the same product as the 13-digit EAN without that 0.
export function productCode(raw) {
	const text = String(raw ?? '').trim();
	const digits = /^\d{8,14}$/.test(text) ? text : text.match(/\/01\/(\d{14})(?:\/|\?|$)/)?.[1];
	if (!digits) return null;
	return digits.length === 14 && digits.startsWith('0') ? digits.slice(1) : digits;
}
// Asks Open Food Facts for one barcode.
// Returns { food } when the product has all values, { incomplete: true } when it exists but values are missing,
// { notFound: true } when it is unknown, { error } when Open Food Facts could not be reached.
export async function lookupBarcode(code) {
	const headers = { 'User-Agent': USER_AGENT, Accept: 'application/json' };
	if (BASE_URL.includes('openfoodfacts.net')) headers.Authorization = 'Basic ' + btoa('off:off');

	let response;
	try {
		response = await fetch(
			`${BASE_URL}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`,
			{
				headers,
				signal: AbortSignal.timeout(TIMEOUT_MS)
			}
		);
	} catch (error) {
		console.error('[Open Food Facts]', error?.name, error?.message);
		return { error: error?.name === 'TimeoutError' ? 'timeout' : 'network' };
	}

	if (response.status === 404) return { notFound: true };
	if (!response.ok) {
		console.error('[Open Food Facts] HTTP', response.status);
		return { error: response.status === 429 ? 'limit' : 'server' };
	}

	const data = await response.json();
	if (data.status !== 1 || !data.product) return { notFound: true };

	const food = toFood(data.product, code);
	if (food) return { food };

	// Known product without nutrition values: name and brand help to add it by hand
	const p = data.product;
	return {
		incomplete: true,
		name: text(p.product_name || p.product_name_en || p.product_name_de || p.generic_name).slice(
			0,
			100
		),
		brand: text(p.brands?.split(',')[0]).slice(0, 100)
	};
}

// Turns an Open Food Facts product into the shape createFood() expects (values per 100 g)
function toFood(product, code) {
	const n = product.nutriments ?? {};
	const name = text(
		product.product_name ||
		product.product_name_en ||
		product.product_name_de ||
		product.generic_name
	);

	// Calories: kcal directly, or kJ converted (1 kcal = 4.184 kJ)
	const kcal =
		number(n['energy-kcal_100g']) ?? (number(n.energy_100g) != null ? n.energy_100g / 4.184 : null);
	const protein = number(n.proteins_100g);
	const carbs = number(n.carbohydrates_100g);
	const fat = number(n.fat_100g);

	// Without a name, calories and the three macros the product is not usable
	if (!name || kcal == null || protein == null || carbs == null || fat == null) return null;

	return {
		name: name.slice(0, 100),
		brand: text(product.brands?.split(',')[0]).slice(0, 100) || 'Open Food Facts',
		icon: '🛒',
		category: 'Scanned',
		barcode: code,
		serving: number(product.serving_quantity) > 0 ? round(product.serving_quantity) : 100,
		kcal: round(kcal),
		protein: round(protein),
		carbs: round(carbs),
		fat: round(fat),
		fiber: round(number(n.fiber_100g) ?? 0),
		sugar: round(number(n.sugars_100g) ?? 0)
	};
}

const text = (value) => String(value ?? '').trim();
const round = (value) => Math.round(Number(value) * 10) / 10;

// A number >= 0, or null when the value is missing
function number(value) {
	const result = Number(value);
	return value === '' || value == null || !Number.isFinite(result) || result < 0 ? null : result;
}
