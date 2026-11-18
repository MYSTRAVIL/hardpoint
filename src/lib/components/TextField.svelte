<script lang="ts" module>
	import type { HTMLInputAttributes } from 'svelte/elements';

	/**
	 * The input types the well suits. `number`, `date`, `time` and
	 * `datetime-local` use the browser's own controls and pickers, styled
	 * from tokens: the number's spin buttons are hidden (the arrow keys still
	 * step it) and the pickers' icon is drawn in `--muted`. Set `min`, `max`
	 * and `step` as on a native input. The type of `value` is the same for
	 * all of them; see `TextFieldProps.value`.
	 */
	export type TextFieldType =
		| 'text'
		| 'email'
		| 'password'
		| 'search'
		| 'tel'
		| 'url'
		| 'number'
		| 'date'
		| 'time'
		| 'datetime-local';

	/** From which width the label sits beside the well: 600px, 900px or 1200px. */
	export type TextFieldBreakpoint = 'medium' | 'expanded' | 'large';

	/** Attributes and handlers not listed here go to the `<input>`. */
	export type TextFieldProps = Omit<HTMLInputAttributes, 'type' | 'value' | 'children'> & {
		/**
		 * The caps field label above the well. Required, also with
		 * `labelHidden`: a placeholder is never the only label.
		 */
		label: string;
		/**
		 * The text. Bindable. Always a string, for every `type`: the string
		 * the browser holds, so `'12.5'` for a number (parse it with
		 * `Number(value)`), `'2026-11-18'` for a date, `'14:30'` for a time,
		 * `'2026-11-18T14:30'` for a date and time, and `''` while the box is
		 * empty or holds an incomplete or invalid entry.
		 */
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
		/**
		 * Hides the label from sight; it stays the field's accessible name.
		 * For a field whose purpose its place makes plain, such as a search in
		 * a toolbar. The well keeps its look and its 16 px text. It overrides
		 * `labelBeside`.
		 */
		labelHidden?: boolean;
		/**
		 * The accessible name of the clear button that `type="search"` shows
		 * inside the well while it holds text.
		 */
		clearLabel?: string;
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
		labelHidden = false,
		clearLabel = 'Clear',
		id = uid,
		disabled,
		readonly,
		ref = $bindable(null),
		class: className,
		'aria-describedby': describedBy,
		'aria-invalid': ariaInvalid,
		inputmode: inputmodeProp,
		oninput: onInput,
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

	// ---- Search: the clear button --------------------------------------

	// The browser's own cancel button is hidden (CSS below) and this one
	// takes its place, so every engine draws the same control. It writes
	// the empty value and fires a bubbling `input`, as typing would, so
	// `bind:value` and the app's `oninput` both hear it, then focus returns
	// to the field. A mouse or a touch press never takes focus from the
	// field, so an on-screen keyboard stays up; keys reach the button by Tab.
	const clearable = $derived(type === 'search');
	const showClear = $derived(clearable && !!value && !disabled && !readonly);

	function clear() {
		if (!ref) return;
		ref.value = '';
		ref.dispatchEvent(new Event('input', { bubbles: true }));
		ref.focus();
	}

	// ---- Number, date and time ------------------------------------------

	// `bind:value` on a number input would hand the app a number or null, and
	// would reset the box while "1." is typed. The field's value is one type
	// for every kind of input, the string the browser holds ('12.5',
	// '2026-11-18', '14:30', '2026-11-18T14:30', and '' while empty or
	// incomplete), so a number input is written to by hand: the typed text
	// goes to `value`, and `value` goes back to the box only when the app
	// changed it (the box then differs from it; typing never does).
	function typed(event: Parameters<NonNullable<TextFieldProps['oninput']>>[0]) {
		value = event.currentTarget.value;
		onInput?.(event);
	}
	$effect(() => {
		const next = value;
		if (type === 'number' && ref && ref.value !== next) ref.value = next;
	});
	// A form's reset puts the box back to its default; `bind:value` hears that
	// itself, this hears it for the hand-written number box.
	$effect(() => {
		const form = type === 'number' ? ref?.form : null;
		if (!form) return;
		const reset = () => setTimeout(() => ref && (value = ref.value));
		form.addEventListener('reset', reset);
		return () => form.removeEventListener('reset', reset);
	});

	// A phone's number pad. A number box with no `inputmode` shows the
	// browser's own keyboard, which has a minus key. `numeric` and
	// `decimal` pads can lack one, so they are set only where nothing below zero
	// is allowed (`min` of 0 or more), and then by the step: a whole step is
	// `numeric`, any other is `decimal`. The app's own `inputmode` always wins.
	const inputmode = $derived.by(() => {
		if (inputmodeProp) return inputmodeProp;
		if (type !== 'number' || rest.min === undefined || !(Number(rest.min) >= 0)) return undefined;
		const step = rest.step === undefined || rest.step === 'any' ? 1 : Number(rest.step);
		return rest.step === 'any' || !Number.isInteger(step) ? 'decimal' : 'numeric';
	});
</script>

<!--
	A single-line text input in the black well, with a plain caps label above
	it (Bits UI Label), an optional hint and an inline error below. Extra
	attributes (`name`, `inputmode`, `autocomplete`, `enterkeyhint`,
	`required`), handlers and `class` go to the <input>. With
	`type="search"` the well holds a clear button at its end while it has
	text. The number, date and time types keep the browser's own controls,
	styled from tokens; `value` is always the string the browser holds.
-->
<div
	bind:this={root}
	class="hp-text-field"
	data-invalid={error ? '' : undefined}
	data-disabled={disabled ? '' : undefined}
	data-label-beside={labelHidden ? undefined : labelBeside === true ? 'always' : labelBeside || undefined}
>
	<Label.Root for={id}>
		{#snippet child({ props })}
			<label {...props} class={['hp-label', labelHidden && 'hp-visually-hidden']}>{label}</label>
		{/snippet}
	</Label.Root>
	{#snippet well()}
		{#if type === 'number'}
			<!-- Not bound: Svelte's `bind:value` turns a number input's text into a
			     number, and the field's value is always the string the browser
			     holds. -->
			<input
				{...rest}
				bind:this={ref}
				oninput={typed}
				{id}
				{type}
				{inputmode}
				{disabled}
				{readonly}
				class={['hp-well', className]}
				aria-describedby={describedByIds}
				aria-invalid={error ? true : ariaInvalid}
			/>
		{:else}
			<input
				{...rest}
				bind:this={ref}
				bind:value
				oninput={onInput}
				{id}
				{type}
				{inputmode}
				{disabled}
				{readonly}
				class={['hp-well', className]}
				aria-describedby={describedByIds}
				aria-invalid={error ? true : ariaInvalid}
			/>
		{/if}
	{/snippet}
	{#if clearable}
		<div class="search">
			{@render well()}
			{#if showClear}
				<button
					type="button"
					class="clear hp-focus-inset"
					aria-label={clearLabel}
					onmousedown={(e) => e.preventDefault()}
					onclick={clear}
				>
					<svg
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="square"
						aria-hidden="true"
					>
						<path d="M4 4l8 8M12 4l-8 8" />
					</svg>
				</button>
			{/if}
		</div>
	{:else}
		{@render well()}
	{/if}
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

	/* ---- Number, date and time: the browser's own controls, from tokens -- */

	/* Figures line up in a column of fields; the native widgets take the
	   titanium accent where they draw one. */
	input[type='number'],
	input[type='date'],
	input[type='time'],
	input[type='datetime-local'] {
		font-variant-numeric: tabular-nums;
		accent-color: var(--accent);
	}

	/* The spin buttons are hidden everywhere. Chrome draws them 15px wide
	   whatever the well, in a colour a token cannot set, and a touch screen
	   has no use for them; the arrow keys still step the value by `step`
	   and the number pad (`inputmode`) fills it in. */
	input[type='number'] {
		appearance: textfield;
		-moz-appearance: textfield;
	}
	input[type='number']::-webkit-inner-spin-button,
	input[type='number']::-webkit-outer-spin-button {
		appearance: none;
		margin: 0;
	}

	/* The picker icon is drawn from the muted token: the browser's image is
	   replaced by a mask, so one rule colours it in both themes. It is a
	   24px square on a fine pointer; on touch the whole box opens the
	   picker. A disabled or read-only box has no picker to open. */
	input[type='date'],
	input[type='datetime-local'] {
		--picker-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M2.5 3.5h11v10h-11zM2.5 6.5h11M5.5 1.5v3M10.5 1.5v3' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='square'/%3E%3C/svg%3E");
	}
	input[type='time'] {
		--picker-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M2.5 2.5h11v11h-11zM8 5v3.5L10.5 10' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='square'/%3E%3C/svg%3E");
	}
	input::-webkit-calendar-picker-indicator {
		box-sizing: content-box;
		width: var(--space-4);
		height: var(--space-4);
		margin: 0 calc(-1 * var(--space-1)) 0 var(--space-2);
		padding: var(--space-1);
		background: var(--muted);
		-webkit-mask: var(--picker-icon) center / 16px 16px no-repeat;
		mask: var(--picker-icon) center / 16px 16px no-repeat;
		opacity: 1;
		cursor: pointer;
	}
	@media (hover: hover) and (pointer: fine) {
		input::-webkit-calendar-picker-indicator:hover {
			background: var(--text);
		}
	}
	input:is(:disabled, [readonly])::-webkit-calendar-picker-indicator {
		display: none;
	}
	/* WebKit on iOS centres the value of an empty date box and collapses it;
	   the value starts at the start edge like any text. */
	input::-webkit-date-and-time-value {
		text-align: start;
	}
	/* The separators are --muted, so the fields read as the entry. The field
	   being edited is a --text block, as selected text is, where Chrome
	   would draw its system highlight colour. (:focus-within, not :focus:
	   Chrome matches only that one after its own pseudo-elements.) */
	input::-webkit-datetime-edit-text {
		color: var(--muted);
	}
	input::-webkit-datetime-edit-month-field:focus-within,
	input::-webkit-datetime-edit-day-field:focus-within,
	input::-webkit-datetime-edit-year-field:focus-within,
	input::-webkit-datetime-edit-hour-field:focus-within,
	input::-webkit-datetime-edit-minute-field:focus-within,
	input::-webkit-datetime-edit-second-field:focus-within,
	input::-webkit-datetime-edit-millisecond-field:focus-within,
	input::-webkit-datetime-edit-ampm-field:focus-within {
		background: var(--text);
		color: var(--canvas);
		outline: none;
	}

	/* ---- Search: the clear button replaces the browser's own --------- */

	/* WebKit and Blink draw a cancel button in a search input whatever its
	   appearance; Chrome on Android draws it bright blue. */
	input::-webkit-search-cancel-button,
	input::-webkit-search-decoration {
		appearance: none;
		display: none;
	}
	.search {
		position: relative;
		min-width: 0;
	}
	/* The text stops short of the button's square, whether it shows or not,
	   so the text never moves when it appears. */
	.search > input {
		padding-right: var(--control-height);
	}
	/* A --control-height square over the end of the well: 36px on fine
	   pointers, 44px on coarse. Its transparent border keeps a press fill
	   inside the well's edge. The cross is smaller than a close button's,
	   in --muted like the placeholder, so it reads as part of the well. */
	.clear {
		position: absolute;
		top: 0;
		right: 0;
		display: grid;
		place-items: center;
		box-sizing: border-box;
		width: var(--control-height);
		height: var(--control-height);
		padding: 0;
		border: 1px solid transparent;
		background: transparent;
		background-clip: padding-box;
		color: var(--muted);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.clear svg {
		display: block;
		width: var(--space-4);
		height: var(--space-4);
	}
	.clear:active {
		background-color: var(--surface-raised);
		color: var(--text);
	}
	@media (hover: hover) and (pointer: fine) {
		.clear {
			transition:
				background-color var(--dur-hover) var(--settle),
				color var(--dur-hover) var(--settle);
		}
		.clear:hover {
			color: var(--text);
		}
		.clear:active {
			transition-duration: var(--dur-press);
		}
		/* The button is part of the well, so the well keeps its hover fill. */
		.search:has(> .clear:hover) > input {
			background-color: var(--surface-hover);
		}
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
	input + .error,
	.search + .hint,
	.search + .error {
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
	[data-label-beside='always'] .search,
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
		[data-label-beside='medium'] .search,
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
		[data-label-beside='expanded'] .search,
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
		[data-label-beside='large'] .search,
		[data-label-beside='large'] p {
			grid-column: 2;
		}
	}
</style>
