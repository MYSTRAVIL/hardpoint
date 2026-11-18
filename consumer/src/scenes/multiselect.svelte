<script>
	import { Button, MultiSelect } from '@mystravil/hardpoint';
	// Five options: the short form (Bits UI Select, no search box).
	const types = [
		{ value: 'pdf', label: 'PDF', count: 124 },
		{ value: 'sheet', label: 'Spreadsheet', count: 58 },
		{ value: 'image', label: 'Image', count: '1,204' },
		{ value: 'text', label: 'Text', count: 96, description: 'Plain and rich text' },
		{ value: 'archive', label: 'Archive', count: 9, disabled: true }
	];
	// Ten options in groups: the search box (Bits UI Combobox).
	const cities = [
		{ value: 'lisbon', label: 'Lisbon', group: 'Europe', count: 42 },
		{ value: 'paris', label: 'Paris', group: 'Europe', count: 88 },
		{ value: 'berlin', label: 'Berlin', group: 'Europe', count: 64 },
		{ value: 'warsaw', label: 'Warsaw', group: 'Europe', count: 23 },
		{ value: 'toronto', label: 'Toronto', group: 'Americas', count: 47 },
		{ value: 'lima', label: 'Lima', group: 'Americas', count: 12 },
		{ value: 'bogota', label: 'Bogotá', group: 'Americas', count: 19 },
		{ value: 'tokyo', label: 'Tokyo', group: 'Asia', count: 71 },
		{ value: 'seoul', label: 'Seoul', group: 'Asia', count: 39 },
		{ value: 'mumbai', label: 'Mumbai', group: 'Asia', count: 26 }
	];
	let type = $state(['pdf']);
	// "atlantis" is not among the options: it stays listed so it can be cleared.
	let city = $state(['lisbon', 'atlantis']);
	let more = $state(false);
	let submitted = $state('');
	let checked = $state('');
</script>

<main class="page">
	<form
		class="page"
		onsubmit={(e) => {
			e.preventDefault();
			submitted = [...new FormData(e.currentTarget)].map(([k, v]) => `${k}=${v}`).join('&');
		}}
	>
		<MultiSelect label="Type" name="type" items={types} bind:value={type} placeholder="Any" hint="Any number of types" />
		<MultiSelect label="City" name="city" items={cities} bind:value={city} placeholder="Any" />
		<Button type="submit">Send</Button>
	</form>
	<p id="type-value">{type.join(',')}</p>
	<p id="city-value">{city.join(',')}</p>
	<p id="submitted">{submitted}</p>
	<form
		class="page"
		onsubmit={(e) => {
			e.preventDefault();
			checked = 'sent';
		}}
	>
		<MultiSelect label="Needed" name="needed" items={types} required placeholder="Any" error="Choose at least one type" />
		<Button type="submit">Check</Button>
	</form>
	<p id="checked">{checked}</p>
	<Button onclick={() => (more = true)}>Mount closed fields</Button>
	{#if more}
		<MultiSelect label="Closed short" items={types} value={['pdf', 'sheet']} placeholder="Any" />
		<MultiSelect label="Closed long" items={cities} value={['tokyo']} placeholder="Any" />
	{/if}
</main>
