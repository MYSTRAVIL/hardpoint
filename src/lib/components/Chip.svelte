<script lang="ts" module>
	import type { HTMLAnchorAttributes, HTMLAttributes, HTMLButtonAttributes, MouseEventHandler } from 'svelte/elements';

	/**
	 * A data category, drawn in `--category-1` to `--category-5`. The colour
	 * only repeats a category the app also names, for example in a legend.
	 */
	export type ChipCategory = 1 | 2 | 3 | 4 | 5;

	/**
	 * Attributes and handlers not listed here go to the chip's body: its
	 * link, its button, or its text; `class` goes to the root.
	 */
	export type ChipProps = Omit<HTMLAnchorAttributes, 'children' | 'href' | 'onclick'> & {
		/** The value, as written: never caps. The remove button's name ends in it. */
		label: string;
		/** Makes the chip a link. A remove button stays a sibling of the link. */
		href?: string;
		/**
		 * Without `href`, makes the chip a button that runs this action, such
		 * as applying a saved filter. With `href` it runs on the link's click,
		 * as on any link. A remove button stays a sibling of the button.
		 */
		onclick?: MouseEventHandler<HTMLElement> | null;
		/** A number after the value in `--muted`, such as how many items carry it. */
		count?: number;
		/**
		 * A value that is not settled: the edge is dashed, and screen readers
		 * hear `tentativeLabel` after the value, so the line is never the only
		 * cue.
		 */
		tentative?: boolean;
		/** The words a screen reader hears after a tentative value. */
		tentativeLabel?: string;
		/** A 3 px edge on the start side in `--category-N`. Data only, always with a legend or a label. */
		category?: ChipCategory;
		/**
		 * Shows a remove button after the value. The app removes the chip; when
		 * a removed chip held focus, focus moves to the next chip in the same
		 * list, or the previous one.
		 */
		onremove?: () => void;
		/** The remove button's accessible name. Default: `Remove <label>`. */
		removeLabel?: string;
	};
</script>

<script lang="ts">
	let {
		label,
		href,
		onclick,
		count,
		tentative = false,
		tentativeLabel = 'tentative',
		category,
		onremove,
		removeLabel,
		class: className,
		...rest
	}: ChipProps = $props();

	// `rest` holds the attributes of one element; each branch reads it as its own.
	const asSpan = (attributes: typeof rest) => attributes as HTMLAttributes<HTMLSpanElement>;
	const asButton = (attributes: typeof rest) => attributes as HTMLButtonAttributes;

	let root: HTMLSpanElement | null = $state(null);

	// ---- Focus after a removal -------------------------------------------

	// The app removes the chip; this only keeps focus from falling to <body>.
	// A press of the remove button records where the chip sat in its list
	// (the nearest ul, ol or role="list"), if focus was inside the chip. When
	// the chip is destroyed and focus has fallen to <body>, focus moves to
	// the chip now at that place (the next one), or else the one before it:
	// its remove button, or its link or button. If the app moved focus
	// itself, or the chip stays, nothing moves. A pointer press never takes
	// focus (below), so a mouse or a touch removal leaves focus where it was.
	let removal: { chip: HTMLElement; list: Element; index: number } | null = null;

	function remove() {
		if (!onremove || !root) return;
		const list = root.closest('ul, ol, [role="list"]');
		removal =
			list && root.contains(document.activeElement)
				? { chip: root, list, index: [...list.querySelectorAll('.hp-chip')].indexOf(root) }
				: null;
		onremove();
	}

	function refocus({ chip, list, index }: NonNullable<typeof removal>) {
		const active = document.activeElement;
		if ((active && active !== document.body) || !list.isConnected) return;
		const chips = [...list.querySelectorAll<HTMLElement>('.hp-chip')].filter((c) => c !== chip);
		const next = chips[index] ?? chips[index - 1];
		(next?.querySelector<HTMLElement>('.hp-chip-remove') ?? next?.querySelector<HTMLElement>(':is(a, button).hp-chip-body'))?.focus();
	}

	// Teardown only: runs when the chip is destroyed. A microtask later the
	// DOM has caught up, whatever removed the chip.
	$effect(() => () => {
		const pending = removal;
		if (pending) queueMicrotask(() => refocus(pending));
	});

	// Backspace and Delete remove a focused chip, as in a chip field. A held
	// key does not run on through the next chips.
	function keydown(event: KeyboardEvent) {
		if (event.key !== 'Backspace' && event.key !== 'Delete') return;
		event.preventDefault();
		if (!event.repeat) remove();
	}
</script>

<!--
	A value in an outlined block: the --border-control edge of an outlined
	control, no fill, Geist as written, never caps. Display by default; a
	link with `href`, a button with `onclick`. A remove button follows the
	text, never inside the link or the button. Interactive chips reserve
	their hit area on coarse pointers, so a row of them needs no extra gap.
-->
<span
	bind:this={root}
	class={['hp-chip', className]}
	data-link={href ? '' : undefined}
	data-action={!href && onclick ? '' : undefined}
	data-removable={onremove ? '' : undefined}
	data-tentative={tentative ? '' : undefined}
	data-category={category}
>
	{#snippet content()}
		<span class="hp-chip-label">{label}</span>
		{#if count !== undefined}
			<!-- A space in the text, so every browser names it "label 12"; a
			     flex container does not draw it. -->
			{' '}<span class="hp-chip-count">{count}</span>
		{/if}
		{#if tentative}
			<span class="hp-visually-hidden">, {tentativeLabel}</span>
		{/if}
	{/snippet}
	{#if href}
		<a {...rest} {href} {onclick} class="hp-chip-body">{@render content()}</a>
	{:else if onclick}
		<button {...asButton(rest)} type="button" {onclick} class="hp-chip-body">{@render content()}</button>
	{:else}
		<span {...asSpan(rest)} class="hp-chip-body">{@render content()}</span>
	{/if}
	{#if onremove}
		<button
			type="button"
			class="hp-chip-remove hp-focus-inset"
			aria-label={removeLabel ?? `Remove ${label}`}
			onmousedown={(event) => event.preventDefault()}
			onclick={remove}
			onkeydown={keydown}
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
</span>

<style>
	/* Geist as written, even inside a caps label or a mono table cell. 16px
	   on 24px lines; 14 on 20 with a mouse, as dense UI. The block is 24px
	   high on fine pointers and 28px on coarse ones. */
	.hp-chip {
		position: relative;
		display: inline-flex;
		box-sizing: border-box;
		min-width: 0;
		/* Never wider than its container; a longer value wraps inside the
		   block, never cut. An app caps a chip by capping its container. */
		max-width: 100%;
		border: 1px solid var(--border-control);
		background: transparent;
		color: var(--text);
		font-family: var(--sans);
		font-size: var(--type-body);
		font-weight: 400;
		line-height: 24px;
		letter-spacing: normal;
		text-align: start;
		text-transform: none;
		white-space: normal;
		-webkit-tap-highlight-color: transparent;
	}
	@media (pointer: fine) {
		.hp-chip {
			font-size: var(--type-dense);
			line-height: 20px;
		}
	}

	/* A link or a remove button keeps its --hit-target band inside the
	   chip's own margin box: 8px above and below on coarse pointers, none on
	   fine ones. Rows of chips 8px apart keep 8px between targets. */
	.hp-chip[data-link],
	.hp-chip[data-action],
	.hp-chip[data-removable] {
		margin-block: max(0px, (var(--hit-target) - 1lh - 4px) / 2);
	}

	.hp-chip[data-tentative] {
		border-style: dashed;
	}

	/* ---- The text: value, count, hidden words ------------------------- */

	.hp-chip-body {
		position: relative;
		display: inline-flex;
		align-items: baseline;
		gap: var(--space-2);
		min-width: 0;
		padding: 1px var(--space-2);
		color: inherit;
		text-decoration: none;
	}
	.hp-chip-label {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.hp-chip-count {
		flex: none;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}

	/* ---- Category edge: 3px on the start side ------------------------- */

	/* It covers the boundary's start side, so the text keeps its place
	   with or without a category. Above the link's hover fill. */
	.hp-chip[data-category]::after {
		content: '';
		position: absolute;
		z-index: 1;
		inset-block: -1px;
		inset-inline-start: -1px;
		width: 3px;
		pointer-events: none;
	}
	.hp-chip[data-category='1']::after {
		background: var(--category-1);
	}
	.hp-chip[data-category='2']::after {
		background: var(--category-2);
	}
	.hp-chip[data-category='3']::after {
		background: var(--category-3);
	}
	.hp-chip[data-category='4']::after {
		background: var(--category-4);
	}
	.hp-chip[data-category='5']::after {
		background: var(--category-5);
	}

	/* ---- Link or button: an outlined control ---------------------------- */

	/* A button body drops the browser's own button look. */
	button.hp-chip-body {
		margin: 0;
		border: 0;
		background: transparent;
		font: inherit;
		letter-spacing: inherit;
		text-align: inherit;
		text-transform: inherit;
	}
	/* At least --hit-target wide, and --hit-target high through ::before. */
	:is(a, button).hp-chip-body {
		min-width: var(--hit-target);
		cursor: pointer;
	}
	:is(a, button).hp-chip-body::before {
		content: '';
		position: absolute;
		inset-inline: 0;
		top: 50%;
		height: max(100%, var(--hit-target));
		translate: 0 -50%;
	}

	/* ---- Remove button -------------------------------------------------- */

	/* --hit-target wide (24px fine, 44px coarse) and --hit-target high
	   through ::before, so it never overlaps the link or the next chip. The
	   cross is 8px in --muted, as the search field's clear button. */
	.hp-chip-remove {
		position: relative;
		display: grid;
		flex: none;
		place-items: center;
		box-sizing: border-box;
		width: var(--hit-target);
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--muted);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.hp-chip-remove::before {
		content: '';
		position: absolute;
		inset-inline: 0;
		top: 50%;
		height: max(100%, var(--hit-target));
		translate: 0 -50%;
	}
	.hp-chip-remove svg {
		width: var(--space-4);
		height: var(--space-4);
	}
	/* Beside plain text the button's own space separates them; beside a
	   link a 1px line marks where one target ends. */
	.hp-chip[data-removable]:not([data-link], [data-action]) > .hp-chip-body {
		padding-inline-end: 0;
	}
	.hp-chip:is([data-link], [data-action]) > .hp-chip-remove {
		border-inline-start: 1px solid var(--border-control);
	}

	/* ---- Hover: fine pointers only ------------------------------------- */

	@media (hover: hover) and (pointer: fine) {
		:is(a, button).hp-chip-body,
		.hp-chip-remove {
			transition:
				background-color var(--dur-hover) var(--settle),
				color var(--dur-hover) var(--settle);
		}
		:is(a, button).hp-chip-body:hover,
		.hp-chip-remove:hover {
			background-color: var(--surface-hover);
		}
		.hp-chip-remove:hover {
			color: var(--text);
		}
		:is(a, button).hp-chip-body:active,
		.hp-chip-remove:active {
			transition-duration: var(--dur-press);
		}
	}

	/* ---- Press: after hover, so it wins while the pointer is down ------ */

	:is(a, button).hp-chip-body:active,
	.hp-chip-remove:active {
		background-color: var(--surface-raised);
	}
	.hp-chip-remove:active {
		color: var(--text);
	}
</style>
