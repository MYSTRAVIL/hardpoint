<script lang="ts" module>
	import type { HTMLButtonAttributes } from 'svelte/elements';

	export type MultiSelectItem = {
		value: string;
		/** The option's text, and the trigger's text when it is the only one chosen. */
		label: string;
		/**
		 * How many things the option stands for, such as matching records: set
		 * at the row's end in `--muted` with tabular figures, and read with the
		 * option. Shown as given, so the app formats it.
		 */
		count?: number | string;
		/** A second line in `--muted`. */
		description?: string;
		/**
		 * The heading the option sits under, as written; the search matches it
		 * too. Options with the same group share one heading, in the order each
		 * group first appears; options without one come first.
		 */
		group?: string;
		disabled?: boolean;
	};

	export type MultiSelectLabelBeside = boolean | 'medium' | 'expanded' | 'large';

	/** Attributes and handlers not listed here go to the trigger button. */
	export type MultiSelectProps = Omit<HTMLButtonAttributes, 'children' | 'value' | 'name' | 'disabled' | 'type' | 'id'> & {
		items: MultiSelectItem[];
		/**
		 * The chosen items' values, in the order they were chosen. A value that
		 * is not among `items` stays listed, at the top, so it can be cleared.
		 */
		value?: string[];
		open?: boolean;
		/** The caps field label above the trigger, and the sheet's title on compact widths. */
		label: string;
		/** The trigger's text in `--muted` while nothing is chosen. Never the only label. */
		placeholder?: string;
		/** The trigger's text when more than one value is chosen. Say it in the app's language. */
		selectedText?: (count: number) => string;
		/** Guidance under the trigger in `--muted`, linked by `aria-describedby`. */
		hint?: string;
		/**
		 * The error to show under the trigger, with an icon, linked by
		 * `aria-describedby`; it sets `aria-invalid`. Say how to fix the
		 * problem. The app validates; the field shows what it is given.
		 */
		error?: string;
		disabled?: boolean;
		/**
		 * The field needs a choice: `aria-required` on the trigger, and a native
		 * form submit stops while nothing is chosen.
		 */
		required?: boolean;
		/** Submits each chosen value with a form, one hidden input per value. */
		name?: string;
		/**
		 * The label beside the trigger instead of above it: always (`true`), or
		 * from a breakpoint up (`medium` 600px, `expanded` 900px, `large` 1200px).
		 */
		labelBeside?: MultiSelectLabelBeside;
		/** A search box sits above the options when there are more than this many. */
		searchThreshold?: number;
		/** The search box's placeholder. Say it in the app's language. */
		searchPlaceholder?: string;
		/** Shown in place of the options when nothing matches the search. */
		emptyText?: string;
		/** The clear button's name; the field label follows it ("Clear Languages"). */
		clearLabel?: string;
		/** The compact sheet's close button name. */
		closeLabel?: string;
		/** The trigger's id; the label points at it. */
		id?: string;
		/** The trigger button. */
		ref?: HTMLElement | null;
	};
</script>

<script lang="ts">
	import { Combobox as BitsCombobox, Select as BitsSelect } from 'bits-ui';
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
		value = $bindable([]),
		open = $bindable(false),
		label,
		placeholder = '',
		selectedText = (count: number) => `${count} selected`,
		hint,
		error,
		disabled = false,
		required = false,
		name,
		labelBeside = false,
		searchThreshold = 8,
		searchPlaceholder = 'Search',
		emptyText = 'No matches',
		clearLabel = 'Clear',
		closeLabel = 'Close',
		id = `${uid}-trigger`,
		ref = $bindable(null),
		class: className,
		onclick: onclickProp,
		onkeydown: onkeydownProp,
		onpointerdown: onpointerdownProp,
		'aria-describedby': describedBy,
		'aria-invalid': ariaInvalid,
		...rest
	}: MultiSelectProps = $props();

	const labelId = `${uid}-label`;
	const clearId = `${uid}-clear`;
	// The listbox, in the popover or the sheet.
	const listId = `${uid}-list`;
	// With the search box, the trigger opens a panel that holds it and the
	// listbox: a dialog, named by the field label.
	const popupId = `${uid}-popup`;
	const sheetTitleId = `${uid}-sheet-title`;
	const searchId = `${uid}-search`;
	const hintId = $derived(`${id}-hint`);
	const errorId = $derived(`${id}-error`);
	// The error first, so a screen reader reads it before the hint.
	const describedByIds = $derived(
		[error ? errorId : undefined, hint ? hintId : undefined, describedBy].filter(Boolean).join(' ') ||
			undefined
	);
	const invalid = $derived(error ? true : ariaInvalid);

	// ---- Short motion: the error (BRIEF, --dur-message) --------------------

	// As in Select: an error that appears after the first render fades in
	// from 0 over --dur-message, and the trigger's edge fades to --danger
	// with it (the CSS below). An error that clears goes at once, and so does
	// the red edge. A field that renders with an error shows it at once.
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

	// ---- The options -------------------------------------------------------

	// Chosen values that are not among `items` (a value from a pasted link,
	// an option the app no longer offers) stay listed at the top, labelled
	// by their value, so they can be cleared. One cleared while the list is
	// open stays in it, unchecked, until the list closes, so a slip can be
	// undone and the rows under it never move.
	const known = $derived(new Set(items.map((entry) => entry.value)));
	let held = $state<string[]>([]);
	const extras = $derived.by(() => {
		const out = open ? held.filter((v) => !known.has(v)) : [];
		for (const v of value) if (!known.has(v) && !out.includes(v)) out.push(v);
		return out;
	});
	const all: MultiSelectItem[] = $derived(
		extras.length ? [...extras.map((v) => ({ value: v, label: v })), ...items] : items
	);

	// The search box comes with a long list. The form is fixed while the
	// list is open, so options that arrive or go never swap it under the
	// person using it.
	const wantsSearch = $derived(all.length > searchThreshold);
	let searchable = $state(untrack(() => wantsSearch));
	// The trigger is a different element in each form; if it had focus when
	// the form changed, the new one takes it.
	let refocus = false;
	$effect.pre(() => {
		const next = wantsSearch;
		if (open) return;
		untrack(() => {
			if (next === searchable) return;
			refocus = !!ref && document.activeElement === ref;
			searchable = next;
		});
	});
	function takeFocus(node: HTMLElement) {
		if (!refocus) return;
		refocus = false;
		node.focus();
	}

	// What the list is filtered by: the label or the group contains the
	// text, ignoring case and accents, as Combobox's default filter.
	let query = $state('');
	const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
	const matches = $derived.by(() => {
		const q = query.trim();
		if (!q) return all;
		const needle = fold(q);
		return all.filter(
			(entry) => fold(entry.label).includes(needle) || (!!entry.group && fold(entry.group).includes(needle))
		);
	});
	// Options without a group (the chosen values not among `items` first),
	// then each group that still has a match.
	const grouped = $derived(groupOptions(matches));

	// The trigger's text: the placeholder, the one chosen label, or a count.
	const summary = $derived.by(() => {
		if (!value.length) return placeholder;
		if (value.length > 1) return selectedText(value.length);
		return items.find((entry) => entry.value === value[0])?.label ?? value[0];
	});

	// The highlight moved by keys gets the focus contour; a pointer's gets the
	// hover tint alone.
	let keyboard = $state(false);

	let panelNode = $state<HTMLElement | null>(null);
	let sheetNode = $state<HTMLElement | null>(null);

	// Bits UI's portal and content mount on the first open, so a closed
	// field costs only its trigger.
	const layers = mountOnFirstOpen(() => open);

	// ---- Opening and closing ----------------------------------------------

	// The pointer that opened the list ('touch', 'mouse', 'pen'), or '' for
	// keys and assistive technology. A touch opens it without focusing the
	// search box, so the on-screen keyboard stays down until the box is
	// tapped.
	let openedBy = '';

	// Every open and close passes here once, whoever caused it: Bits UI
	// (Escape, Tab, an outside press), the trigger, the sheet's close button
	// and swipe, or the app through `bind:open`.
	let settled = false;
	let heldHeight = $state<number | null>(null);
	function openChanged(next: boolean) {
		if (next === settled) return;
		settled = next;
		query = '';
		navigated = false;
		heldHeight = null;
		if (next) {
			held = value.filter((v) => !known.has(v));
			return;
		}
		// Focus comes back to the trigger from inside the list or the sheet,
		// and when the closing list took it along. A press on another control
		// keeps it there.
		const active = document.activeElement;
		if (!active || active === document.body || panelNode?.contains(active) || sheetNode?.contains(active)) {
			ref?.focus();
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

	function close() {
		setOpen(false);
		ref?.focus();
	}

	// ---- The trigger with the search box ----------------------------------

	// With the search box, the trigger is Hardpoint's own button: Bits UI's
	// Combobox keeps its keys on its input, which sits in the panel. A click
	// the label forwards to the trigger focuses it and opens nothing, as on
	// Select; it comes with detail 0, like a key's, so the label marks it.
	let fromLabel = false;

	function onTriggerPointerDown(e: PointerEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		onpointerdownProp?.(e);
		fromLabel = false;
		openedBy = e.pointerType;
	}

	function onTriggerClick(e: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		onclickProp?.(e);
		if (fromLabel) {
			fromLabel = false;
			e.currentTarget.focus();
			return;
		}
		if (disabled || e.defaultPrevented) return;
		// Enter, Space and a screen reader's activation click have detail 0.
		if (e.detail === 0) openedBy = '';
		setOpen(!open);
	}

	function markLabelClicks(node: HTMLLabelElement) {
		const mark = () => (fromLabel = searchable);
		node.addEventListener('click', mark);
		return () => node.removeEventListener('click', mark);
	}

	function onTriggerKeydown(e: KeyboardEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		onkeydownProp?.(e);
		fromLabel = false;
		if (disabled || e.defaultPrevented) return;
		if (open) {
			forwardToSearch(e);
			return;
		}
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			openedBy = '';
			setOpen(true);
			return;
		}
		// A character typed on the closed trigger opens the list and starts
		// the search with it.
		if (printable(e)) {
			e.preventDefault();
			openedBy = '';
			setOpen(true);
			query = e.key;
		}
	}

	// One character, not Space, and no Ctrl or Cmd shortcut; AltGr types
	// (Chrome on Windows reports it as Ctrl+Alt).
	const printable = (e: KeyboardEvent) =>
		!((e.ctrlKey || e.metaKey) && !e.altKey) && e.key !== ' ' && [...e.key].length === 1;

	// While the list is open its keys belong to the search box. After a touch
	// opened it, focus sits on the panel, or may come back to the trigger; a
	// hardware keyboard (a touchscreen laptop) still works: a character moves
	// focus into the box and lands there, and any other key goes to the box
	// as if pressed there. Tab, Escape and shortcuts keep their meaning.
	function forwardToSearch(e: KeyboardEvent) {
		const input = document.getElementById(searchId);
		if (!(input instanceof HTMLInputElement) || e.key === 'Tab' || e.key === 'Escape') return;
		if ((e.ctrlKey || e.metaKey) && !e.altKey) return;
		input.focus({ preventScroll: true });
		if (printable(e)) return;
		e.preventDefault();
		const { key, code, shiftKey, altKey } = e;
		input.dispatchEvent(new KeyboardEvent('keydown', { key, code, shiftKey, altKey, bubbles: true, cancelable: true }));
	}

	function onPanelKeydown(e: KeyboardEvent) {
		if (e.target === e.currentTarget) forwardToSearch(e);
	}

	// ---- The search box -----------------------------------------------------

	// Space toggles the highlighted option while the box is empty, and after
	// an arrow key moved the highlight; once a character is typed it types.
	let navigated = false;

	function toggle(v: string) {
		value = value.includes(v) ? value.filter((x) => x !== v) : [...value, v];
	}

	function onSearchKeydown(e: KeyboardEvent & { currentTarget: EventTarget & HTMLInputElement }) {
		// Shift+Tab goes back to the trigger; Tab closes (Bits UI) and moves on
		// from the trigger.
		if (e.key === 'Tab' && e.shiftKey) {
			e.preventDefault();
			setOpen(false);
			return;
		}
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'PageDown' || e.key === 'PageUp') {
			navigated = true;
			return;
		}
		if (e.key === ' ' && !e.isComposing && (navigated || !e.currentTarget.value)) {
			const option = document.getElementById(listId)?.querySelector('[data-highlighted]');
			const optionValue = option?.getAttribute('data-value');
			if (optionValue == null) return;
			e.preventDefault();
			toggle(optionValue);
		}
	}

	function onSearchInput(e: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		const list = document.getElementById(listId);
		// The popover keeps the height it opened with while the list filters,
		// so a list placed above the trigger never moves the box under the
		// typing hand. Measured at the first key, when it is placed and full.
		if (heldHeight === null && list && wide.current) heldHeight = list.offsetHeight;
		navigated = false;
		query = e.currentTarget.value;
		// The matches show from the top, so Bits UI's highlight, which goes to
		// the first option in view, lands on the first match.
		const viewport = list?.querySelector('[data-combobox-viewport]');
		if (viewport) viewport.scrollTop = 0;
	}

	// Opened by keys, a mouse or a pen, the search box takes focus. Opened by
	// a touch, the panel does, so the on-screen keyboard waits for a tap on
	// the box; the sheet then sits above it (internal/Sheet.svelte).
	function focusOnOpen(node: HTMLInputElement) {
		const target = openedBy === 'touch' ? node.closest<HTMLElement>('[role=dialog]') : node;
		target?.focus({ preventScroll: true });
	}

	// ---- Clear --------------------------------------------------------------

	function clear() {
		value = [];
		ref?.focus();
	}

	// ---- Presses on the overlay -------------------------------------------

	// The panel's search row and empty line, the sheet's title row and the
	// trigger (it toggles the list itself) are not outside presses.
	function insidePanel(e: PointerEvent) {
		if (!(e.target instanceof Node)) return;
		if (panelNode?.contains(e.target) || ref?.contains(e.target)) e.preventDefault();
	}
	function insideSheet(e: PointerEvent) {
		if (sheetNode && e.target instanceof Node && sheetNode.contains(e.target)) e.preventDefault();
	}

	// Presses on the overlay keep focus where it is; a press on the search
	// box itself still focuses it.
	function keepFocus(e: PointerEvent) {
		if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
	}

	// In the sheet, Bits UI never learns that its content is placed:
	// ContentStatic with forceMount reports placement once, at mount, while
	// still closed. So Bits neither opens it at the chosen option nor scrolls
	// to the option the keys move to; this does both, nearest edge first, as
	// Select and Combobox do. The viewport's scroll-padding keeps an option
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

<!--
	Several values from a list, for faceted filters. The trigger is Select's
	black well and says what is chosen: the placeholder, the one label, or a
	count. The options carry Checkbox's box, an optional count and group
	headings. From 600px they open under the trigger; below 600px in the
	shared bottom sheet. More than `searchThreshold` options add a search box
	above them. A clear button at the end of the well removes every value.

	Up to the threshold it is Bits UI Select (type multiple): focus stays on
	the trigger, which is a role=combobox button over a multiselectable
	listbox. With the search box it is Bits UI Combobox (type multiple): the
	search box in the panel is the combobox and keeps the keys while a search
	is typed; the trigger opens the panel, a dialog. Extra attributes and
	handlers go to the trigger; `class` goes to the field.
-->
<div
	bind:this={root}
	class={['hp-multi-select', className]}
	data-state={open ? 'open' : 'closed'}
	data-disabled={disabled || undefined}
	data-invalid={error ? '' : undefined}
	data-placeholder={value.length ? undefined : ''}
	data-search={searchable || undefined}
	data-label-beside={labelBeside === true ? 'always' : labelBeside || undefined}
	onkeydowncapture={() => (keyboard = true)}
	onpointerdowncapture={() => (keyboard = false)}
>
	<label class="hp-multi-select-label hp-label" id={labelId} for={id} {@attach markLabelClicks}>{label}</label>

	{#if searchable}
		<BitsCombobox.Root
			type="multiple"
			bind:value
			bind:open={() => layers.open, (next) => (open = next)}
			items={all}
			{disabled}
			inputValue={query}
			onOpenChange={openChanged}
		>
			<span class="hp-multi-select-field hp-well-chevron">
				<button
					{...rest}
					bind:this={ref}
					type="button"
					{id}
					class="hp-multi-select-trigger hp-well"
					role="combobox"
					aria-haspopup="dialog"
					aria-expanded={open}
					aria-controls={layers.open ? popupId : undefined}
					aria-labelledby={labelId}
					aria-describedby={describedByIds}
					aria-invalid={invalid}
					aria-required={required || undefined}
					data-placeholder={value.length ? undefined : ''}
					{disabled}
					onpointerdown={onTriggerPointerDown}
					onclick={onTriggerClick}
					onkeydown={onTriggerKeydown}
					{@attach takeFocus}
				>
					<span class="hp-multi-select-value">{summary}</span>
				</button>
				{@render clearButton()}
			</span>
			{@render layer()}
		</BitsCombobox.Root>
	{:else}
		<BitsSelect.Root
			type="multiple"
			bind:value
			bind:open={() => layers.open, (next) => (open = next)}
			items={all}
			{disabled}
			onOpenChange={openChanged}
		>
			<BitsSelect.Trigger
				{...rest}
				bind:ref
				{id}
				aria-labelledby={labelId}
				aria-describedby={describedByIds}
				aria-invalid={invalid}
				aria-required={required || undefined}
				onclick={onclickProp}
				onkeydown={onkeydownProp}
				onpointerdown={onpointerdownProp}
			>
				{#snippet child({ props })}
					<span class="hp-multi-select-field hp-well-chevron">
						<button
							{...props}
							class="hp-multi-select-trigger hp-well"
							data-placeholder={value.length ? undefined : ''}
							{@attach takeFocus}
						>
							<span class="hp-multi-select-value">{summary}</span>
						</button>
						{@render clearButton()}
					</span>
				{/snippet}
			</BitsSelect.Trigger>
			{@render layer()}
		</BitsSelect.Root>
	{/if}

	<!-- The form's inputs: one per chosen value (unkeyed, so a value the app
	     repeats never throws); and, while a required field holds nothing, an
	     empty required input that stops a native submit and hands the
	     browser's focus to the trigger. -->
	{#if name}
		{#each value as chosen}
			<input type="hidden" {name} value={chosen} {disabled} />
		{/each}
	{/if}
	{#if required && !disabled && !value.length}
		<input
			class="hp-visually-hidden"
			tabindex="-1"
			aria-hidden="true"
			required
			value=""
			onfocus={() => ref?.focus()}
		/>
	{/if}

	{#if searchable && (wide.current || !layers.open)}
		{@render status()}
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

<!-- Over the end of the well, before the chevron, while something is
     chosen. It is named with the field ("Clear Languages"). -->
{#snippet clearButton()}
	{#if value.length && !disabled}
		<button
			type="button"
			id={clearId}
			class="hp-multi-select-clear hp-focus-inset"
			aria-label={clearLabel}
			aria-labelledby="{clearId} {labelId}"
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
{/snippet}

<!-- Combobox's Content and Select's are the same Bits UI part, so one layer
     serves both roots. -->
{#snippet layer()}
	{#if layers.mounted}
		<BitsSelect.Portal>
			{#if wide.current}
				<BitsSelect.Content
					id={listId}
					forceMount
					side="bottom"
					align="start"
					sideOffset={8}
					collisionPadding={8}
					customAnchor={searchable ? ref : null}
					aria-labelledby={labelId}
					onInteractOutside={searchable ? insidePanel : undefined}
				>
					{#snippet child({ wrapperProps, props, open: shown })}
						<!-- Each form's element sits straight in the branch that shows it, so
						     its local transition plays on every open and close. -->
						{#if shown && searchable}
							<div {...wrapperProps}>
								<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
								<div
									bind:this={panelNode}
									id={popupId}
									class="hp-multi-select-panel"
									role="dialog"
									aria-labelledby={labelId}
									tabindex="-1"
									data-side={props['data-side'] as string | undefined}
									onpointerdown={keepFocus}
									onkeydowncapture={() => (keyboard = true)}
									onkeydown={onPanelKeydown}
									transition:pop
								>
									{@render search(labelId, false)}
									{@render empty(false)}
									<div
										{...props}
										class="hp-multi-select-list"
										data-form="panel"
										data-empty={matches.length ? undefined : ''}
										data-keyboard={keyboard || undefined}
										style:min-height={heldHeight === null ? undefined : `${heldHeight}px`}
										onpointermovecapture={() => (keyboard = false)}
									>
										{@render options(false)}
									</div>
								</div>
							</div>
						{:else if shown}
							<div {...wrapperProps}>
								<div
									{...props}
									class="hp-multi-select-list"
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
				<BitsSelect.ContentStatic id={listId} forceMount preventScroll onInteractOutside={insideSheet}>
					{#snippet child({ props, open: shown })}
						<Sheet
							open={shown}
							title={label}
							titleId={sheetTitleId}
							layer="popover"
							onclose={close}
							{closeLabel}
							bind:ref={sheetNode}
							onpointerdown={keepFocus}
							{...searchable
								? {
										id: popupId,
										role: 'dialog',
										'aria-modal': 'true',
										'aria-labelledby': sheetTitleId,
										tabindex: -1,
										onkeydown: onPanelKeydown
									}
								: {}}
						>
							{#if searchable}
								{@render search(sheetTitleId, true)}
								{@render status()}
								{@render empty(true)}
							{/if}
							<div
								{...props}
								class="hp-multi-select-list"
								data-form="sheet"
								data-search={searchable || undefined}
								data-empty={matches.length ? undefined : ''}
								aria-labelledby={searchable ? sheetTitleId : labelId}
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
{/snippet}

<!-- The search box: Bits UI's Combobox input, so the keys move the highlight
     and Enter toggles while a search is typed. Its value is the search
     alone; Bits UI would write the toggled option's label into it. -->
{#snippet search(labelledBy: string, inSheet: boolean)}
	<div
		class="hp-multi-select-search"
		data-form={inSheet ? 'sheet' : 'panel'}
		onkeydowncapture={() => (keyboard = true)}
	>
		<BitsCombobox.Input
			id={searchId}
			placeholder={searchPlaceholder}
			autocomplete="off"
			spellcheck={false}
			aria-labelledby={labelledBy}
			aria-controls={listId}
			oninput={onSearchInput}
			onkeydown={onSearchKeydown}
		>
			{#snippet child({ props })}
				<input {...props} value={query} class="hp-multi-select-search-input hp-well" {@attach focusOnOpen} />
			{/snippet}
		</BitsCombobox.Input>
	</div>
{/snippet}

{#snippet options(inSheet: boolean)}
	<BitsSelect.Viewport>
		{#snippet child({ props: viewportProps })}
			<div
				{...viewportProps}
				class="hp-multi-select-viewport"
				data-grouped={grouped.groups.length ? '' : undefined}
				{@attach inSheet && followHighlight}
			>
				{#each grouped.loose as entry (entry.value)}
					{@render option(entry)}
				{/each}
				{#each grouped.groups as group (group.name)}
					<!-- role="group", named by its heading, which is no option: keys
					     and typeahead skip it. -->
					<BitsSelect.Group>
						{#snippet child({ props: groupProps })}
							<div {...groupProps} class="hp-multi-select-group">
								<BitsSelect.GroupHeading>
									{#snippet child({ props: headingProps })}
										<div {...headingProps} class="hp-multi-select-group-heading">{group.name}</div>
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

<!-- An option: role=option with aria-selected (Bits UI), Checkbox's box, the
     label and description, and the count. A hidden comma parts the text
     from the count, so a screen reader pauses between them ("Berlin, 12";
     Chrome's accessible name reads "Berlin , 12"). -->
{#snippet option(entry: MultiSelectItem)}
	<BitsSelect.Item value={entry.value} label={entry.label} disabled={entry.disabled}>
		{#snippet child({ props: optionProps })}
			<div
				{...optionProps}
				class="hp-multi-select-option"
				data-described={entry.description ? '' : undefined}
				aria-disabled={entry.disabled ? 'true' : undefined}
			>
				<span class="hp-multi-select-box" aria-hidden="true">
					<svg class="hp-multi-select-check" viewBox="0 0 12 12"><path d="M1.5 6.5l3 3 6-6" /></svg>
				</span>
				<span class="hp-multi-select-text">
					<span class="hp-multi-select-option-label">{entry.label}</span>
					{#if entry.description}
						<span class="hp-multi-select-option-description">{entry.description}</span>
					{/if}
				</span>
				{#if entry.count != null && entry.count !== ''}
					<span class="hp-multi-select-count"><span class="hp-visually-hidden">,</span>{entry.count}</span>
				{/if}
			</div>
		{/snippet}
	</BitsSelect.Item>
{/snippet}

<!-- Outside the listbox, which may hold options and groups only. The visible
     line where the options were; hidden from assistive tech, because the
     status region says it once. -->
{#snippet empty(inSheet: boolean)}
	<p class="hp-multi-select-empty" data-form={inSheet ? 'sheet' : 'panel'} aria-hidden="true">
		{#if !matches.length}{emptyText}{/if}
	</p>
{/snippet}

<!-- As on Combobox: one status region, mounted with the field, that holds
     `emptyText` only while the list is open and shows no option. The
     compact sheet is modal, so while it is open the region lives inside it. -->
{#snippet status()}
	<p class="hp-visually-hidden" role="status">
		{#if layers.open && !matches.length}{emptyText}{/if}
	</p>
{/snippet}

<style>
	/* ---- Field: caps label over a black well --------------------------- */

	.hp-multi-select {
		/* The required input is absolutely placed in here. */
		position: relative;
		display: grid;
		gap: var(--space-1);
		min-width: 0;
	}

	.hp-multi-select-label {
		color: var(--muted);
	}

	/* Label beside the trigger, as in a filter bar: always, or from a
	   breakpoint up. The label keeps its one line in the first column; the
	   trigger, hint and error share the second. */
	.hp-multi-select[data-label-beside='always'] {
		grid-template-columns: auto minmax(0, 1fr);
		column-gap: var(--space-2);
	}
	.hp-multi-select[data-label-beside='always'] .hp-multi-select-label {
		grid-row: 1;
		align-self: center;
		white-space: nowrap;
	}
	.hp-multi-select[data-label-beside='always'] .hp-multi-select-field,
	.hp-multi-select[data-label-beside='always'] p {
		grid-column: 2;
	}
	@media (min-width: 600px) {
		.hp-multi-select[data-label-beside='medium'] {
			grid-template-columns: auto minmax(0, 1fr);
			column-gap: var(--space-2);
		}
		.hp-multi-select[data-label-beside='medium'] .hp-multi-select-label {
			grid-row: 1;
			align-self: center;
			white-space: nowrap;
		}
		.hp-multi-select[data-label-beside='medium'] .hp-multi-select-field,
		.hp-multi-select[data-label-beside='medium'] p {
			grid-column: 2;
		}
	}
	@media (min-width: 900px) {
		.hp-multi-select[data-label-beside='expanded'] {
			grid-template-columns: auto minmax(0, 1fr);
			column-gap: var(--space-2);
		}
		.hp-multi-select[data-label-beside='expanded'] .hp-multi-select-label {
			grid-row: 1;
			align-self: center;
			white-space: nowrap;
		}
		.hp-multi-select[data-label-beside='expanded'] .hp-multi-select-field,
		.hp-multi-select[data-label-beside='expanded'] p {
			grid-column: 2;
		}
	}
	@media (min-width: 1200px) {
		.hp-multi-select[data-label-beside='large'] {
			grid-template-columns: auto minmax(0, 1fr);
			column-gap: var(--space-2);
		}
		.hp-multi-select[data-label-beside='large'] .hp-multi-select-label {
			grid-row: 1;
			align-self: center;
			white-space: nowrap;
		}
		.hp-multi-select[data-label-beside='large'] .hp-multi-select-field,
		.hp-multi-select[data-label-beside='large'] p {
			grid-column: 2;
		}
	}

	/* Invalid: the trigger's boundary turns --danger, never alone: the icon
	   and the message say what is wrong. Keyed on the root's data-invalid,
	   set by `error`. The edge fades to --danger over --dur-message with the
	   message and goes back at once when the error clears, because the
	   transition belongs to this rule. The hover fill keeps base.css's
	   timing. */
	[data-invalid] .hp-multi-select-trigger {
		border-color: var(--danger);
		transition:
			background-color var(--dur-hover) var(--settle),
			border-color var(--dur-message) var(--settle);
	}
	[data-invalid][data-disabled] .hp-multi-select-trigger {
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
	   contour (2px, drawn 4px outside the well). Hidden inputs may sit
	   between them, so the rule reads by sibling order, not adjacency. */
	.hp-multi-select-field ~ .hint,
	.hp-multi-select-field ~ .error {
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

	/* The trigger is base.css's well in Select's look; its wrapper draws the
	   chevron. The wrapper is the grid item, so it holds the width and the
	   minimum. */
	.hp-multi-select-field {
		width: 100%;
		min-width: 136px;
	}
	.hp-multi-select-trigger {
		display: flex;
		align-items: center;
		width: 100%;
		text-align: start;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.hp-multi-select-trigger:disabled {
		cursor: not-allowed;
	}
	.hp-multi-select-trigger[data-placeholder] {
		color: var(--muted);
	}
	.hp-multi-select-value {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* ---- Clear: TextField's search clear button, before the chevron ---- */

	/* While it shows, the text stops short of it. */
	.hp-multi-select-field:has(> .hp-multi-select-clear) > .hp-multi-select-trigger {
		padding-right: calc(var(--space-8) + var(--control-height));
	}
	/* A --control-height square: 36px on fine pointers, 44px on coarse. Its
	   right edge stops 32px from the well's, where the chevron's area
	   begins, so a press on the chevron still opens the list. The transparent
	   border keeps a press fill inside the well's edge; the cross is in
	   --muted like the placeholder, so it reads as part of the well. */
	.hp-multi-select-clear {
		position: absolute;
		top: 0;
		right: var(--space-8);
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
	.hp-multi-select-clear svg {
		display: block;
		width: var(--space-4);
		height: var(--space-4);
	}
	.hp-multi-select-clear:active {
		background-color: var(--surface-raised);
		color: var(--text);
	}
	@media (hover: hover) and (pointer: fine) {
		.hp-multi-select-clear {
			transition:
				background-color var(--dur-hover) var(--settle),
				color var(--dur-hover) var(--settle);
		}
		.hp-multi-select-clear:hover {
			color: var(--text);
		}
		.hp-multi-select-clear:active {
			transition-duration: var(--dur-press);
		}
		/* The button is part of the well, so the well keeps its hover fill. */
		.hp-multi-select-field:has(> .hp-multi-select-clear:hover) > .hp-multi-select-trigger {
			background-color: var(--surface-hover);
		}
	}

	/* ---- The list: a popover on medium and up, the shared sheet's body on
	   compact (internal/Sheet.svelte, on the popover layer) ---------------- */

	/* The overlay parts render in a portal at the end of <body>, outside
	   .hp-multi-select, so they carry this themselves. */
	.hp-multi-select-panel,
	.hp-multi-select-list,
	.hp-multi-select-search,
	.hp-multi-select-empty {
		/* Option text lines up with the trigger's text (popover) or the
		   sheet's title (sheet). */
		--option-inset: var(--space-3);
		/* The popover list's cap: eight and a half 36px rows, so a cut row
		   shows there is more. */
		--multi-select-list-height: 320px;
	}

	.hp-multi-select-list {
		box-sizing: border-box;
		background: var(--canvas);
		color: var(--text);
		font-family: var(--sans);
	}
	/* Without the search box the listbox is the framed popover, on the
	   popover layer (tokens.css), over the shell and an open dialog. */
	.hp-multi-select-list[data-form='popover'] {
		position: relative;
		z-index: var(--layer-popover);
		min-width: var(--bits-select-anchor-width);
		max-width: max(var(--bits-select-anchor-width), min(var(--bits-select-content-available-width), 480px));
		max-height: min(var(--multi-select-list-height), var(--bits-select-content-available-height));
		border: 1px solid var(--border-control);
	}

	/* With the search box, the panel draws the frame round the search row,
	   the empty line and the listbox. */
	.hp-multi-select-panel {
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
	.hp-multi-select-panel:focus {
		outline: none;
	}
	/* As wide as the trigger at least, inside the panel's two 1px borders;
	   as tall as the cap, or the room the search row leaves. */
	.hp-multi-select-list[data-form='panel'] {
		min-width: calc(var(--bits-combobox-anchor-width) - 2px);
		max-width: max(
			calc(var(--bits-combobox-anchor-width) - 2px),
			min(calc(var(--bits-combobox-content-available-width) - 2px), 480px)
		);
		max-height: min(
			var(--multi-select-list-height),
			calc(var(--bits-combobox-content-available-height) - var(--control-height) - var(--space-4) - 2px)
		);
	}

	.hp-multi-select-list[data-form='sheet'] {
		--option-inset: var(--gutter);
		flex: 1 1 auto;
		min-height: 0;
	}
	/* With the search box the sheet keeps the height it opened with while
	   the list filters, so the box never moves under the typing thumb: the
	   list asks for the sheet's whole cap (--sheet-max-height: half the
	   screen, or the room above the on-screen keyboard) and shrinks into
	   what the title and search rows leave, as on Combobox. */
	.hp-multi-select-list[data-form='sheet'][data-search] {
		height: var(--sheet-max-height);
	}

	/* Bits UI hides the viewport's scrollbar; a long list shows where it is. */
	.hp-multi-select-viewport {
		scrollbar-width: thin !important;
		overscroll-behavior: contain;
		padding-block: var(--space-1);
	}
	.hp-multi-select-list[data-empty] .hp-multi-select-viewport {
		padding-block: 0;
	}
	/* An option the keys or the chosen value scroll to stays clear of the
	   group heading stuck at the top: one heading line high. */
	.hp-multi-select-viewport[data-grouped] {
		scroll-padding-top: calc(var(--space-2) + 16px + var(--space-1));
	}

	/* ---- The search box ------------------------------------------------ */

	/* 8px above and below the well, so its focus contour (2px, 4px out)
	   stays inside the panel or the sheet body, which clips; the well's edge
	   lines up with the options' boxes. */
	.hp-multi-select-search {
		flex: none;
		padding: var(--space-2) var(--option-inset);
	}
	.hp-multi-select-search[data-form='sheet'],
	.hp-multi-select-empty[data-form='sheet'] {
		--option-inset: var(--gutter);
	}
	.hp-multi-select-search-input {
		display: block;
		width: 100%;
		min-width: 0;
	}
	.hp-multi-select-search-input::placeholder {
		color: var(--muted);
		opacity: 1;
	}

	/* Nothing matches: one muted line where the options were. */
	.hp-multi-select-empty {
		margin: 0;
		padding: var(--space-2) var(--option-inset);
		color: var(--muted);
		font-size: var(--type-body);
		line-height: 24px;
	}
	.hp-multi-select-empty:empty {
		padding: 0;
	}

	/* ---- Group headings: as Select's ------------------------------------ */

	/* MenuGroup's heading: muted, on the options' edge, 8px above and 4px
	   below. The text stays as written, because a group name may be the
	   app's data (BRIEF, style rule 4). It stays at the top of the list while
	   its options scroll under it, until the next group pushes it up; that is
	   scrolling, not motion. */
	.hp-multi-select-group-heading {
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

	/* ---- Options: Checkbox's box, the label as written, the count ------ */

	/* Select's option row: 36px on fine pointers, 44px on coarse, 4px of
	   padding above and below a 24px line. The box, the text and the count
	   sit on the first line, so a wrapped label keeps its box beside it. */
	.hp-multi-select-option {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-content: center;
		align-items: start;
		box-sizing: border-box;
		min-height: var(--control-height);
		padding: var(--space-1) var(--option-inset);
		font-size: var(--type-body);
		line-height: 24px;
		overflow-wrap: anywhere;
		cursor: pointer;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}
	.hp-multi-select-option[data-described] {
		padding-block: var(--space-2);
	}
	.hp-multi-select-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.hp-multi-select-option-description {
		color: var(--muted);
		font-size: var(--type-caption);
		line-height: 18px;
	}
	/* The count: supporting ink, tabular figures, at the row's end. */
	.hp-multi-select-count {
		margin-left: var(--space-4);
		color: var(--muted);
		font-variant-numeric: tabular-nums;
		text-align: end;
		white-space: nowrap;
	}

	/* Checkbox's black box with a 3:1 boundary, centred on the first line.
	   Chosen, the edge and the mark turn titanium and the box stays black:
	   selection is never a fill, and the box is the row's only selection
	   mark, as on MenuCheckboxItem. */
	.hp-multi-select-box {
		display: grid;
		place-items: center;
		box-sizing: border-box;
		width: 20px;
		height: 20px;
		margin: calc((24px - 20px) / 2) var(--space-3) 0 0;
		border: 1px solid var(--border-control);
		background: var(--canvas);
		color: var(--accent);
	}
	.hp-multi-select-option[data-selected] .hp-multi-select-box {
		border-color: var(--accent);
	}
	/* The check is always there, at opacity 0 until the option is chosen.
	   Choosing fades it in from 0 over --dur-mark (BRIEF, short motion);
	   clearing takes it away at once. A CSS transition never runs on an
	   element's first style, so a list that opens or filters shows its marks
	   at once. 0ms is a snap. Opacity only, so reduced motion keeps it. */
	.hp-multi-select-check {
		width: 12px;
		height: 12px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2px;
		opacity: 0;
	}
	.hp-multi-select-option[data-selected] .hp-multi-select-check {
		opacity: 1;
		transition: opacity var(--dur-mark) var(--settle);
	}

	/* Highlight, by pointer or keys: the hover tint. Selection snaps and
	   filtering never animates, so nothing here transitions (BRIEF, motion
	   rule 3 and the frequency check). */
	.hp-multi-select-option[data-highlighted],
	.hp-multi-select-option:active {
		background: var(--surface-hover);
	}
	/* Keys move a virtual focus (focus stays on the trigger or in the search
	   box), so the highlight they move also draws the focus contour, inside
	   the row. */
	.hp-multi-select-list[data-keyboard] .hp-multi-select-option[data-highlighted] {
		outline: 2px solid var(--focus);
		outline-offset: -2px;
	}
	.hp-multi-select-option[data-disabled] {
		color: var(--muted);
		cursor: not-allowed;
	}
	.hp-multi-select-option[data-disabled] .hp-multi-select-box {
		border-color: var(--border);
		color: var(--muted);
	}
</style>
