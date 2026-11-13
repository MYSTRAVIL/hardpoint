<script lang="ts" module>
	import { Progress as BitsProgress } from 'bits-ui';

	/**
	 * The bar's accessible name: a `label` line above the bar, an `aria-label`
	 * or an `aria-labelledby`. Exactly one.
	 */
	type ProgressName =
		| {
				/**
				 * A line above the bar saying what is in progress, as written (never
				 * caps: it may hold a file or project name). It names the progress bar.
				 */
				label: string;
				'aria-label'?: never;
				'aria-labelledby'?: never;
		  }
		| { label?: never; 'aria-label': string; 'aria-labelledby'?: never }
		| { label?: never; 'aria-label'?: never; 'aria-labelledby': string };

	export type ProgressProps = Omit<BitsProgress.RootProps, 'value' | 'child' | 'children'> & {
		/**
		 * How far the work has got, from `min` to `max`. Pass the real figure
		 * each time it changes: the bar never moves on its own. Work whose
		 * progress is unknown shows a `Spinner` instead.
		 */
		value: number;
		/** The value at which the work is done. Default 100. */
		max?: number;
		/** The value at which the work starts. Default 0. */
		min?: number;
		/**
		 * How many segments the bar has (default 20, at least 2). A segment
		 * lights once the value has passed its whole share, so the bar never
		 * shows more than has been done.
		 */
		segments?: number;
		/**
		 * The value in words, such as `3 of 12 files`. Shown at the end of the
		 * label line and read as `aria-valuetext`. Without it both give the
		 * percentage done, rounded down.
		 */
		valueText?: string;
	} & ProgressName;
</script>

<script lang="ts">
	let {
		value,
		max = 100,
		min = 0,
		segments = 20,
		label,
		valueText,
		id,
		class: className,
		ref = $bindable(null),
		...rest
	}: ProgressProps = $props();

	const uid = $props.id();
	const labelId = `${uid}-label`;

	// The value inside its range, so the bar and aria-valuenow agree. An
	// empty range counts as done.
	const current = $derived(Math.min(max, Math.max(min, value)));
	const span = $derived(max - min);
	const count = $derived(Math.max(2, Math.floor(segments)));
	// Round down: a segment lights only when its whole share is done.
	// Multiply before dividing and clear float noise before rounding down,
	// so 58 of 100 and 0.58 of 1 are both 58% and not 57.99…
	const share = (n: number) => Math.floor(Number((((current - min) * n) / span).toPrecision(12)));
	const lit = $derived(current >= max || span <= 0 ? count : share(count));
	const percent = $derived(span > 0 ? share(100) : 100);
	const shown = $derived(valueText ?? `${percent}%`);
</script>

<!--
	Bits UI Progress, rendered through its `child` snippet so the element is
	this component's markup and its styles stay scoped. The root is the
	progressbar (`role`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`,
	`data-state` loading | loaded); `id`, extra attributes and `class` go to
	it. Its children are presentational to assistive technology, so the label
	line names it through `aria-labelledby`, and the value as shown (the
	`valueText` or the floored percentage) reaches it as `aria-valuetext`.
	A segment that lights or goes out fades its colour over --dur-segment.
-->
<BitsProgress.Root
	bind:ref
	value={current}
	{max}
	{min}
	aria-labelledby={label ? labelId : undefined}
	aria-valuetext={shown}
	{...rest}
>
	{#snippet child({ props })}
		<div {...props} {id} class={['hp-progress', className]} data-lit={lit} data-segments={count}>
			{#if label}
				<div class="hp-progress-line">
					<span id={labelId} class="hp-progress-label">{label}</span>
					<span class="hp-progress-value">{shown}</span>
				</div>
			{/if}
			<div class="hp-progress-bar" style:--segments={count}>
				{#each { length: count }, i}
					<span class="hp-progress-segment" data-lit={i < lit || undefined}></span>
				{/each}
			</div>
		</div>
	{/snippet}
</BitsProgress.Root>

<style>
	/* The bar fills the width it is given; the app sets a narrower one. */
	.hp-progress {
		display: grid;
		gap: var(--space-2);
		min-width: 0;
	}

	/* 16px on touch, the dense 14px on fine pointers. The value keeps the
	   end of the line; a long label wraps rather than widen the page. */
	.hp-progress-line {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-4);
		font-size: var(--type-body);
		line-height: 24px;
	}
	@media (pointer: fine) {
		.hp-progress-line {
			font-size: var(--type-dense);
			line-height: 20px;
		}
	}
	.hp-progress-label {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.hp-progress-value {
		flex: none;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}

	/* Separate segments (BRIEF, visual rule 7; da3-38): titanium once done,
	   the 3:1 control boundary while still to do, so the unlit share reads as
	   part of the bar. Square, 4px apart, one row. */
	.hp-progress-bar {
		display: grid;
		grid-template-columns: repeat(var(--segments), minmax(0, 1fr));
		gap: var(--space-1);
		height: 12px;
	}
	/* A segment that lights or goes out fades its colour over --dur-segment
	   (BRIEF, short motion). A CSS transition never runs on an element's
	   first style, so a bar shows its value at once when it renders. 0ms is
	   a snap. Colour only, so reduced motion keeps it. */
	.hp-progress-segment {
		background: var(--border-control);
		transition: background-color var(--dur-segment) var(--settle);
	}
	.hp-progress-segment[data-lit] {
		background: var(--accent);
	}
</style>
