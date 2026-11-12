<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { DropdownMenu as BitsDropdownMenu } from 'bits-ui';

	export type MenuTriggerSnippetProps = {
		/** Spread onto the button that opens the menu. */
		props: Record<string, unknown>;
	};

	/**
	 * Attributes and handlers not listed here go to the menu element (Bits UI
	 * `DropdownMenu.Content`), among them `side` (default `bottom`), `align`
	 * (default `start`), `sideOffset` (default 8), `collisionPadding`
	 * (default 8), `loop`, `onCloseAutoFocus`, `onEscapeKeydown` and
	 * `onInteractOutside`. The placement props apply from 600px only; below it
	 * the menu is a bottom sheet.
	 */
	export type MenuProps = Omit<BitsDropdownMenu.ContentProps, 'child' | 'children' | 'forceMount' | 'ref'> & {
		open?: boolean;
		/**
		 * The menu's accessible name, and the sheet's title below 600px. Use the
		 * trigger's accessible name: its text, or an icon button's `aria-label`.
		 * A fixed string the app defines, set in caps as the sheet's title, so it
		 * never carries user data; name a row's item through the trigger's
		 * `aria-describedby`.
		 */
		label: string;
		/** The button the menu opens from: spread `props` onto it. */
		trigger: Snippet<[MenuTriggerSnippetProps]>;
		/** The items: MenuItem, MenuCheckboxItem, MenuRadioGroup, MenuGroup and MenuSeparator. */
		children: Snippet;
		/** The sheet's close button's accessible name (below 600px). */
		closeLabel?: string;
		/** The menu element, `role="menu"`. */
		ref?: HTMLElement | null;
	};
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import { DropdownMenu } from 'bits-ui';
	import { MediaQuery } from 'svelte/reactivity';
	import { pop } from '../motion/index.js';
	import Sheet from './internal/Sheet.svelte';

	let {
		open = $bindable(false),
		label,
		trigger,
		children,
		closeLabel = 'Close',
		ref = $bindable(null),
		class: className,
		onInteractOutside,
		onCloseAutoFocus,
		side = 'bottom',
		align = 'start',
		sideOffset = 8,
		collisionPadding = 8,
		alignOffset,
		arrowPadding,
		avoidCollisions,
		collisionBoundary,
		sticky,
		hideWhenDetached,
		updatePositionStrategy,
		strategy,
		customAnchor,
		...rest
	}: MenuProps = $props();

	// Placement belongs to the menu under the trigger; the sheet always sits
	// at the bottom edge, so ContentStatic never receives these.
	const placement = $derived({
		side,
		align,
		sideOffset,
		collisionPadding,
		alignOffset,
		arrowPadding,
		avoidCollisions,
		collisionBoundary,
		sticky,
		hideWhenDetached,
		updatePositionStrategy,
		strategy,
		customAnchor
	});

	// The form follows the width (BRIEF, Apps and phones: Overlays): a menu
	// under its trigger from 600px, the shared bottom sheet below it.
	const wide = new MediaQuery('min-width: 600px', true);

	// Bits UI moves real focus to the highlighted item, whether keys or a
	// pointer moved it. Only a highlight the keys moved draws the focus
	// contour; a pointer's draws the tint alone. The items read the contour
	// from --menu-contour, which .hp-menu[data-keyboard] sets.
	let keyboard = $state(false);

	let sheetNode = $state<HTMLElement | null>(null);
	let triggerNode = $state<HTMLElement | null>(null);

	// Bits UI's content layers (the portal, positioning, focus and dismiss
	// handling) cost about 0.3 ms a menu, and an app may draw several closed
	// menus per view, so they mount on the first open, not with the
	// trigger. Until then only the trigger and its ARIA exist. They mount
	// closed, and Bits UI sees the menu open one update later, so the first
	// entrance plays as every later one does. They stay mounted after that.
	let layers = $state(false);
	let ready = $state(false);
	$effect(() => {
		if (!open || layers) return;
		layers = true;
		tick().then(() => (ready = true));
	});

	function close() {
		open = false;
	}

	// The sheet's title row and handle sit outside the menu element; pressing
	// them is not an outside press.
	function insideSheet(e: PointerEvent) {
		if (sheetNode && e.target instanceof Node && sheetNode.contains(e.target)) {
			e.preventDefault();
			return;
		}
		onInteractOutside?.(e);
	}

	// Bits UI leaves focus where an outside press put it, so a click on
	// another control keeps it. Below 600px the only thing outside is the
	// scrim, and a press there is a dismiss like the close button, so focus
	// returns to the trigger as it does after the close button.
	function returnFocus(e: Event) {
		onCloseAutoFocus?.(e);
		if (e.defaultPrevented) return;
		e.preventDefault();
		triggerNode?.focus();
	}

	// Listens on the menu element without replacing Bits UI's own handlers
	// in `props`.
	function trackInput(node: HTMLElement) {
		const keys = () => (keyboard = true);
		const pointer = () => (keyboard = false);
		node.addEventListener('keydown', keys, true);
		node.addEventListener('pointerdown', pointer, true);
		node.addEventListener('pointermove', pointer, true);
		return () => {
			node.removeEventListener('keydown', keys, true);
			node.removeEventListener('pointerdown', pointer, true);
			node.removeEventListener('pointermove', pointer, true);
		};
	}
</script>

<!--
	Bits UI gives the trigger aria-haspopup="menu", aria-expanded and
	aria-controls; the menu element takes role="menu" and `label` as its
	name. Opened by keys, focus moves to the first item; opened by a pointer,
	to the menu itself. Arrow keys move the highlight and loop, letters jump
	by typeahead, Enter or Space runs the item. Escape, choosing an item and,
	below 600px, the close button, a swipe down or a press on the scrim close
	it and return focus to the trigger. From 600px a press outside closes it
	and leaves focus where the press put it; Tab closes it and moves on.
-->
<DropdownMenu.Root bind:open={() => open && ready, (value) => (open = value)}>
	<DropdownMenu.Trigger
		bind:ref={triggerNode}
		onkeydowncapture={() => (keyboard = true)}
		onpointerdowncapture={() => (keyboard = false)}
	>
		{#snippet child({ props })}
			{@render trigger({ props })}
		{/snippet}
	</DropdownMenu.Trigger>

	{#if layers}
		<DropdownMenu.Portal>
			{#if wide.current}
				<DropdownMenu.Content forceMount bind:ref {...placement} {onInteractOutside} {onCloseAutoFocus} {...rest}>
					{#snippet child({ wrapperProps, props, open: shown })}
						{#if shown}
							<div {...wrapperProps}>
								<div
									{...props}
									class={['hp-menu', className]}
									data-form="popover"
									data-keyboard={keyboard || undefined}
									aria-label={label}
									transition:pop
									{@attach trackInput}
								>
									{@render children()}
								</div>
							</div>
						{/if}
					{/snippet}
				</DropdownMenu.Content>
			{:else}
				<DropdownMenu.ContentStatic
					forceMount
					bind:ref
					{...rest}
					preventScroll
					onInteractOutside={insideSheet}
					onCloseAutoFocus={returnFocus}
				>
					{#snippet child({ props, open: shown })}
						<Sheet open={shown} layer="popover" title={label} {closeLabel} onclose={close} bind:ref={sheetNode}>
							<div
								{...props}
								class={['hp-menu', className]}
								data-form="sheet"
								data-keyboard={keyboard || undefined}
								aria-label={label}
								{@attach trackInput}
							>
								{@render children()}
							</div>
						</Sheet>
					{/snippet}
				</DropdownMenu.ContentStatic>
			{/if}
		</DropdownMenu.Portal>
	{/if}
</DropdownMenu.Root>

<style>
	/* The list in both forms. Items read two inherited properties:
	   --menu-inset, the row's side padding, so item text lines up with the
	   menu's edge here and with the sheet's title there; and --menu-contour,
	   the outline a highlighted row draws, which only keys turn on. The menu
	   element takes focus when a pointer opens it; the rows show where focus
	   is, so the menu itself draws no contour. */
	.hp-menu {
		--menu-inset: var(--space-3);
		--menu-contour: none;

		box-sizing: border-box;
		padding-block: var(--space-1);
		background: var(--canvas);
		color: var(--text);
		font-family: var(--sans);
		outline: none;
	}
	.hp-menu[data-keyboard] {
		--menu-contour: 2px solid var(--focus);
	}

	/* ---- Popover (600px and up): a black panel under its trigger --------- */

	/* On the popover layer (tokens.css), over the shell and over an open
	   dialog; Bits UI copies the z-index to the positioned wrapper. At least
	   as wide as the trigger and 192px, at most 320px, and as tall as the
	   space beside the trigger; a longer list scrolls inside. */
	.hp-menu[data-form='popover'] {
		position: relative;
		z-index: var(--layer-popover);
		width: max-content;
		min-width: max(var(--bits-dropdown-menu-anchor-width), 192px);
		max-width: min(320px, var(--bits-dropdown-menu-content-available-width));
		max-height: var(--bits-dropdown-menu-content-available-height);
		overflow-y: auto;
		overscroll-behavior: contain;
		border: 1px solid var(--border-control);
	}

	/* ---- Sheet (compact): the list is the sheet's body, which scrolls ---- */

	.hp-menu[data-form='sheet'] {
		--menu-inset: var(--gutter);
	}
</style>
