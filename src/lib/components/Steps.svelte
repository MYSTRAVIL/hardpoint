<script lang="ts" module>
	import type { HTMLOlAttributes } from 'svelte/elements';

	export type StepsItem = {
		/** The step's caps label. A short fixed string the app defines. */
		label: string;
		/** A supporting line in `--muted`, as written. */
		detail?: string;
	};

	/** Where a step stands, from `current`. Each step's `<li>` carries it in `data-state`. */
	export type StepsState = 'done' | 'current' | 'upcoming';

	/** From which width the steps sit in a row: 600px, 900px or 1200px. */
	export type StepsBreakpoint = 'medium' | 'expanded' | 'large';

	export type StepsProps = Omit<HTMLOlAttributes, 'children'> & {
		/** In order, first to last. */
		steps: StepsItem[];
		/**
		 * The index of the current step, from 0. Steps before it are done,
		 * steps after it upcoming. `steps.length` marks every step done.
		 */
		current: number;
		/**
		 * From which width the steps sit in a row of equal columns; narrower,
		 * they stack. Default `medium` (600px). Pick a later one when long
		 * labels or many steps would not fit their columns.
		 */
		rowFrom?: StepsBreakpoint;
		/** Screen-reader text after a done step's label. Default `done`. */
		doneLabel?: string;
	};
</script>

<script lang="ts">
	let {
		steps,
		current,
		rowFrom = 'medium',
		doneLabel = 'done',
		class: className,
		...rest
	}: StepsProps = $props();

	function stateOf(index: number): StepsState {
		return index < current ? 'done' : index === current ? 'current' : 'upcoming';
	}
</script>

<!--
	Ordered steps as discrete segments (BRIEF, visual rule 7): each step has a
	3px edge, titanium once reached and --border while upcoming, so the edges
	read as a segmented bar. The current step adds the selection tint and
	aria-current="step"; a done step shows a check for its number. A row from
	`rowFrom` (600px by default), stacked below. When the current step
	changes, the edges and the tint fade their colour over --dur-segment.
	Extra attributes (an `aria-label` naming the process)
	and `class` go to the <ol>.
-->
<ol role="list" {...rest} class={['hp-steps', className]} data-row-from={rowFrom}>
	{#each steps as step, index}
		{@const state = stateOf(index)}
		<li class="hp-steps-step" data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
			<span class="hp-steps-mark" aria-hidden="true">
				{#if state === 'done'}
					<svg viewBox="0 0 16 16" width="16" height="16" focusable="false">
						<path d="m3 8.5 3.5 3.5 6.5-7.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
					</svg>
				{:else}
					{index + 1}
				{/if}
			</span>
			<span class="hp-steps-label hp-label">{step.label}</span>
			{#if state === 'done'}<span class="hp-visually-hidden">, {doneLabel}</span>{/if}
			{#if step.detail}<span class="hp-steps-detail">{step.detail}</span>{/if}
		</li>
	{/each}
</ol>

<style>
	/* Stacked below 600px. The edges and the current tint reach --bleed into
	   the gutter, so the labels keep the page edge, as table rows do. */
	.hp-steps {
		display: grid;
		gap: var(--space-1);
		margin: 0 calc(-1 * var(--bleed));
		padding: 0;
		list-style: none;
	}

	/* The edge colour is a registered colour property, so it can transition
	   on its own while the edge's shape switches at once between the stacked
	   and the row form. */
	@property --steps-edge {
		syntax: '<color>';
		inherits: false;
		initial-value: transparent;
	}

	/* When the current step changes, the edge and the tint fade their colour
	   over --dur-segment (BRIEF, short motion). A CSS transition never runs
	   on an element's first style, so steps show their state at once when
	   they render. 0ms is a snap. Colour only, so reduced motion keeps it.
	   The text colour and the number or check change at once. */
	.hp-steps-step {
		--steps-edge: var(--accent);
		position: relative;
		display: grid;
		grid-template-columns: var(--space-4) minmax(0, 1fr);
		column-gap: var(--space-2);
		row-gap: var(--space-1);
		align-content: start;
		padding: var(--space-3) var(--space-3) var(--space-3) var(--bleed);
		/* the brief's 3px selection edge */
		box-shadow: inset 3px 0 0 var(--steps-edge);
		overflow-wrap: anywhere;
		transition:
			--steps-edge var(--dur-segment) var(--settle),
			background-color var(--dur-segment) var(--settle);
	}
	.hp-steps-step[data-state='current'] {
		background: var(--surface-selected);
	}
	.hp-steps-step[data-state='upcoming'] {
		--steps-edge: var(--border);
		color: var(--muted);
	}

	/* The number or the check, in a 16px box beside the label's first line. */
	.hp-steps-mark {
		display: grid;
		place-items: center;
		height: var(--space-4);
		font-size: var(--type-label);
		font-weight: 500;
		line-height: 16px;
		font-variant-numeric: tabular-nums;
	}

	.hp-steps-detail {
		grid-column: 2;
		color: var(--muted);
		font-size: var(--type-body);
		line-height: 24px;
	}
	@media (pointer: fine) {
		.hp-steps-detail {
			font-size: var(--type-dense);
			line-height: 20px;
		}
	}

	/* A row of equal columns from the rowFrom width, the edge on top. A label
	   longer than its column still breaks rather than widen the page. */
	@media (min-width: 600px) {
		.hp-steps[data-row-from='medium'] {
			grid-auto-columns: minmax(0, 1fr);
			grid-auto-flow: column;
		}
		[data-row-from='medium'] > .hp-steps-step {
			padding: var(--space-4) var(--space-2) var(--space-3) var(--bleed);
			/* the brief's 3px selection edge */
			box-shadow: inset 0 3px 0 var(--steps-edge);
		}
	}
	@media (min-width: 900px) {
		.hp-steps[data-row-from='expanded'] {
			grid-auto-columns: minmax(0, 1fr);
			grid-auto-flow: column;
		}
		[data-row-from='expanded'] > .hp-steps-step {
			padding: var(--space-4) var(--space-2) var(--space-3) var(--bleed);
			/* the brief's 3px selection edge */
			box-shadow: inset 0 3px 0 var(--steps-edge);
		}
	}
	@media (min-width: 1200px) {
		.hp-steps[data-row-from='large'] {
			grid-auto-columns: minmax(0, 1fr);
			grid-auto-flow: column;
		}
		[data-row-from='large'] > .hp-steps-step {
			padding: var(--space-4) var(--space-2) var(--space-3) var(--bleed);
			/* the brief's 3px selection edge */
			box-shadow: inset 0 3px 0 var(--steps-edge);
		}
	}
</style>
