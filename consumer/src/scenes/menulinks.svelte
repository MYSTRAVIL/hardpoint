<script lang="ts">
	import { Button, Menu, MenuItem, MenuSeparator } from '@mystravil/hardpoint';
	let selected = $state('');
	let ref = $state<HTMLElement | null>(null);
</script>

<main class="page">
	<p id="link-state">selected=[{selected}] ref={ref ? ref.tagName : 'none'}</p>
	<Menu label="Go to">
		{#snippet trigger({ props })}<Button {...props} opens>Go to</Button>{/snippet}
		<MenuItem href="#next-page" bind:ref onSelect={() => (selected = 'next')}>Next page</MenuItem>
		<MenuItem href="#unavailable-page" disabled>Unavailable page</MenuItem>
		<MenuItem href="#docs-page" target="_blank" rel="noreferrer">Docs in a new tab</MenuItem>
		<MenuItem href="#export-file" download="export.csv">Download export</MenuItem>
		<MenuItem tone="danger" href="#removal-page">Removal page</MenuItem>
		<MenuSeparator />
		<MenuItem onSelect={() => (selected = 'action')}>A plain action</MenuItem>
	</Menu>
</main>
