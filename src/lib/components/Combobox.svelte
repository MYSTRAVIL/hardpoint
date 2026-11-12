<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	export type ComboboxItem = {
		value: string;
		/** The option's text: what the default filter matches, and the field's text once chosen. */
		label: string;
		/** A second line in `--muted`. */
		description?: string;
		/**
		 * The heading the option sits under, as written; the default filter
		 * matches it too. Options with the same group share one heading, in the
		 * order each group first appears; options without one come first.
		 */
		group?: string;
		disabled?: boolean;
	};

	export type ComboboxItemSnippetProps = {
		item: ComboboxItem;
		selected: boolean;
		highlighted: boolean;
	};

	export type ComboboxLabelBeside = boolean | 'medium' | 'expanded' | 'large';

	/** Whether an item stays in the list for the typed text (trimmed, never empty). */
	export type ComboboxFilter = (item: ComboboxItem, query: string) => boolean;

	/**
	 * Attributes and handlers not listed here go to the field control: the
	 * text input from 600px, the button that opens the sheet below.
	 */
	export type ComboboxProps = Omit<HTMLAttributes<HTMLElement>, 'children' | 'id'> & {
		items: ComboboxItem[];
		/** The chosen item's `value`; `''` for none. It changes only by choosing from the list. */
		value?: string;
		open?: boolean;
		/** The caps field label above the field, and the sheet's title on compact widths. */
		label: string;
		/** Shown in `--muted` in the empty field and in the sheet's search input. Never the only label. */
		placeholder?: string;
		/** Guidance under the field in `--muted`, linked by `aria-describedby`. */
		hint?: string;
		/**
		 * The error to show under the field, with an icon, linked by
		 * `aria-describedby`; it sets `aria-invalid`. Say how to fix it.
		 */
		error?: string;
		disabled?: boolean;
		/** Submits the value with a form, through a hidden input. */
		name?: string;
		/**
		 * The label beside the field instead of above it: always (`true`), or
		 * from a breakpoint up (`medium` 600px, `expanded` 900px, `large` 1200px).
		 * The hint and the error stay under the field.
		 */
		labelBeside?: ComboboxLabelBeside;
		/**
		 * Replaces the default filter: the label or the group contains the text,
		 * ignoring case and accents.
		 */
		filter?: ComboboxFilter;
		/** Shown in place of the options when nothing matches. */
		emptyText?: string;
		/** The sheet's close button name. */
		closeLabel?: string;
		/** The field control's id; the label points at it. */
		id?: string;
		/** The field control: the text input from 600px, the button below. */
		ref?: HTMLElement | null;
		/** Renders an option's content in place of its label and description. */
		item?: Snippet<[ComboboxItemSnippetProps]>;
	};
</script>

<script lang="ts">
	import { Combobox as BitsCombobox } from 'bits-ui';
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
		filter,
		emptyText = 'No matches',
		closeLabel = 'Close',
		id = `${uid}-field`,
		ref = $bindable(null),
		item: itemContent,
		class: className,
		onclick: onclickProp,
		oninput: oninputProp,
		'aria-describedby': describedBy,
		'aria-invalid': ariaInvalid,
		...rest
	}: ComboboxProps = $props();

	const labelId = `${uid}-label`;
	const sheetId = `${uid}-sheet`;
	// The listbox, in the popover or the sheet; the input that drives it
	// says so with aria-controls, which Bits UI leaves out.
	const listId = `${uid}-list`;
	const sheetTitleId = `${uid}-sheet-title`;
	const hintId = $derived(`${id}-hint`);
	const errorId = $derived(`${id}-error`);
	// The error first, so a screen reader reads it before the hint.
	const describedByIds = $derived(
		[error ? errorId : undefined, hint ? hintId : undefined, describedBy].filter(Boolean).join(' ') ||
			undefined
	);
	const invalid = $derived(error ? true : ariaInvalid);

	// Short motion (BRIEF, --dur-message), as TextField: an error that
	// appears after the first render fades in from 0 and the field's edge
	// fades to --danger with it; one that clears goes at once. A field that
	// renders or mounts with an error shows it at once. 0ms is a snap.
	let root: HTMLDivElement | null = $state(null);
	let errorShown = untrack(() => !!error);
	$effect(() => {
		const shown = !!error;
		untrack(() => {
			const appeared = shown && !errorShown;
			errorShown = shown;
			const message = appeared ? root?.querySelector(':scope > .hp-combobox-messages > .hp-combobox-error') : null;
			if (message) fadeIn(message, '--dur-message');
		});
	});

	// Compact (< 600px) opens a bottom sheet with the search input inside;
	// medium and up type in the field and list under it (BRIEF, Apps and
	// phones: Overlays and Choices).
	const wide = new MediaQuery('min-width: 600px', true);

	const chosen = $derived(items.find((i) => i.value === value));
	// A string, so a fresh `items` array with the same choice changes nothing.
	const chosenLabel = $derived(chosen?.label ?? '');

	// The input's text. It shows the chosen label while the list is closed;
	// typing overrides it, and closing puts the label back, so the value
	// only ever comes from the list.
	let text = $derived(chosenLabel);
	// What the list is filtered by: only what was typed since it opened, so
	// it opens with every option even when the field shows a label.
	let query = $state('');

	const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
	const byLabelOrGroup: ComboboxFilter = (entry, q) => {
		const needle = fold(q);
		return fold(entry.label).includes(needle) || (!!entry.group && fold(entry.group).includes(needle));
	};
	const matches = $derived.by(() => {
		const q = query.trim();
		if (!q) return items;
		const keep = filter ?? byLabelOrGroup;
		return items.filter((entry) => keep(entry, q));
	});
	// Options without a group, then each group that still has a match; a
	// group whose options all filter out drops its heading too.
	const grouped = $derived(groupOptions(matches));

	// The highlight moved by keys gets the focus contour; a pointer's gets the
	// hover tint alone. Focus itself stays in the input.
	let keyboard = $state(false);

	// Whether Ctrl or Meta was held at the last key press in the field. Bits
	// UI opens the list on any key, Ctrl and Meta included, so a shortcut
	// such as Ctrl+C opens it too; that open keeps the field's selection, so
	// the shortcut copies what the person selected, not the whole label.
	let shortcut = false;

	let panelNode = $state<HTMLElement | null>(null);
	let sheetNode = $state<HTMLElement | null>(null);

	// Bits UI's portal and content mount on the first open, so a closed
	// combobox costs only its field. The first key typed in the field opens
	// it and lands in the field as before; the list mounts, then filters.
	const layers = mountOnFirstOpen(() => open);

	// Every open and close passes here once, whoever caused it: Bits UI
	// (typing, Escape, an outside press, a choice, Tab), the field, the
	// sheet's close button and swipe, or the app through `bind:open`.
	let settled = false;
	function openChanged(next: boolean) {
		if (next === settled) return;
		settled = next;
		query = '';
		if (next) {
			if (!wide.current) {
				// The sheet's search input starts empty.
				text = '';
			} else if (!shortcut && ref instanceof HTMLInputElement && document.activeElement === ref) {
				// Opened in the field, by a press or a key: the text is selected
				// (before a typed character lands), so typing replaces the label
				// and filters on what was typed alone.
				ref.select();
			}
			return;
		}
		text = chosenLabel;
		// The sheet held focus; give it back to the field.
		if (!wide.current) {
			const active = document.activeElement;
			if (!active || active === document.body || sheetNode?.contains(active)) ref?.focus();
		}
	}
	$effect.pre(() => {
		const next = open;
		untrack(() => openChanged(next));
	});

	function setOpen(next: boolean) {
		open = next;
		openChanged(next);
	}

	function onInput(e: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		oninputProp?.(e);
		query = e.currentTarget.value;
		text = query;
		// The matches show from the top, so Bits UI's highlight, which goes to
		// the first option in view, lands on the first match, and no match
		// waits above the fold or under a group heading.
		const viewport = document.getElementById(listId)?.querySelector('[data-combobox-viewport]');
		if (viewport) viewport.scrollTop = 0;
	}

	// A press on the field opens the list (openChanged selects its text).
	// While open, a press on the chevron end closes it; one on the text
	// places the caret. A label's click (detail 0) only focuses.
	function onFieldClick(e: MouseEvent & { currentTarget: EventTarget & HTMLInputElement }) {
		onclickProp?.(e);
		if (disabled || e.detail === 0) return;
		const input = e.currentTarget;
		if (!open) {
			setOpen(true);
			return;
		}
		const box = input.getBoundingClientRect();
		if (e.clientX >= box.right - parseFloat(getComputedStyle(input).paddingRight)) setOpen(false);
	}

	function onTriggerClick(e: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		onclickProp?.(e);
		if (!disabled) setOpen(true);
	}

	// As on Select's trigger: the arrow keys open the sheet too.
	function onTriggerKeydown(e: KeyboardEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		rest.onkeydown?.(e);
		if (disabled || e.defaultPrevented) return;
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			setOpen(true);
		}
	}

	function close() {
		setOpen(false);
	}

	// The panel's empty line and the sheet's title row sit outside the
	// listbox; pressing them is not an outside press.
	function insidePanel(e: PointerEvent) {
		if (panelNode && e.target instanceof Node && panelNode.contains(e.target)) e.preventDefault();
	}
	function insideSheet(e: PointerEvent) {
		if (sheetNode && e.target instanceof Node && sheetNode.contains(e.target)) e.preventDefault();
	}

	// Presses on the overlay's chrome keep focus in the input; a press on the
	// sheet's search input itself still focuses it.
	function keepFocus(e: PointerEvent) {
		if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
	}

	function focusOnMount(node: HTMLInputElement) {
		node.focus({ preventScroll: true });
	}

	// In the sheet, Bits UI never learns that its content is placed:
	// ContentStatic with forceMount reports placement once, at mount, while
	// still closed. So Bits neither opens it at the chosen option nor scrolls
	// to the option the keys move to; this does both, nearest edge first, as
	// Bits does in the popover (Select does the same). The viewport's
	// scroll-padding keeps an option clear of a group heading stuck at the top.
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
	class={['hp-combobox', className]}
	data-state={open ? 'open' : 'closed'}
	data-disabled={disabled || undefined}
	data-placeholder={chosen ? undefined : ''}
	data-invalid={error ? '' : undefined}
	data-label-beside={labelBeside === true ? 'always' : labelBeside || undefined}
	onkeydowncapture={(e) => {
		keyboard = true;
		// Chrome on Windows reports AltGr as Ctrl+Alt; AltGr types a character.
		shortcut = (e.ctrlKey || e.metaKey) && !e.altKey;
	}}
	onpointerdowncapture={() => {
		keyboard = false;
		shortcut = false;
	}}
>
	<label class="hp-combobox-label hp-label" id={labelId} for={id}>{label}</label>

	<BitsCombobox.Root
		type="single"
		bind:value
		bind:open={() => layers.open, (next) => (open = next)}
		{items}
		{disabled}
		{name}
		allowDeselect={false}
		inputValue={text}
		onOpenChange={openChanged}
	>
		{#if wide.current}
			<BitsCombobox.Input
				{...rest}
				bind:ref
				{id}
				{placeholder}
				autocomplete="off"
				spellcheck={false}
				aria-describedby={describedByIds}
				aria-invalid={invalid}
				oninput={onInput}
				aria-controls={layers.open ? listId : undefined}
				onclick={onFieldClick}
			>
				{#snippet child({ props })}
					<span class="hp-combobox-field hp-well-chevron">
						<input {...props} class="hp-combobox-input hp-well" />
					</span>
				{/snippet}
			</BitsCombobox.Input>

			{#if layers.mounted}
				<BitsCombobox.Portal>
					<BitsCombobox.Content
						id={listId}
						forceMount
						side="bottom"
						align="start"
						sideOffset={8}
						collisionPadding={8}
						aria-labelledby={labelId}
						onInteractOutside={insidePanel}
					>
						{#snippet child({ wrapperProps, props, open: shown })}
							{#if shown}
								<div {...wrapperProps}>
									<div
										class="hp-combobox-panel"
										data-form="popover"
										data-side={props['data-side'] as string | undefined}
										bind:this={panelNode}
										role="presentation"
										onpointerdown={keepFocus}
										transition:pop
									>
										{@render empty(false)}
										<div
											{...props}
											class="hp-combobox-list"
											data-form="popover"
											data-empty={matches.length ? undefined : ''}
											data-keyboard={keyboard || undefined}
											onpointermovecapture={() => (keyboard = false)}
										>
											{@render options(false)}
										</div>
									</div>
								</div>
							{/if}
						{/snippet}
					</BitsCombobox.Content>
				</BitsCombobox.Portal>
			{/if}
		{:else}
			<span class="hp-combobox-field hp-well-chevron">
				<button
					{...rest}
					bind:this={ref}
					type="button"
					{id}
					class="hp-combobox-trigger hp-well"
					role="combobox"
					aria-haspopup="dialog"
					aria-expanded={open}
					aria-controls={layers.open ? sheetId : undefined}
					aria-labelledby={labelId}
					aria-describedby={describedByIds}
					aria-invalid={invalid}
					data-placeholder={chosen ? undefined : ''}
					{disabled}
					onclick={onTriggerClick}
					onkeydown={onTriggerKeydown}
				>
					<span class="hp-combobox-value">{chosen?.label ?? placeholder}</span>
				</button>
			</span>

			{#if layers.mounted}
				<BitsCombobox.Portal>
					<BitsCombobox.ContentStatic id={listId} forceMount preventScroll onInteractOutside={insideSheet}>
						{#snippet child({ props, open: shown })}
							<Sheet
								open={shown}
								title={label}
								titleId={sheetTitleId}
								layer="popover"
								onclose={close}
								{closeLabel}
								bind:ref={sheetNode}
								id={sheetId}
								role="dialog"
								aria-modal="true"
								aria-labelledby={sheetTitleId}
								onpointerdown={keepFocus}
							>
								<div class="hp-combobox-search" onkeydowncapture={() => (keyboard = true)}>
									<BitsCombobox.Input
										{placeholder}
										autocomplete="off"
										spellcheck={false}
										aria-labelledby={sheetTitleId}
										aria-describedby={describedByIds}
										aria-controls={layers.open ? listId : undefined}
										oninput={onInput}
									>
										{#snippet child({ props: inputProps })}
											<input {...inputProps} class="hp-combobox-input hp-well" {@attach focusOnMount} />
										{/snippet}
									</BitsCombobox.Input>
								</div>
								{@render empty(true)}
								<div
									{...props}
									class="hp-combobox-list"
									data-form="sheet"
									data-empty={matches.length ? undefined : ''}
									aria-labelledby={sheetTitleId}
									data-keyboard={keyboard || undefined}
									onpointermovecapture={() => (keyboard = false)}
								>
									{@render options(true)}
								</div>
							</Sheet>
						{/snippet}
					</BitsCombobox.ContentStatic>
				</BitsCombobox.Portal>
			{/if}
		{/if}
	</BitsCombobox.Root>

	{#if hint || error}
		<div class="hp-combobox-messages">
			{#if hint}
				<p class="hp-combobox-hint hp-caption" id={hintId}>{hint}</p>
			{/if}
			{#if error}
				<p class="hp-combobox-error hp-caption" id={errorId}>
					<span class="hp-combobox-error-icon" aria-hidden="true">
						<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor">
							<path d="M1.5 1.5h13v13h-13z" />
							<path d="M8 4v4M8 10v2" stroke-width="2" />
						</svg>
					</span>
					<span>{error}</span>
				</p>
			{/if}
		</div>
	{/if}
</div>

{#snippet options(inSheet: boolean)}
	<BitsCombobox.Viewport>
		{#snippet child({ props: viewportProps })}
			<div
				{...viewportProps}
				class="hp-combobox-viewport"
				data-grouped={grouped.groups.length ? '' : undefined}
				{@attach inSheet && followHighlight}
			>
				{#each grouped.loose as entry (entry.value)}
					{@render option(entry)}
				{/each}
				{#each grouped.groups as group (group.name)}
					<!-- role="group", named by its heading, which is no option: keys
					     skip it. -->
					<BitsCombobox.Group>
						{#snippet child({ props: groupProps })}
							<div {...groupProps} class="hp-combobox-group">
								<BitsCombobox.GroupHeading>
									{#snippet child({ props: headingProps })}
										<div {...headingProps} class="hp-combobox-group-heading">{group.name}</div>
									{/snippet}
								</BitsCombobox.GroupHeading>
								{#each group.items as entry (entry.value)}
									{@render option(entry)}
								{/each}
							</div>
						{/snippet}
					</BitsCombobox.Group>
				{/each}
			</div>
		{/snippet}
	</BitsCombobox.Viewport>
{/snippet}

{#snippet option(entry: ComboboxItem)}
	<BitsCombobox.Item value={entry.value} label={entry.label} disabled={entry.disabled}>
		{#snippet child({ props: optionProps, selected, highlighted })}
			<div
				{...optionProps}
				class="hp-combobox-option"
				data-described={entry.description ? '' : undefined}
				aria-disabled={entry.disabled ? 'true' : undefined}
			>
				{#if itemContent}
					{@render itemContent({ item: entry, selected, highlighted })}
				{:else}
					<span class="hp-combobox-option-label">{entry.label}</span>
					{#if entry.description}
						<span class="hp-combobox-option-description">{entry.description}</span>
					{/if}
				{/if}
			</div>
		{/snippet}
	</BitsCombobox.Item>
{/snippet}

<!-- Outside the listbox, which may hold options and groups only. Mounted
	 while the list is open, so the text it gains when nothing matches is
	 announced. -->
{#snippet empty(inSheet: boolean)}
	<p class="hp-combobox-empty" data-form={inSheet ? 'sheet' : 'popover'} role="status">
		{#if !matches.length}{emptyText}{/if}
	</p>
{/snippet}

<style>
	/* ---- Field: caps label over a black well --------------------------- */

	.hp-combobox {
		/* Bits UI's hidden form input is absolutely placed in here. */
		position: relative;
		display: grid;
		gap: var(--space-1);
		min-width: 0;
	}

	.hp-combobox-label {
		color: var(--muted);
	}

	/* The input or the trigger is base.css's well; its wrapper draws the
	   chevron, like a select's. The wrapper is the grid item, so it holds
	   the width and the minimum. */
	.hp-combobox-field {
		width: 100%;
		min-width: 136px;
	}
	.hp-combobox-input {
		display: block;
		width: 100%;
		min-width: 0;
	}
	.hp-combobox-input::placeholder {
		color: var(--muted);
		opacity: 1;
	}
	.hp-combobox-trigger {
		display: flex;
		align-items: center;
		width: 100%;
		text-align: start;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.hp-combobox-trigger:disabled {
		cursor: not-allowed;
	}
	.hp-combobox-trigger[data-placeholder] {
		color: var(--muted);
	}
	.hp-combobox-value {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Invalid: the boundary turns --danger, never alone: the icon and the
	   message say what is wrong (as TextField). It fades to --danger over
	   --dur-message with the message and goes back at once when the error
	   clears, because the transition belongs to this rule. The hover fill
	   keeps base.css's timing. */
	.hp-combobox[data-invalid] .hp-well {
		border-color: var(--danger);
		transition:
			background-color var(--dur-hover) var(--settle),
			border-color var(--dur-message) var(--settle);
	}
	.hp-combobox[data-invalid] .hp-well:disabled {
		border-color: var(--border);
	}

	/* ---- Hint and error, as TextField's -------------------------------- */

	/* The first message starts 8px under the well, clear of the focus
	   contour (2px, drawn 4px outside the well); 4px between messages. */
	.hp-combobox-messages {
		display: grid;
		gap: var(--space-1);
		margin-top: var(--space-1);
	}
	.hp-combobox-hint {
		margin: 0;
		color: var(--muted);
	}
	.hp-combobox-error {
		display: flex;
		gap: var(--space-2);
		margin: 0;
		color: var(--danger);
	}
	/* One line box high, so the icon centres on the first line of the
	   message however it wraps. */
	.hp-combobox-error-icon {
		display: flex;
		flex: none;
		align-items: center;
		height: 1lh;
	}
	.hp-combobox-error-icon svg {
		display: block;
	}

	/* ---- Label beside the field: always, or from a breakpoint up ------- */

	/* The label keeps its one line in the first column; the field and its
	   messages share the second. */
	.hp-combobox[data-label-beside='always'] {
		grid-template-columns: auto minmax(0, 1fr);
		column-gap: var(--space-2);
	}
	.hp-combobox[data-label-beside='always'] .hp-combobox-label {
		grid-row: 1;
		align-self: center;
		white-space: nowrap;
	}
	.hp-combobox[data-label-beside='always'] .hp-combobox-field,
	.hp-combobox[data-label-beside='always'] .hp-combobox-messages {
		grid-column: 2;
	}
	@media (min-width: 600px) {
		.hp-combobox[data-label-beside='medium'] {
			grid-template-columns: auto minmax(0, 1fr);
			column-gap: var(--space-2);
		}
		.hp-combobox[data-label-beside='medium'] .hp-combobox-label {
			grid-row: 1;
			align-self: center;
			white-space: nowrap;
		}
		.hp-combobox[data-label-beside='medium'] .hp-combobox-field,
		.hp-combobox[data-label-beside='medium'] .hp-combobox-messages {
			grid-column: 2;
		}
	}
	@media (min-width: 900px) {
		.hp-combobox[data-label-beside='expanded'] {
			grid-template-columns: auto minmax(0, 1fr);
			column-gap: var(--space-2);
		}
		.hp-combobox[data-label-beside='expanded'] .hp-combobox-label {
			grid-row: 1;
			align-self: center;
			white-space: nowrap;
		}
		.hp-combobox[data-label-beside='expanded'] .hp-combobox-field,
		.hp-combobox[data-label-beside='expanded'] .hp-combobox-messages {
			grid-column: 2;
		}
	}
	@media (min-width: 1200px) {
		.hp-combobox[data-label-beside='large'] {
			grid-template-columns: auto minmax(0, 1fr);
			column-gap: var(--space-2);
		}
		.hp-combobox[data-label-beside='large'] .hp-combobox-label {
			grid-row: 1;
			align-self: center;
			white-space: nowrap;
		}
		.hp-combobox[data-label-beside='large'] .hp-combobox-field,
		.hp-combobox[data-label-beside='large'] .hp-combobox-messages {
			grid-column: 2;
		}
	}

	/* ---- The list: a popover panel on medium and up, the sheet's body on
	   compact ---------------------------------------------------------- */

	/* The overlay parts render in a portal at the end of <body>, outside
	   .hp-combobox, so they carry this themselves. */
	.hp-combobox-panel,
	.hp-combobox-list,
	.hp-combobox-empty {
		/* Option text lines up with the field's text (popover) or the
		   sheet's title (sheet). */
		--option-inset: var(--space-3);
		/* The popover list's cap: eight and a half 36px rows, so a cut row
		   shows there is more. */
		--combobox-list-height: 320px;
	}

	/* The panel draws the frame round the listbox and the empty line, on the
	   popover layer (tokens.css), over the shell and an open dialog. */
	.hp-combobox-panel {
		position: relative;
		z-index: var(--layer-popover);
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		border: 1px solid var(--border-control);
		background: var(--canvas);
		color: var(--text);
		font-family: var(--sans);
	}

	.hp-combobox-list {
		box-sizing: border-box;
		background: var(--canvas);
		color: var(--text);
		font-family: var(--sans);
	}
	/* As wide as the field at least, inside the panel's two 1px borders. */
	.hp-combobox-list[data-form='popover'] {
		min-width: calc(var(--bits-combobox-anchor-width) - 2px);
		max-width: max(
			calc(var(--bits-combobox-anchor-width) - 2px),
			min(calc(var(--bits-combobox-content-available-width) - 2px), 480px)
		);
		max-height: min(var(--combobox-list-height), calc(var(--bits-combobox-content-available-height) - 2px));
	}
	/* The sheet keeps the height it opened with while the list filters, so
	   the search input never moves under the typing thumb: the list asks for
	   the sheet's whole cap (--sheet-max-height from internal/Sheet.svelte:
	   half the screen, or the room above the on-screen keyboard) and shrinks
	   into what the title and search rows leave. */
	.hp-combobox-list[data-form='sheet'] {
		--option-inset: var(--gutter);
		flex: 1 1 auto;
		height: var(--sheet-max-height);
		min-height: 0;
	}

	/* Bits UI hides the viewport's scrollbar; a long list shows where it is. */
	.hp-combobox-viewport[data-combobox-viewport] {
		scrollbar-width: thin !important;
		overscroll-behavior: contain;
		padding-block: var(--space-1);
	}
	.hp-combobox-list[data-empty] .hp-combobox-viewport[data-combobox-viewport] {
		padding-block: 0;
	}
	/* An option the keys or the chosen value scroll to stays clear of the
	   group heading stuck at the top: one heading line high. */
	.hp-combobox-viewport[data-grouped] {
		scroll-padding-top: calc(var(--space-2) + 16px + var(--space-1));
	}

	/* ---- Group headings: as Select's ------------------------------------ */

	/* MenuGroup's heading: muted, on the options' text edge, 8px above and
	   4px below. The text stays as written, because a group name may be the
	   app's data (BRIEF, style rule 4). It stays at the top of the list while
	   its options scroll under it, until the next group pushes it up; that is
	   scrolling, not motion. It sticks to the viewport's edge, over its 4px
	   padding, so nothing shows above it. */
	.hp-combobox-group-heading {
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

	.hp-combobox-option {
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
	.hp-combobox-option[data-described] {
		padding-block: var(--space-2);
	}
	.hp-combobox-option-description {
		color: var(--muted);
		font-size: var(--type-caption);
		line-height: 18px;
	}

	/* Highlight, by pointer or keys: the hover tint. Selection snaps and
	   filtering never animates, so nothing here transitions (BRIEF, motion
	   rule 3 and the frequency check). */
	.hp-combobox-option[data-highlighted],
	.hp-combobox-option:active {
		background: var(--surface-hover);
	}
	/* Selected: a 3px titanium edge and the tint, text unchanged. Hover and
	   press never darken it. */
	.hp-combobox-option[data-selected] {
		background: var(--surface-selected);
		box-shadow: inset 3px 0 0 var(--accent);
	}
	/* Keys move a virtual focus (focus stays in the input), so the
	   highlight they move also draws the focus contour, inside the row. */
	.hp-combobox-list[data-keyboard] .hp-combobox-option[data-highlighted] {
		outline: 2px solid var(--focus);
		outline-offset: -2px;
	}
	.hp-combobox-option[data-disabled] {
		color: var(--muted);
		cursor: not-allowed;
	}

	/* Nothing matches: one muted line where the options were. */
	.hp-combobox-empty {
		margin: 0;
		padding: var(--space-2) var(--option-inset);
		color: var(--muted);
		font-size: var(--type-body);
		line-height: 24px;
	}
	.hp-combobox-empty:empty {
		padding: 0;
	}

	/* ---- Sheet (compact): the search input over the list ---------------- */

	.hp-combobox-search {
		flex: none;
		/* 8px above the well: its focus contour (2px, 4px out) stays inside
		   the sheet body, which clips. */
		padding: var(--space-2) var(--gutter);
	}
	/* In the sheet the empty line keeps the gutter inset, as the options do. */
	.hp-combobox-empty[data-form='sheet'] {
		--option-inset: var(--gutter);
	}
</style>
