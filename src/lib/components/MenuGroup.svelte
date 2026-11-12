<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { DropdownMenu as BitsDropdownMenu } from 'bits-ui';

	/** Attributes not listed here go to the group element (Bits UI `DropdownMenu.Group`). */
	export type MenuGroupProps = Omit<BitsDropdownMenu.GroupProps, 'child' | 'children'> & {
		/**
		 * The caps heading over the items, and the group's accessible name. A
		 * fixed string the app defines, set in caps; never user data.
		 */
		label?: string;
		/** The items. */
		children: Snippet;
	};
</script>

<script lang="ts">
	import { DropdownMenu } from 'bits-ui';

	let { label, ref = $bindable(null), class: className, children, ...rest }: MenuGroupProps = $props();
</script>

<!--
	A Bits UI group, role="group", named by its heading through
	aria-labelledby. Separate groups with a MenuSeparator.
-->
<DropdownMenu.Group bind:ref {...rest}>
	{#snippet child({ props })}
		<div {...props} class={['hp-menu-group', className]}>
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
</DropdownMenu.Group>

<style>
	/* A muted caps label over the items, its text on the items' text edge.
	   The same heading as MenuRadioGroup's. */
	.hp-menu-group-heading {
		padding: var(--space-2) var(--menu-inset, var(--space-3)) var(--space-1);
		color: var(--muted);
		user-select: none;
	}
</style>
