<script>
	import { Tabs, Disclosure, Pagination, Steps, Tag } from '@mystravil/hardpoint';
	const tabs = [
		{ value: 'one', label: 'Overview' },
		{ value: 'two', label: 'Activity' },
		{ value: 'three', label: 'Settings', disabled: true }
	];
	let tab = $state('one');
	let page = $state(2);
</script>

<main class="page">
	<Tabs {tabs} label="Sections" bind:value={tab}>
		{#snippet panel(t)}<p>Panel {t.label}</p>{/snippet}
	</Tabs>
	<Disclosure title="Details">
		<p>Hidden until opened.</p>
	</Disclosure>
	<Disclosure title="Open already" open>
		<p>Shown.</p>
	</Disclosure>
	<Pagination bind:page count={95} perPage={10} />
	<Steps current={1} steps={[{ label: 'Account' }, { label: 'Plan', detail: 'Pick one' }, { label: 'Done' }]} />
	<div class="row"><Tag>New</Tag><Tag as="span">Beta</Tag></div>
</main>
