<script lang="ts">
	import LabelsTable from '../../LabelsTable.svelte';
	import PageLinks from '../../PageLinks.svelte';
	import { page } from '$app/state';
	import AppShell, {
		type AppShellCompactNav,
		type AppShellDestination,
		type AppShellWideNav
	} from '#lib/components/AppShell.svelte';
	import Button from '#lib/components/Button.svelte';
	import NativeSelect from '#lib/components/NativeSelect.svelte';

	const base = '/components/app-shell';

	// Five neutral views. The navigation links to them with ?view=, so the
	// title, the current destination and the sample content follow the URL.
	const views = [
		{
			view: 'projects',
			label: 'Projects',
			icon: projectsIcon,
			mono: false,
			items: ['Customer portal redesign', 'Billing migration', 'Mobile onboarding', 'Search relevance', 'Accessibility review', 'Data export', 'Team calendar', 'Release notes site', 'Help centre refresh', 'Partner directory']
		},
		{
			view: 'tasks',
			label: 'Tasks',
			icon: tasksIcon,
			mono: false,
			items: ['Draft the kickoff agenda', 'Review the vendor contract', 'Update the style guide', 'Book the usability sessions', 'Archive last quarter’s files', 'Plan the April release', 'Answer the survey comments', 'Check the invoice totals', 'Write the onboarding email', 'Clean up the shared drive']
		},
		{
			view: 'people',
			label: 'People',
			icon: peopleIcon,
			mono: false,
			items: ['Ana Ruiz', 'Ben Okafor', 'Chloe Martin', 'Dev Patel', 'Elena Rossi', 'Farid Haddad', 'Grace Lee', 'Hugo Weber', 'Ines Costa', 'Jonas Berg']
		},
		{
			view: 'files',
			label: 'Files',
			icon: filesIcon,
			mono: true,
			items: ['brief-v3.pdf', 'roadmap-2026.xlsx', 'onboarding-flow.png', 'contract-draft.docx', 'survey-results.csv', 'logo-pack.zip', 'meeting-notes.md', 'budget-q2.xlsx', 'style-guide.pdf', 'release-plan.md']
		},
		{
			view: 'settings',
			label: 'Settings',
			icon: settingsIcon,
			mono: false,
			items: ['Profile', 'Notifications', 'Language and region', 'Security', 'Billing', 'Integrations', 'Members', 'Data and privacy', 'Appearance', 'Keyboard shortcuts']
		}
	];

	const all: AppShellDestination[] = views.map((v) => ({
		href: `${base}?view=${v.view}`,
		label: v.label,
		icon: v.icon
	}));

	let count = $state('4');
	let controlsKind = $state<'actions' | 'filters' | 'none'>('actions');
	let titleKind = $state<'view' | 'long'>('view');
	let compactNav = $state<AppShellCompactNav>('bar');
	let wideNav = $state<AppShellWideNav>('sidebar');
	let status = $state('all');
	let owner = $state('anyone');

	const active = $derived(views.find((v) => v.view === page.url.searchParams.get('view')) ?? views[0]);
	const destinations = $derived(all.slice(0, Number(count)));
	const current = $derived(`${base}?view=${active.view}`);
	const title = $derived(titleKind === 'long' ? 'Quarterly planning and review' : active.label);
</script>

<svelte:head>
	<title>App shell · Components · Hardpoint</title>
</svelte:head>

{#snippet projectsIcon()}
	<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M2 3.5h4.5l1.5 2h6v7H2z" /></svg>
{/snippet}
{#snippet tasksIcon()}
	<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M2.5 2.5h11v11h-11zM5.5 8l2 2 3-4" /></svg>
{/snippet}
{#snippet peopleIcon()}
	<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M5.5 2.5h5v5h-5zM2.5 13.5v-3h11v3" /></svg>
{/snippet}
{#snippet filesIcon()}
	<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M3.5 1.5h6l3 3v10h-9zM9.5 1.5v3h3" /></svg>
{/snippet}
{#snippet settingsIcon()}
	<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M2 4.5h12M2 11.5h12M5.5 2.5v4M10.5 9.5v4" /></svg>
{/snippet}

{#snippet pageControls()}
	{#if controlsKind === 'filters'}
		<search class="filters" aria-label="Filter {active.label.toLowerCase()}">
			<NativeSelect
				label="Status"
				labelBeside="expanded"
				bind:value={status}
				items={[
					{ value: 'all', label: 'All' },
					{ value: 'active', label: 'Active' },
					{ value: 'done', label: 'Done' }
				]}
			/>
			<NativeSelect
				label="Owner"
				labelBeside="expanded"
				bind:value={owner}
				items={[
					{ value: 'anyone', label: 'Anyone' },
					{ value: 'me', label: 'Me' },
					{ value: 'team', label: 'My team' }
				]}
			/>
		</search>
	{:else}
		<!-- The view's one group of solid blocks: equal-weight page actions. -->
		<div class="actions">
			<Button class="action" variant="primary">New</Button>
			<Button class="action" variant="primary">Import</Button>
			<Button class="action" variant="primary">Export</Button>
		</div>
	{/if}
{/snippet}

<AppShell
	{title}
	{destinations}
	{current}
	{compactNav}
	{wideNav}
	controls={controlsKind === 'none' ? undefined : pageControls}
>
	{#snippet brand()}
		<a class="wordmark hp-pixel" href="/">HARDPOINT</a>
	{/snippet}

	<p class="intro">
		The app frame. <code>AppShell</code> pins one header row: the brand at the left, the view title in
		caps centred on the page, and the page controls. The destinations take the form that suits the
		width: a bottom bar or a drawer below 600px, a rail from 600px, a sidebar or the rail from 900px.
		This page renders without the docs site’s own header, so the frame you see is the component; the
		wordmark leads back to the index.
	</p>

	<section aria-labelledby="try">
		<h2 id="try" class="hp-section-title">Try it</h2>
		<p class="lede">
			Change the frame here, then resize the window. The navigation switches between the views; the
			title, the current destination and the sample below follow. A view outside the list, such as
			Settings with four destinations, marks no destination: the shell marks only the one whose
			<code>href</code> matches <code>current</code>.
		</p>
		<div class="options">
			<NativeSelect
				label="Destinations"
				bind:value={count}
				items={[
					{ value: '3', label: 'Three' },
					{ value: '4', label: 'Four' },
					{ value: '5', label: 'Five' }
				]}
			/>
			<NativeSelect
				label="Page controls"
				bind:value={controlsKind}
				items={[
					{ value: 'actions', label: 'Page actions' },
					{ value: 'filters', label: 'Filters' },
					{ value: 'none', label: 'None' }
				]}
			/>
			<NativeSelect
				label="Title"
				bind:value={titleKind}
				items={[
					{ value: 'view', label: 'The view’s name' },
					{ value: 'long', label: 'A long title' }
				]}
			/>
			<NativeSelect
				label="Below 600px"
				bind:value={compactNav}
				items={[
					{ value: 'bar', label: 'Bottom bar' },
					{ value: 'drawer', label: 'Drawer' }
				]}
			/>
			<NativeSelect
				label="From 900px"
				bind:value={wideNav}
				items={[
					{ value: 'sidebar', label: 'Sidebar' },
					{ value: 'rail', label: 'Rail' }
				]}
			/>
		</div>
	</section>

	<section aria-labelledby="by-width">
		<h2 id="by-width" class="hp-section-title">By width</h2>
		<ul class="notes">
			<li>
				<strong>Below 600px.</strong> The header row is 56px plus the top safe area. The title centres
				when the brand leaves room and otherwise follows it, and truncates last. The page controls take
				their own row under the header and scroll away with the page. The bottom bar holds the
				destinations, 56px plus the bottom safe area, each one an equal share of the width. With
				<code>compactNav="drawer"</code> a menu button before the brand opens a drawer from the left
				instead; its close button, a swipe to the left, a tap on the dimmed page and <kbd>Esc</kbd> close
				it, and so does following a link in it.
			</li>
			<li>
				<strong>600 to 899px.</strong> The same header and controls row. The destinations form an
				80px rail at the left under the header, each one a cell with the icon above the label.
			</li>
			<li>
				<strong>From 900px.</strong> A 240px sidebar of rows, each with the icon on the page edge under
				the brand and the label after it, or the rail with <code>wideNav="rail"</code>.
			</li>
			<li><strong>From 1200px.</strong> The controls move into the header row, at the right.</li>
		</ul>
	</section>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<code>title</code> is the view title, a fixed string the app defines. The shell renders it as the
				page’s <code>&lt;h1&gt;</code>, so headings in the content start at <code>&lt;h2&gt;</code>.
			</li>
			<li>
				<code>brand</code> is a snippet for the wordmark, usually a link home. Give the link at least
				<code>--hit-target</code> height, as this page does.
			</li>
			<li>
				<code>controls</code> is a snippet for filters (in a <code>&lt;search&gt;</code>) or the row of
				page actions, the view’s one group of solid blocks.
			</li>
			<li>
				<code>destinations</code> lists three to five <code>{'{ href, label, icon }'}</code>, the one
				list every navigation form uses. They are plain links, so SvelteKit or any other router
				handles them. An app that builds an <code>href</code> from untrusted data validates the URL
				first, because a <code>javascript:</code> URL runs when someone follows it. Keep labels to about
				six letters: five destinations share 320px and the rail is 80px, and a label too long for its
				cell ends in an ellipsis. The <code>icon</code> snippet
				draws an inline <code>&lt;svg&gt;</code> in <code>currentColor</code> with a
				<code>viewBox</code> and no <code>width</code> or <code>height</code>; it fills a 20px square.
			</li>
			<li>
				<code>current</code> holds the <code>href</code> of the current destination. It gets
				<code>aria-current="page"</code> and the selection mark: the selected tint and a 3px titanium
				edge, on the top in the bar and on the left in the rail, the sidebar and the drawer. The shell
				never reads the URL; the app decides which destination a page belongs to.
			</li>
			<li>
				<code>compactNav</code> is <code>bar</code> (the default) or <code>drawer</code>;
				<code>wideNav</code> is <code>sidebar</code> (the default) or <code>rail</code>. The widths
				come from <code>--rail-width</code>, <code>--sidebar-width</code> and
				<code>--drawer-width</code>.
			</li>
			<li>
				<code>menuLabel</code> (default “Menu”) names the menu button and is the drawer’s caps title;
				<code>closeLabel</code> names its close button. <code>bind:drawerOpen</code> reads or sets
				whether the drawer is open. The drawer keeps focus inside it while open and gives it back to
				the menu button when it closes. When the window reaches 600px it closes by itself and focus
				moves to the current destination in the rail or the sidebar, or to its first link when no
				destination is current, since the menu button is gone. A drawer that was never opened adds
				nothing to the page but the menu button; it mounts on the first open and stays mounted after it.
			</li>
			<li>
				The first <kbd>Tab</kbd> shows a skip link to <code>&lt;main&gt;</code>. Scroll padding keeps a
				focused element clear of the header row and, on phones, of the bottom bar. The shell’s styles set
				it on the root element whenever a shell is on the page, before any script runs; a plain
				<code>html {'{}'}</code> rule in the app overrides it.
			</li>
			<li>
				Extra attributes and <code>class</code> go to the root <code>.hp-app-shell</code>;
				<code>data-controls</code>, <code>data-bar</code> and <code>data-drawer</code> say which parts
				it renders.
			</li>
			<li>
				In this SvelteKit docs site, a route leaves the site’s own header and shell out with
				<code>bare: true</code> from its load function.
			</li>
		</ul>
	</section>

	<section aria-labelledby="sample">
		<h2 id="sample" class="hp-section-title">Sample content</h2>
		<p class="lede">
			Ten rows of the {active.label.toLowerCase()} view, so the page scrolls under the pinned header row
			and, on phones, above the bottom bar.
		</p>
		<ul class="sample" class:hp-mono={active.mono}>
			{#each active.items as item (item)}
				<li>{item}</li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="labels">
		<h2 id="labels" class="hp-section-title">Labels</h2>
		<LabelsTable
			rows={[
				{ prop: 'navLabel', value: 'Main', shows: 'The name of the navigation landmark, in the bar, the rail, the sidebar and the drawer.' },
				{ prop: 'menuLabel', value: 'Menu', shows: 'The name of the menu button below 600px, and the caps title of the drawer.' },
				{ prop: 'closeLabel', value: 'Close', shows: 'The name of the drawer’s close button.' },
				{ prop: 'skipLabel', value: 'Skip to content', shows: 'The skip link, shown on keyboard focus.' }
			]}
		/>
	</section>

	<section><PageLinks pathname={page.url.pathname} /></section>
</AppShell>

<style>
	/* The brand link: at least the hit target, centred in the header row.
	   Its 32px pixel line keeps even free space in a 44px box. */
	.wordmark {
		display: flex;
		align-items: center;
		min-height: var(--hit-target);
		text-decoration: none;
	}

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

	code,
	kbd {
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

	/* ---- Options ---------------------------------------------------------- */

	.options {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
		gap: var(--space-4);
		max-width: 42rem;
	}

	/* ---- Page controls: as on the specimen pages ------------------------ */

	.filters {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-3);
	}
	@media (min-width: 600px) {
		.filters {
			grid-template-columns: repeat(2, minmax(0, 200px));
		}
	}
	@media (min-width: 900px) {
		.filters {
			display: flex;
			gap: var(--space-6);
		}
	}

	/* 8px apart, so a focus contour (4px out) never overlaps the neighbour. */
	.actions {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-2);
	}
	@media (min-width: 600px) {
		.actions {
			display: flex;
			flex-wrap: wrap;
		}
	}
	@media (min-width: 900px) {
		.actions {
			flex-wrap: nowrap;
		}
	}
	/* The equal-weight actions share a minimum width. */
	.actions > :global(.action) {
		min-width: 112px;
	}

	/* ---- Sample rows: no dividers, grouped by space --------------------- */

	.sample {
		display: grid;
		max-width: var(--measure);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.sample li {
		padding: var(--space-2) 0;
	}
</style>
