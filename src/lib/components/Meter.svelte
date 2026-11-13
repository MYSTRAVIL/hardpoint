<script lang="ts" module>
	import { Meter as BitsMeter } from 'bits-ui';

	/** A status hue for the bar: `ok` fine, `warn` needs attention, `danger` bad. */
	export type MeterTone = 'ok' | 'warn' | 'danger';

	/**
	 * The meter's accessible name: a `label` line above the bar, an
	 * `aria-label` or an `aria-labelledby`. Exactly one.
	 */
	type MeterName =
		| {
				/**
				 * A line above the bar saying what is measured, as written (never
				 * caps: it may hold a name). It names the meter.
				 */
				label: string;
				'aria-label'?: never;
				'aria-labelledby'?: never;
		  }
		| { label?: never; 'aria-label': string; 'aria-labelledby'?: never }
		| { label?: never; 'aria-label'?: never; 'aria-labelledby': string };

	export type MeterProps = Omit<BitsMeter.RootProps, 'value' | 'child' | 'children'> & {
		/**
		 * The measurement, from `min` to `max`. Pass the real figure each time
		 * it changes: the bar never moves on its own. A value outside the
		 * range is held at its ends for the bar and `aria-valuenow`. Work that
		 * is getting done shows a `Progress` instead.
		 */
		value: number;
		/** The top of the range. Default 100. */
		max?: number;
		/** The bottom of the range. Default 0. */
		min?: number;
		/**
		 * How many segments the bar has (default 20, at least 2). A segment
		 * lights once the value has passed its whole share, so the bar never
		 * shows more than the value.
		 */
		segments?: number;
		/**
		 * The value in words, such as `4.2 of 5 GB`. Shown at the end of the
		 * label line and read as `aria-valuetext`. Without it both give the
		 * share of the range, rounded down.
		 */
		valueText?: string;
		/**
		 * The value at and above which the meter shows `warn`. Default 80% of
		 * the range. `null` turns the warn step off.
		 */
		warnAt?: number | null;
		/**
		 * The value at and above which the meter shows `danger`. Default
		 * `max`. `null` turns the danger step off.
		 */
		dangerAt?: number | null;
		/**
		 * Replaces the thresholds with a colour the app chooses. Use it where
		 * lower is worse, or for a state the value cannot show. Colour never
		 * carries meaning alone: say the reason in `valueText` or `detail`.
		 */
		tone?: MeterTone;
		/**
		 * A reference value drawn as a thin mark across the bar: a target, an
		 * expected level, an earlier reading. Held inside the range. The mark
		 * is visual only and hidden from assistive technology, so say what it
		 * stands for in `detail`.
		 */
		marker?: number;
		/**
		 * A muted line under the bar, as written. Assistive technology reads
		 * it as the meter's description; the app's own `aria-describedby`
		 * ids follow it.
		 */
		detail?: string;
	} & MeterName;
</script>

<script lang="ts">
	let {
		value,
		max = 100,
		min = 0,
		segments = 20,
		label,
		valueText,
		warnAt,
		dangerAt,
		tone,
		marker,
		detail,
		id,
		class: className,
		ref = $bindable(null),
		'aria-describedby': describedby,
		...rest
	}: MeterProps = $props();

	const uid = $props.id();
	const labelId = `${uid}-label`;
	const detailId = `${uid}-detail`;

	// The value inside its range, so the bar and aria-valuenow agree. An
	// empty range counts as full.
	const current = $derived(Math.min(max, Math.max(min, value)));
	const span = $derived(max - min);
	const count = $derived(Math.max(2, Math.floor(segments)));
	// Round down: a segment lights only when its whole share is reached.
	// Multiply before dividing and clear float noise before rounding down,
	// so 58 of 100 and 0.58 of 1 are both 58% and not 57.99…
	const share = (n: number) => Math.floor(Number((((current - min) * n) / span).toPrecision(12)));
	const lit = $derived(current >= max || span <= 0 ? count : share(count));
	const percent = $derived(span > 0 ? share(100) : 100);
	const shown = $derived(valueText ?? `${percent}%`);

	// Thresholds apply to the value inside the range. `undefined` takes the
	// default; `null` turns the step off. 0.8 of the span is cleared of float
	// noise so a value on the line counts.
	const warnLine = $derived(
		warnAt === undefined ? min + Number((0.8 * span).toPrecision(12)) : warnAt
	);
	const dangerLine = $derived(dangerAt === undefined ? max : dangerAt);
	const shownTone = $derived<MeterTone | undefined>(
		tone ??
			(dangerLine !== null && current >= dangerLine
				? 'danger'
				: warnLine !== null && current >= warnLine
					? 'warn'
					: undefined)
	);

	// The marker's place across the bar, held inside the range.
	const markerAt = $derived(
		marker === undefined
			? undefined
			: span > 0
				? Math.min(1, Math.max(0, (marker - min) / span)) * 100
				: 0
	);

	const describedBy = $derived([detail ? detailId : undefined, describedby].filter(Boolean).join(' ') || undefined);
</script>

<!--
	Bits UI Meter, rendered through its `child` snippet so the element is this
	component's markup and its styles stay scoped. The root is the meter
	(`role`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`); `id`, extra
	attributes and `class` go to it. Its children are presentational to
	assistive technology, so the label line names it through
	`aria-labelledby`, the value as shown reaches it as `aria-valuetext`, and
	the detail line describes it. The marker is a decoration.
	A segment that lights, goes out or changes tone fades its colour over
	--dur-segment; the marker moves at once.
-->
<BitsMeter.Root
	bind:ref
	value={current}
	{max}
	{min}
	aria-labelledby={label ? labelId : undefined}
	aria-valuetext={shown}
	aria-describedby={describedBy}
	{...rest}
>
	{#snippet child({ props })}
		<div
			{...props}
			{id}
			class={['hp-meter', className]}
			data-tone={shownTone}
			data-lit={lit}
			data-segments={count}
		>
			{#if label}
				<div class="hp-meter-line">
					<span id={labelId} class="hp-meter-label">{label}</span>
					<span class="hp-meter-value">{shown}</span>
				</div>
			{/if}
			<div class="hp-meter-bar" style:--segments={count}>
				{#each { length: count }, i}
					<span class="hp-meter-segment" data-lit={i < lit || undefined}></span>
				{/each}
				{#if markerAt !== undefined}
					<span class="hp-meter-marker" aria-hidden="true" style:left="{markerAt}%"></span>
				{/if}
			</div>
			{#if detail}
				<p id={detailId} class="hp-meter-detail">{detail}</p>
			{/if}
		</div>
	{/snippet}
</BitsMeter.Root>

<style>
	/* The bar fills the width it is given; the app sets a narrower one. */
	.hp-meter {
		display: grid;
		gap: var(--space-2);
		min-width: 0;
	}

	/* 16px on touch, the dense 14px on fine pointers. The value keeps the
	   end of the line; a long label wraps rather than widen the page. */
	.hp-meter-line {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-4);
		font-size: var(--type-body);
		line-height: 24px;
	}
	@media (pointer: fine) {
		.hp-meter-line {
			font-size: var(--type-dense);
			line-height: 20px;
		}
	}
	.hp-meter-label {
		min-width: 0;
		color: var(--text);
		overflow-wrap: anywhere;
	}
	/* Muted with no tone; the tone's hue otherwise, so the words and the
	   bar agree. The value text is always there, so colour never carries the
	   meaning alone. */
	.hp-meter-value {
		flex: none;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.hp-meter[data-tone='ok'] .hp-meter-value {
		color: var(--ok);
	}
	.hp-meter[data-tone='warn'] .hp-meter-value {
		color: var(--warn);
	}
	.hp-meter[data-tone='danger'] .hp-meter-value {
		color: var(--danger);
	}

	/* Separate segments as in Progress (BRIEF, visual rule 7): lit in the
	   tone's colour, the 3:1 control boundary while unlit. Square, 4px
	   apart, one row. */
	.hp-meter-bar {
		position: relative;
		display: grid;
		grid-template-columns: repeat(var(--segments), minmax(0, 1fr));
		gap: var(--space-1);
		height: 12px;
	}
	/* A segment that lights, goes out or changes tone fades its colour over
	   --dur-segment (BRIEF, short motion). A CSS transition never runs on an
	   element's first style, so a meter shows its value at once when it
	   renders. 0ms is a snap. Colour only, so reduced motion keeps it. */
	.hp-meter-segment {
		background: var(--border-control);
		transition: background-color var(--dur-segment) var(--settle);
	}
	.hp-meter-segment[data-lit] {
		background: var(--accent);
	}
	.hp-meter[data-tone='ok'] .hp-meter-segment[data-lit] {
		background: var(--ok);
	}
	.hp-meter[data-tone='warn'] .hp-meter-segment[data-lit] {
		background: var(--warn);
	}
	.hp-meter[data-tone='danger'] .hp-meter-segment[data-lit] {
		background: var(--danger);
	}

	/* A 2px line in the text colour, 4px past the bar at each end. A 1px
	   canvas edge on each side lets it read over lit segments of every tone,
	   unlit ones and the gaps, in both themes. It moves at once. */
	.hp-meter-marker {
		position: absolute;
		top: calc(var(--space-1) * -1);
		bottom: calc(var(--space-1) * -1);
		width: 2px;
		margin-left: -1px;
		background: var(--text);
		box-shadow: 0 0 0 1px var(--canvas);
		pointer-events: none;
	}

	.hp-meter-detail {
		margin: 0;
		color: var(--muted);
		font-size: var(--type-caption);
		line-height: 18px;
	}
</style>
