<script lang="ts">
	import LabelsTable from '../../LabelsTable.svelte';
	import Button from '#lib/components/Button.svelte';
	import Chip from '#lib/components/Chip.svelte';
	import NativeSelect from '#lib/components/NativeSelect.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import Switch from '#lib/components/Switch.svelte';
	import Table, { type Column, type TableMark, type TableSort } from '#lib/components/Table.svelte';
	import Tag from '#lib/components/Tag.svelte';
	import { Motion } from '#lib/motion/index.js';

	type Sync = 'Synced' | 'Queued' | 'Failed' | 'Local only';
	type FileRow = {
		id: string;
		name: string;
		owner: string;
		modified: string;
		versions: number;
		size: number; // KB
		sync: Sync;
	};

	// Colour only where the word means that status.
	const syncMark: Partial<Record<Sync, TableMark>> = { Synced: 'ok', Queued: 'warn', Failed: 'danger' };
	const syncs: Sync[] = ['Synced', 'Queued', 'Failed', 'Local only'];

	const files: FileRow[] = [
		{ id: 'F-01', name: 'quarterly-report.pdf', owner: 'Lena Fischer', modified: '2026-11-08', versions: 12, size: 2310, sync: 'Synced' },
		{ id: 'F-02', name: 'meeting-notes.md', owner: 'Omar Haddad', modified: '2026-11-08', versions: 4, size: 18, sync: 'Queued' },
		{ id: 'F-03', name: 'budget-2027.xlsx', owner: 'Priya Nair', modified: '2026-11-07', versions: 31, size: 642, sync: 'Synced' },
		{ id: 'F-04', name: 'team-photo.jpg', owner: 'Sam Okafor', modified: '2026-11-06', versions: 1, size: 5480, sync: 'Failed' },
		{ id: 'F-05', name: 'onboarding-guide.docx', owner: 'Ingrid Berg', modified: '2026-11-05', versions: 7, size: 1204, sync: 'Local only' },
		{ id: 'F-06', name: 'release-checklist.md', owner: 'Lena Fischer', modified: '2026-11-04', versions: 22, size: 9, sync: 'Synced' },
		{ id: 'F-07', name: 'contacts-export.csv', owner: 'Omar Haddad', modified: '2026-11-02', versions: 3, size: 76, sync: 'Synced' },
		{ id: 'F-08', name: 'brand-colours.svg', owner: 'Priya Nair', modified: '2026-10-30', versions: 9, size: 4, sync: 'Queued' }
	];

	const formatSize = (kb: number) => (kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`);

	// ---- Plain, ruled, selected -------------------------------------------

	const plainColumns: Column<FileRow>[] = [
		{ key: 'name', label: 'Name' },
		{ key: 'owner', label: 'Owner', width: 'calc(14ch + var(--space-6))', hideBelow: 'expanded' },
		{ key: 'modified', label: 'Modified', width: 'calc(10ch + var(--space-6))' },
		{ key: 'versions', label: 'Versions', width: 'calc(8ch + var(--bleed))', numeric: true }
	];

	// ---- Marks and custom cells -------------------------------------------

	const syncColumns: Column<FileRow>[] = [
		{ key: 'name', label: 'Name' },
		{ key: 'owner', label: 'Owner', width: 'calc(14ch + var(--space-6))', hideBelow: 'expanded' },
		{ key: 'sync', label: 'Sync', width: 'calc(10ch + var(--space-10))', mark: (f) => syncMark[f.sync] },
		{ key: 'size', label: 'Size', width: 'calc(8ch + var(--bleed))', numeric: true }
	];

	// ---- Muted rows and live marks ------------------------------------------

	type Job = { id: string; name: string; state: 'Running' | 'Queued' | 'Failed'; rank: 'High' | 'Low' };
	const jobs: Job[] = [
		{ id: 'J-1', name: 'Index the archive', state: 'Running', rank: 'High' },
		{ id: 'J-2', name: 'Export the report', state: 'Queued', rank: 'High' },
		{ id: 'J-3', name: 'Rebuild thumbnails', state: 'Running', rank: 'Low' },
		{ id: 'J-4', name: 'Compact the log', state: 'Failed', rank: 'Low' },
		{ id: 'J-5', name: 'Refresh the cache', state: 'Queued', rank: 'Low' }
	];
	const jobMark: Record<Job['state'], TableMark> = { Running: 'ok', Queued: 'warn', Failed: 'danger' };
	const jobColumns: Column<Job>[] = [
		{ key: 'name', label: 'Job' },
		{
			key: 'state',
			label: 'State',
			width: 'calc(10ch + var(--space-10))',
			mark: (job) => jobMark[job.state],
			markLive: (job) => job.state === 'Running'
		},
		{ key: 'rank', label: 'Rank', width: 'calc(8ch + var(--bleed))' }
	];
	let jobsPaused = $state(false);

	// ---- Numbers ----------------------------------------------------------

	type Usage = { team: string; members: number; files: number; storage: number; share: number };
	const usage: Usage[] = [
		{ team: 'Design', members: 6, files: 1284, storage: 48.2, share: 31.4 },
		{ team: 'Engineering', members: 14, files: 9302, storage: 61.7, share: 40.2 },
		{ team: 'Finance', members: 3, files: 412, storage: 2.9, share: 1.9 },
		{ team: 'Marketing', members: 5, files: 2071, storage: 33.1, share: 21.6 },
		{ team: 'People', members: 2, files: 318, storage: 7.4, share: 4.9 }
	];
	const usageColumns: Column<Usage>[] = [
		{ key: 'team', label: 'Team' },
		{ key: 'members', label: 'Members', width: 'calc(8ch + var(--space-6))', numeric: true },
		{ key: 'files', label: 'Files', width: 'calc(8ch + var(--space-6))', numeric: true },
		{ key: 'storage', label: 'Storage GB', width: 'calc(10ch + var(--space-6))', numeric: true },
		{ key: 'share', label: 'Share %', width: 'calc(8ch + var(--bleed))', numeric: true }
	];

	// ---- Filtered, paged, expressive --------------------------------------

	const stems = ['invoice', 'roadmap', 'interview', 'survey-results', 'press-kit', 'sprint-review', 'floor-plan', 'menu', 'style-guide', 'payroll', 'newsletter', 'workshop'];
	const extensions = ['pdf', 'md', 'xlsx', 'png', 'docx', 'csv'];
	const owners = ['Lena Fischer', 'Omar Haddad', 'Priya Nair', 'Sam Okafor', 'Ingrid Berg'];
	const syncCycle: Sync[] = ['Synced', 'Synced', 'Queued', 'Synced', 'Local only', 'Synced', 'Failed', 'Synced', 'Queued'];
	const library: FileRow[] = Array.from({ length: 36 }, (_, i) => ({
		id: `L-${String(i + 1).padStart(2, '0')}`,
		name: `${stems[(i * 5) % stems.length]}-${String(i + 1).padStart(2, '0')}.${extensions[i % extensions.length]}`,
		owner: owners[(i * 3) % owners.length],
		modified: new Date(Date.UTC(2026, 10, 8) - i * 86_400_000).toISOString().slice(0, 10),
		versions: ((i * 7) % 19) + 1,
		size: ((i * 389) % 4096) + 3,
		sync: syncCycle[(i * 4) % syncCycle.length]
	}));

	const perPage = 6;
	let sync = $state('all');
	let page = $state(1);
	let replay = $state(0);
	const matching = $derived(library.filter((f) => sync === 'all' || f.sync === sync));
	const shown = $derived(matching.slice((page - 1) * perPage, page * perPage));
	const syncOptions = [{ value: 'all', label: 'All' }, ...syncs.map((s) => ({ value: s, label: s }))];

	// ---- Sorting: the page orders all the rows, then pages them ----------

	// Table reports the sort; it never reorders rows. A comparison for the
	// demo: numbers by value, everything else by text.
	const order = <T,>(list: T[], by: TableSort<T> | undefined) => {
		if (!by) return list;
		const sign = by.direction === 'ascending' ? 1 : -1;
		return [...list].sort((a, b) => {
			const x = a[by.key];
			const y = b[by.key];
			return sign * (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y)));
		});
	};

	const sortableColumns: Column<FileRow>[] = [
		{ key: 'name', label: 'Name', sortable: true },
		{ key: 'owner', label: 'Owner', width: 'calc(14ch + var(--space-6))', hideBelow: 'expanded', sortable: true },
		{ key: 'modified', label: 'Modified', width: 'calc(10ch + var(--space-10))', sortable: true, sortFirst: 'descending' },
		{ key: 'size', label: 'Size', width: 'calc(8ch + var(--bleed) + var(--space-4))', numeric: true, sortable: true, sortFirst: 'descending' }
	];
	let fileSort = $state<TableSort<FileRow> | undefined>({ key: 'modified', direction: 'descending' });
	let sortPage = $state(1);
	const sortedLibrary = $derived(order(library, fileSort));
	const sortedShown = $derived(sortedLibrary.slice((sortPage - 1) * perPage, sortPage * perPage));

	// ---- Wide: a data grid that scrolls sideways ---------------------------

	type Asset = FileRow & { team: string; labels: string[]; note: string; location: string };
	const teams = ['Design', 'Engineering', 'Finance', 'Marketing', 'People'];
	const labelSets = [['Draft'], ['Shared', 'Review'], [], ['Archived', 'Legal'], ['Review'], ['Draft', 'Shared', 'Legal'], ['Shared'], []];
	const notes = [
		'Final',
		'Waiting for a second review before it goes out',
		'Final',
		'Kept for seven years, then deleted',
		'Needs the new logo',
		'Shared with the finance team for sign-off',
		'Final',
		'Replaced by the 2027 version'
	];
	const assets: Asset[] = files.map((file, i) => ({
		...file,
		team: teams[i % teams.length],
		labels: labelSets[i],
		note: notes[i],
		location: `/shared/${teams[i % teams.length].toLowerCase()}/2026/q4/`
	}));
	const assetColumns: Column<Asset>[] = [
		{ key: 'name', label: 'Name' },
		{ key: 'owner', label: 'Owner' },
		{ key: 'team', label: 'Team' },
		{ key: 'labels', label: 'Labels' },
		{ key: 'note', label: 'Note', width: '28ch' },
		{ key: 'location', label: 'Location' },
		{ key: 'modified', label: 'Modified' },
		{ key: 'versions', label: 'Versions', numeric: true },
		{ key: 'size', label: 'Size', numeric: true },
		{ key: 'sync', label: 'Sync', mark: (f) => syncMark[f.sync] }
	];

	// ---- Expandable rows ----------------------------------------------------

	type Member = { name: string; role: string; files: number; active: string };
	const roster: Record<string, Member[]> = {
		Design: [
			{ name: 'Priya Nair', role: 'Lead', files: 512, active: '2026-11-08' },
			{ name: 'Sam Okafor', role: 'Editor', files: 388, active: '2026-11-07' },
			{ name: 'Lena Fischer', role: 'Viewer', files: 41, active: '2026-10-30' }
		],
		Engineering: [
			{ name: 'Omar Haddad', role: 'Lead', files: 4102, active: '2026-11-08' },
			{ name: 'Ingrid Berg', role: 'Editor', files: 3377, active: '2026-11-08' }
		],
		Finance: [{ name: 'Lena Fischer', role: 'Lead', files: 412, active: '2026-11-06' }],
		Marketing: [
			{ name: 'Sam Okafor', role: 'Lead', files: 1290, active: '2026-11-05' },
			{ name: 'Priya Nair', role: 'Editor', files: 781, active: '2026-11-02' }
		],
		People: [{ name: 'Ingrid Berg', role: 'Lead', files: 318, active: '2026-11-01' }]
	};
	const memberColumns: Column<Member>[] = [
		{ key: 'name', label: 'Member' },
		{ key: 'role', label: 'Role', width: 'calc(8ch + var(--space-6))' },
		{ key: 'files', label: 'Files', width: 'calc(8ch + var(--space-6))', numeric: true },
		{ key: 'active', label: 'Last active', width: 'calc(11ch + var(--bleed))' }
	];
	let openTeams = $state<string[]>(['Design']);

	// ---- Column descriptions ----------------------------------------------

	const describedColumns: Column<Usage>[] = [
		{ key: 'team', label: 'Team', sortable: true },
		{
			key: 'members',
			label: 'Members',
			width: 'calc(13ch + var(--space-6))',
			numeric: true,
			description: 'People who can open the team’s files today.'
		},
		{
			key: 'storage',
			label: 'Storage GB',
			width: 'calc(16ch + var(--space-6))',
			numeric: true,
			sortable: true,
			sortFirst: 'descending',
			description: 'Space the team’s files take with all their older versions, in gigabytes.'
		},
		{
			key: 'share',
			label: 'Share %',
			width: 'calc(13ch + var(--bleed))',
			numeric: true,
			description: 'The team’s part of all the storage in use.'
		}
	];
	let usageSort = $state<TableSort<Usage>>();
	const sortedUsage = $derived(order(usage, usageSort));

	let demoPage = $state(4);
</script>

<svelte:head>
	<title>Table · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Table</h1></header>

<main id="main" tabindex="-1">
	{#snippet fileCell({ column, value }: { column: Column<FileRow>; value: unknown })}
		{column.key === 'size' ? formatSize(value as number) : value}
	{/snippet}

	{#snippet usageCell({ column, value }: { column: Column<Usage>; value: unknown })}
		{column.key === 'storage' || column.key === 'share' ? (value as number).toFixed(1) : value}
	{/snippet}

	{#snippet assetCell({ row, column, value }: { row: Asset; column: Column<Asset>; value: unknown })}
		{#if column.key === 'labels'}
			<span class="tags">{#each row.labels as tag (tag)}<Tag as="span">{tag}</Tag>{/each}</span>
		{:else if column.key === 'size'}
			{formatSize(value as number)}
		{:else}
			{value}
		{/if}
	{/snippet}

	<p class="intro">
		Rows of data under one filled header band. <code>Table</code> takes <code>rows</code> and
		<code>columns</code> and draws Geist Mono cells on an even pitch, with no zebra stripes, cell borders
		or row dividers. The band pins under the header row as the page scrolls. Below 600px the table
		becomes a stacked list. <code>Pagination</code> sits in its footer row.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Columns.</strong> Each column names a row field (<code>key</code>) and a caps
				<code>label</code>. <code>numeric</code> right-aligns tabular figures; <code>align: 'end'</code>
				right-aligns text. <code>width</code> takes any CSS width; columns without one share the rest.
				<code>hideBelow: 'expanded'</code> or <code>'large'</code> drops a column below 900px or 1200px.
			</li>
			<li>
				<strong>Rows.</strong> <code>key</code> names the field that identifies a row.
				<code>rowHref</code> makes each whole row one link; the link sits in the first cell and covers
				the row, and its focus contour is drawn inside the row. An app that builds these links from
				untrusted data validates each URL first, because a <code>javascript:</code> URL runs when someone
				follows it. <code>label</code> is the table’s accessible name.
			</li>
			<li>
				<strong>Selection.</strong> <code>selected</code> takes a row key: a 3px titanium edge and the
				selected tint, with <code>aria-current</code>. Never a fill, and hover and press never darken it.
			</li>
			<li>
				<strong>Snippets.</strong> <code>cell</code> renders a cell from <code>row</code>,
				<code>column</code> and <code>value</code>, in the table and the stacked list; without it a cell
				shows its value. <code>empty</code> replaces the rows when there are none. <code>footer</code>
				ends the footer row, beside the count from <code>total</code>.
			</li>
			<li>
				<strong>Sorting.</strong> <code>sortable</code> on a column makes its label a button, and
				<code>bind:sort</code> holds <code>{'{ key, direction }'}</code>. Table never reorders rows: the
				page sorts them, then pages them, so paging and sorting on a server work the same way. Below
				600px a sort select replaces the header buttons.
			</li>
			<li>
				<strong>Muted rows.</strong> <code>muted</code> takes a function from a row to a boolean. A muted
				row shows in <code>--muted</code>, with everything in it that draws in <code>--text</code>: a
				Chip, a Status label, a link. It is for lower-ranked rows, not for disabled ones. Status marks keep
				their hue.
			</li>
			<li>
				<strong>Live marks.</strong> <code>markLive</code> on a column pulses the mark of the rows it
				answers <code>true</code> for, as Status <code>live</code> does. It holds still under reduced
				motion and inside <code>&lt;Motion paused&gt;</code>.
			</li>
			<li>
				<strong>Wide.</strong> <code>wide</code> makes a data grid: values keep their width, the table
				scrolls sideways inside its own group named by <code>label</code> with the first column fixed,
				and it scrolls on phones too instead of stacking.
			</li>
			<li>
				<strong>Details.</strong> The <code>detail</code> snippet gives each row an expand button and
				content under it, such as a nested table. <code>bind:expanded</code> holds the keys of the open
				rows.
			</li>
			<li>
				<strong>Descriptions.</strong> <code>description</code> on a column puts a button after its label
				that shows what the column means.
			</li>
			<li>
				<code>variant="ruled"</code> adds 1px dividers for long dense tables. The default,
				<code>plain</code>, has none.
			</li>
			<li>Extra attributes and <code>class</code> go to the root element, <code>.hp-table</code>.</li>
		</ul>
	</section>

	<section aria-labelledby="plain">
		<h2 id="plain" class="hp-section-title">Plain</h2>
		<p class="lede">
			The default. Each row links somewhere. Owner hides below 900px. Hover a row with a mouse to see
			the hover tint; press <kbd>Tab</kbd> to see the row’s focus contour.
		</p>
		<Table
			label="Files"
			rows={files.slice(0, 5)}
			columns={plainColumns}
			key="id"
			rowHref={() => '#plain'}
			total={5}
		/>
	</section>

	<section aria-labelledby="ruled">
		<h2 id="ruled" class="hp-section-title">Ruled</h2>
		<p class="lede">
			1px dividers in <code>--border</code>, so the eye keeps its row across a long table.
		</p>
		<Table
			label="Files, ruled"
			variant="ruled"
			rows={files}
			columns={plainColumns}
			key="id"
			rowHref={() => '#ruled'}
		/>
	</section>

	<section aria-labelledby="selected">
		<h2 id="selected" class="hp-section-title">Selected row</h2>
		<p class="lede">
			<code>selected="F-03"</code>: the edge marker and the tint, text unchanged. Selection and focus
			look different, so both can show at once.
		</p>
		<Table
			label="Files with one selected"
			rows={files.slice(0, 5)}
			columns={plainColumns}
			key="id"
			selected="F-03"
			rowHref={() => '#selected'}
		/>
		<p class="lede after">In a ruled table the edge sits over the divider. These rows are not links.</p>
		<Table
			label="Ruled files with one selected"
			variant="ruled"
			rows={files.slice(0, 5)}
			columns={plainColumns}
			key="id"
			selected="F-03"
		/>
	</section>

	<section aria-labelledby="marks">
		<h2 id="marks" class="hp-section-title">Status marks and custom cells</h2>
		<p class="lede">
			<code>mark</code> maps a row to <code>ok</code>, <code>warn</code> or <code>danger</code> and
			draws a square in that hue before the value. It hangs left of the word, so marked and unmarked
			values share one text edge. Use it only where the word means that status: Local only has none.
			The <code>cell</code> snippet here writes sizes in KB or MB.
		</p>
		<Table label="Files and their sync state" rows={files} columns={syncColumns} key="id" cell={fileCell} />
	</section>

	<section aria-labelledby="muted">
		<h2 id="muted" class="hp-section-title">Muted rows and live marks</h2>
		<p class="lede">
			<code>muted</code> shows the rows an app ranks lower in <code>--muted</code>: here every row with a
			Low rank. A Chip and a link in such a row follow the row’s ink. <code>markLive</code> pulses the
			mark of each running job, in a muted row too. The pulse stops under reduced motion and while the
			switch below pauses it.
		</p>
		<Motion paused={jobsPaused}>
			<Table
				label="Jobs by rank"
				rows={jobs}
				columns={jobColumns}
				key="id"
				muted={(job) => job.rank === 'Low'}
				rowHref={() => '#muted'}
				selected="J-4"
			>
				{#snippet cell({ row, column, value })}
					{#if column.key === 'rank'}<Chip label={row.rank} />{:else}{value}{/if}
				{/snippet}
			</Table>
			<div class="pause">
				<Switch label="Pause animations" bind:checked={jobsPaused} />
			</div>
		</Motion>
	</section>

	<section aria-labelledby="numbers">
		<h2 id="numbers" class="hp-section-title">Numbers</h2>
		<p class="lede">
			<code>numeric</code> columns right-align tabular figures, labels included, so digits line up.
			Give decimals a fixed precision in the <code>cell</code> snippet.
		</p>
		<Table
			label="Storage by team"
			rows={usage}
			columns={usageColumns}
			key="team"
			cell={usageCell}
			total={usage.length}
		/>
	</section>

	<section aria-labelledby="empty">
		<h2 id="empty" class="hp-section-title">Empty</h2>
		<p class="lede">
			With no rows the band stays and the <code>empty</code> snippet takes their place. Say why it is
			empty and offer one next action.
		</p>
		<Table label="Shared with you" rows={[] as FileRow[]} columns={plainColumns} key="id" total={0}>
			{#snippet empty()}
				<p>Nothing has been shared with you yet.</p>
				<Button href="#empty">Invite a teammate</Button>
			{/snippet}
		</Table>
	</section>

	<section aria-labelledby="compact">
		<h2 id="compact" class="hp-section-title">Compact: the stacked list</h2>
		<p class="lede">
			Below 600px every table on this page becomes a list: one field as the row title in Geist, two or
			three fields as key-value lines in Geist Mono, and the whole item as one 44px target on touch.
			Narrow the window to see it. <code>stack</code> picks the fields; by default the first column is
			the title and the next three are the lines. Marks and the <code>cell</code> snippet apply there
			too.
		</p>
		<pre><code>{`<Table … stack={{ title: 'name', fields: ['sync', 'owner'] }} />`}</code></pre>
	</section>

	<section aria-labelledby="paging">
		<h2 id="paging" class="hp-section-title">Pagination</h2>
		<p class="lede">
			<code>Pagination</code> on Bits UI: <code>bind:page</code> (from 1), <code>count</code> and
			<code>perPage</code>. Its steps are the list view’s one group of solid blocks, 24px on a mouse
			and 44px on touch. The ends disable themselves; arrow keys move between the steps.
		</p>
		<div class="pagers">
			<div class="pager-demo">
				<span class="hp-caption state">95 items, 10 per page: page {demoPage}</span>
				<Pagination bind:page={demoPage} count={95} perPage={10} />
			</div>
			<div class="pager-demo">
				<span class="hp-caption state">One page: both steps disabled</span>
				<Pagination count={4} perPage={10} />
			</div>
		</div>
	</section>

	<section aria-labelledby="sorting">
		<h2 id="sorting" class="hp-section-title">Sorting</h2>
		<p class="lede">
			A <code>sortable</code> column’s label is a button. The first press sorts in the column’s
			<code>sortFirst</code> order (ascending unless it says otherwise), and the next press reverses it.
			The sorted column’s header carries <code>aria-sort</code> and one triangle pointing the order’s
			way; the other sortable columns show a muted pair. Table only reports the sort through
			<code>bind:sort</code>. This page sorts all 36 files, shows one page of them, and goes back to page 1
			when the sort changes. Rows change place at once, with no motion.
		</p>
		<p class="hp-caption state sort-state">
			sort = {fileSort ? `{ key: '${fileSort.key}', direction: '${fileSort.direction}' }` : 'undefined'}
		</p>
		<Table
			label="Library files, sortable"
			rows={sortedShown}
			columns={sortableColumns}
			key="id"
			cell={fileCell}
			stack={{ title: 'name', fields: ['modified', 'size'] }}
			bind:sort={() => fileSort, (next) => {
				fileSort = next;
				sortPage = 1;
			}}
			total={library.length}
		>
			{#snippet footer()}
				<Pagination bind:page={sortPage} count={library.length} {perPage} />
			{/snippet}
		</Table>
		<p class="lede after">
			Below 600px the headers are gone, so a sort select sits above the stacked list. It lists each
			sortable column in both orders, the column’s first order first, and sets the same
			<code>sort</code>. A page with its own sort control, or one that sorts by something that is not a
			column, leaves the columns unsortable and keeps its control.
		</p>
	</section>

	<section aria-labelledby="wide">
		<h2 id="wide" class="hp-section-title">Wide tables</h2>
		<p class="lede">
			<code>wide</code> is for data grids whose columns matter together. Cells keep their natural width
			and never truncate, so tags and several values fit. The table scrolls sideways inside a group
			named by <code>label</code>, not a region, so a wide table inside a Section of the same name is
			one landmark; while it scrolls, the group takes focus and the arrow keys move it.
			The first column stays in place. A 1px edge shows where columns go under it, and another where
			more wait past the end. Below 600px it scrolls instead of stacking.
		</p>
		<Table
			label="Assets"
			rows={assets}
			columns={assetColumns}
			key="id"
			wide
			selected="F-03"
			rowHref={() => '#wide'}
			cell={assetCell}
		/>
		<p class="lede after">
			A column without a <code>width</code> keeps its values on one line. Note has
			<code>width: '28ch'</code>, so its values wrap inside it and their rows grow, with every value on
			its first line. The first column takes at most half the region and wraps after that, so a phone
			keeps room for the others. The band scrolls with the table and does not pin under the header,
			because the region is its scroll container.
		</p>
	</section>

	<section aria-labelledby="expandable">
		<h2 id="expandable" class="hp-section-title">Expandable rows</h2>
		<p class="lede">
			The <code>detail</code> snippet gets each <code>row</code> and renders under it, across the table.
			Each row starts with a button: the select chevron, named “Details” and the row’s title, with
			<code>aria-expanded</code> and <code>aria-controls</code>. As on Disclosure, the height snaps open,
			the content fades in over <code>--dur-expand</code>, and closing cuts. Here each team opens its
			members in a nested table.
		</p>
		<p class="hp-caption state sort-state">expanded = [{openTeams.map((team) => `'${team}'`).join(', ')}]</p>
		<Table
			label="Teams"
			rows={usage}
			columns={usageColumns}
			key="team"
			cell={usageCell}
			stack={{ title: 'team', fields: ['members', 'storage'] }}
			rowHref={() => '#expandable'}
			bind:expanded={openTeams}
		>
			{#snippet detail({ row })}
				<Table label="Members of {row.team}" rows={roster[row.team]} columns={memberColumns} key="name" />
			{/snippet}
		</Table>
		<p class="lede after">
			These rows also link. The button sits above the row’s link: it opens the detail, and anywhere
			else on the row follows the link. Below 600px the button ends the item’s title line and the detail
			follows the item’s lines. A detail renders in the quiet tier, so a nested table never staggers
			in, and a row that arrives already open, after a sort or on another page, shows its detail at once.
		</p>
	</section>

	<section aria-labelledby="descriptions">
		<h2 id="descriptions" class="hp-section-title">Column descriptions</h2>
		<p class="lede">
			<code>description</code> puts the square info mark after a column’s label. A press, a key or a tap
			opens the text in a popover titled with the label (a sheet on phones), and a screen reader finds a
			button named “About” and the label. A tooltip alone would leave touch out. In an end-aligned
			column the mark comes before the label, so the label keeps the figures’ edge.
		</p>
		<p class="lede">
			The button takes 16px of its column and a 4px gap to the label, 20px in all. On touch screens the gap
			is 14px, 30px in all. Its target is still 24px with a mouse and 44px on touch screens, centred on
			the mark and drawn over the gap and the cell’s padding by <code>::before</code>, so it never
			overlaps the sort button beside it or the next column’s controls. A table with several described
			numeric columns pays that for each, so budget for it when the width is tight.
		</p>
		<Table
			label="Storage by team, described"
			rows={sortedUsage}
			columns={describedColumns}
			key="team"
			cell={usageCell}
			stack={{ title: 'team', fields: ['storage', 'share'] }}
			bind:sort={usageSort}
		/>
		<p class="lede after">
			Below 600px one button above the stacked list, “About the columns”, lists the descriptions of the
			fields the list shows. Team and Storage GB sort too, so the sort select sits beside it.
		</p>
	</section>

	<section aria-labelledby="expressive">
		<h2 id="expressive" class="hp-section-title">Expressive entrance</h2>
		<p class="lede">
			Inside <code>&lt;Motion tier="expressive"&gt;</code> the rows of the first render enter one after
			another, 30ms apart, done by 300ms. Rows that arrive later through the filter or the pages never
			animate, and nothing moves in the quiet tier or with reduced motion. The button remounts the
			table to replay the entrance.
		</p>
		<div class="demo-controls">
			<NativeSelect
				label="Sync"
				labelBeside
				items={syncOptions}
				bind:value={sync}
				onchange={() => (page = 1)}
			/>
			<Button onclick={() => (replay += 1)}>Replay entrance</Button>
		</div>
		<div data-testid="expressive-demo">
			<Motion tier="expressive">
				{#key replay}
					<Table
						label="Library files"
						rows={shown}
						columns={syncColumns}
						key="id"
						rowHref={() => '#expressive'}
						cell={fileCell}
						total={matching.length}
					>
						{#snippet empty()}
							<p>No files with this sync state.</p>
						{/snippet}
						{#snippet footer()}
							<Pagination bind:page count={matching.length} {perPage} />
						{/snippet}
					</Table>
				{/key}
			</Motion>
		</div>
	</section>

	<section aria-labelledby="labels">
		<h2 id="labels" class="hp-section-title">Labels</h2>
		<LabelsTable
			rows={[
				{ prop: 'totalLabel', value: 'Total', shows: 'The caps label before the count in the footer row, when total is set.' },
				{ prop: 'sortLabel', value: 'Sort', shows: 'The caps label of the sort select above the stacked list.' },
				{ prop: 'unsortedLabel', value: 'Unsorted', shows: 'The sort select’s choice while no sortable column orders the rows.' },
				{ prop: 'ascendingLabel', value: 'ascending', shows: 'After a column label in the sort select: “Size, ascending”.' },
				{ prop: 'descendingLabel', value: 'descending', shows: 'After a column label in the sort select: “Size, descending”.' },
				{ prop: 'aboutLabel', value: 'About', shows: 'Before a column label in the name of its description button: “About Size”.' },
				{
					prop: 'aboutColumnsLabel',
					value: 'About the columns',
					shows: 'The button above the stacked list that lists the column descriptions, and the title of its sheet.'
				},
				{ prop: 'expandLabel', value: 'Details', shows: 'Before the row’s title in the name of its expand button: “Details Design”.' }
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
	.lede.after {
		margin-top: var(--space-8);
	}

	section {
		margin-top: var(--space-12);
	}

	code,
	kbd {
		font-size: 0.875em;
	}
	pre {
		margin: 0;
		overflow-x: auto;
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

	.pagers {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-8) var(--space-12);
	}
	.pager-demo {
		display: grid;
		justify-items: start;
		gap: var(--space-2);
	}
	.state {
		color: var(--muted);
	}

	.pause {
		margin-top: var(--space-5);
		max-width: 20rem;
	}
	.demo-controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-4) var(--space-6);
		margin-bottom: var(--space-6);
	}

	.sort-state {
		margin-bottom: var(--space-3);
		font-family: var(--mono);
	}
	.tags {
		display: inline-flex;
		gap: var(--space-1);
	}
</style>
