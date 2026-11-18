<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	export type TabNavItem = {
		/** Where the link goes. A plain `<a href>`, so any router handles it. */
		href: string;
		/** The caps label. A short fixed string the app defines, never user data. */
		label: string;
	};

	/**
	 * Attributes and handlers not listed here go to the `<nav>`, which is the
	 * element that scrolls.
	 */
	export type TabNavProps = Omit<HTMLAttributes<HTMLElement>, 'children' | 'aria-label'> & {
		/** The pages, in order. */
		items: TabNavItem[];
		/**
		 * The `href` of the page that is open. An exact match, as on `AppShell`
		 * (never a prefix): the tab with that `href` takes `aria-current="page"`
		 * and the selected look. The app passes it, so the router decides which
		 * page is open and no browser location is read here. No match, no
		 * selected tab.
		 */
		current?: string;
		/** The navigation's accessible name, for example "Project sections". */
		label: string;
		/** The `<nav>`. Bindable. */
		ref?: HTMLElement | null;
	};
</script>

<script lang="ts">
	import { revealTab, watchTabStrip } from './internal/tab-strip.js';

	let {
		items,
		current,
		label,
		class: className,
		ref = $bindable(null),
		...rest
	}: TabNavProps = $props();

	// The current tab, shown whole inside the strip on the first render and
	// whenever the page changes (the helper is shared with Tabs).
	const currentTab = (nav: HTMLElement) =>
		Array.from(nav.children).find(
			(el): el is HTMLElement => el instanceof HTMLElement && el.getAttribute('aria-current') === 'page'
		);

	$effect(() => {
		// Read here so the effect reruns when the page changes.
		void current;
		if (ref) revealTab(ref, currentTab(ref));
	});

	// Again whenever the strip or a tab changes size, and when the set of
	// pages changes (each link is keyed by its `href`).
	$effect(() => {
		const el = ref;
		const hrefs = items.map((item) => item.href);
		if (!el || hrefs.length === 0) return;
		return watchTabStrip(el, () => revealTab(el, currentTab(el)));
	});
</script>

<!--
	A row of links in the Tabs look, for pages that are routes of their own:
	each tab is a plain `<a href>`, so the app's router, or the browser,
	opens the page. Tabs is for panels in one page. The tab whose `href`
	equals `current` has `aria-current="page"`. Extra attributes and `class`
	go to the root `nav.hp-tab-nav`. Tab through the links; there are no
	arrow keys, because these are links, not a tab widget.
-->
<nav {...rest} bind:this={ref} class={['hp-tab-nav hp-tab-strip', className]} aria-label={label}>
	{#each items as item (item.href)}
		<a
			class="hp-tab-nav-tab hp-tab hp-label hp-focus-inset"
			href={item.href}
			aria-current={item.href === current ? 'page' : undefined}>{item.label}</a
		>
	{/each}
</nav>

<style>
	/* In a flex or grid parent the strip never grows wider than its column:
	   it scrolls instead of widening the page. The look is base.css's
	   .hp-tab-strip and .hp-tab, which Tabs shares. */
	.hp-tab-nav {
		min-width: 0;
	}
</style>
