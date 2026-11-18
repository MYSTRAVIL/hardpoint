<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import TabNav, { type TabNavItem } from '#lib/components/TabNav.svelte';

	// One project's pages. Each tab is a link to a page of its own; the demo
	// keeps `current` in a variable and stops the click, where an app lets
	// its router open the page and passes the open page back.
	const base = '/components/tab-nav';
	const projectItems: TabNavItem[] = [
		{ href: `${base}?page=overview`, label: 'Overview' },
		{ href: `${base}?page=tasks`, label: 'Tasks' },
		{ href: `${base}?page=files`, label: 'Files' },
		{ href: `${base}?page=activity`, label: 'Activity' }
	];
	let project = $state(projectItems[0].href);

	// Settings: more pages than a phone can show.
	const settingsItems: TabNavItem[] = [
		{ href: `${base}?settings=general`, label: 'General' },
		{ href: `${base}?settings=members`, label: 'Members' },
		{ href: `${base}?settings=notifications`, label: 'Notifications' },
		{ href: `${base}?settings=integrations`, label: 'Integrations' },
		{ href: `${base}?settings=webhooks`, label: 'Webhooks' },
		{ href: `${base}?settings=billing`, label: 'Billing' },
		{ href: `${base}?settings=security`, label: 'Security' },
		{ href: `${base}?settings=advanced`, label: 'Advanced' }
	];
	let settings = $state(settingsItems[6].href);
	let outside = $state(settingsItems[0].href);

	const name = (items: TabNavItem[], href: string) => items.find((item) => item.href === href)?.label ?? 'none';

	// A plain click on a tab sets `current` and stays on the page; a click
	// with a modifier key opens the link as the browser does.
	function follow(set: (href: string) => void) {
		return (event: MouseEvent) => {
			const link = (event.target as Element).closest('a');
			if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
			event.preventDefault();
			set(link.getAttribute('href') ?? '');
		};
	}
</script>

<svelte:head>
	<title>Tab navigation · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Tab navigation</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		Links to the pages of one section, in the look of <a href="/components/tabs">Tabs</a>. <code>TabNav</code>
		is a <code>&lt;nav&gt;</code> of plain links: each tab opens a page of its own, through the app’s router
		or the browser, where a tab in <code>Tabs</code> shows a panel of the same page. The tab for the open page
		gets the selection mark of visual rule 2: <code>aria-current="page"</code>, the selected tint and a 3px
		titanium edge on the side that faces the content. The list scrolls sideways when the tabs do not fit, and
		the page does not.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Items.</strong> <code>items</code> takes <code>{'{ href, label }'}</code> in order. Each is a plain
				<code>&lt;a href&gt;</code>, so a router that handles link clicks, or a full page load, opens the page.
				<code>label</code> is a short fixed string the app defines; it shows in caps.
			</li>
			<li>
				<strong>Current page.</strong> <code>current</code> is the <code>href</code> of the open page, an exact
				match as on <a href="/components/app-shell">AppShell</a>. The app passes it from its router, so
				nothing here reads the browser’s location. A page with no tab, or no <code>current</code>, leaves every
				tab unselected.
			</li>
			<li>
				<strong>Name.</strong> <code>label</code> is required and names the navigation for screen readers,
				for example “Project pages”. Give each <code>TabNav</code> on a page its own name.
			</li>
			<li>
				<strong>Keys.</strong> They are links, so <kbd>Tab</kbd> moves through them and <kbd>Enter</kbd> opens
				one. There are no arrow keys, as there are in <code>Tabs</code>, because this is a list of links, not a
				tab widget.
			</li>
			<li>
				<strong>Narrow screens.</strong> The current tab is scrolled into view on the first render and whenever
				<code>current</code> changes, with part of the next tab showing. Only the strip scrolls, never the page.
			</li>
			<li>
				<strong>Markup.</strong> Tabs are <code>--control-height</code> high: 36px with a mouse, 32px in compact
				density and 44px on touch. Extra attributes and <code>class</code> go to the root
				<code>nav.hp-tab-nav</code>; the links are <code>.hp-tab-nav-tab</code>. The look is shared with
				<code>Tabs</code> through the <code>.hp-tab-strip</code> and <code>.hp-tab</code> classes in
				<code>base.css</code>. A selected tab snaps; nothing on a tab transitions.
			</li>
		</ul>
	</section>

	<section aria-labelledby="default">
		<h2 id="default" class="hp-section-title">Default</h2>
		<p class="lede">
			A project’s four pages. The page below the strip is the app’s own; here it only names the open tab. A
			click on a tab sets <code>current</code> without leaving this page.
		</p>
		<TabNav items={projectItems} current={project} label="Project pages" onclick={follow((href) => (project = href))} />
		<p class="page">Open page: <code>{name(projectItems, project)}</code></p>
	</section>

	<section aria-labelledby="many">
		<h2 id="many" class="hp-section-title">More pages than fit</h2>
		<p class="lede">
			Eight settings pages, with Security open. On a phone the strip starts scrolled so Security shows, with the
			start of Advanced after it. Swipe it, or use the scroll bar with a mouse.
		</p>
		<TabNav items={settingsItems} current={settings} label="Settings pages" onclick={follow((href) => (settings = href))} />
		<p class="page">Open page: <code>{name(settingsItems, settings)}</code></p>
	</section>

	<section aria-labelledby="outside">
		<h2 id="outside" class="hp-section-title">Changing the page from outside</h2>
		<p class="lede">
			The router, or a link elsewhere on the page, may open another page. <code>current</code> follows at once,
			and on a phone the strip scrolls so the open tab shows.
		</p>
		<div class="actions">
			<Button onclick={() => (outside = settingsItems[7].href)}>Open Advanced</Button>
			<Button onclick={() => (outside = settingsItems[0].href)}>Open General</Button>
			<Button onclick={() => (outside = `${base}?settings=elsewhere`)}>Open a page with no tab</Button>
		</div>
		<TabNav
			items={settingsItems}
			current={outside}
			label="Settings pages, changed from outside"
			onclick={follow((href) => (outside = href))}
		/>
		<p class="page">Open page: <code>{name(settingsItems, outside)}</code></p>
	</section>

	<section aria-labelledby="compact">
		<h2 id="compact" class="hp-section-title">Compact density</h2>
		<p class="lede">
			Inside <code>data-density="compact"</code> the tabs are 32px high with a mouse. Touch keeps 44px.
		</p>
		<div data-density="compact">
			<TabNav items={projectItems} current={project} label="Project pages, compact" onclick={follow((href) => (project = href))} />
		</div>
	</section>
</main>

<style>
	.intro,
	.lede {
		max-width: var(--measure);
		color: var(--muted);
	}
	.lede {
		margin: var(--space-2) 0 var(--space-5);
	}

	section {
		margin-top: var(--space-12);
	}

	/* Token names never break at their hyphens. */
	code,
	kbd {
		font-size: 0.875em;
		white-space: nowrap;
	}

	.notes {
		display: grid;
		gap: var(--space-3);
		max-width: var(--measure);
		margin: var(--space-3) 0 0;
		padding-left: var(--space-5);
		color: var(--muted);
	}
	.notes strong {
		color: var(--text);
		font-weight: 500;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-bottom: var(--space-5);
	}

	/* The app's page under the strip. */
	.page {
		margin: var(--space-6) 0 0;
		color: var(--muted);
	}
</style>
