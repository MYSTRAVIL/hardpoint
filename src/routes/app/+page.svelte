<script lang="ts">
	import { page } from '$app/state';
	import {
		Button,
		EmptyState,
		LoadRegion,
		NativeSelect,
		Pagination,
		Skeleton,
		Table,
		TextField,
		type Column
	} from '#lib';
	import { Motion } from '#lib/motion/index.js';
	import AppFrame from './AppFrame.svelte';
	import { firstLoad } from './first-load';
	import { me, priorities, projects, statuses, tone, type Project } from './projects';

	// ---- First load -------------------------------------------------------

	// The first time a tab opens the list, the rows come "over the network"
	// after loadDelay and the view is expressive: the rows crossfade in over
	// skeleton rows and stagger. Later visits have the rows "cached": they
	// show at once in the quiet tier. Decided once, when the page mounts.
	const first = firstLoad('list');
	const loadDelay = 700;
	let loading = $state(first);

	$effect(() => {
		if (!first) return;
		const timer = setTimeout(() => (loading = false), loadDelay);
		return () => clearTimeout(timer);
	});

	const perPage = 10;

	const mine = $derived(page.url.searchParams.get('view') === 'mine');
	const title = $derived(mine ? 'My projects' : 'Projects');

	// Each view starts unfiltered. SvelteKit keeps this page mounted when only
	// the query changes (Projects ⇄ Mine), so the filters reset on the view;
	// the fields' bindings override them in between.
	let search = $derived.by(() => {
		void mine;
		return '';
	});
	let status = $derived.by(() => {
		void mine;
		return 'all';
	});
	let priority = $derived.by(() => {
		void mine;
		return 'all';
	});

	const needle = $derived(search.trim().toLowerCase());
	const filtered = $derived(
		projects.filter(
			(p) =>
				(!mine || p.owner === me) &&
				(status === 'all' || p.status === status) &&
				(priority === 'all' || p.priority === priority) &&
				(p.name.toLowerCase().includes(needle) || p.id.toLowerCase().includes(needle))
		)
	);

	// Page 1, and back to it whenever the view or a filter changes (each
	// reruns `filtered`). Pagination's binding overrides it in between.
	let currentPage = $derived.by(() => {
		void filtered;
		return 1;
	});
	const rows = $derived(filtered.slice((currentPage - 1) * perPage, currentPage * perPage));

	// Widths come from custom properties set on .projects below, so they can
	// change by width. Owner and Updated wait for 1200px, not the specimen's
	// 900px: the sidebar takes 240px from there, and with both columns the
	// name would shrink to a few characters.
	const columns: Column<Project>[] = [
		{ key: 'id', label: 'ID', width: 'var(--w-id)' },
		{ key: 'name', label: 'Name' },
		{ key: 'owner', label: 'Owner', width: 'var(--w-owner)', hideBelow: 'large' },
		{ key: 'updated', label: 'Updated', width: 'var(--w-updated)', hideBelow: 'large' },
		{ key: 'priority', label: 'Priority', width: 'var(--w-priority)' },
		{ key: 'status', label: 'Status', width: 'var(--w-status)', mark: (p) => tone[p.status] },
		{ key: 'progress', label: 'Progress', width: 'var(--w-progress)', numeric: true }
	];

	// ---- Loading ----------------------------------------------------------

	// Placeholder rows of the same row type: the Table lays them out as it
	// will the rows, and each cell shows a Skeleton bar instead of a value
	// (the loading table pattern of /components/states). Fixed-width values
	// take their width in ch of the mono face; names vary.
	const placeholders: Project[] = Array.from({ length: perPage }, (_, i) => ({
		id: `loading-${i}`,
		name: '',
		owner: '',
		updated: '',
		priority: 'Medium',
		status: 'Planned',
		progress: 0
	}));
	const nameWidths = ['70%', '46%', '58%', '64%', '40%', '52%', '66%', '44%', '60%', '50%'];
	const barWidths: Record<Exclude<keyof Project, 'name'>, string> = {
		id: '8ch',
		owner: '12ch',
		updated: '10ch',
		priority: '8ch',
		status: '7ch',
		progress: '4ch'
	};
	const barWidth = (row: Project, key: keyof Project) =>
		key === 'name' ? nameWidths[placeholders.indexOf(row)] : barWidths[key];

	// The status line stays mounted, so its changes are announced.
	const loadStatus = $derived(
		loading ? 'Loading projects' : `${filtered.length} ${filtered.length === 1 ? 'project' : 'projects'}`
	);

	function clearFilters() {
		search = '';
		status = 'all';
		priority = 'all';
	}
</script>

<svelte:head>
	<title>{title} · Specimen app · Hardpoint</title>
</svelte:head>

<!-- The header holds the two selects, as on the specimen list: from 1200px
     the controls share the 56px header row, so they must stay one control
     high (labels beside from 900px). The search, which needs width, sits
     over the table it filters. -->
{#snippet filters()}
	<search class="filters" aria-label="Filter projects">
		<NativeSelect label="Status" labelBeside="expanded" bind:value={status}>
			<option value="all">All</option>
			{#each statuses as s (s)}<option value={s}>{s}</option>{/each}
		</NativeSelect>
		<NativeSelect label="Priority" labelBeside="expanded" bind:value={priority}>
			<option value="all">All</option>
			{#each priorities as p (p)}<option value={p}>{p}</option>{/each}
		</NativeSelect>
	</search>
{/snippet}

{#snippet loadingCell({ row, column }: { row: Project; column: Column<Project> })}
	<Skeleton width={barWidth(row, column.key)} />
{/snippet}

<AppFrame {title} controls={filters} expressive={first}>
	<div class="projects">
		<search class="find" aria-label="Search projects">
			<TextField
				label="Search"
				labelBeside="expanded"
				type="search"
				placeholder="Name or ID"
				autocomplete="off"
				enterkeyhint="search"
				bind:value={search}
			/>
		</search>
		<LoadRegion {loading} status={loadStatus}>
			{#snippet placeholder()}
				<!-- The blocks are not content arriving: they stay quiet. -->
				<Motion tier="quiet">
					<Table
						label={title}
						rows={placeholders}
						{columns}
						key="id"
						stack={{ title: 'name', fields: ['id', 'status', 'owner'] }}
						cell={loadingCell}
					/>
				</Motion>
			{/snippet}
			<Table
				label={title}
				{rows}
				{columns}
				key="id"
				rowHref={() => '/app/detail'}
				stack={{ title: 'name', fields: ['id', 'status', 'owner'] }}
				total={filtered.length}
			>
				{#snippet cell({ column, value })}
					{value}{#if column.key === 'progress'}%{/if}
				{/snippet}
				{#snippet empty()}
					<EmptyState
						title="No projects match these filters"
						description="Try another status or priority, or clear the search."
					>
						{#snippet actions()}
							<Button type="button" onclick={clearFilters}>Clear filters</Button>
						{/snippet}
					</EmptyState>
				{/snippet}
				{#snippet footer()}
					<Pagination bind:page={currentPage} count={filtered.length} {perPage} />
				{/snippet}
			</Table>
		</LoadRegion>
	</div>
</AppFrame>

<style>
	/* ---- Filters: as on the specimen list page --------------------------- */

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

	/* ---- Search: over the table, full width on phones ------------------- */

	.find {
		display: block;
		margin-bottom: var(--space-6);
	}
	@media (min-width: 600px) {
		.find {
			max-width: 24rem;
		}
	}

	/* ---- Column widths -------------------------------------------------- */

	/* In ch of the mono face; the name takes the rest. Tables ignore widths
	   that mix lengths and percentages, so large widths switch to plain
	   percentages to spread the columns. The specimen switches at 1200px;
	   beside the 240px sidebar the table first reaches the 1110px these
	   percentages need (9% for 10ch of progress) at 1400px. */
	.projects {
		--w-id: calc(8ch + var(--space-6) + var(--bleed));
		--w-owner: calc(12ch + var(--space-6));
		--w-updated: calc(10ch + var(--space-6));
		--w-priority: calc(8ch + var(--space-6));
		--w-status: calc(7ch + var(--space-10));
		--w-progress: calc(10ch + var(--bleed));
	}
	@media (min-width: 1400px) {
		.projects {
			--w-id: 10%;
			--w-owner: 14%;
			--w-updated: 12%;
			--w-priority: 10%;
			--w-status: 11%;
			--w-progress: 9%;
		}
	}
</style>
