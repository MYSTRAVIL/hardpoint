<!--
	The specimen app's frame: AppShell with the app's brand and its three
	destinations. Every page under /app renders inside it and passes its own
	view title and page controls. The shell stays the same from page to page,
	so a page change is a cut (BRIEF, motion rule 1).

	The frame also sets the motion tier for its page: `expressive` is true
	when this is the view's first load in the tab (see first-load.ts). The
	page decides it once, when it mounts, and passes the same value for as
	long as the page lives.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { AppShell, type AppShellDestination } from '#lib';
	import { Motion } from '#lib/motion/index.js';

	let {
		title,
		controls,
		expressive = false,
		children
	}: {
		/** The view title, a fixed string set in caps in the header. */
		title: string;
		/** Filters or page actions for this view. */
		controls?: Snippet;
		/** The first load of this view in the tab: render it in the expressive tier. */
		expressive?: boolean;
		children: Snippet;
	} = $props();

	const destinations: AppShellDestination[] = [
		{ href: '/app', label: 'Projects', icon: projectsIcon },
		{ href: '/app?view=mine', label: 'Mine', icon: mineIcon },
		{ href: '/app/settings', label: 'Settings', icon: settingsIcon }
	];

	// The app decides which destination a page belongs to: a project's page
	// belongs to Projects.
	const current = $derived.by(() => {
		const { pathname, searchParams } = page.url;
		if (pathname === '/app/settings') return '/app/settings';
		if (pathname === '/app' && searchParams.get('view') === 'mine') return '/app?view=mine';
		return '/app';
	});
</script>

{#snippet projectsIcon()}
	<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M2 3.5h4.5l1.5 2h6v7H2z" /></svg>
{/snippet}
{#snippet mineIcon()}
	<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M5.5 2.5h5v5h-5zM2.5 13.5v-3h11v3" /></svg>
{/snippet}
{#snippet settingsIcon()}
	<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M2 4.5h12M2 11.5h12M5.5 2.5v4M10.5 9.5v4" /></svg>
{/snippet}

<Motion tier={expressive ? 'expressive' : 'quiet'}>
	<AppShell {title} {destinations} {current} {controls}>
		{#snippet brand()}
			<!-- Leads back to the docs index, as on /components/app-shell. -->
			<a class="wordmark hp-pixel" href="/">HARDPOINT</a>
		{/snippet}

		{@render children()}
	</AppShell>
</Motion>

<style>
	/* The brand link: at least the hit target, centred in the header row.
	   Its 32px pixel line keeps even free space in a 44px box. */
	.wordmark {
		display: flex;
		align-items: center;
		min-height: var(--hit-target);
		text-decoration: none;
	}
</style>
