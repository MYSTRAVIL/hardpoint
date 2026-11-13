<script lang="ts">
	import { Button, Dialog, TextField, Select } from '@mystravil/hardpoint';
	const people = [
		{ value: 'a', label: 'Mara Ilves' },
		{ value: 'b', label: 'Tomas Reyes' }
	];
	let name = $state('');
	let more = $state(false);
	let openAtMount = $state(false);
	// initialFocus targets: an element bound in the actions, a field returned by a function.
	let keep = $state<HTMLElement | null>(null);
	let itemName = $state<HTMLInputElement | null>(null);
	let first = $state<HTMLInputElement | null>(null);
	let second = $state<HTMLInputElement | null>(null);
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
	<!-- Closed dialogs, mounted on demand, so the driver can count what they add to <body>. -->
	<div class="row">
		<Button onclick={() => (more = true)}>Mount three dialogs</Button>
		{#if more}
			{#each [1, 2, 3] as i (i)}
				<Dialog title={`Confirm ${i}`} description="Nothing changes until you confirm.">
					{#snippet trigger({ props })}<Button {...props}>Confirm {i}</Button>{/snippet}
					{#snippet actions({ close })}
						<Button onclick={close}>Cancel</Button>
						<Button variant="primary" onclick={close}>Confirm</Button>
					{/snippet}
				</Dialog>
			{/each}
		{/if}
	</div>
	<!-- initialFocus as an element and as a function; an app's own onOpenAutoFocus wins over it. -->
	<div class="row">
		<Dialog title="Delete item" description="This cannot be undone." initialFocus={keep}>
			{#snippet trigger({ props })}<Button {...props}>Delete item</Button>{/snippet}
			{#snippet actions({ close })}
				<Button bind:ref={keep} onclick={close}>Keep</Button>
				<Button variant="primary" onclick={close}>Delete</Button>
			{/snippet}
		</Dialog>
		<Dialog title="Rename item" initialFocus={() => itemName}>
			{#snippet trigger({ props })}<Button {...props}>Rename item</Button>{/snippet}
			<TextField label="Item name" bind:ref={itemName} />
		</Dialog>
		<Dialog
			title="Own focus"
			initialFocus={() => first}
			onOpenAutoFocus={(e: Event) => {
				e.preventDefault();
				second?.focus();
			}}
		>
			{#snippet trigger({ props })}<Button {...props}>Own focus</Button>{/snippet}
			<TextField label="First field" bind:ref={first} />
			<TextField label="Second field" bind:ref={second} />
		</Dialog>
		<Button onclick={() => (openAtMount = true)}>Mount an open dialog</Button>
		{#if openAtMount}
			<Dialog title="Opened at mount" open>
				<p>Mounted with open set.</p>
			</Dialog>
		{/if}
	</div>
</main>
