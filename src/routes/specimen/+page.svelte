<script lang="ts">
	import NativeSelect from '#lib/components/NativeSelect.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import Table, { type Column } from '#lib/components/Table.svelte';

	type Status = 'Active' | 'Planned' | 'Blocked' | 'On hold' | 'Done';
	type Priority = 'High' | 'Medium' | 'Low';
	type Project = {
		id: string;
		name: string;
		owner: string;
		updated: string;
		priority: Priority;
		status: Status;
		progress: number;
	};

	const statuses: Status[] = ['Active', 'Planned', 'Blocked', 'On hold', 'Done'];
	const priorities: Priority[] = ['High', 'Medium', 'Low'];
	// Colour only where the word means that status (BRIEF, Tokens).
	const tone: Partial<Record<Status, 'warn' | 'ok'>> = { Blocked: 'warn', Done: 'ok' };

	const firstPage: Project[] = [
		{ id: 'PRJ-0142', name: 'Customer portal redesign', owner: 'Mara Ilves', updated: '2026-11-08', priority: 'High', status: 'Blocked', progress: 62 },
		{ id: 'PRJ-0139', name: 'Invoice export to CSV', owner: 'Tomás Reyes', updated: '2026-11-07', priority: 'Medium', status: 'Active', progress: 35 },
		{ id: 'PRJ-0137', name: 'Onboarding checklist v2', owner: 'Ana Kovač', updated: '2026-11-07', priority: 'High', status: 'Active', progress: 48 },
		{ id: 'PRJ-0136', name: 'Search relevance tuning', owner: 'Joel Brandt', updated: '2026-11-06', priority: 'Low', status: 'Planned', progress: 0 },
		{ id: 'PRJ-0133', name: 'Offline mode for the mobile app', owner: 'Mara Ilves', updated: '2026-11-05', priority: 'High', status: 'Active', progress: 21 },
		{ id: 'PRJ-0131', name: 'Accessibility audit fixes', owner: 'Ines Duarte', updated: '2026-11-04', priority: 'Medium', status: 'Done', progress: 100 },
		{ id: 'PRJ-0128', name: 'Billing address validation', owner: 'Tomás Reyes', updated: '2026-11-03', priority: 'Low', status: 'On hold', progress: 14 },
		{ id: 'PRJ-0126', name: 'Team permissions', owner: 'Ana Kovač', updated: '2026-11-02', priority: 'Medium', status: 'Done', progress: 100 },
		{ id: 'PRJ-0121', name: 'Weekly digest email', owner: 'Joel Brandt', updated: '2026-10-30', priority: 'Low', status: 'Planned', progress: 0 },
		{ id: 'PRJ-0117', name: 'Data retention settings', owner: 'Ines Duarte', updated: '2026-10-29', priority: 'Medium', status: 'Active', progress: 57 }
	];

	// The other 94 rows, generated deterministically so paging and filters work.
	const areas = ['Billing', 'Search', 'Reports', 'Admin console', 'Notifications', 'Data import', 'Help centre', 'Checkout', 'Profile settings', 'Audit log', 'Calendar sync', 'File uploads', 'Public API'];
	const works = ['performance pass', 'copy review', 'error states', 'keyboard support', 'empty states', 'usage metrics', 'cleanup', 'translations'];
	const owners = ['Mara Ilves', 'Tomás Reyes', 'Ana Kovač', 'Joel Brandt', 'Ines Duarte'];
	const statusCycle: Status[] = ['Active', 'Done', 'Active', 'Planned', 'Done', 'Active', 'On hold', 'Done', 'Planned', 'Active', 'Blocked', 'Done'];

	function generated(): Project[] {
		const rows: Project[] = [];
		const day = Date.UTC(2026, 9, 28);
		for (let i = 0; i < 94; i++) {
			const status = statusCycle[(i * 5) % statusCycle.length];
			const date = new Date(day - Math.floor(i * 1.6) * 86_400_000);
			rows.push({
				id: `PRJ-${String(116 - i).padStart(4, '0')}`,
				name: `${areas[(i * 7) % areas.length]} ${works[i % works.length]}`,
				owner: owners[(i * 3) % owners.length],
				updated: date.toISOString().slice(0, 10),
				priority: priorities[(i * 2 + (i >> 2)) % 3],
				status,
				progress: status === 'Done' ? 100 : status === 'Planned' ? 0 : (i * 37) % 96 + 3
			});
		}
		return rows;
	}

	const projects = [...firstPage, ...generated()];
	const selectedId = 'PRJ-0142';
	const perPage = 10;

	let status = $state('all');
	let priority = $state('all');
	let page = $state(1);

	const filtered = $derived(
		projects.filter(
			(p) => (status === 'all' || p.status === status) && (priority === 'all' || p.priority === priority)
		)
	);
	const rows = $derived(filtered.slice((page - 1) * perPage, page * perPage));

	// Widths come from custom properties set on <main> below, so they can
	// change at 1200px.
	const columns: Column<Project>[] = [
		{ key: 'id', label: 'ID', width: 'var(--w-id)' },
		{ key: 'name', label: 'Name' },
		{ key: 'owner', label: 'Owner', width: 'var(--w-owner)', hideBelow: 'expanded' },
		{ key: 'updated', label: 'Updated', width: 'var(--w-updated)', hideBelow: 'expanded' },
		{ key: 'priority', label: 'Priority', width: 'var(--w-priority)' },
		{ key: 'status', label: 'Status', width: 'var(--w-status)', mark: (p) => tone[p.status] },
		{ key: 'progress', label: 'Progress', width: 'var(--w-progress)', numeric: true }
	];

	function resetPage() {
		page = 1;
	}
	function clearFilters() {
		status = 'all';
		priority = 'all';
		page = 1;
	}
</script>

<svelte:head>
	<title>Projects · Specimen · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Projects</h1></header>

<search class="filters" aria-label="Filter projects">
	<NativeSelect label="Status" labelBeside="expanded" bind:value={status} onchange={resetPage}>
		<option value="all">All</option>
		{#each statuses as s (s)}<option value={s}>{s}</option>{/each}
	</NativeSelect>
	<NativeSelect label="Priority" labelBeside="expanded" bind:value={priority} onchange={resetPage}>
		<option value="all">All</option>
		{#each priorities as p (p)}<option value={p}>{p}</option>{/each}
	</NativeSelect>
</search>

<main id="main" tabindex="-1">
	<Table
		label="Projects"
		{rows}
		{columns}
		key="id"
		selected={selectedId}
		rowHref={() => '/specimen/record'}
		stack={{ title: 'name', fields: ['id', 'status', 'owner'] }}
		total={filtered.length}
	>
		{#snippet cell({ column, value })}
			{value}{#if column.key === 'progress'}%{/if}
		{/snippet}
		{#snippet empty()}
			<p>No projects match these filters.</p>
			<button type="button" class="text-button hp-label" onclick={clearFilters}>Clear filters</button>
		{/snippet}
		{#snippet footer()}
			<Pagination bind:page count={filtered.length} {perPage} />
		{/snippet}
	</Table>
</main>

<style>
	/* ---- Filters: two columns of wells; labels beside them from 900px -- */

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

	/* ---- Column widths -------------------------------------------------- */

	/* In ch of the mono face; the name takes the rest. Tables ignore widths
	   that mix lengths and percentages, so large widths switch to plain
	   percentages to spread the columns. */
	main {
		--w-id: calc(8ch + var(--space-6) + var(--bleed));
		--w-owner: calc(12ch + var(--space-6));
		--w-updated: calc(10ch + var(--space-6));
		--w-priority: calc(8ch + var(--space-6));
		--w-status: calc(7ch + var(--space-10));
		--w-progress: calc(10ch + var(--bleed));
	}
	@media (min-width: 1200px) {
		main {
			--w-id: 10%;
			--w-owner: 14%;
			--w-updated: 12%;
			--w-priority: 10%;
			--w-status: 11%;
			--w-progress: 9%;
		}
	}

	/* ---- Empty state action --------------------------------------------- */

	.text-button {
		display: inline-flex;
		align-items: center;
		min-height: var(--hit-target);
		padding: 0;
		border: 0;
		background: none;
		text-decoration: underline;
		text-underline-offset: 0.3em;
		cursor: pointer;
	}
</style>
