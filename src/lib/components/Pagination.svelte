<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	export type PaginationProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
		/** The current page, from 1. Bindable. */
		page?: number;
		/** The number of items. */
		count: number;
		/** Items per page. With the default 1, `count` is the number of pages. */
		perPage?: number;
		/** The navigation landmark's accessible name. */
		label?: string;
		/** The caps label before the page figure. */
		pageLabel?: string;
		previousLabel?: string;
		nextLabel?: string;
	};
</script>

<script lang="ts">
	import { Pagination as BitsPagination } from 'bits-ui';

	let {
		page = $bindable(1),
		count,
		perPage = 1,
		label = 'Pages',
		pageLabel = 'Page',
		previousLabel = 'Previous page',
		nextLabel = 'Next page',
		class: className,
		...rest
	}: PaginationProps = $props();

	const pages = $derived(Math.max(1, Math.ceil(count / perPage)));

	// Fewer items (a filter) can leave the page past the end; keep it in range.
	$effect.pre(() => {
		if (page > pages) page = pages;
	});
</script>

<!--
	The list view's one group of solid blocks: square titanium steps with
	black arrows. Bits UI Pagination supplies the behaviour: disabled ends and
	arrow keys between the steps.
-->
<BitsPagination.Root bind:page {count} {perPage}>
	{#snippet child({ props, currentPage })}
		<nav {...rest} {...props} class={['hp-pagination', className]} aria-label={label}>
			<span class="hp-label">{pageLabel}</span>
			<span class="figure" aria-live="polite">{currentPage} / {pages}</span>
			<span class="steps">
				<BitsPagination.PrevButton>
					{#snippet child({ props })}
						<button {...props} class="step" data-direction="previous" aria-label={previousLabel}
						></button>
					{/snippet}
				</BitsPagination.PrevButton>
				<BitsPagination.NextButton>
					{#snippet child({ props })}
						<button {...props} class="step" data-direction="next" aria-label={nextLabel}></button>
					{/snippet}
				</BitsPagination.NextButton>
			</span>
		</nav>
	{/snippet}
</BitsPagination.Root>

<style>
	.hp-pagination {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}
	.figure {
		font-family: var(--mono);
		font-variant-numeric: tabular-nums;
	}
	/* 8px apart, so a focus contour (4px out) never overlaps the neighbour. */
	.steps {
		display: flex;
		gap: var(--space-2);
		margin-left: var(--space-2);
	}

	/* 24px on fine pointers, 44px on coarse ones (--hit-target). A
	   disabled step drops to the band grey. */
	.step {
		display: grid;
		place-items: center;
		width: var(--hit-target);
		height: var(--hit-target);
		padding: 0;
		border: 0;
		background: var(--accent);
		color: var(--canvas);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.step::before {
		content: '';
		width: 6px;
		height: 8px;
		background: currentColor;
	}
	@media (pointer: coarse) {
		.step::before {
			width: 8px;
			height: 12px;
		}
	}
	.step[data-direction='previous']::before {
		clip-path: polygon(100% 0, 0 50%, 100% 100%);
	}
	.step[data-direction='next']::before {
		clip-path: polygon(0 0, 100% 50%, 0 100%);
	}
	.step:disabled {
		background: var(--surface-band);
		color: var(--muted);
		cursor: default;
	}
	@media (hover: hover) and (pointer: fine) {
		.step:not(:disabled):hover {
			background: var(--muted);
		}
	}
	.step:not(:disabled):active {
		background: var(--muted);
	}
</style>
