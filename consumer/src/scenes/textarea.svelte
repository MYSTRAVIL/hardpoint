<script>
	import { TextArea, Button, Dialog } from '@mystravil/hardpoint';
	let value = $state('');
	let full = $state('');
	let error = $state('');
</script>

<main class="page">
	<TextArea label="Notes" bind:value hint="Grows to six rows" rows={2} maxRows={6} error={error || undefined} />
	<Button onclick={() => (error = error ? '' : 'Notes are required')}>Toggle error</Button>
	<Dialog title="New note" fullscreen>
		{#snippet trigger({ props })}<Button {...props}>Open full screen</Button>{/snippet}
		<TextArea label="Body" bind:value={full} rows={3} maxRows={5} />
		{#snippet actions({ close })}<Button onclick={close}>Done</Button>{/snippet}
	</Dialog>
</main>
