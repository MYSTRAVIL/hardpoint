<!--
	Sets the motion tier for everything inside it. Renders no element.
	<Motion tier="expressive"> marks an infrequent moment: the first load of a
	view in a session, a success, an empty state filling (BRIEF, Motion).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setMotionTier, type MotionTier } from './context.js';

	let { tier = 'quiet', children }: { tier?: MotionTier; children: Snippet } = $props();

	setMotionTier(() => tier);
</script>

{@render children()}
