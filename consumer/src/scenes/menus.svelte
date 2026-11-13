<script>
	import { Button, Menu, MenuItem, MenuCheckboxItem, MenuRadioGroup, MenuRadioItem, MenuGroup, MenuSeparator } from '@mystravil/hardpoint';
	let hidden = $state(false);
	let sizes = $state(true);
	let sort = $state('name');
	let more = $state(false);
</script>

<main class="page">
	<Menu label="View">
		{#snippet trigger({ props })}<Button {...props} opens>View</Button>{/snippet}
		<MenuGroup label="Edit">
			<MenuItem>Cut</MenuItem>
			<MenuItem disabled>Paste</MenuItem>
		</MenuGroup>
		<MenuSeparator />
		<MenuCheckboxItem bind:checked={hidden} closeOnSelect={false}>Show hidden</MenuCheckboxItem>
		<MenuCheckboxItem bind:checked={sizes} closeOnSelect={false}>Show sizes</MenuCheckboxItem>
		<MenuSeparator />
		<MenuRadioGroup label="Sort by" bind:value={sort}>
			<MenuRadioItem value="name">Name</MenuRadioItem>
			<MenuRadioItem value="date">Date</MenuRadioItem>
		</MenuRadioGroup>
		<MenuSeparator />
		<MenuItem tone="danger">Delete</MenuItem>
	</Menu>
	<div class="row">
		<Button onclick={() => (more = true)}>Mount three menus</Button>
		{#if more}
			{#each [1, 2, 3] as i (i)}
				<Menu label={`More ${i}`}>
					{#snippet trigger({ props })}<Button {...props}>More {i}</Button>{/snippet}
					<MenuItem>First</MenuItem>
					<MenuItem>Second</MenuItem>
				</Menu>
			{/each}
		{/if}
	</div>
</main>
