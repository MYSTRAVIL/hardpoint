<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	export type LoadRegionProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'placeholder'> & {
		/** True while the content loads: the region shows `placeholder` and is `aria-busy`. */
		loading: boolean;
		/**
		 * The text of the status line, such as `Loading tasks`, then `5 tasks`.
		 * The line is visually hidden, stays mounted outside the region and is
		 * a `role="status"` region, so each change is announced. Leave it empty
		 * while an error state announces itself.
		 */
		status: string;
		/**
		 * The skeleton layout shown while loading, rendered inside an
		 * `aria-hidden`, `inert` wrapper. Give it the content's own layout
		 * container: during a reveal it lies under the content in a box of its
		 * own, so a grid or gap set on the region would not reach it.
		 */
		placeholder: Snippet;
		/** The content, and also any empty or error state. */
		children: Snippet;
		/** The region element. A page moves focus here when the content replaces the focused control. */
		ref?: HTMLDivElement | null;
	};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { duration } from '../motion/transitions.js';

	let {
		loading,
		status,
		placeholder,
		children,
		ref = $bindable(null),
		class: className,
		...rest
	}: LoadRegionProps = $props();

	// ---- Reveal (BRIEF, motion rule 2) -------------------------------------

	// When a load ends after its skeletons became visible and --dur-reveal is
	// more than 0ms, the content crossfades in over the skeletons for
	// --dur-reveal on --settle. The placeholder stays mounted under the
	// content, unchanged. The content lies on top on an opaque backdrop (the
	// colour behind the region) and fades in from 0, so every pixel moves in
	// a straight line from the placeholder's to the content's: a bar turns
	// into its text, and a part drawn the same in both layers (a tag, a
	// label, a table's band) does not change at all. Then the placeholder
	// goes. At 0ms, for a load that ends within --skeleton-delay, on the
	// first render and for any change that is not a load ending, the content
	// replaces the placeholder in one frame. Opacity only: the skeletons
	// mirror the layout, so nothing moves. Quiet motion, so it runs in both
	// tiers; it is only a fade, so reduced motion keeps it.

	type Phase = 'loading' | 'reveal' | 'content';
	let phase = $state<Phase>(untrack(() => (loading ? 'loading' : 'content')));
	// Counts loads. A new load remounts the placeholder, so its skeletons
	// wait out --skeleton-delay again, also when it cuts a reveal short.
	let load = $state(0);

	/** When the running load began, or null between loads. */
	let began: number | null = untrack(() => (loading ? performance.now() : null));
	/** --skeleton-delay when the load began, as the skeletons read it; null until read. */
	let delay: number | null = null;
	/** The running reveal's timing, read from the region when the load ended. */
	let timing: KeyframeAnimationOptions = {};

	// Before the DOM update, so a reveal keeps the placeholder mounted (its
	// skeletons stay visible) while the content mounts on top. Only `loading`
	// is tracked.
	$effect.pre(() => {
		const busy = loading;
		untrack(() => {
			const node = ref;
			if (busy) {
				if (phase !== 'loading') {
					began = performance.now();
					delay = node ? duration(node, '--skeleton-delay') : null;
					load += 1;
					phase = 'loading';
				}
				return;
			}
			if (phase !== 'loading') return;
			const elapsed = began === null ? -1 : performance.now() - began;
			began = null;
			// Read now, so a token retuned during the load applies.
			const ms = node ? duration(node, '--dur-reveal') : 0;
			const wait = delay ?? (node ? duration(node, '--skeleton-delay') : 0);
			if (!node || ms <= 0 || elapsed < wait) {
				phase = 'content';
				return;
			}
			const settle = getComputedStyle(node).getPropertyValue('--settle').trim();
			timing = {
				duration: ms,
				easing: CSS.supports('transition-timing-function', settle) ? settle : 'ease-out'
			};
			phase = 'reveal';
		});
	});

	/** The solid colour behind `node`: the first background colour up the tree that is not transparent. */
	function backdrop(node: Element): string {
		for (let el: Element | null = node; el; el = el.parentElement) {
			const colour = getComputedStyle(el).backgroundColor;
			// Transparent is `rgba(…, 0)`, or `… / 0)` in the newer colour syntaxes.
			if (colour !== 'transparent' && !/^rgba\(.*,\s*0\)$|\/\s*0\)$/.test(colour)) return colour;
		}
		// Nothing paints: the browser's canvas shows through.
		return 'Canvas';
	}

	// After the DOM update, in the same flush, so the content's first frame
	// is already at opacity 0. The cleanup cancels the fade when a new load
	// starts or the region goes away.
	$effect(() => {
		if (phase !== 'reveal') return;
		return untrack(() => {
			const node = ref;
			const content = node?.querySelector<HTMLElement>(':scope > .hp-load-region-content');
			if (!node || !content) {
				phase = 'content';
				return;
			}
			content.style.backgroundColor = backdrop(node);
			const fade = content.animate([{ opacity: 0 }, { opacity: 1 }], timing);
			fade.onfinish = () => (phase = 'content');
			return () => {
				fade.cancel();
				content.style.removeProperty('background-color');
			};
		});
	});
</script>

<!--
	A region that loads (BRIEF, motion rule 2): skeleton blocks while the
	content loads, then the content. It owns the loading pattern of the
	states docs: a visually hidden `role="status"` line before the region
	that stays mounted, `aria-busy` on the region while `loading`, and the
	`placeholder` in an `aria-hidden`, `inert` wrapper. When a load that
	showed skeletons ends and `--dur-reveal` is more than 0ms, the content
	crossfades in over the skeletons; see the script. Both layers are
	`display: contents` at rest, so they add no box. During a reveal the
	region is `position: relative`, the placeholder lies under the content
	(`position: absolute; inset: 0`) and the content is a block on the
	colour behind the region, so keep the region's own layout inside the
	snippets and give their roots no outer margin. Focus is the page's job:
	when the content replaces the focused control, the page moves focus to
	`ref` or to the control needed next. Extra attributes and `class` go to
	the region, `div.hp-load-region` (`tabindex="-1"`), which carries
	`data-revealing` during a reveal.
-->
<p class="hp-visually-hidden" role="status">{status}</p>
<div
	{...rest}
	bind:this={ref}
	class={['hp-load-region', className]}
	tabindex="-1"
	aria-busy={loading}
	data-revealing={phase === 'reveal' ? '' : undefined}
>
	{#key load}
		{#if phase !== 'content'}
			<div class="hp-load-region-placeholder" aria-hidden="true" inert>
				{@render placeholder()}
			</div>
		{/if}
	{/key}
	{#if !loading}
		<div class="hp-load-region-content">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	/* Focus lands here only from the page's own code, when the content
	   replaces the focused control, as <main> takes it from the skip link:
	   no contour, since the region is not a control. */
	.hp-load-region:focus {
		outline: none;
	}
	/* At rest neither layer adds a box. */
	.hp-load-region-placeholder,
	.hp-load-region-content {
		display: contents;
	}

	/* ---- Reveal: the content over the placeholder ------------------------ */

	.hp-load-region[data-revealing] {
		position: relative;
	}
	/* Under the content, over the content's area. Its own stacking context
	   keeps a sticky table band (z-index) under the content too. Taller
	   placeholder rows are cut at the region's bottom edge; a band's bleed
	   into the gutter stays. */
	.hp-load-region[data-revealing] > .hp-load-region-placeholder {
		display: block;
		position: absolute;
		inset: 0;
		isolation: isolate;
		overflow-x: visible;
		overflow-y: clip;
	}
	/* A box for the fade, painted after the placeholder. The script gives it
	   the colour behind the region, so it covers the placeholder as it fades
	   in. */
	.hp-load-region[data-revealing] > .hp-load-region-content {
		display: block;
		position: relative;
	}
</style>
