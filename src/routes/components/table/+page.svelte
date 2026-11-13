<script lang="ts">
	import LabelsTable from '../../LabelsTable.svelte';
	import Button from '#lib/components/Button.svelte';
	import NativeSelect from '#lib/components/NativeSelect.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import Table, { type Column, type TableMark } from '#lib/components/Table.svelte';
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
				{ prop: 'totalLabel', value: 'Total', shows: 'The caps label before the count in the footer row, when total is set.' }
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

	.demo-controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-4) var(--space-6);
		margin-bottom: var(--space-6);
	}
</style>
