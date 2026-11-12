<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import { RadioGroup as BitsRadioGroup } from 'bits-ui';

	export type RadioGroupItem = {
		/** Identifies the choice; the bound `value` holds the chosen one. */
		value: string;
		/** The text beside the box, as written (never caps). */
		label: string;
		/** A second line in `--muted` under the label, read out as the choice's description. */
		hint?: string;
		/**
		 * A Tag after the label, such as "Recommended": a short fixed string the
		 * app defines, set in caps. It is part of the choice's accessible name.
		 */
		tag?: string;
		/** Shown in muted ink; it cannot be chosen and arrow keys skip it. */
		disabled?: boolean;
	};

	/** The group's name: a fixed caps `label`, or a `legend` set as written. Exactly one. */
	type RadioGroupName =
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
	export type RadioGroupProps = Omit<BitsRadioGroup.RootProps, 'child' | 'children' | 'ref' | 'orientation'> &
		RadioGroupName & {
			/** The choices, stacked in order. */
			items: RadioGroupItem[];
			/** The chosen item's `value`. Bindable; `''` means none is chosen, and the app may set `''` to clear it. */
			value?: string;
			/** A line in `--muted` under the name, read out as the group's description. */
			hint?: string;
			/**
			 * The error to show under the choices, with an icon, linked by
			 * `aria-describedby`; it sets `aria-invalid` on the group. Say how to
			 * fix the problem. The app validates; the group shows what it is given.
			 */
			error?: string;
			/** The group element (`role="radiogroup"`). */
			ref?: HTMLElement | null;
		};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import Tag from './Tag.svelte';
	import { fadeIn } from './internal/fade-in.js';

	const uid = $props.id();

	let {
		value = $bindable(''),
		label,
		legend,
		items,
		hint,
		error,
		disabled = false,
		id = uid,
		ref = $bindable(null),
		class: className,
		'aria-describedby': describedBy,
		'aria-invalid': ariaInvalid,
		onValueChange,
		...rest
	}: RadioGroupProps = $props();

	const labelId = $derived(`${id}-label`);
	const hintId = $derived(`${id}-hint`);
	const errorId = $derived(`${id}-error`);
	// The error first, so a screen reader reads it before the hint.
	const describedByIds = $derived(
		[error ? errorId : undefined, hint ? hintId : undefined, describedBy].filter(Boolean).join(' ') ||
			undefined
	);

	// ---- The tab stop -------------------------------------------------------

	// One radio is in the tab order. While focus is in the group it is the
	// focused radio, so Tab and Shift+Tab leave the group from there. From
	// outside, Tab enters on the chosen radio, or on the first one that can
	// be chosen when none is (an app that sets `value` to '' resets it).
	// Bits UI keeps the last chosen radio as its tab stop after a clear, so
	// the group sets tabindex itself; Bits UI still moves focus on arrow keys.
	let focused = $state<string | null>(null);
	const tabStop = $derived.by(() => {
		if (focused !== null) return focused;
		const open = items.filter((item) => !disabled && !item.disabled);
		return (open.find((item) => item.value === value) ?? open[0])?.value ?? null;
	});

	function focusIn(event: FocusEvent) {
		const radio = event.target instanceof Element ? event.target.closest('[role="radio"]') : null;
		focused = radio instanceof HTMLElement ? (radio.dataset.value ?? null) : null;
	}
	function focusOut(event: FocusEvent) {
		const next = event.relatedTarget;
		if (!(next instanceof Node && event.currentTarget instanceof Node && event.currentTarget.contains(next))) {
			focused = null;
		}
	}

	// ---- Short motion: the mark (BRIEF, --dur-mark) -------------------------

	// The mark a pointer or a touch chooses fades in from 0 over --dur-mark;
	// the mark it takes away goes at once. A choice made with a key (arrows,
	// Home, End, Space, Enter) or a `value` the app sets cuts, so holding an
	// arrow key through the choices never starts a fade (the frequency
	// check). As in Tabs: the choices keep the last input they saw, from
	// pointerdown and keydown in the capture phase, before Bits UI acts on
	// them; Bits UI calls onValueChange only for a choice the user makes, so
	// the change notes there whether a pointer made it, and the effect below
	// fades the new mark once it shows. A new choice cancels a fade that
	// still runs. 0ms is a cut.
	let input: 'pointer' | 'key' | null = null;
	let fadeTo: string | null = null;
	let fade: Animation | null = null;

	function changed(next: string) {
		fadeTo = input === 'pointer' ? next : null;
		onValueChange?.(next);
	}

	$effect(() => {
		const chosen = value;
		untrack(() => {
			fade?.cancel();
			fade = null;
			const pointed = fadeTo !== null && fadeTo === chosen;
			fadeTo = null;
			if (!pointed || !ref) return;
			const radio = Array.from(ref.querySelectorAll<HTMLElement>('[role="radio"]')).find(
				(el) => el.dataset.value === chosen
			);
			const mark = radio?.querySelector('.mark');
			if (mark) fade = fadeIn(mark, '--dur-mark');
		});
	});

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
	One choice from a set read side by side: a Bits UI RadioGroup, a
	role="radiogroup" element named by its caps `label` or its `legend`, with
	one role="radio" button per item. Pressing anywhere on an item's row (the
	box, the label, the tag, the hint) chooses it; arrow keys move the choice.
	`disabled`, `required`, `name` and `loop` go to Bits UI. Attributes,
	handlers and `class` go to the group element.
-->
<BitsRadioGroup.Root
	bind:value
	bind:ref
	{id}
	{disabled}
	aria-labelledby={labelId}
	aria-describedby={describedByIds}
	aria-invalid={error ? true : ariaInvalid}
	onValueChange={changed}
	{...rest}
>
	{#snippet child({ props })}
		<div {...props} class={['hp-radio-group', className]} data-invalid={error ? '' : undefined}>
			{#if legend}
				<div class="legend" id={labelId}>{@render legend()}</div>
			{:else}
				<span class="hp-label group-label" id={labelId}>{label}</span>
			{/if}
			{#if hint}
				<p class="hint hp-caption" id={hintId}>{hint}</p>
			{/if}
			<div
				class="items"
				onpointerdowncapture={() => (input = 'pointer')}
				onkeydowncapture={() => (input = 'key')}
				onfocusin={focusIn}
				onfocusout={focusOut}
			>
				{#each items as item, index (item.value)}
					{@const radioId = `${id}-item-${index}`}
					<div class="item">
						<span class="control">
							<BitsRadioGroup.Item
								id={radioId}
								value={item.value}
								disabled={item.disabled}
								aria-describedby={item.hint ? `${radioId}-hint` : undefined}
							>
								{#snippet child({ props: radioProps })}
									<button {...radioProps} class="box" tabindex={item.value === tabStop ? 0 : -1}>
										<span class="mark" aria-hidden="true"></span>
									</button>
								{/snippet}
							</BitsRadioGroup.Item>
						</span>
						<label class="hp-dense" class:tagged={!!item.tag} for={radioId}
							>{item.label}{#if item.tag}{' '}<Tag as="span">{item.tag}</Tag>{/if}</label
						>
						{#if item.hint}
							<p class="hint hp-caption" id="{radioId}-hint">{item.hint}</p>
						{/if}
					</div>
				{/each}
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
</BitsRadioGroup.Root>

<style>
	/* The name, its hint, the choices 8px apart (as CheckboxGroup's boxes),
	   then the error. Rows keep their own height when a layout makes the
	   group taller. */
	.hp-radio-group {
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

	/* ---- A choice: Checkbox's row ---------------------------------------- */

	/* The box, then the label as written. The first line is one hit-target
	   band (24px fine, 44px coarse): the box sits centred in it and the
	   label's first line too. The hint runs under the label, aligned with
	   its text. The row is as wide as its content, and all of it is the
	   target: the label's ::after covers the row, so a press on the hint, the
	   tag or the space between them is a press on the label, which chooses
	   the radio. The box sits above that cover with its own hit area. */
	.item {
		/* The label's line height, as .hp-dense sets it. */
		--_line: 24px;
		position: relative;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		column-gap: var(--space-3);
		align-items: start;
		width: fit-content;
		max-width: 100%;
	}
	@media (pointer: fine) {
		.item {
			--_line: 20px;
		}
	}

	.control {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		height: var(--hit-target);
	}

	/* Checkbox's box. Chosen, the edge turns titanium and an 8px titanium
	   square sits inside, as on a menu's radio item; the fill stays black,
	   because selection is never a fill. Focus is base.css's contour 4px
	   outside the box, as on Checkbox: the row has no frame to draw it on,
	   and the label and hint beside the box show which choice it is. */
	.box {
		position: relative;
		display: grid;
		place-items: center;
		box-sizing: border-box;
		width: 20px;
		height: 20px;
		margin: 0;
		padding: 0;
		border: 1px solid var(--border-control);
		background: var(--canvas);
		color: var(--accent);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	/* The hit area: at least --hit-target square, centred on the box. */
	.box::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		width: max(100%, var(--hit-target));
		height: max(100%, var(--hit-target));
		translate: -50% -50%;
	}
	.box[data-state='checked'] {
		border-color: var(--accent);
	}

	/* The mark is always there, at opacity 0 until its radio is chosen, and
	   switches at once here; a pointer's choice fades it in (the script). */
	.mark {
		width: 8px;
		height: 8px;
		background: currentColor;
		opacity: 0;
	}
	.box[data-state='checked'] .mark {
		opacity: 1;
	}

	label {
		justify-self: start;
		padding: calc((var(--hit-target) - var(--_line)) / 2) 0;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	label::after {
		content: '';
		position: absolute;
		inset: 0;
	}
	/* The tag sits after the label when both fit on one line; otherwise it
	   wraps under the label whole. */
	.tagged {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-2);
	}

	.item > .hint {
		grid-column: 2;
	}

	/* ---- Hover: fine pointers only, over any part of the row -------------- */

	/* Only the fill fades. The edge switches at once, on hover as on a
	   choice, so an arrow key that moves the choice away from a row under a
	   resting pointer never starts a fade (as on Tabs). */
	@media (hover: hover) and (pointer: fine) {
		.box {
			transition: background-color var(--dur-hover) var(--settle);
		}
		.item:has(> label:hover, .box:hover) .box:not(:disabled) {
			background-color: var(--surface-hover);
		}
		.item:has(> label:hover, .box:hover) .box[data-state='unchecked']:not(:disabled) {
			border-color: var(--muted);
		}
		.item:has(> label:active, .box:active) .box:not(:disabled) {
			transition-duration: var(--dur-press);
		}
	}

	/* ---- Press: one step past hover, so it reads on a phone too ---------- */

	.item:has(> label:active, .box:active) .box:not(:disabled) {
		background-color: var(--surface-raised);
	}

	/* ---- Disabled: the quieter --border and muted ink, the tag too -------- */

	.box:disabled {
		border-color: var(--border);
		color: var(--muted);
		cursor: not-allowed;
	}
	.item:has(.box:disabled) label {
		color: var(--muted);
		cursor: not-allowed;
	}
	.item:has(.box:disabled) label > :global(.hp-tag) {
		background: var(--muted);
	}

	/* ---- The error: TextField's ------------------------------------------- */

	/* It starts 8px under the last row, clear of its focus contour. */
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
