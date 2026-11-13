<script lang="ts">
	import { neighbours } from './pages';

	let { pathname }: { pathname: string } = $props();

	// The entries before and after this page in the index order; null off the index.
	const around = $derived(neighbours(pathname));
</script>

<!--
	Previous and next: the entries around this page in the index's order
	(./pages.ts). Plain links on the index's row look: the hover tint bleeds
	past the text edge. The layout renders it after every docs page; a page
	that renders without the layout (bare) places it itself.
-->
{#if around && (around.prev || around.next)}
	<nav class="pager" aria-label="Previous and next page">
		{#if around.prev}
			<a class="link prev" href={around.prev.href} rel="prev">
				<span class="hp-label">Previous</span>
				<span class="hp-body">{around.prev.title}</span>
			</a>
		{/if}
		{#if around.next}
			<a class="link next" href={around.next.href} rel="next">
				<span class="hp-label">Next</span>
				<span class="hp-body">{around.next.title}</span>
			</a>
		{/if}
	</nav>
{/if}

<style>
	.pager {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: var(--space-4);
		margin: 0 calc(-1 * var(--bleed));
	}
	.link {
		display: grid;
		align-content: center;
		gap: var(--space-1);
		min-width: 0;
		min-height: var(--hit-target);
		padding: calc(var(--space-3) * var(--density)) var(--bleed);
		text-decoration: none;
	}
	.link span:first-child {
		color: var(--muted);
	}
	.link span:last-child {
		overflow-wrap: anywhere;
	}
	.prev {
		grid-column: 1;
	}
	.next {
		grid-column: 2;
		text-align: end;
	}
	@media (hover: hover) and (pointer: fine) {
		.link:hover {
			background: var(--surface-hover);
		}
	}
	.link:active {
		background: var(--surface-hover);
	}
	.link:focus-visible {
		outline-offset: -2px;
	}
</style>
