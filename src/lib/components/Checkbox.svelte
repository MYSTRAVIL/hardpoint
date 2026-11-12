<script lang="ts" module>
	import { Checkbox as BitsCheckbox } from 'bits-ui';

	/** Attributes and handlers not listed here go to the checkbox button. */
	export type CheckboxProps = Omit<BitsCheckbox.RootProps, 'child' | 'children' | 'ref'> & {
		/**
		 * The text beside the box, as written (never caps). Pressing it, or
		 * anywhere on the box's row, toggles the box. Without it, give the box
		 * an accessible name with `aria-label`.
		 */
		label?: string;
		/**
		 * A Tag after the label, such as "Recommended": a short fixed string the
		 * app defines, set in caps. It is part of the box's accessible name and
		 * shows only with a `label`.
		 */
		tag?: string;
		/** A second line in `--muted` under the label, read out as the box's description. */
		hint?: string;
		/** The checkbox button. */
		ref?: HTMLElement | null;
	};
</script>

<script lang="ts">
	import Tag from './Tag.svelte';

	const uid = $props.id();

	let {
		checked = $bindable(false),
		indeterminate = $bindable(false),
		label,
		tag,
		hint,
		id = uid,
		ref = $bindable(null),
		class: className,
		'aria-describedby': describedBy,
		...rest
	}: CheckboxProps = $props();

	const hintId = $derived(`${id}-hint`);
	const describedByIds = $derived([hint ? hintId : null, describedBy].filter(Boolean).join(' ') || undefined);
</script>

<!--
	A Bits UI Checkbox: a <button role="checkbox"> with aria-checked true,
	false or mixed, and its state in data-state (checked, unchecked,
	indeterminate) and data-disabled. Pressing the box or anywhere on its row
	(the label, the tag, the hint) toggles it; an indeterminate box becomes
	checked. Inside a CheckboxGroup, give it a `value`. Attributes, handlers
	and `class` go to the button.
-->
<div class="hp-checkbox">
	<span class="control">
		<BitsCheckbox.Root bind:checked bind:indeterminate bind:ref {id} aria-describedby={describedByIds} {...rest}>
			{#snippet child({ props })}
				<button {...props} class={['box', className]}>
					<svg class="mark mixed" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6h8" /></svg>
					<svg class="mark check" viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 6.5l3 3 6-6" /></svg>
				</button>
			{/snippet}
		</BitsCheckbox.Root>
	</span>
	{#if label}
		<label class="hp-dense" class:tagged={!!tag} for={id}
			>{label}{#if tag}{' '}<Tag as="span">{tag}</Tag>{/if}</label
		>
	{/if}
	{#if hint}
		<p class="hint hp-caption" id={hintId}>{hint}</p>
	{/if}
</div>

<style>
	/* The box, then the label as written. The first line is one hit-target
	   band (24px fine, 44px coarse): the box sits centred in it and the
	   label's first line too, so a label that wraps keeps the box beside its
	   first line. The hint runs under the label, aligned with its text.
	   The root is as wide as its content (without a label, as the box), and
	   with a label all of it is the target: the label's ::after covers the
	   root, so a press on the hint, the tag or the space between them is a
	   press on the label. The box sits above that cover with its own hit
	   area. */
	.hp-checkbox {
		/* The label's line height, as .hp-dense sets it. */
		--_line: 24px;
		position: relative;
		display: grid;
		grid-template-columns: auto;
		justify-content: start;
		align-items: start;
		width: fit-content;
		max-width: 100%;
	}
	.hp-checkbox:has(> label) {
		grid-template-columns: auto minmax(0, 1fr);
		column-gap: var(--space-3);
	}
	@media (pointer: fine) {
		.hp-checkbox {
			--_line: 20px;
		}
	}

	.control {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		height: var(--hit-target);
	}

	/* A black box with a 3:1 boundary. Checked or indeterminate, the edge and
	   the mark turn titanium; the box stays black, because selection is never
	   a fill. Focus is base.css's contour 4px outside, so it never looks like
	   the checked edge. */
	.box {
		position: relative;
		display: grid;
		place-items: center;
		box-sizing: border-box;
		width: 20px;
		height: 20px;
		margin: 0;
		padding: 0;
		border: 1px solid var(--border-control);
		background: var(--canvas);
		color: var(--accent);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	/* The hit area: at least --hit-target square, centred on the box. */
	.box::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		width: max(100%, var(--hit-target));
		height: max(100%, var(--hit-target));
		translate: -50% -50%;
	}
	.box[data-state='checked'],
	.box[data-state='indeterminate'] {
		border-color: var(--accent);
	}

	/* Both marks are always there, each at opacity 0 until its state comes.
	   The mark a change brings fades in from 0 at its place over --dur-mark
	   (BRIEF, short motion); the mark it takes away goes at once. A CSS
	   transition never runs on an element's first style, so a box that
	   renders checked or mixed shows its mark at once. 0ms is a snap.
	   Opacity only: nothing moves, so reduced motion keeps it. */
	.mark {
		grid-area: 1 / 1;
		width: 12px;
		height: 12px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2px;
		opacity: 0;
	}
	.box[data-state='indeterminate'] .mixed,
	.box[data-state='checked'] .check {
		opacity: 1;
		transition: opacity var(--dur-mark) var(--settle);
	}

	label {
		justify-self: start;
		padding: calc((var(--hit-target) - var(--_line)) / 2) 0;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	label::after {
		content: '';
		position: absolute;
		inset: 0;
	}
	/* The tag sits after the label when both fit on one line; otherwise it
	   wraps under the label whole. */
	.tagged {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-2);
	}

	/* Under the label's text; without a label, under the box. */
	.hint {
		grid-column: -2;
		color: var(--muted);
	}

	/* ---- Hover: fine pointers only, over any part of the row ----------- */

	@media (hover: hover) and (pointer: fine) {
		.box {
			transition:
				background-color var(--dur-hover) var(--settle),
				border-color var(--dur-hover) var(--settle);
		}
		.hp-checkbox:has(> label:hover, .box:hover) .box:not(:disabled) {
			background-color: var(--surface-hover);
		}
		.hp-checkbox:has(> label:hover, .box:hover) .box[data-state='unchecked']:not(:disabled) {
			border-color: var(--muted);
		}
		.hp-checkbox:has(> label:active, .box:active) .box:not(:disabled) {
			transition-duration: var(--dur-press);
		}
	}

	/* ---- Press: one step past hover, so it reads on a phone too -------- */

	.hp-checkbox:has(> label:active, .box:active) .box:not(:disabled) {
		background-color: var(--surface-raised);
	}

	/* ---- Disabled: the quieter --border and muted ink, the tag too ----- */

	.box:disabled {
		border-color: var(--border);
		color: var(--muted);
		cursor: not-allowed;
	}
	.hp-checkbox:has(.box:disabled) label {
		color: var(--muted);
		cursor: not-allowed;
	}
	.hp-checkbox:has(.box:disabled) label > :global(.hp-tag) {
		background: var(--muted);
	}
</style>
