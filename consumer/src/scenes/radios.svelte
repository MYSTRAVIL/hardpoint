<script>
	import { RadioGroup, CheckboxGroup, Button, Tag } from '@mystravil/hardpoint';
	const items = [
		{ value: 'daily', label: 'Daily', hint: 'One summary a day' },
		{ value: 'weekly', label: 'Weekly', tag: 'New' },
		{ value: 'never', label: 'Never', disabled: true }
	];
	let value = $state('daily');
	let error = $state('');
	let group = $state(['a']);
	let gerror = $state('');
</script>

<main class="page">
	<RadioGroup label="Reminders" {items} bind:value hint="Pick one" error={error || undefined} />
	<div class="row">
		<Button onclick={() => (value = '')}>Clear</Button>
		<Button onclick={() => (error = error ? '' : 'Choose one')}>Toggle error</Button>
	</div>
	<RadioGroup {items} bind:value>
		{#snippet legend()}<span>Legend <Tag as="span">Snippet</Tag></span>{/snippet}
	</RadioGroup>
	<CheckboxGroup label="Channels" bind:value={group} hint="Any" error={gerror || undefined}
		items={[{ value: 'a', label: 'Email', tag: 'Default' }, { value: 'b', label: 'Push', hint: 'Phones only' }]} />
	<CheckboxGroup bind:value={group} items={[{ value: 'a', label: 'Email' }, { value: 'b', label: 'Push', tag: 'Beta' }]}>
		{#snippet legend()}<span>Own legend</span>{/snippet}
	</CheckboxGroup>
	<Button onclick={() => (gerror = gerror ? '' : 'Pick a channel')}>Toggle group error</Button>
</main>
