<script lang="ts">
	import { Checkbox, CheckboxGroup, Switch, TextField, Select, NativeSelect, Button } from '@mystravil/hardpoint';
	let name = $state('');
	let error = $state('');
	let checked = $state(false);
	let on = $state(false);
	let group = $state(['a']);

	// One toggle shows an error on every control that takes one, as a form
	// does after a failed submit.
	const plans = [
		{ value: 'free', label: 'Free' },
		{ value: 'team', label: 'Team', description: 'Up to 20 people' }
	];
	let plan = $state('');
	let fieldError = $state('');
	let nativeRef = $state<HTMLSelectElement | null>(null);
	let refTag = $state('');
</script>

<main class="page">
	<TextField label="Name" bind:value={name} hint="Your name" error={error || undefined} />
	<Button onclick={() => (error = error ? '' : 'Name is required')}>Toggle error</Button>
	<Checkbox label="Accept" hint="Required" bind:checked />
	<Checkbox label="Indeterminate" indeterminate />
	<CheckboxGroup label="Group" bind:value={group} items={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B', hint: 'Hint' }]} />
	<Switch label="Notifications" bind:checked={on} />
	<NativeSelect
		label="Native"
		items={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]}
		value="a"
		hint="Native hint"
		error={fieldError ? 'Native ' + fieldError : undefined}
		bind:ref={nativeRef}
	/>
	<Select
		label="Plan"
		items={plans}
		bind:value={plan}
		placeholder="Choose a plan"
		closeLabel="Dismiss plans"
		hint="Plan hint"
		error={fieldError ? 'Plan ' + fieldError : undefined}
	/>
	<Checkbox
		label="Terms"
		hint="Terms hint"
		error={fieldError ? 'Terms ' + fieldError : undefined}
		aria-describedby="forms-extra"
	/>
	<Switch label="Backups" hint="Backups hint" error={fieldError ? 'Backups ' + fieldError : undefined} />
	<Switch aria-label="Row switch" error={fieldError ? 'Row ' + fieldError : undefined} />
	<p id="forms-extra">Extra description</p>
	<Button onclick={() => (fieldError = fieldError ? '' : 'needs a choice')}>Toggle field errors</Button>
	<Button onclick={() => (refTag = nativeRef?.tagName ?? 'none')}>Read native ref</Button>
	<Button onclick={() => nativeRef?.focus()}>Focus native ref</Button>
	<p id="native-ref">{refTag}</p>
	<Button variant="primary">Primary</Button>
	<Button variant="secondary">Secondary</Button>
	<Button variant="tertiary" opens>Tertiary</Button>
</main>
