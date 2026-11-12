<script>
	import { Select, Combobox, NativeSelect } from '@mystravil/hardpoint';
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
	let lang = $state('en');
	let project = $state('');
	let other = $state('');
</script>

<main class="page">
	<Select label="Language" items={langs} bind:value={lang} />
	<Combobox label="Project" items={projects} bind:value={project} placeholder="Search" hint="Type to filter" />
	<Combobox label="Other" items={projects} bind:value={other} emptyText="Nothing found" />
	<NativeSelect label="Native" options={langs} value="en" />
</main>
