<script>
	import { Button, Menu, MenuItem, MenuCheckboxItem, MenuRadioGroup, MenuRadioItem, MenuGroup, MenuSeparator } from '@mystravil/hardpoint';
	let hidden = $state(false);
	let sizes = $state(true);
	let sort = $state('name');
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
		<MenuItem variant="danger">Delete</MenuItem>
	</Menu>
</main>
