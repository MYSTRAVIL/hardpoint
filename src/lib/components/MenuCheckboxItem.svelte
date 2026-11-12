<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { DropdownMenu as BitsDropdownMenu } from 'bits-ui';

	/**
	 * Attributes and handlers not listed here go to the item element (Bits UI
	 * `DropdownMenu.CheckboxItem`), among them `disabled`, `onCheckedChange`,
	 * `onSelect` and `closeOnSelect` (default true; pass false to keep the
	 * menu open, so the change shows).
	 */
	export type MenuCheckboxItemProps = Omit<
		BitsDropdownMenu.CheckboxItemProps,
		'child' | 'children' | 'indeterminate' | 'onIndeterminateChange' | 'value'
	> & {
		/** The label, as written (never caps). */
		children: Snippet;
	};
</script>

<script lang="ts">
	import { DropdownMenu } from 'bits-ui';

	let {
		checked = $bindable(false),
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: MenuCheckboxItemProps = $props();
</script>

<!--
	A Bits UI checkbox item, role="menuitemcheckbox", with aria-checked and
	data-state (checked, unchecked). A press, Enter or Space toggles it.
-->
<DropdownMenu.CheckboxItem bind:checked bind:ref {...rest}>
	{#snippet child({ props })}
		<div {...props} class={['hp-menu-checkbox-item', className]}>
			<span class="hp-menu-box" aria-hidden="true">
				<svg class="hp-menu-check" viewBox="0 0 12 12"><path d="M1.5 6.5l3 3 6-6" /></svg>
			</span>
			<span class="hp-menu-item-label">{@render children()}</span>
		</div>
	{/snippet}
</DropdownMenu.CheckboxItem>

<style>
	/* The row: the same as MenuItem's. Only the mark fades (below). */
	.hp-menu-checkbox-item {
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
	.hp-menu-checkbox-item[data-highlighted] {
		background: var(--surface-hover);
		outline: var(--menu-contour, none);
		outline-offset: -2px;
	}
	.hp-menu-checkbox-item:active:not([data-disabled]) {
		background: var(--surface-raised);
	}
	.hp-menu-checkbox-item[data-disabled] {
		color: var(--muted);
		cursor: not-allowed;
	}

	/* Checkbox's black box with a 3:1 boundary. Checked, the edge and the
	   mark turn titanium and the box stays black: selection is never a fill.
	   The row's tint is the hover feedback. */
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
	.hp-menu-checkbox-item[data-state='checked'] .hp-menu-box {
		border-color: var(--accent);
	}
	.hp-menu-checkbox-item[data-disabled] .hp-menu-box {
		border-color: var(--border);
		color: var(--muted);
	}
	/* The check is always there, at opacity 0 until the item is checked.
	   Checking fades it in from 0 over --dur-mark (BRIEF, short motion);
	   unchecking takes it away at once. A CSS transition never runs on an
	   element's first style, so a menu that opens shows its marks at once.
	   0ms is a snap. Opacity only, so reduced motion keeps it. */
	.hp-menu-check {
		width: 12px;
		height: 12px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2px;
		opacity: 0;
	}
	.hp-menu-checkbox-item[data-state='checked'] .hp-menu-check {
		opacity: 1;
		transition: opacity var(--dur-mark) var(--settle);
	}
</style>
