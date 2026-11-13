<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import { Select as BitsSelect } from 'bits-ui';

	export type SelectItem = {
		value: string;
		/** The option's text, in the trigger once chosen, and for typeahead. */
		label: string;
		/** A second line in `--muted`. */
		description?: string;
		/**
		 * The heading the option sits under, as written. Options with the same
		 * group share one heading, in the order each group first appears;
		 * options without one come first.
		 */
		group?: string;
		disabled?: boolean;
	};

	export type SelectItemSnippetProps = {
		item: SelectItem;
		selected: boolean;
		highlighted: boolean;
	};

	export type SelectLabelBeside = boolean | 'medium' | 'expanded' | 'large';

	/** Attributes and handlers not listed here go to the trigger button. */
	export type SelectProps = Omit<
		BitsSelect.TriggerProps,
		'child' | 'children' | 'value' | 'name' | 'disabled' | 'type' | 'ref'
	> & {
		items: SelectItem[];
		/** The chosen item's `value`; `''` for none. */
		value?: string;
		open?: boolean;
		/** The caps field label above the trigger, and the sheet's title on compact widths. */
		label: string;
		/** Shown in `--muted` while nothing is chosen. Never the only label. */
		placeholder?: string;
		/** Guidance under the trigger in `--muted`, linked by `aria-describedby`. */
		hint?: string;
		/**
		 * The error to show under the trigger, with an icon, linked by
		 * `aria-describedby`; it sets `aria-invalid`. Say how to fix the
		 * problem. The app validates; the select shows what it is given.
		 */
		error?: string;
		disabled?: boolean;
		/** Submits the value with a form, through a hidden input. */
		name?: string;
		/**
		 * The label beside the trigger instead of above it: always (`true`), or
		 * from a breakpoint up (`medium` 600px, `expanded` 900px, `large` 1200px).
		 */
		labelBeside?: SelectLabelBeside;
		/** The compact sheet's close button name. */
		closeLabel?: string;
		/** The trigger button. */
		ref?: HTMLElement | null;
		/** Renders an option's content in place of its label and description. */
		item?: Snippet<[SelectItemSnippetProps]>;
	};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { pop } from '../motion/index.js';
	import { fadeIn } from './internal/fade-in.js';
	import { mountOnFirstOpen } from './internal/first-open.svelte.js';
	import { groupOptions } from './internal/groups.js';
	import Sheet from './internal/Sheet.svelte';

	const uid = $props.id();

	let {
		items,
		value = $bindable(''),
		open = $bindable(false),
		label,
		placeholder = '',
		hint,
		error,
		disabled = false,
		name,
		labelBeside = false,
		closeLabel = 'Close',
		id = `${uid}-trigger`,
		ref = $bindable(null),
		item: itemContent,
		class: className,
		'aria-describedby': describedBy,
		'aria-invalid': ariaInvalid,
		...rest
	}: SelectProps = $props();

	const labelId = `${uid}-label`;
	const hintId = $derived(`${id}-hint`);
	const errorId = $derived(`${id}-error`);
	// The error first, so a screen reader reads it before the hint.
	const describedByIds = $derived(
		[error ? errorId : undefined, hint ? hintId : undefined, describedBy].filter(Boolean).join(' ') ||
			undefined
	);

	// ---- Short motion: the error (BRIEF, --dur-message) --------------------

	// As in TextField: an error that appears after the first render fades in
	// from 0 over --dur-message, and the trigger's edge fades to --danger
	// with it (the CSS below). An error that clears goes at once, and so does
	// the red edge. A select that renders with an error shows it at once.
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

	// Compact (< 600px) opens a bottom sheet; medium and up a list under the
	// trigger (BRIEF, Apps and phones: Overlays and Choices).
	const wide = new MediaQuery('min-width: 600px', true);

	const chosen = $derived(items.find((i) => i.value === value));

	// The list's order: options without a group, then each group. Bits UI
	// gets it too, so typeahead on the closed trigger follows the list.
	const grouped = $derived(groupOptions(items));

	// The highlight moved by keys gets the focus contour; a pointer's gets the
	// hover tint alone. Focus itself stays on the trigger.
	let keyboard = $state(false);

	let sheetNode = $state<HTMLElement | null>(null);

	// Bits UI's portal and content mount on the first open, so a closed
	// select costs only its trigger. Typeahead on the closed trigger reads
	// Bits UI's `items`, not the options, so it works before that.
	const layers = mountOnFirstOpen(() => open);

	function close() {
		open = false;
		ref?.focus();
	}

	// The sheet's title row and handle sit outside the listbox; pressing
	// them is not an outside press.
	function insideSheet(e: PointerEvent) {
		if (sheetNode && e.target instanceof Node && sheetNode.contains(e.target)) e.preventDefault();
	}

	// Presses on the sheet keep focus on the trigger.
	function keepFocus(e: PointerEvent) {
		e.preventDefault();
	}

	// In the sheet, Bits UI never learns that its content is placed:
	// ContentStatic with forceMount reports placement once, at mount, while
	// still closed. So Bits neither opens it at the chosen option nor scrolls
	// to the option the keys move to; this does both, nearest edge first, as
	// Bits does in the popover. The viewport's scroll-padding keeps an option
	// clear of a group heading stuck at the top.
	function followHighlight(viewport: HTMLElement) {
		const reveal = (option: Element | null) => {
			if (!(option instanceof HTMLElement)) return;
			const top = option.offsetTop - (parseFloat(getComputedStyle(viewport).scrollPaddingTop) || 0);
			const bottom = option.offsetTop + option.offsetHeight;
			if (top < viewport.scrollTop) viewport.scrollTop = top;
			else if (bottom > viewport.scrollTop + viewport.clientHeight) {
				viewport.scrollTop = bottom - viewport.clientHeight;
			}
		};
		reveal(viewport.querySelector('[data-selected]'));
		const observer = new MutationObserver((records) => {
			if (!keyboard) return;
			for (const { target } of records) {
				if (target instanceof Element && target.hasAttribute('data-highlighted')) reveal(target);
			}
		});
		observer.observe(viewport, { subtree: true, attributes: true, attributeFilter: ['data-highlighted'] });
		return () => observer.disconnect();
	}
</script>

<div
	bind:this={root}
	class={['hp-select', className]}
	data-state={open ? 'open' : 'closed'}
	data-disabled={disabled || undefined}
	data-invalid={error ? '' : undefined}
	data-placeholder={chosen ? undefined : ''}
	data-label-beside={labelBeside === true ? 'always' : labelBeside || undefined}
	onkeydowncapture={() => (keyboard = true)}
	onpointerdowncapture={() => (keyboard = false)}
>
	<label class="hp-select-label hp-label" id={labelId} for={id}>{label}</label>

	<BitsSelect.Root
		type="single"
		bind:value
		bind:open={() => layers.open, (next) => (open = next)}
		items={grouped.ordered}
		{disabled}
		{name}
	>
		<BitsSelect.Trigger
			bind:ref
			{id}
			aria-labelledby={labelId}
			aria-describedby={describedByIds}
			aria-invalid={error ? true : ariaInvalid}
			{...rest}
		>
			{#snippet child({ props })}
				<span class="hp-select-field hp-well-chevron">
					<button {...props} class="hp-select-trigger hp-well" data-placeholder={chosen ? undefined : ''}>
						<span class="hp-select-value">{chosen?.label ?? placeholder}</span>
					</button>
				</span>
			{/snippet}
		</BitsSelect.Trigger>

		{#if layers.mounted}
			<BitsSelect.Portal>
				{#if wide.current}
					<BitsSelect.Content
						forceMount
						side="bottom"
						align="start"
						sideOffset={8}
						collisionPadding={8}
						aria-labelledby={labelId}
					>
						{#snippet child({ wrapperProps, props, open: shown })}
							{#if shown}
								<div {...wrapperProps}>
									<div
										{...props}
										class="hp-select-list"
										data-form="popover"
										data-keyboard={keyboard || undefined}
										onpointermovecapture={() => (keyboard = false)}
										transition:pop
									>
										{@render options(false)}
									</div>
								</div>
							{/if}
						{/snippet}
					</BitsSelect.Content>
				{:else}
					<BitsSelect.ContentStatic forceMount preventScroll aria-labelledby={labelId} onInteractOutside={insideSheet}>
						{#snippet child({ props, open: shown })}
							<Sheet
								open={shown}
								layer="popover"
								title={label}
								{closeLabel}
								onclose={close}
								bind:ref={sheetNode}
								onpointerdown={keepFocus}
							>
								<div
									{...props}
									class="hp-select-list"
									data-form="sheet"
									data-keyboard={keyboard || undefined}
									onpointermovecapture={() => (keyboard = false)}
								>
									{@render options(true)}
								</div>
							</Sheet>
						{/snippet}
					</BitsSelect.ContentStatic>
				{/if}
			</BitsSelect.Portal>
		{/if}
	</BitsSelect.Root>
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

{#snippet options(inSheet: boolean)}
	<BitsSelect.Viewport>
		{#snippet child({ props: viewportProps })}
			<div
				{...viewportProps}
				class="hp-select-viewport"
				data-grouped={grouped.groups.length ? '' : undefined}
				{@attach inSheet && followHighlight}
			>
				{#each grouped.loose as entry (entry.value)}
					{@render option(entry)}
				{/each}
				{#each grouped.groups as group (group.name)}
					<!-- role="group", named by its heading, which is no option: keys and
					     typeahead skip it. -->
					<BitsSelect.Group>
						{#snippet child({ props: groupProps })}
							<div {...groupProps} class="hp-select-group">
								<BitsSelect.GroupHeading>
									{#snippet child({ props: headingProps })}
										<div {...headingProps} class="hp-select-group-heading">{group.name}</div>
									{/snippet}
								</BitsSelect.GroupHeading>
								{#each group.items as entry (entry.value)}
									{@render option(entry)}
								{/each}
							</div>
						{/snippet}
					</BitsSelect.Group>
				{/each}
			</div>
		{/snippet}
	</BitsSelect.Viewport>
{/snippet}

{#snippet option(entry: SelectItem)}
	<BitsSelect.Item value={entry.value} label={entry.label} disabled={entry.disabled}>
		{#snippet child({ props: optionProps, selected, highlighted })}
			<div
				{...optionProps}
				class="hp-select-option"
				data-described={entry.description ? '' : undefined}
				aria-disabled={entry.disabled ? 'true' : undefined}
			>
				{#if itemContent}
					{@render itemContent({ item: entry, selected, highlighted })}
				{:else}
					<span class="hp-select-option-label">{entry.label}</span>
					{#if entry.description}
						<span class="hp-select-option-description">{entry.description}</span>
					{/if}
				{/if}
			</div>
		{/snippet}
	</BitsSelect.Item>
{/snippet}

<style>
	/* ---- Local tokens --------------------------------------------------- */

	/* The popover list renders in a portal at the end of <body>, outside
	   .hp-select, so it carries this itself. */
	.hp-select-list {
		/* The popover list's cap: eight and a half 36px rows, so a cut row
		   shows there is more. */
		--select-list-height: 320px;
	}

	/* ---- Field: caps label over a black well --------------------------- */

	.hp-select {
		/* Bits UI's hidden form input is absolutely placed in here. */
		position: relative;
		display: grid;
		gap: var(--space-1);
		min-width: 0;
	}

	.hp-select-label {
		color: var(--muted);
	}

	/* Label beside the trigger, as in a filter bar: always, or from a
	   breakpoint up. The label keeps its one line in the first column; the
	   trigger, hint and error share the second. */
	.hp-select[data-label-beside='always'] {
		grid-template-columns: auto minmax(0, 1fr);
		column-gap: var(--space-2);
	}
	.hp-select[data-label-beside='always'] .hp-select-label {
		grid-row: 1;
		align-self: center;
		white-space: nowrap;
	}
	.hp-select[data-label-beside='always'] .hp-select-field,
	.hp-select[data-label-beside='always'] p {
		grid-column: 2;
	}
	@media (min-width: 600px) {
		.hp-select[data-label-beside='medium'] {
			grid-template-columns: auto minmax(0, 1fr);
			column-gap: var(--space-2);
		}
		.hp-select[data-label-beside='medium'] .hp-select-label {
			grid-row: 1;
			align-self: center;
			white-space: nowrap;
		}
		.hp-select[data-label-beside='medium'] .hp-select-field,
		.hp-select[data-label-beside='medium'] p {
			grid-column: 2;
		}
	}
	@media (min-width: 900px) {
		.hp-select[data-label-beside='expanded'] {
			grid-template-columns: auto minmax(0, 1fr);
			column-gap: var(--space-2);
		}
		.hp-select[data-label-beside='expanded'] .hp-select-label {
			grid-row: 1;
			align-self: center;
			white-space: nowrap;
		}
		.hp-select[data-label-beside='expanded'] .hp-select-field,
		.hp-select[data-label-beside='expanded'] p {
			grid-column: 2;
		}
	}
	@media (min-width: 1200px) {
		.hp-select[data-label-beside='large'] {
			grid-template-columns: auto minmax(0, 1fr);
			column-gap: var(--space-2);
		}
		.hp-select[data-label-beside='large'] .hp-select-label {
			grid-row: 1;
			align-self: center;
			white-space: nowrap;
		}
		.hp-select[data-label-beside='large'] .hp-select-field,
		.hp-select[data-label-beside='large'] p {
			grid-column: 2;
		}
	}

	/* Invalid: the trigger's boundary turns --danger (5.9:1 on black), never
	   alone: the icon and the message say what is wrong. Keyed on the root's
	   data-invalid, set by `error`, so an aria-invalid the app passes
	   without a message draws no red border. The edge fades to --danger
	   over --dur-message with the message; the transition belongs to this
	   rule, so the edge goes back at once when the error clears. The hover
	   fill keeps base.css's timing. */
	[data-invalid] .hp-select-trigger {
		border-color: var(--danger);
		transition:
			background-color var(--dur-hover) var(--settle),
			border-color var(--dur-message) var(--settle);
	}
	[data-invalid][data-disabled] .hp-select-trigger {
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
	/* The first message starts 8px under the trigger, clear of the focus
	   contour (2px, drawn 4px outside the well). Bits UI's hidden input may
	   sit between them, so the rule reads by sibling order, not adjacency. */
	.hp-select-field ~ .hint,
	.hp-select-field ~ .error {
		margin-top: var(--space-1);
	}
	.hint ~ .error {
		margin-top: 0;
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

	/* The trigger is base.css's well; its wrapper draws the chevron, like a
	   native select's. The wrapper is the grid or flex item, so it holds the
	   width and the minimum. */
	.hp-select-field {
		width: 100%;
		min-width: 136px;
	}
	.hp-select-trigger {
		display: flex;
		align-items: center;
		width: 100%;
		text-align: start;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.hp-select-trigger:disabled {
		cursor: not-allowed;
	}
	.hp-select-trigger[data-placeholder] {
		color: var(--muted);
	}
	.hp-select-value {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* ---- The list: a popover on medium and up, the shared sheet's body on
	   compact (internal/Sheet.svelte, on the popover layer) ---------------- */

	.hp-select-list {
		/* Option text lines up with the trigger's text (popover) or the
		   sheet's title (sheet). */
		--option-inset: var(--space-3);

		position: relative;
		z-index: var(--layer-popover);
		box-sizing: border-box;
		background: var(--canvas);
		color: var(--text);
		font-family: var(--sans);
	}
	.hp-select-list[data-form='popover'] {
		min-width: var(--bits-select-anchor-width);
		max-width: max(var(--bits-select-anchor-width), min(var(--bits-select-content-available-width), 480px));
		max-height: min(var(--select-list-height), var(--bits-select-content-available-height));
		border: 1px solid var(--border-control);
	}
	.hp-select-list[data-form='sheet'] {
		--option-inset: var(--gutter);
		flex: 1 1 auto;
		min-height: 0;
	}

	/* Bits UI hides the viewport's scrollbar; a long list shows where it is. */
	.hp-select-viewport[data-select-viewport] {
		scrollbar-width: thin !important;
		overscroll-behavior: contain;
		padding-block: var(--space-1);
	}
	/* An option the keys or the chosen value scroll to stays clear of the
	   group heading stuck at the top: one heading line high. */
	.hp-select-viewport[data-grouped] {
		scroll-padding-top: calc(var(--space-2) + 16px + var(--space-1));
	}

	/* ---- Group headings ------------------------------------------------- */

	/* MenuGroup's heading: muted, on the options' text edge, 8px above and
	   4px below. The text stays as written, because a group name may be the
	   app's data (BRIEF, style rule 4). It stays at the top of the list while
	   its options scroll under it, until the next group pushes it up; that is
	   scrolling, not motion. It sticks to the viewport's edge, over its 4px
	   padding, so nothing shows above it. */
	.hp-select-group-heading {
		position: sticky;
		top: calc(-1 * var(--space-1));
		z-index: 1;
		padding: var(--space-2) var(--option-inset) var(--space-1);
		background: var(--canvas);
		color: var(--muted);
		font-size: var(--type-label);
		font-weight: 500;
		line-height: 16px;
		overflow-wrap: anywhere;
		user-select: none;
	}

	/* ---- Options: Geist list items, sentence case ----------------------- */

	.hp-select-option {
		display: flex;
		flex-direction: column;
		justify-content: center;
		box-sizing: border-box;
		/* 36px rows on fine pointers, 44px on coarse. */
		min-height: var(--control-height);
		padding: var(--space-1) var(--option-inset);
		font-size: var(--type-body);
		line-height: 24px;
		overflow-wrap: anywhere;
		cursor: pointer;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}
	.hp-select-option[data-described] {
		padding-block: var(--space-2);
	}
	.hp-select-option-description {
		color: var(--muted);
		font-size: var(--type-caption);
		line-height: 18px;
	}

	/* Highlight, by pointer or keys: the hover tint. Selection snaps, so
	   nothing here transitions (BRIEF, motion rule 3). */
	.hp-select-option[data-highlighted],
	.hp-select-option:active {
		background: var(--surface-hover);
	}
	/* Selected: a 3px titanium edge and the tint, text unchanged. Hover and
	   press never darken it. */
	.hp-select-option[data-selected] {
		background: var(--surface-selected);
		box-shadow: inset 3px 0 0 var(--accent);
	}
	/* Keys move a virtual focus (focus stays on the trigger), so the
	   highlight they move also draws the focus contour, inside the row. */
	.hp-select-list[data-keyboard] .hp-select-option[data-highlighted] {
		outline: 2px solid var(--focus);
		outline-offset: -2px;
	}
	.hp-select-option[data-disabled] {
		color: var(--muted);
		cursor: not-allowed;
	}
</style>
