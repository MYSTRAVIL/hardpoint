<script lang="ts">
	import LabelsTable from '../../LabelsTable.svelte';
	import Button from '#lib/components/Button.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import KeyValueList from '#lib/components/KeyValueList.svelte';
	import LoadRegion from '#lib/components/LoadRegion.svelte';
	import NativeSelect from '#lib/components/NativeSelect.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import Table, { type Column, type TableMark, type TableStack } from '#lib/components/Table.svelte';
	import Tabs from '#lib/components/Tabs.svelte';
	import Tag from '#lib/components/Tag.svelte';

	type Status = 'Active' | 'Planned' | 'Blocked' | 'Done';
	type Task = { id: string; title: string; assignee: string; due: string; status: Status };

	const statuses: Status[] = ['Active', 'Planned', 'Blocked', 'Done'];
	// Colour only where the word means that status.
	const tone: Partial<Record<Status, TableMark>> = { Blocked: 'warn', Done: 'ok' };

	const tasks: Task[] = [
		{ id: 'TSK-2041', title: 'Draft the release notes', assignee: 'Lena Fischer', due: '2026-11-12', status: 'Active' },
		{ id: 'TSK-2038', title: 'Review the onboarding copy', assignee: 'Omar Haddad', due: '2026-11-13', status: 'Blocked' },
		{ id: 'TSK-2035', title: 'Update the billing FAQ', assignee: 'Priya Nair', due: '2026-11-14', status: 'Planned' },
		{ id: 'TSK-2031', title: 'Fix the export date format', assignee: 'Sam Okafor', due: '2026-11-10', status: 'Done' },
		{ id: 'TSK-2029', title: 'Archive last quarter’s files', assignee: 'Ingrid Berg', due: '2026-11-18', status: 'Planned' }
	];
	const assignees = [...new Set(tasks.map((t) => t.assignee))];

	const columns: Column<Task>[] = [
		{ key: 'id', label: 'ID', width: 'calc(8ch + var(--space-6) + var(--bleed))' },
		{ key: 'title', label: 'Task' },
		{ key: 'assignee', label: 'Assignee', width: 'calc(12ch + var(--space-6))', hideBelow: 'expanded' },
		{ key: 'due', label: 'Due', width: 'calc(10ch + var(--space-6))' },
		{ key: 'status', label: 'Status', width: 'calc(7ch + var(--space-4) + var(--bleed))', mark: (t) => tone[t.status] }
	];
	const stack: TableStack<Task> = { title: 'title', fields: ['id', 'due', 'status'] };

	// ---- Loading: placeholder rows of the same shape -----------------------

	// The Table lays placeholder rows out exactly as it will lay out the
	// content: the band, the column widths, the row pitch and, on phones, the
	// stacked list. Each cell renders a Skeleton bar instead of a value.
	const placeholders: Task[] = Array.from({ length: 5 }, (_, i) => ({
		id: `loading-${i}`,
		title: '',
		assignee: '',
		due: '',
		status: 'Planned'
	}));
	// Fixed-width values take their width in ch of the mono face; titles vary.
	const titleWidths = ['70%', '46%', '58%', '64%', '40%'];
	const barWidths: Record<Exclude<keyof Task, 'title'>, string> = {
		id: '8ch',
		assignee: '12ch',
		due: '10ch',
		status: '7ch'
	};
	const barWidth = (row: Task, key: keyof Task) =>
		key === 'title' ? titleWidths[placeholders.indexOf(row)] : barWidths[key];

	// ---- Try it ---------------------------------------------------------------

	type DemoState = 'loaded' | 'loading' | 'empty' | 'error';
	let demo = $state<DemoState>('loaded');
	let timer: ReturnType<typeof setTimeout> | undefined;
	let demoRegion = $state<HTMLDivElement | null>(null);

	// A state that replaces the control holding focus (a retry, an empty
	// state's action) would drop focus to <body>; the region keeps it.
	// LoadRegion leaves focus to the page.
	function keepFocus() {
		if (demoRegion?.contains(document.activeElement)) demoRegion.focus();
	}

	function load(ms: number, outcome: Exclude<DemoState, 'loading'>) {
		keepFocus();
		clearTimeout(timer);
		demo = 'loading';
		timer = setTimeout(() => (demo = outcome), ms);
	}
	$effect(() => () => clearTimeout(timer));

	// The status line stays mounted, so its changes are announced. The error
	// state announces itself (role="alert"), so the line is empty then.
	const demoStatus = $derived(
		demo === 'loading'
			? 'Loading tasks'
			: demo === 'loaded'
				? `${tasks.length} tasks`
				: demo === 'empty'
					? 'No tasks'
					: ''
	);

	// ---- No matches -----------------------------------------------------------

	let status = $state('Blocked');
	let assignee = $state('Sam Okafor');
	const matches = $derived(
		tasks.filter(
			(t) => (status === 'all' || t.status === status) && (assignee === 'all' || t.assignee === assignee)
		)
	);
	let filters: HTMLElement;
	// Clearing removes the button that was pressed: focus goes to the first
	// filter, where the user would change the filters next.
	function clearFilters() {
		status = 'all';
		assignee = 'all';
		filters.querySelector('select')?.focus();
	}

	// ---- Display ----------------------------------------------------------------

	const displayTabs = [
		{ value: 'empty', label: 'Empty' },
		{ value: 'error', label: 'Error' }
	];

	// ---- A record loading -------------------------------------------------------

	// The placeholder's values are bars of the values' widths. The record
	// below them is the content that replaces them; this section never
	// finishes loading, so it stays hidden.
	const recordKeys = [
		{ key: 'Assignee', value: '', width: '12ch' },
		{ key: 'Due', value: '', width: '10ch' },
		{ key: 'Status', value: '', width: '7ch' },
		{ key: 'Updated', value: '', width: '16ch' }
	];
	const record = [
		{ key: 'Assignee', value: 'Lena Fischer' },
		{ key: 'Due', value: '2026-11-12' },
		{ key: 'Status', value: 'Active' },
		{ key: 'Updated', value: '2026-11-09 14:20' }
	];
	const recordFiles = ['outline.pdf', 'changes.md', 'cover.png', 'dates.xlsx'];

	const noop = () => {};
</script>

{#snippet loadingCell({ row, column }: { row: Task; column: Column<Task> })}
	<Skeleton width={barWidth(row, column.key)} />
{/snippet}

<svelte:head>
	<title>Loading, empty and error states · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">States</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		Every data view designs its loading, empty and error states. <code>Skeleton</code> draws static
		blocks where the content will be, and <code>LoadRegion</code> swaps them for the content when it
		arrives. <code>EmptyState</code> says why a view is empty and offers one next action, and
		<code>ErrorState</code> says what failed, how to fix it, and offers a retry. Each sits where the
		content would be: here, under a table’s header band.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>One region per load.</strong> <code>LoadRegion</code> holds what loads. While
				<code>loading</code> is true it shows its <code>placeholder</code> snippet, the skeletons; then its
				children: the content, or its empty or error state. Attributes and <code>class</code> go to the
				region. Keep the layout inside the snippets, each in its own container with no outer margin: during
				a fade the two lie on top of each other in boxes of their own.
			</li>
			<li>
				<strong>Blocks only while waiting.</strong> A <code>Skeleton</code> shows nothing for 300ms
				(<code>--skeleton-delay</code>), so content that arrives quickly never flashes blocks; its box
				keeps its size meanwhile. Skeletons that mount together appear together. Set
				<code>--skeleton-delay: 0ms</code> on a region that has already waited. Blocks never shimmer.
			</li>
			<li>
				<strong>Content replaces the blocks</strong> with a crossfade over <code>--dur-reveal</code>
				(150ms): each bar turns into its text, and what both draw, such as the band and its labels, stays
				as it is. <code>0ms</code> makes it a cut. It runs only when the blocks were on screen: content
				that arrives within the delay, the first render and any change that does not end a load appear at
				once. Reduced motion keeps the fade: it changes only opacity. Try values on the
				<a href="/motion">motion page</a>.
			</li>
			<li>
				<strong>Mirror the content.</strong> A <code>text</code> skeleton (default) draws one bar per line
				in the type of its context, so put it where the text goes (a table cell, a key-value value) or
				give it the content’s type class (<code>hp-page-title</code>, <code>hp-display</code>).
				<code>width</code> takes any CSS width and never exceeds the container; in a grid or flex item a
				fixed width still counts toward the item’s minimum width, as an image’s does, so let the item
				shrink. <code>lines</code> stands for a paragraph and shortens the last line. A
				<code>block</code> skeleton is one box of <code>width</code> by <code>height</code> (default
				<code>--control-height</code>).
			</li>
			<li>
				<strong>A loading table.</strong> In the <code>placeholder</code>, pass placeholder rows of the
				same shape and a <code>cell</code> snippet that renders a <code>Skeleton</code>. The Table keeps
				its band, column widths, row pitch and phone list, so nothing moves when the rows arrive. Leave
				out <code>rowHref</code> and <code>total</code> until then.
			</li>
			<li>
				<strong>Screen readers and focus.</strong> <code>LoadRegion</code> owns the status line, the
				busy state and the hidden placeholder. Its <code>status</code> text is a visually hidden status
				line (<code>role="status"</code>) that stays mounted outside the region, so each change is
				announced: “Loading tasks”, then “5 tasks”. The region is <code>aria-busy</code> while it loads,
				and the placeholder sits in an <code>aria-hidden</code>, <code>inert</code> wrapper. Focus stays
				the page’s job: when a state replaces the control that has focus (a retry, an empty state’s
				action), the page moves focus to the region (<code>bind:ref</code>; it has
				<code>tabindex="-1"</code>) or to the control the user needs next.
			</li>
			<li>
				<strong>Empty.</strong> <code>EmptyState</code> takes a <code>title</code>, an optional
				<code>description</code> and an <code>actions</code> snippet for the next <code>Button</code>. Say why
				the view is empty and what fills it.
			</li>
			<li>
				<strong>Error.</strong> <code>ErrorState</code> takes a <code>title</code> saying what failed and a
				<code>description</code> saying how to fix it, without apologising. <code>onretry</code> adds a
				retry button (<code>retryLabel</code>, default <code>Try again</code>); <code>actions</code> adds
				a fix that is not a retry. A square with a “!” in the status red marks the title, and the title
				and description are a <code>role="alert"</code> region.
			</li>
			<li>
				<strong>Title.</strong> Both titles are a <code>p</code> unless <code>titleAs</code> makes them a
				heading. The <code>display</code> variant sets the title in Geist Pixel Square: the screen’s one
				display line, for a state that fills a page. Neither sets an outer margin.
			</li>
		</ul>
	</section>

	<section aria-labelledby="try">
		<h2 id="try" class="hp-section-title">Try it</h2>
		<p class="lede">
			Reload the table. A load that ends within 300ms never shows blocks; a slower one shows them until the
			rows arrive. The rows replace the blocks as <code>--dur-reveal</code> sets.
		</p>
		<div class="demo-actions">
			<Button onclick={() => load(150, 'loaded')}>Load in 150ms</Button>
			<Button onclick={() => load(2000, 'loaded')}>Load in 2s</Button>
			<Button onclick={() => load(1200, 'empty')}>Load nothing</Button>
			<Button onclick={() => load(1200, 'error')}>Load and fail</Button>
		</div>
		<LoadRegion loading={demo === 'loading'} status={demoStatus} bind:ref={demoRegion}>
			{#snippet placeholder()}
				<Table label="Tasks" rows={placeholders} {columns} {stack} key="id" cell={loadingCell} />
			{/snippet}
			<Table label="Tasks" rows={demo === 'loaded' ? tasks : []} {columns} {stack} key="id" total={demo === 'error' ? undefined : demo === 'loaded' ? tasks.length : 0}>
				{#snippet empty()}
					{#if demo === 'error'}
						<ErrorState
							title="Couldn’t load tasks"
							description="Check your connection, then try again."
							onretry={() => load(1200, 'loaded')}
						/>
					{:else}
						<EmptyState title="No tasks yet" description="Tasks you create or are assigned appear here.">
							{#snippet actions()}
								<Button
									onclick={() => {
										keepFocus();
										demo = 'loaded';
									}}>Create a task</Button
								>
							{/snippet}
						</EmptyState>
					{/if}
				{/snippet}
			</Table>
		</LoadRegion>
	</section>

	<section aria-labelledby="loading">
		<h2 id="loading" class="hp-section-title">Loading</h2>
		<p class="lede">
			Placeholder rows under the real band. Bars for fixed-width values take the value’s width; titles
			vary. On phones the same rows form the stacked list.
		</p>
		<LoadRegion loading status="Loading tasks">
			{#snippet placeholder()}
				<Table label="Tasks" rows={placeholders} {columns} {stack} key="id" cell={loadingCell} />
			{/snippet}
			<Table label="Tasks" rows={tasks} {columns} {stack} key="id" total={tasks.length} />
		</LoadRegion>
	</section>

	<section aria-labelledby="empty">
		<h2 id="empty" class="hp-section-title">Empty</h2>
		<p class="lede">Nothing exists yet. The state says what will fill the view and offers the action that does.</p>
		<Table label="Tasks" rows={[] as Task[]} {columns} {stack} key="id" total={0}>
			{#snippet empty()}
				<EmptyState title="No tasks yet" description="Tasks you create or are assigned appear here.">
					{#snippet actions()}
						<Button href="#empty">Create a task</Button>
					{/snippet}
				</EmptyState>
			{/snippet}
		</Table>
	</section>

	<section aria-labelledby="no-matches">
		<h2 id="no-matches" class="hp-section-title">No matches</h2>
		<p class="lede">
			Tasks exist, but the filters hide them all. The next action clears the filters.
		</p>
		<search class="filters" aria-label="Filter tasks" bind:this={filters}>
			<NativeSelect label="Status" labelBeside="expanded" bind:value={status}>
				<option value="all">All</option>
				{#each statuses as s (s)}<option value={s}>{s}</option>{/each}
			</NativeSelect>
			<NativeSelect label="Assignee" labelBeside="expanded" bind:value={assignee}>
				<option value="all">All</option>
				{#each assignees as a (a)}<option value={a}>{a}</option>{/each}
			</NativeSelect>
		</search>
		<Table label="Tasks" rows={matches} {columns} {stack} key="id" total={matches.length}>
			{#snippet empty()}
				<EmptyState title="No tasks match these filters" description="Clear a filter to see more tasks.">
					{#snippet actions()}
						<Button onclick={clearFilters}>Clear filters</Button>
					{/snippet}
				</EmptyState>
			{/snippet}
		</Table>
	</section>

	<section aria-labelledby="error">
		<h2 id="error" class="hp-section-title">Error</h2>
		<p class="lede">
			The rows failed to load. The error sits where the rows would be, under the band from 600px.
		</p>
		<Table label="Tasks" rows={[] as Task[]} {columns} {stack} key="id">
			{#snippet empty()}
				<ErrorState
					title="Couldn’t load tasks"
					description="Check your connection, then try again."
					onretry={noop}
				/>
			{/snippet}
		</Table>
	</section>

	<section aria-labelledby="other-fix">
		<h2 id="other-fix" class="hp-section-title">An error that a retry cannot fix</h2>
		<p class="lede">
			<code>actions</code> carries the fix instead of a retry. Without <code>onretry</code> there is no
			retry button.
		</p>
		<Table label="Tasks in Website relaunch" rows={[] as Task[]} {columns} {stack} key="id">
			{#snippet empty()}
				<ErrorState
					title="You can’t see this project’s tasks"
					description="Only members of Website relaunch can see its tasks. Ask its owner, Lena Fischer, to add you."
				>
					{#snippet actions()}
						<Button href="#other-fix">Request access</Button>
					{/snippet}
				</ErrorState>
			{/snippet}
		</Table>
	</section>

	<section aria-labelledby="display">
		<h2 id="display" class="hp-section-title">Display</h2>
		<p class="lede">
			A state that fills a page may set its title as the screen’s one display line, in Geist Pixel Square.
			One at a time here, for that reason.
		</p>
		<Tabs tabs={displayTabs} label="Display variant">
			{#snippet panel(tab)}
				<div class="page-state">
					{#if tab.value === 'empty'}
						<EmptyState
							variant="display"
							titleAs="h3"
							title="No projects yet"
							description="Projects group tasks, files and people. Create one to start."
						>
							{#snippet actions()}
								<Button href="#display">Create a project</Button>
							{/snippet}
						</EmptyState>
					{:else}
						<ErrorState
							variant="display"
							titleAs="h3"
							title="No answer from the server"
							description="Projects could not load. Wait a minute, then try again."
							onretry={noop}
						/>
					{/if}
				</div>
			{/snippet}
		</Tabs>
	</section>

	<section aria-labelledby="shapes">
		<h2 id="shapes" class="hp-section-title">Other shapes</h2>
		<p class="lede">
			A record loading: the tag and the labels are fixed, so they show at once; the identifier, values and
			notes are bars in their own type. Blocks stand for things that are not text.
		</p>
		<LoadRegion loading status="Loading the task">
			{#snippet placeholder()}
				<div class="record">
					<div>
						<Tag>Task ID</Tag>
						<Skeleton class="hp-display hp-mono" width="9ch" />
					</div>
					<KeyValueList items={recordKeys}>
						{#snippet value(item)}<Skeleton width={item.width} />{/snippet}
					</KeyValueList>
					<div>
						<Tag>Notes</Tag>
						<Skeleton lines={3} width="60ch" />
					</div>
					<div>
						<Tag>Files</Tag>
						<div class="thumbs">
							{#each { length: 4 }}
								<Skeleton variant="block" width="var(--space-16)" height="var(--space-16)" />
							{/each}
						</div>
					</div>
				</div>
			{/snippet}
			<div class="record">
				<div>
					<Tag>Task ID</Tag>
					<p class="hp-display hp-mono">TSK-2041</p>
				</div>
				<KeyValueList items={record} />
				<div>
					<Tag>Notes</Tag>
					<p class="record-notes">
						Collect the changes merged since the last release, group them by area and write one plain
						sentence for each. Lena reviews the draft before it goes to the support team.
					</p>
				</div>
				<div>
					<Tag>Files</Tag>
					<ul class="thumbs">
						{#each recordFiles as file (file)}<li class="file">{file}</li>{/each}
					</ul>
				</div>
			</div>
		</LoadRegion>
	</section>

	<section aria-labelledby="labels">
		<h2 id="labels" class="hp-section-title">Labels</h2>
		<LabelsTable
			rows={[
				{ prop: 'retryLabel', value: 'Try again', shows: 'The text of ErrorState’s retry button, which onretry adds.' }
			]}
		/>
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

	.demo-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-bottom: var(--space-6);
	}

	/* Two columns of wells; labels beside them from 900px, as on the list
	   specimen. */
	.filters {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-3);
		margin-bottom: var(--space-6);
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

	/* A page-filling state: the space a page gives it under the header. */
	.page-state {
		padding: var(--space-12) 0;
	}

	/* One column that shrinks to the page: the notes skeleton's fixed 60ch
	   would otherwise widen the column on phones. */
	.record {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-8);
	}
	.record :global(.hp-tag) {
		margin-bottom: var(--space-3);
	}
	.thumbs {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.record-notes {
		max-width: var(--measure);
	}
	/* A file in a hairline frame, the size of its block. */
	.file {
		width: var(--space-16);
		height: var(--space-16);
		padding: var(--space-1);
		border: 1px solid var(--border);
		font-family: var(--mono);
		font-size: var(--type-caption);
		line-height: 16px;
		overflow-wrap: anywhere;
	}
</style>
