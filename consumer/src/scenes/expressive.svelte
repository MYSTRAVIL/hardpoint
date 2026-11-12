<script lang="ts">
	import type { Column, TimelineEvent } from '@mystravil/hardpoint';
	import { Motion } from '@mystravil/hardpoint/motion';
	import { Table, KeyValueList, Timeline, Button } from '@mystravil/hardpoint';
	const rows = [
		{ id: 1, name: 'Alpha', size: 120, state: 'ok' },
		{ id: 2, name: 'Beta', size: 98, state: 'warn' },
		{ id: 3, name: 'Gamma', size: 7, state: 'danger' }
	];
	const columns: Column<(typeof rows)[number]>[] = [
		{ key: 'name', label: 'Name' },
		{ key: 'size', label: 'Size', numeric: true, align: 'end', mark: (r) => r.state as 'ok' | 'warn' | 'danger' }
	];
	const items = [
		{ key: 'Size', value: '2.4 MB' },
		{ key: 'Type', value: 'Sheet' },
		{ key: 'Owner', value: 'Mara' }
	];
	const events: TimelineEvent[] = [
		{ title: 'Created', date: '2026-11-08', time: '10:00', tone: 'ok' },
		{ title: 'Edited', detail: 'Two fields', date: '2026-11-09', tone: 'warn' },
		{ title: 'Failed', date: '2026-11-10', tone: 'danger' }
	];
	let on = $state(true);
</script>

<main class="page">
	<Button onclick={() => (on = !on)}>Toggle</Button>
	<Motion tier="expressive">
		{#if on}
			<Table {rows} {columns} key="id" label="Items" variant="ruled" selected={2} total={3} />
			<KeyValueList {items} />
			<Timeline {events} />
		{/if}
	</Motion>
</main>
