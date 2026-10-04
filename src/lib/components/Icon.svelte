<script>
	// Simple line icons. Usage: <Icon name="home" />
	const paths = {
		home: '<path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10M9 20v-6h6v6" />',
		search: '<circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />',
		scan: '<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4" /><path d="M8 12h8" />',
		diary: '<rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 4V2M15 4V2M8 9h8M8 13h5M8 17h4" />',
		user: '<circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />',
		back: '<path d="m15 18-6-6 6-6" />',
		next: '<path d="m9 18 6-6-6-6" />',
		plus: '<path d="M12 5v14M5 12h14" />',
		minus: '<path d="M5 12h14" />',
		close: '<path d="m6 6 12 12M18 6 6 18" />',
		check: '<path d="m5 12 4 4L19 6" />',
		droplet: '<path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z" />',
		trend: '<path d="m3 17 6-6 4 4 8-9" /><path d="M15 6h6v6" />',
		camera: '<rect x="3" y="6" width="18" height="14" rx="3" /><circle cx="12" cy="13" r="4" /><path d="m8 6 1.5-2h5L16 6" />',
		barcode: '<path d="M4 5v14M7 5v14M11 5v14M14 5v14M16 5v14M20 5v14" />',
		edit: '<path d="m4 20 4-1 11-11-3-3L5 16l-1 4Z" /><path d="m14 7 3 3" />',
		trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14" />',
		settings: '<circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.4 3a8 8 0 0 0-1.7 1L5 6.1 3 9.5 5.1 11a7 7 0 0 0 0 2L3 14.5 5 18l2.4-1a8 8 0 0 0 1.7 1l.4 3h5l.4-3a8 8 0 0 0 1.7-1l2.4 1 2-3.5-2.1-1.5a7 7 0 0 0 .1-1Z" />',
		moon: '<path d="M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z" />',
		bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />',
		logout: '<path d="M10 17l5-5-5-5M15 12H3M14 4h6v16h-6" />',
		more: '<circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" />',
		eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" />',
		shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />'
	};

	let { name, size = 22 } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.8"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{@html paths[name] ?? paths.more}
</svg>
