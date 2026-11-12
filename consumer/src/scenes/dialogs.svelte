<script>
	import { Button, Dialog, TextField, Select } from '@mystravil/hardpoint';
	const people = [
		{ value: 'a', label: 'Mara Ilves' },
		{ value: 'b', label: 'Tomas Reyes' }
	];
	let name = $state('');
</script>

<main class="page">
	<div class="row">
		<!-- Centred from 600px, a bottom sheet below. -->
		<Dialog title="Archive project" description="Members keep read access.">
			{#snippet trigger({ props })}<Button {...props}>Open dialog</Button>{/snippet}
			<p>The project moves to the archive.</p>
			{#snippet actions({ close })}
				<Button onclick={close}>Cancel</Button>
				<Button variant="primary" onclick={close}>Archive</Button>
			{/snippet}
		</Dialog>
		<!-- Full screen on phones, with a focused input. -->
		<Dialog title="New task" fullscreen>
			{#snippet trigger({ props })}<Button {...props}>Open full screen</Button>{/snippet}
			<TextField label="Title" bind:value={name} autofocus />
			<Select label="Assignee" items={people} placeholder="Choose" />
			{#snippet actions({ close })}
				<Button onclick={close}>Cancel</Button>
				<Button variant="primary" onclick={close}>Create</Button>
			{/snippet}
		</Dialog>
	</div>
</main>
