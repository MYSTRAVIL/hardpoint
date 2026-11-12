<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { Checkbox as CheckboxPrimitive } from 'bits-ui';

	export type CheckboxGroupItem = {
		value: string;
		/** The text beside the box, as written. */
		label: string;
		/** A second line in `--muted` under the label. */
		hint?: string;
		/** A Tag after the label, such as "Recommended": a short fixed string, set in caps. */
		tag?: string;
		disabled?: boolean;
	};

	/** The group's name: a fixed caps `label`, or a `legend` set as written. Exactly one. */
	type CheckboxGroupName =
		| {
				/** The caps label that names the group: a fixed string the app defines. */
				label: string;
				legend?: never;
		  }
		| {
				label?: never;
				/**
				 * The group's name as content, set as written in 16px at weight 500:
				 * a question, or a name with a counter before it.
				 */
				legend: Snippet;
		  };

	/** Attributes and handlers not listed here go to the group element. */
	export type CheckboxGroupProps = Omit<CheckboxPrimitive.GroupProps, 'child' | 'children' | 'ref'> &
		CheckboxGroupName & {
			/** A line in `--muted` under the name, read out as the group's description. */
			hint?: string;
			/**
			 * The error to show under the boxes, with an icon, linked by
			 * `aria-describedby`; it sets `aria-invalid` on the group. Say how to
			 * fix the problem. The app validates; the group shows what it is given.
			 */
			error?: string;
			/** The choices. Without it, pass `Checkbox` components with a `value` as children. */
			items?: CheckboxGroupItem[];
			children?: Snippet;
			/** The group element. */
			ref?: HTMLElement | null;
		};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { Checkbox as BitsCheckbox } from 'bits-ui';
	import Checkbox from './Checkbox.svelte';
	import { fadeIn } from './internal/fade-in.js';

	const uid = $props.id();

	let {
		value = $bindable([]),
		label,
		legend,
		hint,
		error,
		items,
		id = uid,
		ref = $bindable(null),
		class: className,
		'aria-describedby': describedBy,
		'aria-invalid': ariaInvalid,
		children,
		...rest
	}: CheckboxGroupProps = $props();

	const hintId = $derived(`${id}-hint`);
	const errorId = $derived(`${id}-error`);
	// The error first, so a screen reader reads it before the hint.
	const describedByIds = $derived(
		[error ? errorId : undefined, hint ? hintId : undefined, describedBy].filter(Boolean).join(' ') ||
			undefined
	);

	// ---- Short motion: the error (BRIEF, --dur-message) ---------------------

	// As in TextField: an error that appears after the first render fades in
	// from 0 over --dur-message; one that clears goes at once; a group that
	// renders with an error shows it at once.
	let errorShown = untrack(() => !!error);
	$effect(() => {
		const shown = !!error;
		untrack(() => {
			const appeared = shown && !errorShown;
			errorShown = shown;
			const message = appeared ? ref?.querySelector(':scope > .error') : null;
			if (message) fadeIn(message, '--dur-message');
		});
	});
</script>

<!--
	Several independent choices under one name: a Bits UI Checkbox.Group, a
	role="group" element named by its caps `label` or its `legend`.
	`bind:value` holds the values of the checked boxes. `disabled`,
	`required`, `readonly` and `name` apply to every box. Attributes, handlers
	and `class` go to the group element.
-->
<BitsCheckbox.Group
	bind:value
	bind:ref
	{id}
	aria-describedby={describedByIds}
	aria-invalid={error ? true : ariaInvalid}
	{...rest}
>
	{#snippet child({ props })}
		<div {...props} class={['hp-checkbox-group', className]} data-invalid={error ? '' : undefined}>
			<BitsCheckbox.GroupLabel>
				{#snippet child({ props: labelProps })}
					{#if legend}
						<div {...labelProps} class="legend">{@render legend()}</div>
					{:else}
						<span {...labelProps} class="hp-label group-label">{label}</span>
					{/if}
				{/snippet}
			</BitsCheckbox.GroupLabel>
			{#if hint}
				<p class="hint hp-caption" id={hintId}>{hint}</p>
			{/if}
			<div class="items">
				{#if items}
					{#each items as item (item.value)}
						<Checkbox
							value={item.value}
							label={item.label}
							tag={item.tag}
							hint={item.hint}
							disabled={item.disabled}
						/>
					{/each}
				{:else}
					{@render children?.()}
				{/if}
			</div>
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
	{/snippet}
</BitsCheckbox.Group>

<style>
	/* The name, its hint, then the boxes, 8px apart so neighbouring targets
	   never touch, then the error. Rows keep their own height when a layout
	   makes the group taller. */
	.hp-checkbox-group {
		display: grid;
		align-content: start;
		gap: var(--space-1);
		min-width: 0;
	}
	.group-label,
	.hint {
		color: var(--muted);
	}
	/* A name set as written: a question, or a name with a counter. */
	.legend {
		font-size: var(--type-body);
		font-weight: 500;
		line-height: 24px;
	}
	[data-disabled] > .legend {
		color: var(--muted);
	}
	.items {
		display: grid;
		gap: var(--space-2);
	}

	/* ---- The error: TextField's ------------------------------------------- */

	/* It starts 8px under the last box's row, clear of its focus contour. */
	.error {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-1);
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
</style>
