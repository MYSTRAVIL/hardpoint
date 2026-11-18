<script lang="ts" module>
	import type { HTMLInputAttributes } from 'svelte/elements';

	/**
	 * Attributes and handlers not listed here go to the text `<input>`;
	 * `class` goes to the root.
	 */
	export type ChipFieldProps = Omit<HTMLInputAttributes, 'type' | 'value' | 'children' | 'list' | 'name'> & {
		/**
		 * The caps field label above the well. Required, also with
		 * `labelHidden`. It also names the list of chips.
		 */
		label: string;
		/** The chosen values, in the order they were added. Bindable. */
		value?: string[];
		/**
		 * Values to offer while typing, in the browser's own suggestion list
		 * (a `<datalist>`). Values already chosen are left out. Any other text
		 * can still be added.
		 */
		suggestions?: string[];
		/** Posts each value as a hidden input with this name. The text being typed is never posted. */
		name?: string;
		/** Guidance under the well in `--muted`, linked by `aria-describedby`. */
		hint?: string;
		/** The error under the well, with an icon; it sets `aria-invalid`. The app validates. */
		error?: string;
		/** Hides the label from sight; it stays the accessible name of the field and of the list. */
		labelHidden?: boolean;
		/** Turns a value into the text its chip and its suggestion show. Default: the value as it is. */
		format?: (value: string) => string;
		/** The accessible name of each chip's remove button. Default: `Remove <text>`. */
		removeLabel?: (text: string) => string;
		/** What a screen reader hears when Enter or a suggestion adds a value. Default: `Added <text>`. */
		addedText?: (text: string) => string;
		/** What a screen reader hears when a chip is removed. Default: `Removed <text>`. */
		removedText?: (text: string) => string;
		/** What a screen reader hears when Enter repeats a chosen value. Default: `<text> is already added`. */
		duplicateText?: (text: string) => string;
		/** The text `<input>`, for example to focus the first error on submit. */
		ref?: HTMLInputElement | null;
	};
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import Chip from './Chip.svelte';
	import TextField from './TextField.svelte';

	const uid = $props.id();

	let {
		label,
		value = $bindable([]),
		suggestions = [],
		name,
		hint,
		error,
		labelHidden = false,
		format = (v: string) => v,
		removeLabel = (text: string) => `Remove ${text}`,
		addedText = (text: string) => `Added ${text}`,
		removedText = (text: string) => `Removed ${text}`,
		duplicateText = (text: string) => `${text} is already added`,
		id = uid,
		disabled,
		readonly,
		required,
		autocomplete = 'off',
		enterkeyhint = 'enter',
		ref = $bindable(null),
		class: className,
		onkeydown,
		oninput,
		...rest
	}: ChipFieldProps = $props();

	/** The text being typed; it becomes a value on Enter. */
	let draft = $state('');
	let list: HTMLUListElement | null = $state(null);
	let status = $state('');

	// An app may hand over a list with repeats; each value shows once.
	const chips = $derived([...new Set(value)]);
	const options = $derived([...new Set(suggestions)].filter((s) => !chips.includes(s)));
	const editable = $derived(!disabled && !readonly);
	const listId = $derived(`${id}-suggestions`);

	// One status line, mounted with the field, so the first message is read.
	// Emptied first, so the same words twice in a row are read twice.
	function announce(text: string) {
		status = '';
		tick().then(() => (status = text));
	}

	/** Adds the trimmed text; returns it when it was new. */
	function add(text: string): string | undefined {
		const v = text.trim();
		if (!v) return;
		draft = '';
		if (value.includes(v)) {
			announce(duplicateText(format(v)));
			return;
		}
		value = [...value, v];
		announce(addedText(format(v)));
		return v;
	}

	// The value Enter has just added, until the next task. A browser whose
	// suggestion list also takes that Enter fills in the chosen suggestion
	// after the key events; the pick then replaces the typed value instead
	// of adding a second chip.
	let entered: string | undefined;

	// When a removed chip held focus, Chip moves focus to the next chip or
	// the previous one; after the last chip, focus returns to the field.
	function remove(chip: string) {
		const hadFocus = !!list?.contains(document.activeElement);
		value = value.filter((v) => v !== chip);
		announce(removedText(format(chip)));
		if (hadFocus && !value.length) ref?.focus();
	}

	function keydown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLInputElement }) {
		onkeydown?.(event);
		if (event.defaultPrevented || event.isComposing || !editable) return;
		if (event.key === 'Enter') {
			// Empty: Enter keeps its own job, such as sending the form.
			if (!draft.trim()) return;
			event.preventDefault();
			entered = add(draft);
			if (entered) setTimeout(() => (entered = undefined));
		} else if (event.key === 'Backspace' && event.currentTarget.value === '') {
			// Moves to the last chip's remove button; a second Backspace removes
			// it. A held key never runs on into the chips.
			const last = list?.querySelector<HTMLElement>(':scope > li:last-child .hp-chip-remove');
			if (!last || event.repeat) return;
			event.preventDefault();
			last.focus();
		}
	}

	// A suggestion picked from the list is added at once. Browsers fill it in
	// with a replacement (inputType insertReplacementText) or a plain Event;
	// typing never adds.
	function input(event: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		oninput?.(event);
		const text = event.currentTarget.value;
		const picked = !(event instanceof InputEvent) || event.inputType === 'insertReplacementText';
		if (!editable || !picked || !options.includes(text)) return;
		const typed = entered;
		entered = undefined;
		if (!typed) {
			add(text);
			return;
		}
		draft = '';
		value = value.map((v) => (v === typed ? text : v));
		announce(addedText(format(text)));
	}
</script>

<!--
	A text field whose values become chips: TextField's label, hint, error
	and 16px well, then the chips in a list named by the label. Enter adds
	the trimmed text; a comma is part of a value. Suggestions come from a
	native <datalist>. With `name`, each value posts as a hidden input.
-->
<div
	class={['hp-chip-field', className]}
	data-disabled={disabled ? '' : undefined}
	data-readonly={readonly ? '' : undefined}
	data-invalid={error ? '' : undefined}
>
	<TextField
		{...rest}
		{id}
		{label}
		{hint}
		{error}
		{labelHidden}
		{disabled}
		{readonly}
		{autocomplete}
		{enterkeyhint}
		list={suggestions.length ? listId : undefined}
		aria-required={required ? true : rest['aria-required']}
		bind:value={draft}
		bind:ref
		onkeydown={keydown}
		oninput={input}
	/>
	{#if chips.length}
		<ul bind:this={list} class="chips" aria-label={label}>
			{#each chips as chip (chip)}
				{@const text = format(chip)}
				<li>
					<Chip label={text} removeLabel={removeLabel(text)} onremove={editable ? () => remove(chip) : undefined} />
				</li>
			{/each}
		</ul>
	{/if}
	<!-- Mounted while there are suggestions, even when every one is chosen,
	     so the field's role (combobox) never changes as values come and go. -->
	{#if suggestions.length}
		<datalist id={listId}>
			{#each options as option (option)}
				{@const text = format(option)}
				<option value={option} label={text === option ? undefined : text}></option>
			{/each}
		</datalist>
	{/if}
	{#if name}
		{#each chips as chip (chip)}
			<input type="hidden" {name} value={chip} {disabled} />
		{/each}
	{/if}
	<div class="hp-visually-hidden" role="status">{status}</div>
</div>

<style>
	.hp-chip-field {
		display: grid;
		gap: var(--space-2);
		min-width: 0;
	}

	/* Chromium draws a solid triangle at the end of a field with a
	   datalist, on hover and focus, from its own shadow styles, which only
	   !important overrides. The well stays a plain text well: suggestions
	   show as you type, and with ↓. */
	.hp-chip-field :global(input::-webkit-calendar-picker-indicator) {
		display: none !important;
	}

	/* Chips wrap whole; one longer than the line wraps its text inside. */
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		min-width: 0;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.chips > li {
		display: flex;
		max-width: 100%;
	}

	/* Disabled: muted ink and the quieter edge, as a disabled well. */
	[data-disabled] .chips :global(.hp-chip) {
		border-color: var(--border);
		color: var(--muted);
	}
</style>
