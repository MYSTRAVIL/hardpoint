<script>
	import { Select, Combobox, NativeSelect } from '@mystravil/hardpoint';
	const items = [
		{ value: 'none', label: 'No region' },
		{ value: 'berlin', label: 'Berlin', group: 'Europe' },
		{ value: 'paris', label: 'Paris', group: 'Europe', description: 'UTC+1' },
		{ value: 'tokyo', label: 'Tokyo', group: 'Asia' },
		{ value: 'seoul', label: 'Seoul', group: 'Asia' },
		{ value: 'lima', label: 'Lima', group: 'South America', disabled: true }
	];
	let sel = $state('berlin');
	let combo = $state('');
	let native = $state('berlin');
</script>

<main class="page">
	<Select label="City" {items} bind:value={sel} />
	<Combobox label="Place" {items} bind:value={combo} placeholder="Search" />
	<NativeSelect label="Native" {items} bind:value={native} />
</main>
