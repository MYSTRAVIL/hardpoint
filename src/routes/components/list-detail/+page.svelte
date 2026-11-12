<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import type { ListDetailBreakpoint } from '#lib/components/ListDetail.svelte';
	import NativeSelect from '#lib/components/NativeSelect.svelte';
	import DocumentsDemo from './DocumentsDemo.svelte';

	let splitFrom = $state<ListDetailBreakpoint>('expanded');
</script>

<svelte:head>
	<title>List and detail · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">List and detail</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		A list of items beside the item that is open. <code>ListDetail</code> puts the two side by side from
		900px. Narrower, they are two screens: the list shows first, opening an item shows the detail, and a
		back control in the detail returns to the list. Each pane scrolls on its own. The panes switch at once,
		as pages do (motion rule 1).
	</p>

	<section aria-labelledby="try">
		<h2 id="try" class="hp-section-title">Try it</h2>
		<p class="lede">
			Documents grouped by folder, in a frame of fixed height. Open a document, filter the list or start a
			new one, then make the window narrower than the split width. With nothing open, the detail shows an
			empty state while the panes sit side by side. The browser’s Back closes the open document.
		</p>
		<div class="options">
			<NativeSelect
				label="Side by side from"
				bind:value={splitFrom}
				options={[
					{ value: 'medium', label: '600px (medium)' },
					{ value: 'expanded', label: '900px (expanded)' },
					{ value: 'large', label: '1200px (large)' }
				]}
			/>
			<Button href="/components/list-detail/window?split={splitFrom}" opens>Full window</Button>
		</div>
		<div class="frame">
			<DocumentsDemo {splitFrom} headingTag="h3" />
		</div>
	</section>

	<section aria-labelledby="by-width">
		<h2 id="by-width" class="hp-section-title">By width</h2>
		<ul class="notes">
			<li>
				<strong>Below <code>splitFrom</code>.</strong> One pane fills the layout. <code>showDetail</code> picks
				it: the list when false, the detail when true. The other pane stays mounted but is out of the layout,
				the accessibility tree and the tab order, so a filter keeps its text and the list keeps its scroll
				position.
			</li>
			<li>
				<strong>From <code>splitFrom</code>.</strong> The list is a column of
				<code>--list-detail-width</code> (320px, gutters included) at the left, and the detail fills the
				rest. Both show whatever <code>showDetail</code> says.
			</li>
			<li>
				<code>splitFrom</code> is <code>medium</code> (600px), <code>expanded</code> (900px, the default) or
				<code>large</code> (1200px). Pick <code>large</code> when a sidebar already takes the left of the
				window, as in an app shell.
			</li>
		</ul>
	</section>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Snippets.</strong> <code>list</code> renders the list pane and <code>detail</code> the detail
				pane. Both receive <code>{'{ stacked }'}</code>, true below <code>splitFrom</code>. Show the back
				control only while <code>stacked</code>: a tertiary icon Button with a back glyph at the start of the
				detail’s header.
			</li>
			<li>
				<strong>Nothing open.</strong> Side by side, the detail pane still shows. Render an EmptyState there
				that says what to do, as this page does.
			</li>
			<li>
				<strong>Height.</strong> The root fills the height its container gives it, for example a grid row of
				<code>minmax(0, 1fr)</code> under the app’s header in a <code>100dvh</code> grid, as the full-window
				demo does. Or set <code>--list-detail-height</code> on it. Without a set height the panes grow with
				their content and the page scrolls instead.
			</li>
			<li>
				<strong>Edges.</strong> The layout is built to reach the window’s edges. Each pane pads its content by
				<code>--gutter</code> and 16px at the top and bottom; the root keeps the side safe areas and each pane
				the bottom one. The app’s header keeps the top one. No frame and no divider: the gutters between the
				panes keep them apart.
			</li>
			<li>
				<strong>Width.</strong> <code>--list-detail-width</code> sets the list column. Set it on the
				component’s <code>class</code> for one layout, or on <code>:root</code> for all.
			</li>
			<li>
				<strong>Scrolling.</strong> Each pane is a scroller with
				<code>overscroll-behavior: contain</code>. The detail pane keeps its offset like any scroller, so
				when another item opens, scroll it to the top: this page calls
				<code>scrollTo(0, 0)</code> on <code>.hp-list-detail-detail</code>.
			</li>
			<li>
				<strong>Focus.</strong> When an item opens, the app moves focus into the detail: its title (with
				<code>tabindex="-1"</code>) or its first field. When the detail closes, it moves focus to the item
				that was open. While stacked, ListDetail waits for that, and only if focus is not inside the pane on
				screen does it focus the pane itself (<code>tabindex="-1"</code>, no contour). When the window
				narrows to one pane, focus moves only if the pane that hid held it.
			</li>
			<li>
				<strong>Back.</strong> ListDetail does not touch history. To let the browser’s Back and the phone’s
				back gesture close the detail, push a history entry when an item opens, set
				<code>showDetail = false</code> on <code>popstate</code>, and have the back control call
				<code>history.back()</code>. Switching items side by side replaces the entry, so one Back returns to
				the list. This page keeps the open document in SvelteKit’s <code>page.state</code> through
				<code>goto(url, {'{ state, shallow: true }'})</code>.
			</li>
			<li>
				<code>ref</code> binds the root, <code>div.hp-list-detail</code>; <code>class</code> and other
				attributes go to it. It carries <code>data-split-from</code>, <code>data-stacked</code> below
				<code>splitFrom</code> and <code>data-show-detail</code>. The panes are
				<code>.hp-list-detail-list</code> and <code>.hp-list-detail-detail</code>.
			</li>
		</ul>
	</section>

	<section aria-labelledby="in-shell">
		<h2 id="in-shell" class="hp-section-title">In an app shell</h2>
		<p class="lede">
			With AppShell the sidebar already takes 240px at the left from 900px, so the panes split from 1200px.
			AppShell pads its main area and lets the page scroll under the header. Here the panes scroll instead,
			so one rule in the app takes that padding back with negative margins and sets
			<code>--list-detail-height</code> to the window less the header row, and less the bottom bar on
			phones.
		</p>
		<Button href="/components/list-detail/app-shell" opens>In an app shell</Button>
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

	code {
		font-size: 0.875em;
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

	.options {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--space-4);
		margin-bottom: var(--space-5);
	}

	/* A small window for the demo: a fixed height, so the panes scroll
	   inside it, and a hairline to show its edges. */
	.frame {
		height: min(640px, calc(100dvh - var(--header-height) - env(safe-area-inset-top) - var(--space-16)));
		border: 1px solid var(--border);
	}
</style>
