<!--
	Sets the motion tier for everything inside it, and may pause ongoing
	motion. Renders no element.
	<Motion tier="expressive"> marks an infrequent moment: the first load of a
	view in a session, a success, an empty state filling (BRIEF, Motion).
	<Motion paused> stops motion that runs on its own, such as a live Status's
	pulse (WCAG 2.2.2). An app wires `paused` to a visible control. Left out,
	`paused` follows the nearest <Motion> around this one, so a tier change
	never undoes a pause.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setMotionPaused, setMotionTier, useMotion, type MotionTier } from './context.js';

	let {
		tier = 'quiet',
		paused,
		children
	}: { tier?: MotionTier; paused?: boolean; children: Snippet } = $props();

	// Read before this component sets its own: the outer value.
	const outer = useMotion();

	setMotionTier(() => tier);
	setMotionPaused(() => paused ?? outer.paused);
</script>

{@render children()}
