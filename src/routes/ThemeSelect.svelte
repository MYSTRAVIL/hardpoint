<script lang="ts">
	import { onMount } from 'svelte';
	import { NativeSelect, type NativeSelectBreakpoint } from '#lib';
	import { readTheme, setTheme, themeOptions, type Theme } from './theme';

	let { labelBeside = false, hint }: { labelBeside?: boolean | NativeSelectBreakpoint; hint?: string } = $props();

	// The server and the first client render show Dark; the saved choice
	// lands on mount. The page itself is already themed by src/app.html.
	let theme = $state<Theme>('dark');
	onMount(() => {
		theme = readTheme();
	});
</script>

<!-- The Theme control: applies at once and is remembered (see ./theme.ts). -->
<NativeSelect
	label="Theme"
	{labelBeside}
	{hint}
	items={themeOptions}
	value={theme}
	onchange={(event) => {
		theme = event.currentTarget.value as Theme;
		setTheme(theme);
	}}
/>
