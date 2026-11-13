<script lang="ts" module>
	import type { HTMLSelectAttributes } from 'svelte/elements';

	export type NativeSelectItem<V = string> = {
		value: V;
		label: string;
		/**
		 * The `<optgroup>` the item sits in. Items with the same group share
		 * one, in the order each group first appears; items without one come
		 * first.
		 */
		group?: string;
		disabled?: boolean;
	};

	/** From which width the label sits beside the well: 600px, 900px or 1200px. */
	export type NativeSelectBreakpoint = 'medium' | 'expanded' | 'large';
</script>

<script lang="ts" generics="V = string">
	import { untrack, type Snippet } from 'svelte';
	import { fadeIn } from './internal/fade-in.js';
	import { groupOptions } from './internal/groups.js';

	const uid = $props.id();

	let {
		label,
		value = $bindable(),
		items,
		hint,
		error,
		labelBeside = false,
		id = uid,
		ref = $bindable(null),
		class: className,
		'aria-describedby': describedBy,
		'aria-invalid': ariaInvalid,
		children,
		...rest
	}: Omit<HTMLSelectAttributes, 'value' | 'multiple' | 'children'> & {
		/** The caps field label. */
		label: string;
		/** The chosen item's value. Bindable. */
		value?: V;
		/** The choices. Without it, pass `<option>` elements as children. */
		items?: NativeSelectItem<V>[];
		/** Guidance under the well in `--muted`, linked by `aria-describedby`. */
		hint?: string;
		/**
		 * The error to show under the well, with an icon, linked by
		 * `aria-describedby`; it sets `aria-invalid`. Say how to fix the
		 * problem. The app validates; the select shows what it is given.
		 */
		error?: string;
		/**
		 * The label sits above the well by default. `true` puts it beside the
		 * well at every width; a breakpoint puts it beside from that width up.
		 * The hint and the error stay under the well.
		 */
		labelBeside?: boolean | NativeSelectBreakpoint;
		children?: Snippet;
		/** The `<select>`, for example to focus the first error on submit. */
		ref?: HTMLSelectElement | null;
	} = $props();

	const grouped = $derived(items && groupOptions(items));

	const hintId = $derived(`${id}-hint`);
	const errorId = $derived(`${id}-error`);
	// The error first, so a screen reader reads it before the hint.
	const describedByIds = $derived(
		[error ? errorId : undefined, hint ? hintId : undefined, describedBy].filter(Boolean).join(' ') ||
			undefined
	);

	// ---- Short motion: the error (BRIEF, --dur-message) --------------------

	// As in TextField: an error that appears after the first render fades in
	// from 0 over --dur-message, and the well's edge fades to --danger with
	// it (the CSS below). An error that clears goes at once, and so does the
	// red edge. A select that renders with an error shows it at once.
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
	A single choice from a short fixed list. A native <select>, so phones keep
	their own picker (BRIEF, Apps and phones). Extra attributes, handlers and
	`class` go to the <select>.
-->
<div
	bind:this={root}
	class="hp-native-select"
	data-invalid={error ? '' : undefined}
	data-label-beside={labelBeside === true ? 'always' : labelBeside || undefined}
>
	<label class="hp-label" for={id}>{label}</label>
	<span class="hp-well-chevron">
		<select
			{...rest}
			bind:this={ref}
			bind:value
			{id}
			class={['hp-well', className]}
			aria-describedby={describedByIds}
			aria-invalid={error ? true : ariaInvalid}
		>
			{#if grouped}
				{#each grouped.loose as item (item.value)}
					<option value={item.value} disabled={item.disabled}>{item.label}</option>
				{/each}
				{#each grouped.groups as group (group.name)}
					<optgroup label={group.name}>
						{#each group.items as item (item.value)}
							<option value={item.value} disabled={item.disabled}>{item.label}</option>
						{/each}
					</optgroup>
				{/each}
			{:else}
				{@render children?.()}
			{/if}
		</select>
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
	.hp-native-select {
		display: grid;
		gap: var(--space-1);
		min-width: 0;
	}
	label {
		color: var(--muted);
	}
	/* The well fills its column, never narrower than a short choice and the
	   chevron. The wrapper is the grid item, so it holds the minimum; a
	   select's own minimum would be its longest option. */
	.hp-well-chevron {
		width: 100%;
		min-width: 136px;
	}
	select {
		display: block;
		width: 100%;
	}

	/* Invalid: the boundary turns --danger (5.9:1 on black), never alone:
	   the icon and the message say what is wrong. Keyed on the root's
	   data-invalid, set by `error`, so an aria-invalid the app passes
	   without a message draws no red border. The edge fades to --danger
	   over --dur-message with the message; the transition belongs to this
	   rule, so the edge goes back at once when the error clears. The hover
	   fill keeps base.css's timing. */
	[data-invalid] select {
		border-color: var(--danger);
		transition:
			background-color var(--dur-hover) var(--settle),
			border-color var(--dur-message) var(--settle);
	}
	[data-invalid] select:disabled {
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
	.hp-well-chevron + .hint,
	.hp-well-chevron + .error {
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
	[data-label-beside='always'] .hp-well-chevron,
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
		[data-label-beside='medium'] .hp-well-chevron,
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
		[data-label-beside='expanded'] .hp-well-chevron,
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
		[data-label-beside='large'] .hp-well-chevron,
		[data-label-beside='large'] p {
			grid-column: 2;
		}
	}
</style>
