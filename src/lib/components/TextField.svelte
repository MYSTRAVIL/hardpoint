<script lang="ts" module>
	import type { HTMLInputAttributes } from 'svelte/elements';

	/** The text input types the well suits. For numbers use `text` with `inputmode="numeric"`. */
	export type TextFieldType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';

	/** From which width the label sits beside the well: 600px, 900px or 1200px. */
	export type TextFieldBreakpoint = 'medium' | 'expanded' | 'large';

	/** Attributes and handlers not listed here go to the `<input>`. */
	export type TextFieldProps = Omit<HTMLInputAttributes, 'type' | 'value' | 'children'> & {
		/** The caps field label above the well. Required: a placeholder is never the only label. */
		label: string;
		/** The text. Bindable. */
		value?: string;
		type?: TextFieldType;
		/** Guidance under the well in `--muted`, linked by `aria-describedby`. */
		hint?: string;
		/**
		 * The error to show under the well, with an icon, linked by
		 * `aria-describedby`; it sets `aria-invalid`. Say how to fix the
		 * problem. The app validates; the field shows what it is given.
		 */
		error?: string;
		/**
		 * The label sits above the well by default. `true` puts it beside the
		 * well at every width; a breakpoint puts it beside from that width up.
		 * The hint and the error stay under the well.
		 */
		labelBeside?: boolean | TextFieldBreakpoint;
		/** The `<input>`, for example to focus the first error on submit. */
		ref?: HTMLInputElement | null;
	};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { Label } from 'bits-ui';
	import { fadeIn } from './internal/fade-in.js';

	const uid = $props.id();

	let {
		label,
		value = $bindable(''),
		type = 'text',
		hint,
		error,
		labelBeside = false,
		id = uid,
		disabled,
		ref = $bindable(null),
		class: className,
		'aria-describedby': describedBy,
		'aria-invalid': ariaInvalid,
		...rest
	}: TextFieldProps = $props();

	const hintId = $derived(`${id}-hint`);
	const errorId = $derived(`${id}-error`);
	// The error first, so a screen reader reads it before the hint.
	const describedByIds = $derived(
		[error ? errorId : undefined, hint ? hintId : undefined, describedBy].filter(Boolean).join(' ') ||
			undefined
	);

	// ---- Short motion: the error (BRIEF, --dur-message) --------------------

	// An error that appears after the first render fades in from 0 over
	// --dur-message, and the well's edge fades to --danger with it (the CSS
	// below). An error that clears goes at once, and so does the red edge. A
	// field that renders or mounts with an error, such as one in a dialog
	// that opens, shows it at once. 0ms is a snap.
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
	A single-line text input in the black well, with a plain caps label above
	it (Bits UI Label), an optional hint and an inline error below. Extra
	attributes (`name`, `inputmode`, `autocomplete`, `enterkeyhint`,
	`required`), handlers and `class` go to the <input>.
-->
<div
	bind:this={root}
	class="hp-text-field"
	data-invalid={error ? '' : undefined}
	data-disabled={disabled ? '' : undefined}
	data-label-beside={labelBeside === true ? 'always' : labelBeside || undefined}
>
	<Label.Root for={id}>
		{#snippet child({ props })}
			<label {...props} class="hp-label">{label}</label>
		{/snippet}
	</Label.Root>
	<input
		{...rest}
		bind:this={ref}
		bind:value
		{id}
		{type}
		{disabled}
		class={['hp-well', className]}
		aria-describedby={describedByIds}
		aria-invalid={error ? true : ariaInvalid}
	/>
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
	.hp-text-field {
		display: grid;
		gap: var(--space-1);
		min-width: 0;
	}
	label {
		color: var(--muted);
	}
	input {
		display: block;
		width: 100%;
		min-width: 0;
	}
	input::placeholder {
		color: var(--muted);
		opacity: 1;
	}

	/* Invalid: the boundary turns --danger (5.9:1 on black), never alone:
	   the icon and the message say what is wrong. Keyed on the root's
	   data-invalid, set by `error`, so an aria-invalid the app passes
	   without a message draws no red border. The edge fades to --danger
	   over --dur-message with the message; the transition belongs to this
	   rule, so the edge goes back at once when the error clears. The hover
	   fill keeps base.css's timing. */
	[data-invalid] input {
		border-color: var(--danger);
		transition:
			background-color var(--dur-hover) var(--settle),
			border-color var(--dur-message) var(--settle);
	}
	[data-invalid] input:disabled {
		border-color: var(--border);
	}

	.hint {
		margin: 0;
		color: var(--muted);
	}
	.error {
		display: flex;
		gap: var(--space-2);
		margin: 0;
		color: var(--danger);
	}
	/* The first message starts 8px under the well, clear of the focus
	   contour (2px, drawn 4px outside the well). */
	input + .hint,
	input + .error {
		margin-top: var(--space-1);
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

	/* Beside the well, the label keeps its one line in the first column; the
	   well, hint and error share the second. */
	[data-label-beside='always'] {
		grid-template-columns: auto minmax(0, 1fr);
		column-gap: var(--space-2);
	}
	[data-label-beside='always'] label {
		grid-row: 1;
		align-self: center;
		white-space: nowrap;
	}
	[data-label-beside='always'] input,
	[data-label-beside='always'] p {
		grid-column: 2;
	}
	@media (min-width: 600px) {
		[data-label-beside='medium'] {
			grid-template-columns: auto minmax(0, 1fr);
			column-gap: var(--space-2);
		}
		[data-label-beside='medium'] label {
			grid-row: 1;
			align-self: center;
			white-space: nowrap;
		}
		[data-label-beside='medium'] input,
		[data-label-beside='medium'] p {
			grid-column: 2;
		}
	}
	@media (min-width: 900px) {
		[data-label-beside='expanded'] {
			grid-template-columns: auto minmax(0, 1fr);
			column-gap: var(--space-2);
		}
		[data-label-beside='expanded'] label {
			grid-row: 1;
			align-self: center;
			white-space: nowrap;
		}
		[data-label-beside='expanded'] input,
		[data-label-beside='expanded'] p {
			grid-column: 2;
		}
	}
	@media (min-width: 1200px) {
		[data-label-beside='large'] {
			grid-template-columns: auto minmax(0, 1fr);
			column-gap: var(--space-2);
		}
		[data-label-beside='large'] label {
			grid-row: 1;
			align-self: center;
			white-space: nowrap;
		}
		[data-label-beside='large'] input,
		[data-label-beside='large'] p {
			grid-column: 2;
		}
	}
</style>
