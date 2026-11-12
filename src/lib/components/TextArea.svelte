<script lang="ts" module>
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	/** Attributes and handlers not listed here go to the `<textarea>`. */
	export type TextAreaProps = Omit<HTMLTextareaAttributes, 'value' | 'children' | 'rows'> & {
		/** The caps field label above the well. Required: a placeholder is never the only label. */
		label: string;
		/** The text. Bindable. */
		value?: string;
		/** Guidance under the well in `--muted`, linked by `aria-describedby`. */
		hint?: string;
		/**
		 * The error to show under the well, with an icon, linked by
		 * `aria-describedby`; it sets `aria-invalid`. Say how to fix the
		 * problem. The app validates; the field shows what it is given.
		 */
		error?: string;
		/** The height of the empty well, in lines. */
		rows?: number;
		/**
		 * The well grows with its text up to this many lines, then scrolls
		 * inside. Never less than `rows`.
		 */
		maxRows?: number;
		/** The `<textarea>`, for example to focus the first error on submit. */
		ref?: HTMLTextAreaElement | null;
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
		hint,
		error,
		rows = 3,
		maxRows = 10,
		id = uid,
		disabled,
		readonly,
		ref = $bindable(null),
		class: className,
		'aria-describedby': describedBy,
		'aria-invalid': ariaInvalid,
		...rest
	}: TextAreaProps = $props();

	const hintId = $derived(`${id}-hint`);
	const errorId = $derived(`${id}-error`);
	// The error first, so a screen reader reads it before the hint.
	const describedByIds = $derived(
		[error ? errorId : undefined, hint ? hintId : undefined, describedBy].filter(Boolean).join(' ') ||
			undefined
	);

	// ---- Short motion: the error (BRIEF, --dur-message) --------------------

	// As TextField: an error that appears after the first render fades in
	// from 0 over --dur-message, and the well's edge fades to --danger with
	// it (the CSS below). An error that clears goes at once, and so does the
	// red edge. A field that renders or mounts with an error shows it at once.
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

	// ---- Growth ------------------------------------------------------------

	// Where the browser has field-sizing (Chromium 123+), CSS alone sizes the
	// well between its rows and maxRows heights. Elsewhere the height comes
	// from scrollHeight whenever the text, the line counts or the width
	// change, written through element.style, never a style attribute.
	const sizesItself = typeof CSS !== 'undefined' && CSS.supports('field-sizing', 'content');

	function fit(field: HTMLTextAreaElement) {
		// The well collapses to its content to measure it. Holding the root's
		// height meanwhile keeps the page from getting shorter, which would
		// move its scroll position. Without a scrollbar while it measures, the
		// text wraps at the width it has once it fits.
		if (root) root.style.minHeight = `${root.offsetHeight}px`;
		field.style.overflowY = 'hidden';
		field.style.height = 'auto';
		const borders = field.offsetHeight - field.clientHeight;
		field.style.height = `${field.scrollHeight + borders}px`;
		field.style.overflowY = '';
		if (root) root.style.minHeight = '';
	}

	$effect(() => {
		const field = ref;
		if (sizesItself || !field) return;
		// Read so the effect runs again when they change. A new `style` from
		// the app replaces the element's inline height, so it refits too.
		void [value, rows, maxRows, rest.style];
		fit(field);
	});

	$effect(() => {
		const field = ref;
		if (sizesItself || !field) return;
		let width = field.clientWidth;
		const observer = new ResizeObserver(() => {
			if (field.clientWidth === width) return;
			width = field.clientWidth;
			fit(field);
		});
		observer.observe(field);
		return () => observer.disconnect();
	});
</script>

<!--
	Multi-line text in the black well, with a plain caps label above it (Bits
	UI Label), an optional hint and an inline error below. The well starts
	`rows` lines high, grows with its text up to `maxRows` lines, then scrolls
	inside. Extra attributes (`name`, `placeholder`, `required`, `maxlength`,
	`autocomplete`, `enterkeyhint`), handlers and `class` go to the
	<textarea>. The textarea is never re-created and its value is written
	only when it differs, so the text, the caret and focus survive any
	re-render around it.
-->
<div
	bind:this={root}
	class="hp-text-area"
	data-invalid={error ? '' : undefined}
	data-disabled={disabled ? '' : undefined}
	data-readonly={readonly ? '' : undefined}
	style:--text-area-rows={Math.max(1, rows)}
	style:--text-area-max-rows={Math.max(1, maxRows)}
>
	<Label.Root for={id}>
		{#snippet child({ props })}
			<label {...props} class="hp-label">{label}</label>
		{/snippet}
	</Label.Root>
	<textarea
		{...rest}
		bind:this={ref}
		bind:value
		{id}
		rows={Math.max(1, rows)}
		{disabled}
		{readonly}
		class={['hp-well', className]}
		aria-describedby={describedByIds}
		aria-invalid={error ? true : ariaInvalid}
	></textarea>
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
	.hp-text-area {
		display: grid;
		gap: var(--space-1);
		min-width: 0;
	}
	label {
		color: var(--muted);
	}

	/* The well, in lines of 24px. Its heights are the line count times the
	   line, plus 12px of padding at the top and bottom and the two 1px
	   borders: 98px empty and 266px at most by default. The root sets the
	   line counts from `rows` and `maxRows`; the fallbacks are the defaults,
	   for a page whose policy blocks the style attribute of server-rendered
	   markup. The text is 16px at every width, from .hp-well. */
	textarea {
		display: block;
		width: 100%;
		min-width: 0;
		height: auto;
		min-height: calc(var(--text-area-rows, 3) * 24px + 2 * var(--space-3) + 2px);
		max-height: calc(var(--text-area-max-rows, 10) * 24px + 2 * var(--space-3) + 2px);
		padding: var(--space-3);
		line-height: 24px;
		field-sizing: content;
		resize: none;
		overflow-y: auto;
		/* Once it scrolls, the browser keeps the caret's line clear of the
		   padding, so the line being typed never sits on the edge. */
		scroll-padding-block: var(--space-3);
		/* As the other scrolling parts: a thin bar on fine pointers; touch
		   shows its own while it scrolls. */
		scrollbar-width: thin;
	}
	textarea::placeholder {
		color: var(--muted);
		opacity: 1;
	}

	/* Read-only: muted text as when disabled, and no hover fill, because
	   nothing here can change. It keeps the 3:1 boundary: the field still
	   takes focus and its text can be selected and copied, so it stays a
	   control (WCAG 1.4.11 exempts only inactive ones). */
	textarea[readonly] {
		color: var(--muted);
	}
	@media (hover: hover) and (pointer: fine) {
		textarea[readonly]:hover {
			background-color: var(--canvas);
		}
	}

	/* Invalid: as TextField. The boundary turns --danger, never alone: the
	   icon and the message say what is wrong. Keyed on the root's
	   data-invalid, set by `error`. The edge fades to --danger over
	   --dur-message with the message and goes back at once when the error
	   clears. A disabled well keeps --border. */
	[data-invalid] textarea {
		border-color: var(--danger);
		transition:
			background-color var(--dur-hover) var(--settle),
			border-color var(--dur-message) var(--settle);
	}
	[data-invalid] textarea:disabled {
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
	textarea + .hint,
	textarea + .error {
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
</style>
