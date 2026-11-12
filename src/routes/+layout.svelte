<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/env';
	import { page } from '$app/state';
	import '#lib/fonts.css';
	import '#lib/tokens.css';
	import '#lib/base.css';
	import ThemeSelect from './ThemeSelect.svelte';
	import { applySavedTuning } from './motion-tuning';

	let { children } = $props();

	// The /motion page's overrides for this tab, on every page: docs and bare.
	if (browser) applySavedTuning();

	// `npm run audit` waits for this mark: before hydration a server-rendered page lacks its client-only
	// parts and an `ssr = false` route such as /app is empty, and a cold dev server can take seconds.
	onMount(() => {
		document.documentElement.dataset.hydrated = '';
	});
</script>

<!--
	The shell: one header row that stays in place (BRIEF, visual rule 9). The
	layout owns the wordmark; each page renders, as direct children and in this
	order:
	  1. <header> with its <h1 class="hp-view-title"> view title;
	  2. optionally one element of page controls (filters, page actions);
	  3. <main id="main" tabindex="-1"> with the content.
	The view title sits centred in the header row: the wordmark and the
	controls take equal side columns, so the title lands in the middle of the
	page. Where a side column is too wide to allow that, the title moves over
	and, at worst, truncates. From 1200px the controls sit at the right of the
	header row; below that they take their own row under it and scroll with
	the page, so the pinned row stays one row high and the title can centre.
	The title and controls are page content and change with the page; the
	wordmark never does (da3-40, da3-49).

	A route opts out of this shell with `bare: true` from its load function
	(`export const load = () => ({ bare: true })` in its +page.ts, or a
	+layout.ts for a whole subtree). It then renders alone, so it can show a
	full-viewport frame such as AppShell. The stylesheets still load.
-->
{#if page.data.bare}
	{@render children()}
{:else}
	<a class="skip hp-label" href="#main">Skip to content</a>

	<div class="shell">
		<nav class="brand" aria-label="Docs">
			<a class="hp-pixel" href="/">HARDPOINT</a>
		</nav>
		{@render children()}
		<footer class="site-foot">
			<ThemeSelect labelBeside />
		</footer>
	</div>
{/if}

<style>
	:global(html) {
		scroll-padding-top: calc(var(--header-height) + env(safe-area-inset-top) + var(--space-4));
	}

	.skip {
		position: fixed;
		top: -100px;
		left: calc(var(--gutter) + env(safe-area-inset-left));
		z-index: 10;
		display: flex;
		align-items: center;
		min-height: var(--hit-target);
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--border-control);
		background: var(--canvas);
		text-decoration: none;
	}
	.skip:focus {
		top: calc(var(--space-2) + env(safe-area-inset-top));
	}

	.shell {
		display: grid;
		/* Equal side columns centre the title. Their minimums come from the
		   wordmark and the controls; main and the controls row keep
		   min-width: 0, so wide content never stretches the header. */
		grid-template-columns: 1fr auto 1fr;
		grid-template-rows: auto auto 1fr auto;
		grid-template-areas:
			'brand title .'
			'controls controls controls'
			'main main main'
			'foot foot foot';
		/* Phones: no column gaps, since the empty third column would cost the
		   title a second one; the title's own padding keeps it off the
		   wordmark. */
		column-gap: 0;
		min-height: 100dvh;
		padding: 0 calc(var(--gutter) + env(safe-area-inset-right)) 0
			calc(var(--gutter) + env(safe-area-inset-left));
	}
	@media (min-width: 600px) {
		.shell {
			column-gap: var(--space-8);
		}
	}
	@media (min-width: 1200px) {
		.shell {
			grid-template-rows: auto 1fr auto;
			grid-template-areas:
				'brand title controls'
				'main main main'
				'foot foot foot';
			column-gap: var(--space-12);
		}
	}

	/* The header row's black, edge to edge. A grid item, so it pins with the
	   row; no rule under it. */
	.shell::before {
		content: '';
		grid-row: 1;
		grid-column: 1 / -1;
		margin: 0 calc(-1 * (var(--gutter) + env(safe-area-inset-right))) 0
			calc(-1 * (var(--gutter) + env(safe-area-inset-left)));
		background: var(--canvas);
	}

	/* Everything in the header row pins at the top together. */
	.shell::before,
	.brand,
	.shell > :global(header) {
		position: sticky;
		top: 0;
		z-index: 5;
		height: calc(var(--header-height) + env(safe-area-inset-top));
	}
	.shell::before {
		z-index: 4;
	}

	.brand,
	.shell > :global(header) {
		display: flex;
		align-items: center;
		padding-top: env(safe-area-inset-top);
	}
	/* The title truncates before it pushes the side columns. */
	.shell > :global(header) {
		min-width: 0;
	}
	@media (max-width: 599px) {
		.shell > :global(header) {
			padding-left: var(--space-5);
		}
	}

	.brand {
		grid-area: brand;
	}
	/* The 32px pixel line sits in a box with even free space, so its module
	   lands on whole pixels. */
	.brand a {
		display: flex;
		align-items: center;
		min-height: var(--hit-target);
		text-decoration: none;
	}

	.shell > :global(header) {
		grid-area: title;
	}
	.shell > :global(header > h1) {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Page controls: their own row under the header below 1200px. */
	.shell > :global(header + :not(main)) {
		grid-area: controls;
		min-width: 0;
		padding-bottom: var(--space-4);
	}
	@media (min-width: 1200px) {
		.shell > :global(header + :not(main)) {
			position: sticky;
			top: 0;
			z-index: 5;
			display: flex;
			align-items: center;
			justify-content: flex-end;
			height: calc(var(--header-height) + env(safe-area-inset-top));
			padding: env(safe-area-inset-top) 0 0;
			min-width: auto;
		}
	}

	.shell > :global(main) {
		grid-area: main;
		min-width: 0;
		padding: var(--space-4) 0 calc(var(--space-16) + env(safe-area-inset-bottom));
	}
	.shell > :global(main:focus) {
		outline: none;
	}

	/* Site chrome after the page: the Theme control. Below main, so it never
	   competes with the page controls in the header row. */
	.site-foot {
		grid-area: foot;
		min-width: 0;
		max-width: 320px;
		padding-bottom: calc(var(--space-8) + env(safe-area-inset-bottom));
	}
</style>
