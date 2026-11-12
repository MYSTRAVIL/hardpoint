<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { DropdownMenu as BitsDropdownMenu } from 'bits-ui';

	/**
	 * Attributes and handlers not listed here go to the group element (Bits
	 * UI `DropdownMenu.RadioGroup`), among them `onValueChange`.
	 */
	export type MenuRadioGroupProps = Omit<BitsDropdownMenu.RadioGroupProps, 'child' | 'children'> & {
		/** The chosen MenuRadioItem's `value`; `''` for none. */
		value?: string;
		/**
		 * The caps heading over the items, and the group's accessible name. A
		 * fixed string the app defines, set in caps; never user data.
		 */
		label?: string;
		/** The MenuRadioItems. */
		children: Snippet;
	};
</script>

<script lang="ts">
	import { DropdownMenu } from 'bits-ui';

	let {
		value = $bindable(''),
		label,
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: MenuRadioGroupProps = $props();
</script>

<!--
	A Bits UI radio group, role="group", named by its heading through
	aria-labelledby. One of its MenuRadioItems is chosen at a time.
-->
<DropdownMenu.RadioGroup bind:value bind:ref {...rest}>
	{#snippet child({ props })}
		<div {...props} class={['hp-menu-radio-group', className]}>
			{#if label}
				<DropdownMenu.GroupHeading>
					{#snippet child({ props: headingProps })}
						<div {...headingProps} class="hp-menu-group-heading hp-label">{label}</div>
					{/snippet}
				</DropdownMenu.GroupHeading>
			{/if}
			{@render children()}
		</div>
	{/snippet}
</DropdownMenu.RadioGroup>

<style>
	/* MenuGroup's heading: a muted caps label over the items, its text on
	   the items' text edge. */
	.hp-menu-group-heading {
		padding: var(--space-2) var(--menu-inset, var(--space-3)) var(--space-1);
		color: var(--muted);
		user-select: none;
	}
</style>
