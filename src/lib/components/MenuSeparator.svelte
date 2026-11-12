<script lang="ts" module>
	import type { DropdownMenu as BitsDropdownMenu } from 'bits-ui';

	/** Attributes go to the separator element (Bits UI `DropdownMenu.Separator`). */
	export type MenuSeparatorProps = Omit<BitsDropdownMenu.SeparatorProps, 'child' | 'children'>;
</script>

<script lang="ts">
	import { DropdownMenu } from 'bits-ui';

	let { ref = $bindable(null), class: className, ...rest }: MenuSeparatorProps = $props();
</script>

<!-- A Bits UI separator, role="separator", between groups of items. -->
<DropdownMenu.Separator bind:ref {...rest}>
	{#snippet child({ props })}
		<div {...props} class={['hp-menu-separator', className]}></div>
	{/snippet}
</DropdownMenu.Separator>

<style>
	/* A 1px divider across the whole menu, in the decorative line colour. */
	.hp-menu-separator {
		height: 1px;
		margin-block: var(--space-1);
		background: var(--border);
	}
</style>
