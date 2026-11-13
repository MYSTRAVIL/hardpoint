<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { DropdownMenu as BitsDropdownMenu } from 'bits-ui';

	export type MenuItemTone = 'danger';

	/**
	 * Attributes and handlers not listed here go to the item element (Bits UI
	 * `DropdownMenu.Item`), among them `disabled`, `onSelect` (call
	 * `preventDefault()` on its event to keep the menu open), `closeOnSelect`
	 * (default true) and `textValue`. Typeahead matches the label's text:
	 * Bits UI 2.20.6 declares `textValue` but does not read it yet.
	 */
	export type MenuItemProps = Omit<BitsDropdownMenu.ItemProps, 'child' | 'children'> & {
		/** `danger` (status red) for an action that destroys or removes something. No tone is the neutral row. */
		tone?: MenuItemTone;
		/** The label, as written (never caps). */
		children: Snippet;
	};
</script>

<script lang="ts">
	import { DropdownMenu } from 'bits-ui';

	let {
		tone,
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: MenuItemProps = $props();
</script>

<!--
	A Bits UI menu item, role="menuitem", with Bits UI's data-highlighted,
	data-disabled and aria-disabled. A press, Enter or Space runs `onSelect`
	and closes the menu.
-->
<DropdownMenu.Item bind:ref {...rest}>
	{#snippet child({ props })}
		<div {...props} class={['hp-menu-item', className]} data-tone={tone}>
			<span class="hp-menu-item-label">{@render children()}</span>
		</div>
	{/snippet}
</DropdownMenu.Item>

<style>
	/* A Geist row, sentence case: 36px on fine pointers, 44px on coarse.
	   The label is one flex item, so inline markup inside it stays inline.
	   Highlight moves snap, so nothing on a row transitions (BRIEF, motion
	   rule 3). Same row as MenuCheckboxItem and MenuRadioItem. */
	.hp-menu-item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		box-sizing: border-box;
		min-height: var(--control-height);
		padding: var(--space-1) var(--menu-inset, var(--space-3));
		font: var(--type-body) / 24px var(--sans);
		overflow-wrap: anywhere;
		cursor: pointer;
		user-select: none;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
		outline: none;
	}
	.hp-menu-item-label {
		flex: 1 1 auto;
		min-width: 0;
	}

	/* Highlighted, by keys or a pointer: the hover tint. A highlight the keys
	   moved also draws the focus contour inside the row (Menu sets
	   --menu-contour). */
	.hp-menu-item[data-highlighted] {
		background: var(--surface-hover);
		outline: var(--menu-contour, none);
		outline-offset: -2px;
	}
	/* Press: one step past the tint, so it reads on a phone too. */
	.hp-menu-item:active:not([data-disabled]) {
		background: var(--surface-raised);
	}

	.hp-menu-item[data-tone='danger'] {
		color: var(--danger);
	}
	/* Disabled: muted, even a danger item; keys skip it and a pointer does
	   not highlight it. */
	.hp-menu-item[data-disabled] {
		color: var(--muted);
		cursor: not-allowed;
	}
</style>
