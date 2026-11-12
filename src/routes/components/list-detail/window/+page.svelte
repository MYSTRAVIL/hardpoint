<script lang="ts">
	import { page } from '$app/state';
	import type { ListDetailBreakpoint } from '#lib/components/ListDetail.svelte';
	import DocumentsDemo from '../DocumentsDemo.svelte';

	// ?split=medium or ?split=large picks the width the panes split from.
	const breakpoints: ListDetailBreakpoint[] = ['medium', 'expanded', 'large'];
	const splitFrom = $derived(
		breakpoints.find((b) => b === page.url.searchParams.get('split')) ?? 'expanded'
	);
</script>

<svelte:head>
	<title>List and detail, full window · Components · Hardpoint</title>
</svelte:head>

<!--
	The layout as an app uses it: a header row, then the list and the detail
	filling the rest of the window (100dvh minus the header). The app's own
	header keeps the top safe area; ListDetail keeps the others.
-->
<div class="window">
	<header class="bar">
		<a class="wordmark hp-pixel" href="/components/list-detail">HARDPOINT</a>
		<h1 class="title hp-view-title">Documents</h1>
	</header>
	<DocumentsDemo {splitFrom} headingTag="h2" />
</div>

<style>
	.window {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		height: 100dvh;
	}

	/* The header row: the wordmark at the page edge, the view title centred
	   on the page, as in AppShell. */
	.bar {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		height: calc(var(--header-height) + env(safe-area-inset-top));
		box-sizing: border-box;
		padding: env(safe-area-inset-top) calc(var(--gutter) + env(safe-area-inset-right)) 0
			calc(var(--gutter) + env(safe-area-inset-left));
	}
	.wordmark {
		display: flex;
		align-items: center;
		justify-self: start;
		min-height: var(--hit-target);
		text-decoration: none;
	}
	.title {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	/* Phones: the title follows the wordmark when there is no room to
	   centre it. */
	@media (max-width: 599px) {
		.title {
			padding-left: var(--space-5);
		}
	}
</style>
