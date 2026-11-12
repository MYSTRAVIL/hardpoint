<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { DropdownMenu as BitsDropdownMenu } from 'bits-ui';

	/**
	 * Attributes and handlers not listed here go to the item element (Bits UI
	 * `DropdownMenu.RadioItem`), among them `disabled`, `onSelect` and
	 * `closeOnSelect` (default true; pass false to keep the menu open, so the
	 * change shows). Place it inside a MenuRadioGroup.
	 */
	export type MenuRadioItemProps = Omit<BitsDropdownMenu.RadioItemProps, 'child' | 'children'> & {
		/** Chosen when the group's `value` equals it. */
		value: string;
		/** The label, as written (never caps). */
		children: Snippet;
	};
</script>

<script lang="ts">
	import { DropdownMenu } from 'bits-ui';

	let { ref = $bindable(null), class: className, children, ...rest }: MenuRadioItemProps = $props();
</script>

<!--
	A Bits UI radio item, role="menuitemradio", with aria-checked and
	data-state (checked, unchecked). A press, Enter or Space chooses it.
-->
<DropdownMenu.RadioItem bind:ref {...rest}>
	{#snippet child({ props })}
		<div {...props} class={['hp-menu-radio-item', className]}>
			<span class="hp-menu-box" aria-hidden="true">
				<span class="hp-menu-radio-mark"></span>
			</span>
			<span class="hp-menu-item-label">{@render children()}</span>
		</div>
	{/snippet}
</DropdownMenu.RadioItem>

<style>
	/* The row: the same as MenuItem's. Only the mark fades (below). */
	.hp-menu-radio-item {
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
	.hp-menu-radio-item[data-highlighted] {
		background: var(--surface-hover);
		outline: var(--menu-contour, none);
		outline-offset: -2px;
	}
	.hp-menu-radio-item:active:not([data-disabled]) {
		background: var(--surface-raised);
	}
	.hp-menu-radio-item[data-disabled] {
		color: var(--muted);
		cursor: not-allowed;
	}

	/* The checkbox item's black box; chosen, a titanium edge and a solid
	   8px titanium square, square like every other mark. */
	.hp-menu-box {
		flex: none;
		display: grid;
		place-items: center;
		box-sizing: border-box;
		width: 20px;
		height: 20px;
		border: 1px solid var(--border-control);
		background: var(--canvas);
		color: var(--accent);
	}
	.hp-menu-radio-item[data-state='checked'] .hp-menu-box {
		border-color: var(--accent);
	}
	.hp-menu-radio-item[data-disabled] .hp-menu-box {
		border-color: var(--border);
		color: var(--muted);
	}
	/* The mark is always there, at opacity 0 until the item is chosen.
	   Choosing fades it in from 0 over --dur-mark (BRIEF, short motion);
	   the item that loses the choice drops its mark at once. A CSS
	   transition never runs on an element's first style, so a menu that
	   opens shows its mark at once. 0ms is a snap. Opacity only, so reduced
	   motion keeps it. */
	.hp-menu-radio-mark {
		width: 8px;
		height: 8px;
		background: currentColor;
		opacity: 0;
	}
	.hp-menu-radio-item[data-state='checked'] .hp-menu-radio-mark {
		opacity: 1;
		transition: opacity var(--dur-mark) var(--settle);
	}
</style>
