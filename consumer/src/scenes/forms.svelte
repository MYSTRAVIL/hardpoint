<script>
	import { Checkbox, CheckboxGroup, Switch, TextField, NativeSelect, Button } from '@mystravil/hardpoint';
	let name = $state('');
	let error = $state('');
	let checked = $state(false);
	let on = $state(false);
	let group = $state(['a']);
</script>

<main class="page">
	<TextField label="Name" bind:value={name} hint="Your name" error={error || undefined} />
	<Button onclick={() => (error = error ? '' : 'Name is required')}>Toggle error</Button>
	<Checkbox label="Accept" hint="Required" bind:checked />
	<Checkbox label="Indeterminate" indeterminate />
	<CheckboxGroup label="Group" bind:value={group} items={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B', hint: 'Hint' }]} />
	<Switch label="Notifications" bind:checked={on} />
	<NativeSelect label="Native" options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} value="a" />
	<Button variant="primary">Primary</Button>
	<Button variant="secondary">Secondary</Button>
	<Button variant="tertiary" opens>Tertiary</Button>
</main>
