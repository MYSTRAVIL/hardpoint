<script lang="ts">
	import { Table, Tag, type Column, type TableSort } from '@mystravil/hardpoint';

	type Asset = {
		id: string;
		name: string;
		owner: string;
		labels: string[];
		note: string;
		location: string;
		modified: string;
		size: number;
	};

	const names = ['quarterly-report.pdf', 'meeting-notes.md', 'budget-2027.xlsx', 'team-photo.jpg', 'onboarding-guide.docx', 'release-checklist.md'];
	const owners = ['Lena Fischer', 'Omar Haddad', 'Priya Nair', 'Sam Okafor'];
	const labelSets = [['Draft'], ['Shared', 'Review'], [], ['Archived', 'Legal', 'Shared'], ['Review'], ['Draft', 'Shared']];
	const assets: Asset[] = names.map((name, i) => ({
		id: `A-${i + 1}`,
		name,
		owner: owners[i % owners.length],
		labels: labelSets[i],
		note: i % 2 ? 'Waiting for a second review before it goes out' : 'Final',
		location: `/shared/projects/2026/quarter-${(i % 4) + 1}/department-folder-${i + 1}/`,
		modified: `2026-11-${String(10 - i).padStart(2, '0')}`,
		size: (i * 389) % 4096 + 3
	}));

	type Member = { name: string; role: string };
	const members: Member[] = [
		{ name: 'Lena Fischer', role: 'Editor' },
		{ name: 'Omar Haddad', role: 'Viewer' }
	];
	const memberColumns: Column<Member>[] = [
		{ key: 'name', label: 'Member' },
		{ key: 'role', label: 'Role' }
	];

	const columns: Column<Asset>[] = [
		{ key: 'name', label: 'Name', sortable: true },
		{ key: 'owner', label: 'Owner', sortable: true },
		{ key: 'labels', label: 'Labels' },
		{ key: 'note', label: 'Note', width: '24ch' },
		{ key: 'location', label: 'Location' },
		{ key: 'modified', label: 'Modified', sortable: true, sortFirst: 'descending' },
		{ key: 'size', label: 'Size', numeric: true, sortable: true, sortFirst: 'descending', description: 'Size on disk in kilobytes, without older versions.' }
	];

	// The app sorts; Table only reports the sort.
	const order = (rows: Asset[], sort: TableSort<Asset> | undefined) => {
		if (!sort) return rows;
		const sign = sort.direction === 'ascending' ? 1 : -1;
		return [...rows].sort((a, b) => {
			const x = a[sort.key];
			const y = b[sort.key];
			return sign * (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y)));
		});
	};

	let wideSort = $state<TableSort<Asset>>();
	let wideOpen = $state<string[]>([]);
	let stackSort = $state<TableSort<Asset>>();
	let stackOpen = $state<string[]>([]);
	const wideRows = $derived(order(assets, wideSort));
	const stackRows = $derived(order(assets, stackSort));
</script>

<main class="page">
	<p id="wide-state">{wideSort ? `${wideSort.key} ${wideSort.direction}` : 'none'} | {wideOpen.join(',')}</p>
	<Table
		label="Assets"
		rows={wideRows}
		{columns}
		key="id"
		wide
		selected="A-2"
		bind:sort={wideSort}
		bind:expanded={wideOpen}
		rowHref={(row) => `#table-${row.id}`}
	>
		{#snippet cell({ row, column, value })}
			{#if column.key === 'labels'}
				<span class="cell-tags">{#each row.labels as tag (tag)}<Tag as="span">{tag}</Tag>{/each}</span>
			{:else}
				{value}
			{/if}
		{/snippet}
		{#snippet detail({ row })}
			<Table label="Members of {row.name}" rows={members} columns={memberColumns} key="name" />
		{/snippet}
	</Table>

	<p id="stack-state">{stackSort ? `${stackSort.key} ${stackSort.direction}` : 'none'} | {stackOpen.join(',')}</p>
	<Table
		label="Stacked assets"
		rows={stackRows}
		columns={columns.filter((c) => c.key !== 'labels' && c.key !== 'location')}
		key="id"
		stack={{ title: 'name', fields: ['owner', 'size'] }}
		bind:sort={stackSort}
		bind:expanded={stackOpen}
		sortLabel="Order"
		aboutColumnsLabel="Field notes"
	>
		{#snippet detail({ row })}
			<p>Stored at {row.location}</p>
		{/snippet}
	</Table>
</main>
