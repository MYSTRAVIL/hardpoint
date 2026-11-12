<script lang="ts" module>
	import { Switch as BitsSwitch } from 'bits-ui';

	/** Attributes and handlers not listed here go to the switch button. */
	export type SwitchProps = Omit<BitsSwitch.RootProps, 'child' | 'children' | 'ref'> & {
		/**
		 * The setting's name, as written (never caps), at the start of the line;
		 * the switch sits at its end. Pressing anywhere on the label turns the
		 * switch on or off. Without it, give the switch an accessible name with
		 * `aria-label`.
		 */
		label?: string;
		/** A second line in `--muted` under the label, read out as the switch's description. */
		hint?: string;
		/** The switch button. */
		ref?: HTMLElement | null;
	};
</script>

<script lang="ts">
	const uid = $props.id();

	let {
		checked = $bindable(false),
		label,
		hint,
		id = uid,
		ref = $bindable(null),
		class: className,
		'aria-describedby': describedBy,
		...rest
	}: SwitchProps = $props();

	const hintId = $derived(`${id}-hint`);
	const describedByIds = $derived([hint ? hintId : null, describedBy].filter(Boolean).join(' ') || undefined);
</script>

<!--
	A Bits UI Switch: a <button role="switch"> with aria-checked, its state in
	data-state (checked, unchecked) and data-disabled. An on/off setting that
	applies at once, as omp-remote's settings rows: the label, the switch at
	the end of its line, then the hint. Attributes, handlers and `class` go to
	the button.
-->
<div class="hp-switch">
	{#if label}
		<label class="hp-dense" for={id}>{label}</label>
	{/if}
	<span class="control">
		<BitsSwitch.Root bind:checked bind:ref {id} aria-describedby={describedByIds} {...rest}>
			{#snippet child({ props })}
				<button {...props} class={['track', className]}>
					<BitsSwitch.Thumb>
						{#snippet child({ props: thumbProps })}
							<span {...thumbProps} class="thumb"></span>
						{/snippet}
					</BitsSwitch.Thumb>
				</button>
			{/snippet}
		</BitsSwitch.Root>
	</span>
	{#if hint}
		<p class="hint hp-caption" id={hintId}>{hint}</p>
	{/if}
</div>

<style>
	/* The label fills the line and the switch sits at its end. The first
	   line is one hit-target band (24px fine, 44px coarse): the switch sits
	   centred in it and the label's first line too, so the whole label line
	   is a target. The hint runs under the label. Without a label the root
	   is as wide as the switch. */
	.hp-switch {
		/* The label's line height, as .hp-dense sets it. */
		--_line: 24px;
		display: grid;
		grid-template-columns: auto;
		justify-content: start;
		align-items: start;
	}
	.hp-switch:has(> label) {
		grid-template-columns: minmax(0, 1fr) auto;
		column-gap: var(--space-4);
	}
	@media (pointer: fine) {
		.hp-switch {
			--_line: 20px;
		}
	}

	label {
		padding: calc((var(--hit-target) - var(--_line)) / 2) 0;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.control {
		position: relative;
		grid-column: -2;
		grid-row: 1;
		display: flex;
		align-items: center;
		height: var(--hit-target);
	}

	/* A black box with a 3:1 boundary and a square thumb. On, the edge and the
	   thumb turn titanium and the thumb shows at the end; the box stays black,
	   because selection is never a fill. Focus is base.css's contour 4px
	   outside, so it never looks like the on edge. */
	.track {
		position: relative;
		display: block;
		box-sizing: border-box;
		width: 40px;
		height: 24px;
		margin: 0;
		padding: 0;
		border: 1px solid var(--border-control);
		background: var(--canvas);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	/* The hit area: at least --hit-target square, centred on the track. */
	.track::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		width: max(100%, var(--hit-target));
		height: max(100%, var(--hit-target));
		translate: -50% -50%;
	}
	.track[data-state='checked'] {
		border-color: var(--accent);
	}

	/* The thumb: two 16px squares, 4px in from the outer edge (inside the
	   1px border), ::before at the start (off) and ::after at the end (on).
	   Each is at opacity 0 until its state comes. The one a change brings
	   fades in from 0 at its place over --dur-mark (BRIEF, short motion) and
	   the other goes at once, so the thumb never slides. A CSS transition
	   never runs on an element's first style, so a switch shows its state at
	   once when it renders. 0ms is a snap. Opacity only: nothing moves, so
	   reduced motion keeps it. */
	.thumb {
		position: absolute;
		top: calc(var(--space-1) - 1px);
		left: calc(var(--space-1) - 1px);
		width: 16px;
		height: 16px;
	}
	.thumb::before,
	.thumb::after {
		content: '';
		position: absolute;
		top: 0;
		width: 16px;
		height: 16px;
		opacity: 0;
	}
	.thumb::before {
		left: 0;
		background: var(--muted);
	}
	.thumb::after {
		left: 16px;
		background: var(--accent);
	}
	.track[data-state='unchecked'] .thumb::before,
	.track[data-state='checked'] .thumb::after {
		opacity: 1;
		transition: opacity var(--dur-mark) var(--settle);
	}

	.hint {
		grid-column: 1;
		color: var(--muted);
	}

	/* ---- Hover: fine pointers only, over the switch or its label ------- */

	@media (hover: hover) and (pointer: fine) {
		.track {
			transition:
				background-color var(--dur-hover) var(--settle),
				border-color var(--dur-hover) var(--settle);
		}
		.hp-switch:has(> label:hover, .track:hover) .track:not(:disabled) {
			background-color: var(--surface-hover);
		}
		.hp-switch:has(> label:hover, .track:hover) .track[data-state='unchecked']:not(:disabled) {
			border-color: var(--muted);
		}
		.hp-switch:has(> label:active, .track:active) .track:not(:disabled) {
			transition-duration: var(--dur-press);
		}
	}

	/* ---- Press: one step past hover, so it reads on a phone too -------- */

	.hp-switch:has(> label:active, .track:active) .track:not(:disabled) {
		background-color: var(--surface-raised);
	}

	/* ---- Disabled: the quieter --border and a --border thumb, as
	   omp-remote's; on keeps its place at the end ------------------------ */

	.track:disabled {
		border-color: var(--border);
		cursor: not-allowed;
	}
	.track:disabled .thumb::before {
		background: var(--border);
	}
	.track:disabled .thumb::after {
		background: var(--muted);
	}
	.hp-switch:has(.track:disabled) label {
		color: var(--muted);
		cursor: not-allowed;
	}
</style>
