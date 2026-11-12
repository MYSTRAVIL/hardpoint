<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	/** The elements a tag renders as. Headings for a tag that names a section. */
	export type TagElement = 'p' | 'span' | 'div' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

	export type TagProps = HTMLAttributes<HTMLElement> & {
		/**
		 * The element to render: `p` (default), or a heading when the tag names
		 * a section, with an `id` the section's `aria-labelledby` points at.
		 */
		as?: TagElement;
		children?: Snippet;
	};
</script>

<script lang="ts">
	let { as = 'p', class: className, children, ...rest }: TagProps = $props();
</script>

<!--
	A small solid titanium block with black caps (BRIEF, visual rule 2). A tag
	may sit above a block to name it (da3-51); it sets no outer margin, so the
	layout spaces it.
-->
<svelte:element this={as} {...rest} class={['hp-tag', 'hp-label', className]}>{@render children?.()}</svelte:element>

<style>
	/* The caps type comes from .hp-label. The block never stretches to its
	   container, in block, grid and flex layouts alike. */
	.hp-tag {
		justify-self: start;
		width: fit-content;
		/* matches the approved specimen */
		padding: 2px 6px;
		background: var(--accent);
		color: var(--canvas);
	}
</style>
