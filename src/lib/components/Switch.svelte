<script lang="ts" module>
	import { Switch as BitsSwitch } from 'bits-ui';

	/**
	 * The switch's accessible name: exactly one of a visible `label`, an
	 * `aria-label` or an `aria-labelledby`. The types allow one.
	 */
	type SwitchName =
		| {
				/**
				 * The setting's name, as written (never caps), at the start of the
				 * line; the switch sits at its end. Pressing anywhere on the label
				 * turns the switch on or off.
				 */
				label: string;
				'aria-label'?: never;
				'aria-labelledby'?: never;
		  }
		| {
				label?: never;
				/** The accessible name of a switch with no visible label, such as a table row's. */
				'aria-label': string;
				'aria-labelledby'?: never;
		  }
		| {
				label?: never;
				'aria-label'?: never;
				/** The id of the element that names the switch. */
				'aria-labelledby': string;
		  };

	/** Attributes and handlers not listed here go to the switch button. */
	export type SwitchProps = Omit<
		BitsSwitch.RootProps,
		'child' | 'children' | 'ref' | 'aria-label' | 'aria-labelledby'
	> &
		SwitchName & {
			/** A second line in `--muted` under the label, read out as the switch's description. */
			hint?: string;
			/**
			 * The error to show under the row, with an icon, linked by
			 * `aria-describedby`; it sets `aria-invalid`, and the track's edge
			 * turns `--danger`. Say how to fix the problem. The app validates;
			 * the switch shows what it is given.
			 */
			error?: string;
			/** The switch button. */
			ref?: HTMLElement | null;
		};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { fadeIn } from './internal/fade-in.js';

	const uid = $props.id();

	let {
		checked = $bindable(false),
		label,
		hint,
		error,
		id = uid,
		ref = $bindable(null),
		class: className,
		'aria-describedby': describedBy,
		'aria-invalid': ariaInvalid,
		...rest
	}: SwitchProps = $props();

	const hintId = $derived(`${id}-hint`);
	const errorId = $derived(`${id}-error`);
	// The error first, so a screen reader reads it before the hint.
	const describedByIds = $derived(
		[error ? errorId : undefined, hint ? hintId : undefined, describedBy].filter(Boolean).join(' ') ||
			undefined
	);

	// ---- Short motion: the error (BRIEF, --dur-message) --------------------

	// As in TextField: an error that appears after the first render fades in
	// from 0 over --dur-message, and the track's edge fades to --danger with
	// it (the CSS below). An error that clears goes at once, and so does the
	// red edge. A switch that renders with an error shows it at once.
	let root: HTMLDivElement | null = $state(null);
	let errorShown = untrack(() => !!error);
	$effect(() => {
		const shown = !!error;
		untrack(() => {
			const appeared = shown && !errorShown;
			errorShown = shown;
			const message = appeared ? root?.querySelector(':scope > .error') : null;
			if (message) fadeIn(message, '--dur-message');
		});
	});
</script>

<!--
	A Bits UI Switch: a <button role="switch"> with aria-checked, its state in
	data-state (checked, unchecked) and data-disabled. An on/off setting that
	applies at once, as omp-remote's settings rows: the label, the switch at
	the end of its line, then the hint. Attributes, handlers and `class` go to
	the button.
-->
<div bind:this={root} class="hp-switch" data-invalid={error ? '' : undefined}>
	{#if label}
		<label class="hp-dense" for={id}>{label}</label>
	{/if}
	<span class="control">
		<BitsSwitch.Root
			bind:checked
			bind:ref
			{id}
			aria-describedby={describedByIds}
			aria-invalid={error ? true : ariaInvalid}
			{...rest}
		>
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
	{#if error}
		<p class="error hp-caption" id={errorId}>
			<span class="icon" aria-hidden="true">
				<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor">
					<path d="M1.5 1.5h13v13h-13z" />
					<path d="M8 4v4M8 10v2" stroke-width="2" />
				</svg>
			</span>
			<span>{error}</span>
		</p>
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

	/* The error: TextField's message, 8px under the whole row (the hint
	   included), clear of the track's focus contour. It spans the label's
	   column and the switch's. */
	.error {
		grid-column: 1 / -1;
		display: flex;
		gap: var(--space-2);
		margin: var(--space-2) 0 0;
		color: var(--danger);
	}
	/* One line box high, so the icon centres on the first line of the
	   message however it wraps. */
	.icon {
		display: flex;
		flex: none;
		align-items: center;
		height: 1lh;
	}
	.icon svg {
		display: block;
	}

	/* Invalid: the track's edge turns --danger (5.9:1 on black), never
	   alone: the icon and the message say what is wrong. A single switch has
	   one boundary, as a TextField's well. Keyed on the root's data-invalid,
	   set by `error`, so an aria-invalid the app passes without a message
	   draws no red edge. The edge fades to --danger over --dur-message with
	   the message; the transition belongs to this rule, so the edge goes
	   back at once when the error clears. Danger wins over the on edge and
	   over hover. */
	[data-invalid] .track {
		border-color: var(--danger);
		transition: border-color var(--dur-message) var(--settle);
	}
	[data-invalid] .track:disabled {
		border-color: var(--border);
	}

	/* ---- Hover: fine pointers only, over the switch or its label ------- */

	@media (hover: hover) and (pointer: fine) {
		.track {
			transition:
				background-color var(--dur-hover) var(--settle),
				border-color var(--dur-hover) var(--settle);
		}
		[data-invalid] .track {
			transition:
				background-color var(--dur-hover) var(--settle),
				border-color var(--dur-message) var(--settle);
		}
		.hp-switch:has(> label:hover, .track:hover) .track:not(:disabled) {
			background-color: var(--surface-hover);
		}
		.hp-switch:not([data-invalid]):has(> label:hover, .track:hover) .track[data-state='unchecked']:not(:disabled) {
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
