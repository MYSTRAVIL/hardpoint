<script>
	import { Button, Select, Combobox, NativeSelect } from '@mystravil/hardpoint';
	const langs = [
		{ value: 'da', label: 'Dansk' },
		{ value: 'en', label: 'English', description: 'Default' },
		{ value: 'fr', label: 'Francais' },
		{ value: 'nl', label: 'Nederlands', disabled: true }
	];
	const projects = [
		{ value: 'a11y', label: 'Accessibility review' },
		{ value: 'design', label: 'Design system', description: 'Tokens and parts' },
		{ value: 'docs', label: 'Docs site' },
		{ value: 'web', label: 'Web app' }
	];
	const sizes = [
		{ value: 's', label: 'Small' },
		{ value: 'm', label: 'Medium' },
		{ value: 'l', label: 'Large' }
	];
	let lang = $state('en');
	let project = $state('');
	let other = $state('');
	let more = $state(false);
	let size = $state('m');
	let tagOne = $state('');
	let tagTwo = $state('docs');
</script>

<main class="page">
	<Select label="Language" items={langs} bind:value={lang} />
	<Combobox label="Project" items={projects} bind:value={project} placeholder="Search" hint="Type to filter" />
	<Combobox label="Other" items={projects} bind:value={other} emptyText="Nothing found" />
	<NativeSelect label="Native" options={langs} value="en" />
	<Button onclick={() => (more = true)}>Mount closed fields</Button>
	{#if more}
		<Select label="Size" items={sizes} bind:value={size} />
		<Combobox label="Tag 1" items={projects} bind:value={tagOne} />
		<Combobox label="Tag 2" items={projects} bind:value={tagTwo} />
	{/if}
</main>
