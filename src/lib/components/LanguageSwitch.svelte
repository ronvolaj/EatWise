<script>
	import { m } from '../paraglide/messages.js';
	import { getLocale, setLocale } from '../paraglide/runtime.js';

	// setLocale saves the language in a cookie and reloads the page in the new language
	const languages = [
		{ code: 'en', label: 'EN' },
		{ code: 'de', label: 'DE' },
		{ code: 'sq', label: 'SQ' }
	];
	const current = getLocale();
</script>

<div class="lang-switch" role="group" aria-label={m.lang_switch_label()}>
	{#each languages as language}
		<button type="button" class:active={current === language.code} aria-pressed={current === language.code} onclick={() => setLocale(language.code)}>
			{language.label}
		</button>
	{/each}
</div>