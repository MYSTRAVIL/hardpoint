<script lang="ts" module>
	import type { HTMLImgAttributes } from 'svelte/elements';

	export type MediaImageProps = Omit<HTMLImgAttributes, 'src' | 'alt' | 'children'> & {
		/**
		 * The image's URL. Leave it undefined while the app does not know it
		 * yet: the frame waits, as it does while the image loads. A different
		 * URL starts a new load; the same one changes nothing.
		 */
		src?: string;
		/** The text alternative, required. `""` for a decorative image. */
		alt: string;
		/** The `<img>` element, while there is a `src`. Bindable, read-only. */
		ref?: HTMLImageElement | null;
	};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { useMotion } from '../motion/context.js';
	import { duration } from '../motion/transitions.js';
	import Skeleton from './Skeleton.svelte';
	import { resolveImage } from './internal/resolve.js';

	let { src, alt, ref = $bindable(null), class: className, ...rest }: MediaImageProps = $props();

	const motion = useMotion();

	// waiting: no src yet, or the image has not loaded; the block shows
	//   after --skeleton-delay. fade and resolve: the image reveals over the
	//   block. shown: the image alone. error: the image failed to load.
	type Phase = 'waiting' | 'fade' | 'resolve' | 'shown' | 'error';
	let phase = $state<Phase>('waiting');

	let root = $state<HTMLDivElement>();
	/** The src the phase belongs to. */
	let current = untrack(() => src);
	/** The image a resolve draws, and its step in ms, read when it arrived. */
	let arrived: HTMLImageElement | undefined;
	let step = 0;

	// Before the DOM update, so the image of a new src starts hidden. A block
	// already on screen stays: the wait goes on with the new src.
	$effect.pre(() => {
		const next = src;
		untrack(() => {
			if (next === current) return;
			current = next;
			phase = 'waiting';
		});
	});

	// One <img> per src (see the {#key} below), so this runs once per load.
	// The app's own onload and onerror sit on the element through `rest` and
	// fire as usual.
	function watch(img: HTMLImageElement) {
		return untrack(() => {
			let alive = true;
			let pending = false;
			let cancel: (() => void) | undefined;

			const fail = () => {
				if (alive && phase === 'waiting') phase = 'error';
			};

			// The image is decoded, so its first frame on screen is never blank.
			const arrive = () => {
				if (!alive || phase !== 'waiting') return;
				const node = root;
				// Before the block showed, or with no box to reveal in: at once.
				const block = node?.querySelector(':scope > .hp-skeleton');
				if (!node || block?.getAttribute('data-state') !== 'visible' || !node.clientWidth || !node.clientHeight) {
					phase = 'shown';
					return;
				}
				// Read now, so a token retuned during the load applies.
				if (motion.expressive && img.naturalWidth > 0) {
					step = duration(node, '--resolve-step');
					if (step > 0) {
						arrived = img;
						phase = 'resolve';
						return;
					}
				}
				const ms = duration(node, '--dur-reveal');
				if (ms <= 0) {
					phase = 'shown';
					return;
				}
				const settle = getComputedStyle(node).getPropertyValue('--settle').trim();
				// Started before the DOM update, so the image's first frame is
				// already at 0 over the block.
				const fade = img.animate(
					{ opacity: [0, 1] },
					{ duration: ms, easing: CSS.supports('transition-timing-function', settle) ? settle : 'ease-out' }
				);
				fade.onfinish = () => {
					if (alive) phase = 'shown';
				};
				cancel = () => fade.cancel();
				phase = 'fade';
			};

			const onload = () => {
				// Only the first load counts: a later one is a new srcset
				// candidate, or an event Svelte replays after hydration.
				if (pending || phase !== 'waiting') return;
				pending = true;
				img.decode().then(arrive, () => {
					if (img.naturalWidth > 0) arrive();
					else fail();
				});
			};

			if (img.complete) {
				// Cached, or loaded before hydration: at once. A complete image
				// without a size is broken, unless it is an SVG without one.
				if (img.naturalWidth > 0) phase = 'shown';
				else
					img.decode().then(() => {
						if (alive && phase === 'waiting') phase = 'shown';
					}, fail);
			}
			img.addEventListener('load', onload);
			img.addEventListener('error', fail);
			return () => {
				alive = false;
				cancel?.();
				img.removeEventListener('load', onload);
				img.removeEventListener('error', fail);
			};
		});
	}

	// The canvas mounts with the resolve, after the DOM update and before it
	// is painted; it unmounts when the resolve ends or a new src starts.
	function mosaic(canvas: HTMLCanvasElement) {
		return untrack(() => {
			const img = arrived;
			if (!img) {
				phase = 'shown';
				return;
			}
			return resolveImage(canvas, img, step, () => {
				if (phase === 'resolve') phase = 'shown';
			});
		});
	}
</script>

<!--
	An image that fills a MediaFrame and takes over from a skeleton block
	when it loads (BRIEF, motion rules 2 and 10):

	  <MediaFrame ratio="3 / 2"><MediaImage src={url} alt="…" /></MediaFrame>

	It lies over the frame's whole inner box (absolute, inset 0) and covers
	it (`object-fit: cover`, the only fit for now: a frame crops, it never
	letterboxes). So the frame needs a size of its own: a `ratio`, or
	`--media-frame-ratio`. A frame without one takes its content's height,
	and this has none, so the frame shrinks to its two border lines.

	While there is no `src` or the image has not loaded, a block Skeleton
	fills the frame; it appears after `--skeleton-delay`, as everywhere else.
	An image already complete when it mounts (cached, or loaded before
	hydration), or one that arrives before the block showed, appears at
	once. Otherwise it reveals once `img.decode()` is done, so its first
	frame is never blank: in the expressive tier (`useMotion().expressive`)
	it resolves from a mosaic that sharpens in five steps of `--resolve-step`
	(internal/resolve.ts); everywhere else, and so with reduced motion, it
	fades in over the block for `--dur-reveal` on `--settle`, as LoadRegion's
	crossfade does. The fade changes only opacity, so it runs under reduced
	motion. `--resolve-step`, `--dur-reveal` and `--settle` are read from
	the element when the image arrives. An image from another origin
	without CORS headers resolves too: the mosaic is drawn, never read. An
	image rendered on the server stays hidden until hydration.

	On a load error the block goes and no broken-image glyph shows: the
	frame shows the `alt` as a muted caption in its middle, so a sighted
	user still learns what the image held, or nothing for `alt=""`. The
	app's `onerror` fires; a different `src` tries again.

	The <img> with its `alt` is in the DOM and the accessibility tree from
	the moment it has a `src`; while it waits it is hidden by opacity only.
	The block, the canvas and the caption are `aria-hidden`, and pointer
	events pass through them. No live region: the page says what loads. It
	never takes focus. `class` and other attributes go to the <img>
	(`srcset`, `sizes`, `loading`, `width`, `height`, handlers). The root
	`div.hp-media-image` carries `data-state` waiting | fade | resolve |
	shown | error.
-->
<div class="hp-media-image" data-state={phase} bind:this={root}>
	{#if phase === 'waiting' || phase === 'fade' || phase === 'resolve'}
		<Skeleton variant="block" height="100%" />
	{/if}
	{#if src}
		{#key src}
			<img {...rest} {src} {alt} class={className} bind:this={ref} {@attach watch} />
		{/key}
	{/if}
	{#if phase === 'resolve'}
		<canvas aria-hidden="true" {@attach mosaic}></canvas>
	{/if}
	{#if phase === 'error' && alt}
		<span class="caption hp-caption" aria-hidden="true">{alt}</span>
	{/if}
</div>

<style>
	/* Over the frame's inner box; the frame's marks paint over it. */
	.hp-media-image {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}
	.hp-media-image > :global(.hp-skeleton),
	canvas {
		pointer-events: none;
	}
	img,
	canvas {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
	}
	img {
		object-fit: cover;
	}
	/* Hidden by opacity only, so the image stays in the accessibility tree.
	   A broken image would draw the browser's glyph and its alt. */
	[data-state='waiting'] > img,
	[data-state='resolve'] > img,
	[data-state='error'] > img {
		opacity: 0;
	}
	/* Nearest neighbour if the box does not fill whole device pixels: the
	   blocks stay square and crisp, never blurred. */
	canvas {
		image-rendering: pixelated;
	}

	/* The alt of an image that failed, centred, clear of the frame's marks. */
	.caption {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		padding: var(--space-8);
		overflow: hidden;
		color: var(--muted);
		text-align: center;
		pointer-events: none;
	}
</style>
