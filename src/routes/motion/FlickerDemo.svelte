<!--
	A /motion demo: a small mock (a tag, a display line and a button) that
	switches on when it mounts, either with a single off frame (`flicker`,
	the lab flicker-on of flicker.ts, expressive tier only) or with a plain
	opacity fade over `--dur-reveal` (`fade`, for comparison). The page
	remounts it on Replay. Neither runs on the render the server sent.
-->
<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Tag from '#lib/components/Tag.svelte';
	import { useFadeIn, useFlicker } from './flicker';

	let { mode }: { mode: 'flicker' | 'fade' } = $props();

	const flicker = useFlicker();
	const fadeIn = useFadeIn();
</script>

<div class="mock" data-mode={mode} {@attach mode === 'flicker' ? flicker : fadeIn}>
	<div>
		<Tag>Project ID</Tag>
		<p class="hp-display hp-mono">PRJ-0417</p>
	</div>
	<Button variant="primary" opens>Open project</Button>
</div>

<style>
	.mock {
		display: grid;
		justify-items: start;
		gap: var(--space-6);
	}
	/* The tag names the identifier under it, as on the record page. */
	.mock :global(.hp-tag) {
		margin-bottom: var(--space-3);
	}
</style>
