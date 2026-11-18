<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	/** A status hue for a line that means that status: `ok`, `warn` or `danger`. */
	export type SparklineTone = 'ok' | 'warn' | 'danger';

	/**
	 * The line's colour: one of the two inks (`text`, `muted`) or a data
	 * category (`category-1` to `category-5`).
	 */
	export type SparklineColor =
		| 'text'
		| 'muted'
		| 'category-1'
		| 'category-2'
		| 'category-3'
		| 'category-4'
		| 'category-5';

	export type SparklineProps = Omit<
		HTMLAttributes<HTMLSpanElement>,
		'children' | 'role' | 'aria-label' | 'aria-labelledby'
	> & {
		/**
		 * The readings, oldest first, evenly spaced. `null` (or `NaN`) is a
		 * reading that is missing: it keeps its place and the line joins its
		 * neighbours across it.
		 */
		values: (number | null)[];
		/**
		 * What the line shows, as written: `Active users`. With the last
		 * value it makes the accessible name, `Active users: 1240`. It is not
		 * shown; the app's own text says it on screen.
		 */
		label: string;
		/**
		 * The last value in words, such as `1,240, up 12% this week`, for the
		 * accessible name. Default: the last reading through `format`.
		 */
		valueText?: string;
		/** Formats the last reading for the accessible name. Default: `String(n)`. */
		format?: (value: number) => string;
		/**
		 * The bottom of the scale at most, such as 0 for a line that should
		 * start from zero. Readings below it extend the scale.
		 */
		min?: number;
		/**
		 * The top of the scale at least, so several lines can share one
		 * scale. Readings above it extend the scale.
		 */
		max?: number;
		/**
		 * The line's colour. Default `text`. A category colour needs a label
		 * or a legend beside the line that names the category.
		 */
		color?: SparklineColor;
		/** A status hue instead of `color`, only where the line means that status. */
		tone?: SparklineTone;
	};
</script>

<script lang="ts">
	let {
		values,
		label,
		valueText,
		format = (value: number) => String(value),
		min,
		max,
		color = 'text',
		tone,
		class: className,
		...rest
	}: SparklineProps = $props();

	const finite = (v: number | null | undefined): v is number =>
		typeof v === 'number' && Number.isFinite(v);

	// The readings that are there, with their places.
	const points = $derived(
		values.flatMap((v, i) => (finite(v) ? [{ i, v }] : []))
	);
	const last = $derived(points.at(-1));

	const range = $derived.by(() => {
		const vs = points.map((p) => p.v);
		const lo = Math.min(...vs, finite(min) ? min : Infinity);
		const hi = Math.max(...vs, finite(max) ? max : -Infinity);
		return { lo, hi };
	});

	// Coordinates in a 100 by 100 box that stretches to the element; the
	// stroke does not scale, so the line keeps its width at any size.
	const xOf = (i: number) => (values.length > 1 ? (i / (values.length - 1)) * 100 : 100);
	const yOf = (v: number) =>
		range.hi > range.lo ? ((range.hi - v) / (range.hi - range.lo)) * 100 : 50;
	const line = $derived(points.map((p) => `${xOf(p.i)},${yOf(p.v)}`).join(' '));
	const area = $derived(
		points.length > 1
			? `M${xOf(points[0].i)},100 L${line.replaceAll(' ', ' L')} L${xOf(points.at(-1)!.i)},100 Z`
			: ''
	);

	const name = $derived(
		last || valueText ? `${label}: ${valueText ?? format(last!.v)}` : label
	);
</script>

<!--
	A small line of readings with an area under it and a square at the last
	reading (BRIEF, geometry: square, never round). It has no axes and sits
	inline in text, a Stat or a table cell. The root is an image named by
	`label` and the last value; the drawing inside is aria-hidden. The line
	and the area are SVG in a box that stretches, with a stroke that does not
	scale; the end square is a box of its own, so it stays square and on
	whole pixels at any size. The app sets the size with --sparkline-width
	and --sparkline-height. Extra attributes and `class` go to the root.
-->
<span
	{...rest}
	class={['hp-sparkline', className]}
	role="img"
	aria-label={name}
	data-color={tone ? undefined : color}
	data-tone={tone}
>
	<span class="hp-sparkline-plot" aria-hidden="true">
		{#if points.length > 1}
			<svg focusable="false" viewBox="0 0 100 100" preserveAspectRatio="none">
				<path class="hp-sparkline-area" d={area} />
				<polyline class="hp-sparkline-line" points={line} />
			</svg>
		{/if}
		{#if last}
			<span class="hp-sparkline-end" style:left="{xOf(last.i)}%" style:top="{yOf(last.v)}%"></span>
		{/if}
	</span>
</span>

<style>
	/* Inline, on the text's middle. 96 by 24px unless the app's class sets
	   --sparkline-width and --sparkline-height. The padding keeps the end
	   square and the line's width inside the box. */
	.hp-sparkline {
		display: inline-block;
		box-sizing: border-box;
		width: var(--sparkline-width, 96px);
		height: var(--sparkline-height, 24px);
		padding: var(--space-1) var(--space-1) var(--space-1) 0;
		vertical-align: middle;
		color: var(--text);
	}
	.hp-sparkline-plot {
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
	}
	.hp-sparkline-plot svg {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	/* A 2px line with square joins, and a quiet fill of the same colour
	   under it. */
	.hp-sparkline-line {
		fill: none;
		stroke: currentColor;
		stroke-width: 2px;
		stroke-linejoin: miter;
		stroke-miterlimit: 2;
		vector-effect: non-scaling-stroke;
	}
	.hp-sparkline-area {
		fill: currentColor;
		fill-opacity: 0.16;
		stroke: none;
	}

	/* The last reading: a 6px square centred on it, with a 1px canvas edge
	   so it reads over the line and the area. */
	.hp-sparkline-end {
		position: absolute;
		width: 6px;
		height: 6px;
		margin: -3px 0 0 -3px;
		background: currentColor;
		box-shadow: 0 0 0 1px var(--canvas);
	}

	/* Colour comes through CSS, because SVG presentation attributes do not
	   read custom properties. */
	.hp-sparkline[data-color='muted'] {
		color: var(--muted);
	}
	.hp-sparkline[data-color='category-1'] {
		color: var(--category-1);
	}
	.hp-sparkline[data-color='category-2'] {
		color: var(--category-2);
	}
	.hp-sparkline[data-color='category-3'] {
		color: var(--category-3);
	}
	.hp-sparkline[data-color='category-4'] {
		color: var(--category-4);
	}
	.hp-sparkline[data-color='category-5'] {
		color: var(--category-5);
	}
	.hp-sparkline[data-tone='ok'] {
		color: var(--ok);
	}
	.hp-sparkline[data-tone='warn'] {
		color: var(--warn);
	}
	.hp-sparkline[data-tone='danger'] {
		color: var(--danger);
	}
</style>
