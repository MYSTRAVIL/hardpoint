<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	/**
	 * `text` (default): bars that stand for lines of text, each one line box
	 * high in the surrounding type, so content replaces them without moving
	 * anything. `block`: one solid box, for a control, a figure or a mark.
	 */
	export type SkeletonVariant = 'text' | 'block';

	export type SkeletonProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
		variant?: SkeletonVariant;
		/**
		 * Any CSS width, such as `8ch` for an identifier in a mono cell or
		 * `60%`. Defaults to `100%`, and never exceeds its container's width.
		 * With several `lines`, the width of the full lines; the last line is
		 * shorter.
		 */
		width?: string;
		/** `block` only: any CSS height. Defaults to `--control-height`. */
		height?: string;
		/** `text` only: how many lines of text the bars stand for. Defaults to 1. */
		lines?: number;
	};

	// Blocks that mount together appear together: every skeleton that mounts
	// in the same task with the same delay shares one timer, so a page of
	// blocks shows in one frame instead of rippling in.
	let batch: Map<number, Set<() => void>> | null = null;

	function afterDelay(delay: number, show: () => void): () => void {
		if (!batch) {
			batch = new Map();
			queueMicrotask(() => (batch = null));
		}
		let members = batch.get(delay);
		if (!members) {
			const waiting = new Set<() => void>();
			batch.set(delay, waiting);
			setTimeout(() => waiting.forEach((fn) => fn()), delay);
			members = waiting;
		}
		members.add(show);
		const own = members;
		return () => own.delete(show);
	}
</script>

<script lang="ts">
	import { duration } from '../motion/transitions.js';

	let {
		variant = 'text',
		width,
		height,
		lines = 1,
		class: className,
		...rest
	}: SkeletonProps = $props();

	const count = $derived(variant === 'text' ? Math.max(1, Math.floor(lines)) : 0);

	let shown = $state(false);

	// Motion rule 2: blocks only while waiting. Nothing shows until
	// --skeleton-delay (300ms) has passed, so fast content never flashes
	// blocks; the box keeps its size meanwhile. The delay is read from the
	// element, so an app that already waited can set it to 0ms. It is not
	// motion, so reduced motion keeps it.
	function appear(node: HTMLElement) {
		const delay = duration(node, '--skeleton-delay');
		if (delay <= 0) {
			shown = true;
			return;
		}
		return afterDelay(delay, () => (shown = true));
	}
</script>

<!--
	A static placeholder that mirrors the content it stands for (BRIEF, motion
	rule 2): no shimmer and no transition of its own. Render it in a
	LoadRegion's `placeholder`, which swaps it for the content as
	`--dur-reveal` sets (0ms: a cut). It is aria-hidden: the region says what
	loads itself (aria-busy and a status line). A `text` skeleton takes the
	type of its context, so give it the content's type class
	(`hp-page-title`, `hp-label`) or put it where the content goes, such as a
	table cell. Extra attributes and `class` go to the root
	`span.hp-skeleton`, which carries `data-variant` and `data-state`
	waiting | visible.
-->
<span
	{...rest}
	class={['hp-skeleton', className]}
	aria-hidden="true"
	data-variant={variant}
	data-state={shown ? 'visible' : 'waiting'}
	style:width
	style:height={variant === 'block' ? height : undefined}
	{@attach appear}
>
	{#each { length: count }}
		<span class="hp-skeleton-line"></span>
	{/each}
</span>

<style>
	/* Never wider than its container. In a grid or flex item a fixed width
	   still counts toward the item's minimum width, as an image's does: let
	   the item shrink (minmax(0, 1fr), min-width: 0). */
	.hp-skeleton {
		width: 100%;
		max-width: 100%;
	}
	/* Hidden, not removed, while it waits: the box keeps its size. */
	.hp-skeleton[data-state='waiting'] {
		visibility: hidden;
	}

	/* ---- Text: one bar per line box ------------------------------------ */

	/* Top-aligned and as tall as its lines, so it never changes the height
	   of the line it sits in. */
	.hp-skeleton[data-variant='text'] {
		display: inline-block;
		vertical-align: top;
	}
	/* The bar is three quarters of the font size, rounded down to an even
	   number of pixels, centred in a line box of the context's line height.
	   Even bars in even line heights leave whole pixels above and below. */
	.hp-skeleton-line {
		display: block;
		height: 1lh;
		background: linear-gradient(var(--surface-band) 0 0) 0 50% / 100% round(down, 0.75em, 2px)
			no-repeat;
	}
	/* The last of several lines is shorter, as a paragraph's last line is. */
	.hp-skeleton-line:last-child:not(:first-child) {
		width: 60%;
	}

	/* ---- Block: one solid box ------------------------------------------- */

	.hp-skeleton[data-variant='block'] {
		display: block;
		height: var(--control-height);
		background: var(--surface-band);
	}
</style>
