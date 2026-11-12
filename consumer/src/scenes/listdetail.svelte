<script lang="ts">
	import { ListDetail, Button, EmptyState, Tag } from '@mystravil/hardpoint';
	const docs = [
		{ id: 'a', title: 'Budget 2027', folder: 'Finance' },
		{ id: 'b', title: 'Roadmap', folder: 'Planning' },
		{ id: 'c', title: 'Brief v3', folder: 'Planning' }
	];
	let open = $state<string | null>(null);
	let showDetail = $state(false);
	const current = $derived(docs.find((d) => d.id === open));
</script>

<ListDetail bind:showDetail class="docs">
	{#snippet list({ stacked })}
		<ul class="items">
			{#each docs as d (d.id)}
				<li>
					<Button variant="tertiary" onclick={() => { open = d.id; showDetail = true; }}>{d.title}</Button>
					<Tag as="span">{d.folder}</Tag>
				</li>
			{/each}
		</ul>
	{/snippet}
	{#snippet detail({ stacked })}
		{#if stacked}<Button variant="tertiary" onclick={() => (showDetail = false)}>Back</Button>{/if}
		{#if current}
			<h2>{current.title}</h2>
			<p>Document body for {current.title}.</p>
		{:else}
			<EmptyState title="Nothing open" description="Pick a document." />
		{/if}
	{/snippet}
</ListDetail>
