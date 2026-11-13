<script lang="ts">
	type Row = { prop: string; value: string; shows: string };

	let { rows }: { rows: Row[] } = $props();
</script>

<!--
	The "Labels" block of a docs page: every prop that sets text a user reads
	or hears, with its English default. One place, so each page words it the
	same way. A plain table from 600px; below that each prop is a block with
	its default and its place under it, since Table's stacked list cuts long
	text short.
-->
<p class="lede">
	These props set text with an English default. An app in another language sets each one.
</p>
<table class="labels">
	<thead>
		<tr>
			<th class="hp-label" scope="col">Prop</th>
			<th class="hp-label" scope="col">Default</th>
			<th class="hp-label" scope="col">Where the text shows</th>
		</tr>
	</thead>
	<tbody>
		{#each rows as row (row.prop)}
			<tr>
				<th class="prop hp-mono hp-dense" scope="row">{row.prop}</th>
				<td class="value hp-mono hp-dense" data-label="Default">{row.value}</td>
				<td class="shows hp-dense" data-label="Shows">{row.shows}</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.lede {
		max-width: var(--measure);
		margin: var(--space-2) 0 var(--space-5);
		color: var(--muted);
	}

	.labels {
		width: 100%;
		max-width: 900px;
		border-collapse: collapse;
		text-align: start;
	}
	th,
	td {
		padding: var(--space-3) var(--space-4) var(--space-3) 0;
		text-align: start;
		vertical-align: baseline;
		overflow-wrap: anywhere;
	}
	thead th {
		color: var(--muted);
		border-bottom: 1px solid var(--border);
	}
	tbody tr + tr > * {
		border-top: 1px solid var(--border);
	}
	.prop {
		width: 30%;
		font-weight: 400;
	}
	.value {
		width: 22%;
	}
	.shows {
		color: var(--muted);
	}

	@media (max-width: 599px) {
		thead {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
		}
		table,
		tbody,
		tr,
		th,
		td {
			display: block;
			width: auto;
		}
		.prop,
		.value {
			width: auto;
		}
		tbody tr {
			padding: var(--space-3) 0;
		}
		tbody tr + tr {
			border-top: 1px solid var(--border);
		}
		tbody tr + tr > * {
			border-top: 0;
		}
		th,
		td {
			padding: 0;
		}
		td {
			display: flex;
			gap: var(--space-3);
			padding-top: var(--space-1);
		}
		td::before {
			content: attr(data-label);
			flex: none;
			width: 64px;
			color: var(--muted);
			font-family: var(--sans);
			font-size: var(--type-label);
			font-weight: 500;
			line-height: 24px;
			letter-spacing: var(--label-tracking);
			text-transform: var(--label-transform);
		}
	}
</style>
