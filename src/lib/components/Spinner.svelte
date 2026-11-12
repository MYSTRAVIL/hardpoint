<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	export type SpinnerProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
		/**
		 * What the app is waiting for, such as `Loading projects`. Shown beside
		 * the glyph and announced politely once the spinner appears.
		 */
		label: string;
		/** The root element. */
		ref?: HTMLSpanElement | null;
	};
</script>

<script lang="ts">
	import { duration } from '../motion/transitions.js';

	// The reel's line spinner (da3-10): bar, slash, dash, backslash.
	const glyphs = ['|', '/', '-', '\\'];

	let { label, class: className, ref = $bindable(null), ...rest }: SpinnerProps = $props();

	let shown = $state(false);
	let step = $state(0);

	// A timer, not CSS keyframes (keyframes are for expressive entrances
	// only). It reads both durations from the element, so an app can retune
	// them, also per spinner (a class on the Spinner whose rule sets
	// `--spinner-delay: 0ms`). It keeps stepping under reduced motion:
	// spinners and progress stay.
	function run(node: HTMLElement) {
		const delay = duration(node, '--spinner-delay');
		const every = duration(node, '--spinner-step');
		let interval: ReturnType<typeof setInterval> | undefined;
		const timeout = setTimeout(() => {
			shown = true;
			if (every > 0) interval = setInterval(() => (step = (step + 1) % glyphs.length), every);
		}, delay);
		return () => {
			clearTimeout(timeout);
			clearInterval(interval);
		};
	}
</script>

<!--
	A stepped spinner (BRIEF, visual rule 7): `|`, `/`, `-`, `\` in Geist
	Pixel Square at 26.32px, one state per `--spinner-step` (167ms). Nothing
	shows until `--spinner-delay` (300ms) has passed, so fast work never
	flashes it; the row keeps its height meanwhile. The glyph is aria-hidden
	and sits outside the live region; the label is a `role="status"` region
	that is empty until the spinner appears, so screen readers announce it
	once. Extra attributes and `class` go to the root `span.hp-spinner`, which
	carries `data-state` waiting | visible. Place it start-aligned: centring
	it in a wider box can put the glyph between pixels.
-->
<span
	{...rest}
	bind:this={ref}
	class={['hp-spinner', className]}
	data-state={shown ? 'visible' : 'waiting'}
	{@attach run}
>
	<span class="hp-spinner-glyph" aria-hidden="true" data-step={shown ? step : undefined}
		>{shown ? glyphs[step] : ''}</span
	>
	<span class="hp-spinner-label" role="status">{shown ? label : ''}</span>
</span>

<style>
	/* One row the height of the pixel line, so the spinner does not move
	   anything when it appears. The label line sits an even number of pixels
	   from the top, so the glyph's top edge stays on a whole pixel. */
	.hp-spinner {
		display: inline-flex;
		align-items: center;
		gap: var(--space-3);
		min-height: var(--type-pixel-leading);
		vertical-align: top;
	}

	/* Geist Pixel is proportional: at 26.32px (a 1px module) the four glyphs
	   advance 6, 11, 10 and 11px. A fixed 12px box keeps the label still
	   while the glyph changes. Each glyph starts at the box's edge plus a
	   whole-pixel inset that centres it as nearly as whole pixels allow,
	   because centring in odd free space would put its edges on half pixels
	   (BRIEF, Crisp pixel text). The insets are font metrics. */
	.hp-spinner-glyph {
		flex: none;
		width: 12px;
		font-family: var(--pixel);
		font-size: var(--type-pixel);
		font-weight: 400;
		line-height: var(--type-pixel-leading);
		letter-spacing: 0;
		text-align: start;
		color: var(--text);
	}
	.hp-spinner-glyph[data-step='0'] {
		padding-inline-start: 3px;
	}
	.hp-spinner-glyph[data-step='2'] {
		padding-inline-start: 1px;
	}

	/* 16px on touch, the dense 14px on fine pointers. */
	.hp-spinner-label {
		color: var(--muted);
		font-size: var(--type-body);
		line-height: 24px;
	}
	@media (pointer: fine) {
		.hp-spinner-label {
			font-size: var(--type-dense);
			line-height: 20px;
		}
	}
</style>
