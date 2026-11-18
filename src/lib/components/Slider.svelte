<script lang="ts" module>
	import { Slider as BitsSlider } from 'bits-ui';

	/**
	 * Where the label sits: above the track by default; `true` puts it
	 * beside the track at every width, a breakpoint from that width up
	 * (600px, 900px or 1200px).
	 */
	export type SliderLabelBeside = boolean | 'medium' | 'expanded' | 'large';

	/**
	 * Bits UI's single-value Slider root props, minus what this component
	 * sets itself. Attributes, `id` and handlers not listed here go to the
	 * track area (the Bits UI root, `.hp-slider-control`); `class` goes to the
	 * outer `.hp-slider`. `onValueChange` runs on every change while the
	 * thumb moves, `onValueCommit` once when a drag or a key press ends.
	 */
	export type SliderProps = Omit<
		Extract<BitsSlider.RootProps, { type: 'single' }>,
		'type' | 'value' | 'min' | 'max' | 'step' | 'orientation' | 'thumbPositioning' | 'dir' | 'autoSort' | 'trackPadding' | 'child' | 'children' | 'class' | 'ref'
	> & {
		/**
		 * The caps label above the track. A short fixed string the app
		 * defines. It names the slider for assistive technology, also with
		 * `labelHidden`.
		 */
		label: string;
		/** The chosen number. Bindable; it stays inside `min` and `max` and on a `step`. */
		value?: number;
		/** The lowest value. Default 0. */
		min?: number;
		/** The highest value. Default 100. */
		max?: number;
		/**
		 * How far one arrow key press or one step of a drag moves the value.
		 * Default 1. The value snaps to `min` plus a whole number of steps.
		 */
		step?: number;
		/**
		 * The value as shown beside the label, in tabular figures, for example
		 * `(n) => n.toFixed(1)` or `(n) => `${n}%``. Default: the number as it
		 * is. Without `valueText` it is also what assistive technology reads.
		 */
		format?: (value: number) => string;
		/**
		 * The value in words for assistive technology (`aria-valuetext`) when
		 * the shown text is not enough, such as `3 of 12 files`. Default: the
		 * `format`ted value.
		 */
		valueText?: (value: number) => string;
		/** Guidance under the track in `--muted`, linked by `aria-describedby`. */
		hint?: string;
		/**
		 * The label sits above the track, with the value at the end of its
		 * line, by default. `true` puts the label, the track and the value on
		 * one row at every width; a breakpoint does so from that width up. The
		 * hint stays under the track.
		 */
		labelBeside?: SliderLabelBeside;
		/**
		 * Hides the label from sight; it stays the slider's accessible name.
		 * For a slider whose purpose its place makes plain. The track and the
		 * value share one row. It overrides `labelBeside`.
		 */
		labelHidden?: boolean;
		/** The outer element's classes (width, margin). */
		class?: string;
		/** The track area, for example to measure it. Bindable. */
		ref?: HTMLElement | null;
	};
</script>

<script lang="ts">
	let {
		label,
		value = $bindable(),
		min = 0,
		max = 100,
		step = 1,
		format = String,
		valueText,
		hint,
		labelBeside = false,
		labelHidden = false,
		disabled = false,
		class: className,
		ref = $bindable(null),
		...rest
	}: SliderProps = $props();

	const uid = $props.id();
	const labelId = `${uid}-label`;
	const hintId = `${uid}-hint`;

	// The value as the control holds it: Bits UI starts an unset value at
	// `min` and snaps a stray one to a step.
	const shown = $derived(value ?? min);

	// On one row the value reserves the width of both ends, drawn hidden in
	// the same grid cell, so the track keeps its length while the value moves.
	const row = $derived(labelHidden || labelBeside !== false);
</script>

<!--
	Bits UI Slider (type single), rendered through `child` snippets so every
	element is this component's markup and its styles stay scoped. The thumb
	is the `role="slider"`; Bits UI sets its value attributes and handles the
	keys (arrows by one step, Home and End to the ends) and the pointer (a
	press anywhere on the track moves the thumb there and a drag follows).
	The label line names the thumb through `aria-labelledby`. The track is the
	root's `::before`, so a press on it is a press on the root.
-->
<div
	class={['hp-slider', className]}
	data-disabled={disabled ? '' : undefined}
	data-label-beside={labelHidden ? undefined : labelBeside === true ? 'always' : labelBeside || undefined}
	data-label-hidden={labelHidden ? '' : undefined}
>
	<div class="hp-slider-line">
		<span id={labelId} class={['hp-slider-label', 'hp-label', labelHidden && 'hp-visually-hidden']}>{label}</span>
		<span class="hp-slider-value" data-min={row ? format(min) : undefined} data-max={row ? format(max) : undefined}
			><span>{format(shown)}</span></span
		>
	</div>
	<BitsSlider.Root
		type="single"
		bind:value
		bind:ref
		{min}
		{max}
		{step}
		{disabled}
		thumbPositioning="exact"
		{...rest}
	>
		{#snippet child({ props })}
			<div {...props} class="hp-slider-control">
				<BitsSlider.Range>
					{#snippet child({ props })}
						<span {...props} class="hp-slider-range"></span>
					{/snippet}
				</BitsSlider.Range>
				<BitsSlider.Thumb
					index={0}
					aria-labelledby={labelId}
					aria-describedby={hint ? hintId : undefined}
					aria-valuetext={(valueText ?? format)(shown)}
				>
					{#snippet child({ props })}
						<span {...props} class="hp-slider-thumb"></span>
					{/snippet}
				</BitsSlider.Thumb>
			</div>
		{/snippet}
	</BitsSlider.Root>
	{#if hint}
		<p id={hintId} class="hp-slider-hint hp-caption">{hint}</p>
	{/if}
</div>

<style>
	/* The slider fills the width it is given; the app sets a narrower one. */
	.hp-slider {
		display: grid;
		gap: var(--space-1);
		min-width: 0;
	}

	/* The caps label at the start, the value at the end, on one line. A long
	   label wraps rather than widen the page. */
	.hp-slider-line {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-4);
	}
	.hp-slider-label {
		min-width: 0;
		color: var(--muted);
		overflow-wrap: anywhere;
	}
	.hp-slider-value {
		flex: none;
		font-size: var(--type-body);
		line-height: 24px;
		font-variant-numeric: tabular-nums;
	}

	/* The track area: --hit-target high (44px on coarse pointers), so a
	   press anywhere on it moves the thumb. It is inset by half a thumb, so
	   the thumb's centre runs from the start to the end of the area and
	   Bits UI's pointer maths ("exact" positioning) lands under the pointer;
	   the track below reaches that half thumb back out on both sides. */
	.hp-slider-control {
		position: relative;
		box-sizing: border-box;
		height: var(--hit-target);
		margin-inline: var(--space-2);
		cursor: pointer;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}

	/* The track: a black well with a 3:1 boundary, 12px tall like Progress.
	   Plain, not segmented: a slider's value moves on its own `step`, and
	   segments would promise a different granularity (Progress and Meter are
	   the segmented ones, and they only show). */
	.hp-slider-control::before {
		content: '';
		position: absolute;
		inset: calc(50% - 6px) calc(-1 * var(--space-2));
		border: 1px solid var(--border-control);
		background: var(--canvas);
		pointer-events: none;
		transition: background-color var(--dur-hover) var(--settle);
	}
	@media (hover: hover) and (pointer: fine) {
		.hp-slider-control:not([data-disabled]):hover::before {
			background: var(--surface-hover);
		}
	}

	/* The range runs from the start of the track to the thumb's centre.
	   Bits UI sets its position and its two edges (left and right) inline,
	   through the CSSOM; the rest is here. */
	.hp-slider-range {
		top: calc(50% - 5px);
		height: 10px;
		margin-left: calc(-1 * var(--space-2) + 1px);
		background: var(--accent);
		pointer-events: none;
	}

	/* The thumb: a solid 16 by 24 block, square, ringed in the page colour so
	   it stands apart from the range it sits on. Its position along the
	   track is Bits UI's inline `left` and `translate`. A ::before reaches
	   its hit area to --hit-target square. The value moves it at once, never
	   by transition: a drag is frequent and continuous. */
	.hp-slider-thumb {
		top: calc(50% - 12px);
		width: var(--space-4);
		height: var(--space-6);
		background: var(--accent);
		box-shadow: 0 0 0 2px var(--canvas);
	}
	.hp-slider-thumb::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		width: max(100%, var(--hit-target));
		height: max(100%, var(--hit-target));
		translate: -50% -50%;
	}

	.hp-slider-control[data-disabled] {
		cursor: not-allowed;
	}
	.hp-slider-control[data-disabled]::before {
		border-color: var(--border);
	}
	.hp-slider-control[data-disabled] .hp-slider-range,
	.hp-slider-control[data-disabled] .hp-slider-thumb {
		background: var(--muted);
	}
	.hp-slider[data-disabled] .hp-slider-value {
		color: var(--muted);
	}

	.hp-slider-hint {
		margin: 0;
		color: var(--muted);
	}

	/* One row: the label, the track and the value; the hint under the track.
	   The row is at least one control high, so it lines up with fields whose
	   label sits beside their well. The line around the label and the value
	   gives way, so both become grid items. */
	[data-label-beside='always'] {
		grid-template-columns: auto minmax(0, 1fr) auto;
		grid-template-rows: minmax(var(--control-height), auto);
		column-gap: var(--space-2);
		align-items: center;
	}
	[data-label-beside='always'] .hp-slider-line {
		display: contents;
	}
	[data-label-beside='always'] .hp-slider-label {
		grid-area: 1 / 1;
		white-space: nowrap;
	}
	[data-label-beside='always'] .hp-slider-control {
		grid-area: 1 / 2;
	}
	[data-label-beside='always'] .hp-slider-value {
		grid-area: 1 / 3;
		padding-inline-start: var(--space-1);
	}
	[data-label-beside='always'] .hp-slider-hint {
		grid-area: 2 / 2;
	}
	@media (min-width: 600px) {
		[data-label-beside='medium'] {
			grid-template-columns: auto minmax(0, 1fr) auto;
			grid-template-rows: minmax(var(--control-height), auto);
			column-gap: var(--space-2);
			align-items: center;
		}
		[data-label-beside='medium'] .hp-slider-line {
			display: contents;
		}
		[data-label-beside='medium'] .hp-slider-label {
			grid-area: 1 / 1;
			white-space: nowrap;
		}
		[data-label-beside='medium'] .hp-slider-control {
			grid-area: 1 / 2;
		}
		[data-label-beside='medium'] .hp-slider-value {
			grid-area: 1 / 3;
			padding-inline-start: var(--space-1);
		}
		[data-label-beside='medium'] .hp-slider-hint {
			grid-area: 2 / 2;
		}
	}
	@media (min-width: 900px) {
		[data-label-beside='expanded'] {
			grid-template-columns: auto minmax(0, 1fr) auto;
			grid-template-rows: minmax(var(--control-height), auto);
			column-gap: var(--space-2);
			align-items: center;
		}
		[data-label-beside='expanded'] .hp-slider-line {
			display: contents;
		}
		[data-label-beside='expanded'] .hp-slider-label {
			grid-area: 1 / 1;
			white-space: nowrap;
		}
		[data-label-beside='expanded'] .hp-slider-control {
			grid-area: 1 / 2;
		}
		[data-label-beside='expanded'] .hp-slider-value {
			grid-area: 1 / 3;
			padding-inline-start: var(--space-1);
		}
		[data-label-beside='expanded'] .hp-slider-hint {
			grid-area: 2 / 2;
		}
	}
	@media (min-width: 1200px) {
		[data-label-beside='large'] {
			grid-template-columns: auto minmax(0, 1fr) auto;
			grid-template-rows: minmax(var(--control-height), auto);
			column-gap: var(--space-2);
			align-items: center;
		}
		[data-label-beside='large'] .hp-slider-line {
			display: contents;
		}
		[data-label-beside='large'] .hp-slider-label {
			grid-area: 1 / 1;
			white-space: nowrap;
		}
		[data-label-beside='large'] .hp-slider-control {
			grid-area: 1 / 2;
		}
		[data-label-beside='large'] .hp-slider-value {
			grid-area: 1 / 3;
			padding-inline-start: var(--space-1);
		}
		[data-label-beside='large'] .hp-slider-hint {
			grid-area: 2 / 2;
		}
	}

	/* Hidden label: the track and the value on one row. The label is out of
	   the flow (visually hidden) and still names the thumb. */
	[data-label-hidden] {
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-rows: minmax(var(--control-height), auto);
		column-gap: var(--space-2);
		align-items: center;
	}
	[data-label-hidden] .hp-slider-line {
		display: contents;
	}
	[data-label-hidden] .hp-slider-control {
		grid-area: 1 / 1;
	}
	[data-label-hidden] .hp-slider-value {
		grid-area: 1 / 2;
		padding-inline-start: var(--space-1);
	}
	[data-label-hidden] .hp-slider-hint {
		grid-area: 2 / 1;
	}

	/* The value's width on one row: both ends, drawn hidden in the same grid
	   cell as the shown value, so the cell is as wide as the widest of the
	   three and the track keeps its length. The shown value sits at the
	   cell's end. Pseudo-elements keep the ends out of the text and, hidden,
	   out of the accessibility tree. */
	.hp-slider-value[data-min] {
		display: inline-grid;
		justify-items: end;
	}
	.hp-slider-value[data-min] > span,
	.hp-slider-value[data-min]::before,
	.hp-slider-value[data-min]::after {
		grid-area: 1 / 1;
	}
	.hp-slider-value[data-min]::before {
		content: attr(data-min);
		visibility: hidden;
	}
	.hp-slider-value[data-min]::after {
		content: attr(data-max);
		visibility: hidden;
	}
</style>
