<script>
	import { Notice, Button } from '@mystravil/hardpoint';
	let closed = $state(false);
	let text = $state('Saving');
	let n = $state(0);
</script>

<main class="page">
	<Notice title="Plain notice">Something to read.</Notice>
	<Notice tone="ok" title="Saved">Your changes are in.</Notice>
	<Notice tone="warn" title="Careful" titleAs="h2">This will take a while.</Notice>
	<Notice tone="danger" title="Failed">
		It did not work.
		{#snippet actions()}<Button>Retry</Button><Button variant="tertiary">Details</Button>{/snippet}
	</Notice>
	{#if !closed}
		<Notice tone="warn" title="Closable" onclose={() => (closed = true)}>Close me.</Notice>
	{/if}
	<Notice tone="ok">Without a title: {text}</Notice>
	<Notice tone="danger" role="alert">{text} {n}</Notice>
	<Button onclick={() => { n++; text = 'Updated'; }}>Change text</Button>
</main>
