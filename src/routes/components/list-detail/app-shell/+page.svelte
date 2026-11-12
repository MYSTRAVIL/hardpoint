<script lang="ts">
	import AppShell, { type AppShellDestination } from '#lib/components/AppShell.svelte';
	import DocumentsDemo from '../DocumentsDemo.svelte';

	const here = '/components/list-detail/app-shell';
	const destinations: AppShellDestination[] = [
		{ href: here, label: 'Files', icon: filesIcon },
		{ href: '/components/list-detail', label: 'Guide', icon: guideIcon },
		{ href: '/', label: 'Index', icon: indexIcon }
	];
</script>

<svelte:head>
	<title>List and detail in an app shell · Components · Hardpoint</title>
</svelte:head>

{#snippet filesIcon()}
	<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M3.5 1.5h6l3 3v10h-9zM9.5 1.5v3h3" /></svg>
{/snippet}
{#snippet guideIcon()}
	<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M2 3h5v10.5H2zM9 3h5v10.5H9z" /></svg>
{/snippet}
{#snippet indexIcon()}
	<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M2 3.5h12M2 8h12M2 12.5h12" /></svg>
{/snippet}

<!--
	ListDetail inside AppShell, with the sidebar or rail beside it. The
	shell's sidebar already takes 240px at the left, so the panes split
	from 1200px. The shell pads <main> and the page's sides, and the page
	scrolls under its header; here the list and the detail scroll instead,
	so the layout takes that padding back and fills the window under the
	header row (and above the bottom bar on phones).
-->
<AppShell title="Documents" {destinations} current={here}>
	{#snippet brand()}
		<a class="wordmark hp-pixel" href="/">HARDPOINT</a>
	{/snippet}
	<DocumentsDemo class="in-shell" splitFrom="large" headingTag="h2" />
</AppShell>

<style>
	.wordmark {
		display: flex;
		align-items: center;
		min-height: var(--hit-target);
		text-decoration: none;
	}

	/* AppShell's <main> pads 16px above and 64px plus the bottom safe area
	   below, and the shell pads the sides by the gutter and the safe areas.
	   ListDetail keeps the side and bottom safe areas itself, so it takes
	   all of that back. Its height is the window less the header row. */
	:global(.hp-list-detail.in-shell) {
		--list-detail-height: calc(100dvh - var(--header-height) - env(safe-area-inset-top));
		margin: calc(-1 * var(--space-4)) calc(-1 * (var(--gutter) + env(safe-area-inset-right)))
			calc(-1 * (var(--space-16) + env(safe-area-inset-bottom)))
			calc(-1 * (var(--gutter) + env(safe-area-inset-left)));
	}
	/* Phones: the bottom bar keeps the bottom safe area and <main> pads
	   64px above it. */
	@media (max-width: 599px) {
		:global(.hp-list-detail.in-shell) {
			--list-detail-height: calc(
				100dvh - 2 * var(--header-height) - env(safe-area-inset-top) - env(safe-area-inset-bottom)
			);
			margin-bottom: calc(-1 * var(--space-16));
		}
	}
</style>
