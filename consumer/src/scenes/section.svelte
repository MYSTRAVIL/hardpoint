<script lang="ts">
	import { Button, Pagination, Section, Status, Table, type Column } from '@mystravil/hardpoint';

	type Row = { id: string; name: string; owner: string };
	const rows: Row[] = [
		{ id: 'a', name: 'Alpha', owner: 'Mara' },
		{ id: 'b', name: 'Beta', owner: 'Lena' }
	];
	const columns: Column<Row>[] = [
		{ key: 'name', label: 'Name' },
		{ key: 'owner', label: 'Owner' }
	];
</script>

<main class="page">
	<div id="wide">
		<Section title="Files" meta="2 of 38" id="files">
			{#snippet actions()}<Button>Upload</Button>{/snippet}
			<Table label="Files" {rows} {columns} key="id" />
			{#snippet foot()}<span>Foot text</span><Pagination count={38} perPage={2} />{/snippet}
		</Section>
		<Section title="Plan" titleAs="h3">
			{#snippet meta()}<Status tone="ok">Active</Status>{/snippet}
			<p>Plain body.</p>
		</Section>
	</div>
	<div class="narrow-column" id="narrow">
		<Section title="A long title that needs more than one line in a narrow column" meta="Edited by Mara today">
			{#snippet actions()}<Button>Share</Button><Button>Edit</Button>{/snippet}
			<p>Body.</p>
		</Section>
		<Section title="Notes" meta="Last edited by Mara Okafor on 2026-11-18 at 09:14">
			{#snippet actions()}<Button>Share</Button><Button>Edit</Button>{/snippet}
			<p>Body.</p>
		</Section>
	</div>
</main>
