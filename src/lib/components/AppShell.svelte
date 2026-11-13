<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	/**
	 * One place the app's navigation leads to. The same list serves every
	 * navigation form: the bottom bar or the drawer on compact widths, the
	 * rail and the sidebar from 600px.
	 */
	export type AppShellDestination = {
		/** Where the link goes. A plain `<a href>`, so any router handles it. */
		href: string;
		/**
		 * A short fixed label, set in caps. About six letters fit five across a
		 * 320px phone and the 80px rail; a longer label ends in an ellipsis.
		 */
		label: string;
		/**
		 * A glyph beside or above the label: an inline `<svg>` drawn in
		 * `currentColor` with `aria-hidden="true"`. It fills a 20px square, so
		 * give it a `viewBox` and no `width` or `height`.
		 */
		icon?: Snippet;
	};

	/**
	 * The navigation below 600px: a bottom bar of the destinations, or a
	 * drawer that a menu button at the left of the header opens.
	 */
	export type AppShellCompactNav = 'bar' | 'drawer';

	/**
	 * The navigation from 900px: a sidebar of rows, or the rail that every
	 * width from 600 to 899px shows.
	 */
	export type AppShellWideNav = 'sidebar' | 'rail';

	export type AppShellProps = Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> & {
		/** The view title: a fixed string the app defines, set in caps in the header. */
		title: string;
		/**
		 * The left of the header: the app's wordmark, usually a link home. Give
		 * a link here at least `--hit-target` height.
		 */
		brand?: Snippet;
		/**
		 * Page controls: filters or the row of page actions. At the right of the
		 * header row from 1200px; below that, their own row under the header.
		 */
		controls?: Snippet;
		/**
		 * Three to five destinations: the bottom bar or the drawer below 600px,
		 * the rail from 600px, the sidebar or the rail from 900px.
		 */
		destinations?: AppShellDestination[];
		/**
		 * The `href` of the current destination; it gets `aria-current="page"`.
		 * The app decides which destination a nested page belongs to.
		 */
		current?: string;
		/** Below 600px: `bar` (default) or `drawer`. */
		compactNav?: AppShellCompactNav;
		/** From 900px: `sidebar` (default) or `rail`. */
		wideNav?: AppShellWideNav;
		/** Whether the drawer is open. It closes when the window reaches 600px. */
		drawerOpen?: boolean;
		/** The accessible name of the navigation. */
		navLabel?: string;
		/** The menu button's accessible name and the drawer's caps title. */
		menuLabel?: string;
		/** The accessible name of the drawer's close button. */
		closeLabel?: string;
		/** The id of `<main>`, the skip link's target. */
		mainId?: string;
		/** The skip link's text, shown on keyboard focus. */
		skipLabel?: string;
		/** The view's content, rendered inside `<main>`. */
		children: Snippet;
	};
</script>

<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { MediaQuery } from 'svelte/reactivity';
	import { drawer as slide } from '../motion/index.js';
	import { mountOnFirstOpen } from './internal/first-open.svelte.js';
	import Scrim from './internal/Scrim.svelte';
	import { swipeDismiss } from './internal/swipe-dismiss.js';

	const uid = $props.id();

	let {
		title,
		brand,
		controls,
		destinations = [],
		current,
		compactNav = 'bar',
		wideNav = 'sidebar',
		drawerOpen = $bindable(false),
		navLabel = 'Main',
		menuLabel = 'Menu',
		closeLabel = 'Close',
		mainId = 'main',
		skipLabel = 'Skip to content',
		class: className,
		children,
		...rest
	}: AppShellProps = $props();

	const nav = $derived(destinations.length > 0);
	const bar = $derived(nav && compactNav === 'bar');
	const withDrawer = $derived(nav && compactNav === 'drawer');
	const drawerTitleId = `${uid}-drawer-title`;

	// From 600px the rail or the sidebar holds the destinations and the menu
	// button is gone, so a drawer left open closes.
	const wide = new MediaQuery('min-width: 600px', false);
	$effect(() => {
		if (wide.current && drawerOpen) drawerOpen = false;
	});

	// Bits UI's portal and the drawer mount on its first open, so a closed
	// drawer costs only the menu button.
	const drawerLayers = mountOnFirstOpen(() => drawerOpen);

	let side = $state<HTMLElement | null>(null);

	// Closing gives focus back to the menu button, except when the drawer
	// closed because the window reached 600px: that button is hidden, so
	// focus moves to the current destination in the rail or sidebar, or to
	// its first link when none is current.
	function onCloseAutoFocus(e: Event) {
		if (!wide.current || !side) return;
		e.preventDefault();
		(side.querySelector<HTMLElement>('[aria-current="page"]') ?? side.querySelector<HTMLElement>('a'))?.focus();
	}

	function closeDrawer() {
		drawerOpen = false;
	}
</script>

<!--
	The app frame (BRIEF, visual rule 9): one header row that stays in place,
	with the brand at the left and the view title in caps centred on the page;
	page controls at the right of that row from 1200px and on their own row
	under it below; the view's content in <main>; and the destinations. Below
	600px they form a bottom bar, or a drawer from a menu button before the
	brand; from 600px a rail under the header at the left; from 900px a
	sidebar there unless the app asks for the rail. Page changes cut: the
	shell stays and only the title, controls and content change.
-->
<div
	{...rest}
	class={['hp-app-shell', className]}
	data-controls={controls ? true : undefined}
	data-bar={bar || undefined}
	data-drawer={withDrawer || undefined}
>
	<a class="skip hp-label" href="#{mainId}">{skipLabel}</a>

	<header class="hp-app-shell-header">
		<div class="brand">
			{#if withDrawer}
				<Dialog.Root bind:open={() => drawerLayers.open, (value) => (drawerOpen = value)}>
					<Dialog.Trigger>
						{#snippet child({ props })}
							<button {...props} type="button" class="hp-app-shell-menu" aria-label={menuLabel}>
								<svg
									viewBox="0 0 16 16"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="square"
									aria-hidden="true"
								>
									<path d="M2 3.5h12M2 8h12M2 12.5h12" />
								</svg>
							</button>
						{/snippet}
					</Dialog.Trigger>
					{#if drawerLayers.mounted}
						<Dialog.Portal>
							<Dialog.Content forceMount aria-labelledby={drawerTitleId} {onCloseAutoFocus}>
								{#snippet child({ props, open: shown })}
									<Scrim open={shown} layer="dialog" />
									{#if shown}
										<div
											{...props}
											class="hp-app-shell-drawer"
											transition:slide
											{@attach swipeDismiss(closeDrawer, { direction: 'left' })}
										>
											<div class="drawer-head">
												<h2 id={drawerTitleId} class="drawer-title hp-view-title">{menuLabel}</h2>
												<button type="button" class="drawer-close" aria-label={closeLabel} onclick={closeDrawer}>
													<svg
														viewBox="0 0 16 16"
														fill="none"
														stroke="currentColor"
														stroke-width="1.5"
														stroke-linecap="square"
														aria-hidden="true"
													>
														<path d="M3 3l10 10M13 3L3 13" />
													</svg>
												</button>
											</div>
											<nav class="drawer-nav" aria-label={navLabel}>
												{@render links('drawer')}
											</nav>
										</div>
									{/if}
								{/snippet}
							</Dialog.Content>
						</Dialog.Portal>
					{/if}
				</Dialog.Root>
			{/if}
			{@render brand?.()}
		</div>
		<h1 class="hp-app-shell-title hp-view-title">{title}</h1>
	</header>

	{#if nav}
		<nav bind:this={side} class="hp-app-shell-side" aria-label={navLabel} data-wide={wideNav}>
			{@render links('side')}
		</nav>
	{/if}

	{#if controls}
		<div class="hp-app-shell-controls">{@render controls()}</div>
	{/if}

	<main id={mainId} class="hp-app-shell-main" tabindex="-1">
		{@render children()}
	</main>

	{#if bar}
		<nav class="hp-app-shell-bar" aria-label={navLabel}>
			{@render links('bar')}
		</nav>
	{/if}
</div>

<!--
	The destinations in one form. The selectors below stay flat (a class and
	attributes on the element itself), because these elements render inside
	snippets, some of them in Bits UI's portal.
-->
{#snippet links(form: 'bar' | 'side' | 'drawer')}
	<ul class="links" data-form={form}>
		{#each destinations as destination (destination.href)}
			<li>
				<a
					class="link hp-focus-inset"
					data-form={form}
					data-wide={form === 'side' ? wideNav : undefined}
					href={destination.href}
					aria-current={destination.href === current ? 'page' : undefined}
					onclick={form === 'drawer' ? closeDrawer : undefined}
				>
					{#if destination.icon}
						<span class="icon">{@render destination.icon()}</span>
					{/if}
					<span class="text hp-label">{destination.label}</span>
				</a>
			</li>
		{/each}
	</ul>
{/snippet}

<style>
	/* Layers (tokens.css): the header row, the bottom bar and the rail or
	   sidebar sit on --layer-shell, over the table's sticky band and under
	   every overlay. The controls in the header row (from 1200px) sit one
	   step up and the skip link two; the drawer and its scrim are on
	   --layer-dialog. */

	/* ---- Scroll padding: the root element, while a shell is on the page */

	/* Focus moved to an element stays clear of the pinned bars: the header
	   row at every width, the bottom bar on compact. scroll-padding works
	   only on the scroller, the root element, so these two rules are the one
	   named exception to the :global() convention (user decision
	   2026-11-10). They apply before any script runs, and :where() keeps
	   their specificity at 0, so an app's plain html {} rule overrides them
	   without !important. */
	:global(:where(html:has(.hp-app-shell))) {
		scroll-padding-top: calc(var(--header-height) + env(safe-area-inset-top) + var(--space-4));
	}
	@media (max-width: 599px) {
		:global(:where(html:has(.hp-app-shell[data-bar]))) {
			scroll-padding-bottom: calc(var(--header-height) + env(safe-area-inset-bottom) + var(--space-4));
		}
	}

	.hp-app-shell {
		display: grid;
		/* Equal side columns centre the title. Their minimums come from the
		   brand and the controls; main and the controls row keep
		   min-width: 0, so wide content never stretches the header. */
		grid-template-columns: 1fr auto 1fr;
		grid-template-rows: auto auto 1fr auto;
		grid-template-areas:
			'header header header'
			'controls controls controls'
			'main main main'
			'bar bar bar';
		/* Phones: no column gaps, since the empty third column would cost the
		   title a second one; the title's own padding keeps it off the
		   brand. */
		column-gap: 0;
		min-height: 100dvh;
		padding: 0 calc(var(--gutter) + env(safe-area-inset-right)) 0
			calc(var(--gutter) + env(safe-area-inset-left));
	}
	@media (min-width: 600px) {
		.hp-app-shell {
			column-gap: var(--space-8);
		}
	}
	@media (min-width: 1200px) {
		.hp-app-shell {
			column-gap: var(--space-12);
		}
	}

	/* ---- Skip link: off screen until it takes focus ------------------- */

	.skip {
		position: fixed;
		top: calc(-2 * var(--space-16));
		left: calc(var(--gutter) + env(safe-area-inset-left));
		z-index: calc(var(--layer-shell) + 2);
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

	/* ---- Header row: pinned, black edge to edge, no rule under it ----- */

	/* A subgrid on the shell's three columns, so the brand and the title
	   share their tracks with the controls. The negative margin takes the
	   black into the gutters and safe areas; the padding gives that width
	   back, so the items keep the page edges. The header spans the whole
	   width over the rail or sidebar, so the title centres on the page. */
	.hp-app-shell-header {
		grid-area: header;
		position: sticky;
		top: 0;
		z-index: var(--layer-shell);
		display: grid;
		grid-template-columns: subgrid;
		align-items: center;
		height: calc(var(--header-height) + env(safe-area-inset-top));
		margin: 0 calc(-1 * (var(--gutter) + env(safe-area-inset-right))) 0
			calc(-1 * (var(--gutter) + env(safe-area-inset-left)));
		padding: env(safe-area-inset-top) calc(var(--gutter) + env(safe-area-inset-right)) 0
			calc(var(--gutter) + env(safe-area-inset-left));
		background: var(--canvas);
	}

	/* The brand row's 56px leaves even free space around a Geist Pixel
	   wordmark's 32px line, so its module lands on whole pixels. */
	.brand {
		grid-column: 1;
		display: flex;
		align-items: center;
	}

	/* The title truncates before it pushes the side columns. */
	.hp-app-shell-title {
		grid-column: 2;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	/* Phones: when there is no room to centre it, the title follows the
	   brand at this distance. */
	@media (max-width: 599px) {
		.hp-app-shell-title {
			padding-left: var(--space-5);
		}
	}

	/* ---- Menu button and drawer: compact widths, when asked ---------- */

	/* Before the brand. The glyph, not the box, keeps the page edge, so the
	   box reaches into the gutter. */
	.hp-app-shell-menu,
	.drawer-close {
		display: grid;
		flex: none;
		place-items: center;
		/* 36px on fine pointers, 44px on coarse. */
		width: var(--control-height);
		height: var(--control-height);
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--text);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.hp-app-shell-menu {
		margin: 0 var(--space-2) 0 calc((var(--space-4) - var(--control-height)) / 2);
	}
	.hp-app-shell-menu svg,
	.drawer-close svg {
		width: var(--space-4);
		height: var(--space-4);
	}
	.hp-app-shell-menu:active,
	.drawer-close:active {
		background: var(--surface-raised);
	}
	@media (hover: hover) and (pointer: fine) {
		.hp-app-shell-menu,
		.drawer-close {
			transition: background-color var(--dur-hover) var(--settle);
		}
		.hp-app-shell-menu:hover,
		.drawer-close:hover {
			background: var(--surface-hover);
		}
		.hp-app-shell-menu:active,
		.drawer-close:active {
			background: var(--surface-raised);
			transition-duration: var(--dur-press);
		}
	}
	/* From 600px the rail or the sidebar takes over. */
	@media (min-width: 600px) {
		.hp-app-shell-menu {
			display: none;
		}
	}

	/* A black panel from the left edge, full height, leaving a strip of the
	   page beside it to tap; a 3:1 boundary on its open side, like the
	   centred dialog's. It slides in at the sheet timing (motion/drawer). A
	   swipe to the left closes it (internal/swipe-dismiss.ts): the browser
	   keeps vertical scrolling and pinch zoom, and sideways moves reach the
	   swipe. */
	.hp-app-shell-drawer {
		position: fixed;
		top: 0;
		bottom: 0;
		left: 0;
		z-index: var(--layer-dialog);
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		width: min(
			var(--drawer-width) + env(safe-area-inset-left),
			100% - var(--header-height)
		);
		padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom) env(safe-area-inset-left);
		border-right: 1px solid var(--border-control);
		background: var(--canvas);
		color: var(--text);
		overscroll-behavior: contain;
		touch-action: pan-y pinch-zoom;
		/* Bits UI may have turned pointer events off on <body>. */
		pointer-events: auto;
	}

	/* The header row's height: the caps title at the page edge, the close
	   button at the end. */
	.drawer-head {
		flex: none;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--space-2);
		min-height: var(--header-height);
		padding: 0 var(--space-1) 0 var(--gutter);
	}
	.drawer-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* The list scrolls inside the panel when it is taller than the screen. */
	.drawer-nav {
		flex: 1 1 auto;
		min-height: 0;
		padding: var(--space-2) 0 var(--space-4);
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	/* ---- Rail and sidebar: from 600px -------------------------------- */

	/* Pinned under the header row at the left, down to the bottom of the
	   window; the content keeps a gutter to its right. Nothing frames it:
	   the space between it and the content groups it. */
	.hp-app-shell-side {
		display: none;
	}
	@media (min-width: 600px) {
		.hp-app-shell-side {
			position: fixed;
			top: calc(var(--header-height) + env(safe-area-inset-top));
			bottom: 0;
			left: 0;
			z-index: var(--layer-shell);
			display: block;
			box-sizing: border-box;
			width: calc(var(--rail-width) + env(safe-area-inset-left));
			padding: var(--space-4) 0 calc(var(--space-4) + env(safe-area-inset-bottom))
				env(safe-area-inset-left);
			overflow-y: auto;
			overscroll-behavior: contain;
			background: var(--canvas);
		}
		.hp-app-shell-side ~ .hp-app-shell-controls,
		.hp-app-shell-side ~ .hp-app-shell-main {
			margin-left: var(--rail-width);
		}
	}
	@media (min-width: 900px) {
		.hp-app-shell-side[data-wide='sidebar'] {
			width: calc(var(--sidebar-width) + env(safe-area-inset-left));
		}
		.hp-app-shell-side[data-wide='sidebar'] ~ .hp-app-shell-controls,
		.hp-app-shell-side[data-wide='sidebar'] ~ .hp-app-shell-main {
			margin-left: var(--sidebar-width);
		}
	}

	/* ---- Page controls: their own row under the header below 1200px -- */

	.hp-app-shell-controls {
		grid-area: controls;
		min-width: 0;
		padding-bottom: var(--space-4);
	}
	@media (min-width: 1200px) {
		/* In the header row's right column, pinned with it and painted over
		   its black (later in the DOM, one layer up). */
		.hp-app-shell-controls,
		.hp-app-shell-side ~ .hp-app-shell-controls,
		.hp-app-shell-side[data-wide='sidebar'] ~ .hp-app-shell-controls {
			grid-area: 1 / 3;
			position: sticky;
			top: 0;
			z-index: calc(var(--layer-shell) + 1);
			display: flex;
			align-items: center;
			justify-content: flex-end;
			height: calc(var(--header-height) + env(safe-area-inset-top));
			margin-left: 0;
			padding: env(safe-area-inset-top) 0 0;
			min-width: auto;
		}
	}

	/* ---- Main -------------------------------------------------------- */

	.hp-app-shell-main {
		grid-area: main;
		min-width: 0;
		padding: var(--space-4) 0 calc(var(--space-16) + env(safe-area-inset-bottom));
	}
	.hp-app-shell-main:focus {
		outline: none;
	}

	/* ---- Bottom bar: compact widths only ----------------------------- */

	/* The last grid row, pinned to the bottom of the viewport while the
	   page scrolls. Black edge to edge like the header row, with the
	   bottom and side safe areas inside it. */
	.hp-app-shell-bar {
		grid-area: bar;
		position: sticky;
		bottom: 0;
		z-index: var(--layer-shell);
		margin: 0 calc(-1 * (var(--gutter) + env(safe-area-inset-right))) 0
			calc(-1 * (var(--gutter) + env(safe-area-inset-left)));
		padding: 0 env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
		background: var(--canvas);
	}
	/* The bar carries the bottom safe area, so main does not. */
	@media (max-width: 599px) {
		.hp-app-shell[data-bar] .hp-app-shell-main {
			padding-bottom: var(--space-16);
		}
	}
	/* From 600px the rail or the sidebar takes over. */
	@media (min-width: 600px) {
		.hp-app-shell-bar {
			display: none;
		}
	}

	/* ---- Destinations, in every form --------------------------------- */

	.links {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.links[data-form='bar'] {
		display: grid;
		grid-auto-columns: minmax(0, 1fr);
		grid-auto-flow: column;
	}

	.link {
		display: flex;
		align-items: center;
		color: var(--muted);
		text-decoration: none;
		-webkit-tap-highlight-color: transparent;
	}

	/* Bottom bar and rail: a whole cell, the header row's height (56px),
	   with the icon above the label. In the bar each cell is an equal
	   share of the width, so every target is at least 44px on a 320px
	   phone with five destinations; in the rail it is the rail's 80px. */
	.link[data-form='bar'],
	.link[data-form='side'] {
		flex-direction: column;
		justify-content: center;
		gap: var(--space-1);
		min-height: var(--header-height);
		padding: var(--space-2) var(--space-1);
	}

	/* Drawer and sidebar: a row, the icon on the page edge (under the
	   brand) and the label after it; the row a control's height. */
	.link[data-form='drawer'] {
		gap: var(--space-3);
		min-height: var(--control-height);
		padding: var(--space-2) var(--gutter);
	}
	@media (min-width: 900px) {
		.link[data-form='side'][data-wide='sidebar'] {
			flex-direction: row;
			justify-content: flex-start;
			gap: var(--space-3);
			min-height: var(--control-height);
			padding: var(--space-2) var(--gutter);
		}
	}

	/* A 20px square; the app's <svg> fills it (base.css makes it a block of
	   at most 100% width, and its viewBox sets the height). */
	.icon {
		display: block;
		flex: none;
		width: var(--space-5);
		height: var(--space-5);
	}

	/* A label too long for its cell or row ends in an ellipsis rather than
	   widening the navigation. */
	.text {
		min-width: 0;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* The current destination: the selection mark, a 3px titanium edge and
	   the selected tint. In the bar the edge is on the top, facing the
	   content; in the vertical lists it is on the left, as on a selected
	   table row. It snaps: nothing on the navigation transitions. */
	.link[aria-current='page'] {
		background: var(--surface-selected);
		box-shadow: inset 3px 0 0 var(--accent);
		color: var(--text);
	}
	.link[data-form='bar'][aria-current='page'] {
		box-shadow: inset 0 3px 0 var(--accent);
	}

	@media (hover: hover) and (pointer: fine) {
		.link:hover {
			color: var(--text);
		}
		.link:not([aria-current='page']):hover {
			background: var(--surface-hover);
		}
	}

	/* Press: one step past hover, as on buttons, so it reads on a phone. */
	.link:active {
		background: var(--surface-raised);
	}
</style>
