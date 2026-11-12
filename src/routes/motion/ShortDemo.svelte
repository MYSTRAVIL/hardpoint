<script lang="ts" module>
	/** Which short-motion token a demo shows: --dur-mark, --dur-panel, --dur-segment or --dur-message. */
	export type ShortFamily = 'mark' | 'panel' | 'segment' | 'message';
</script>

<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Checkbox from '#lib/components/Checkbox.svelte';
	import Menu from '#lib/components/Menu.svelte';
	import MenuCheckboxItem from '#lib/components/MenuCheckboxItem.svelte';
	import MenuRadioGroup from '#lib/components/MenuRadioGroup.svelte';
	import MenuRadioItem from '#lib/components/MenuRadioItem.svelte';
	import MenuSeparator from '#lib/components/MenuSeparator.svelte';
	import Progress from '#lib/components/Progress.svelte';
	import Steps from '#lib/components/Steps.svelte';
	import Switch from '#lib/components/Switch.svelte';
	import Tabs, { type TabsItem } from '#lib/components/Tabs.svelte';
	import TextField from '#lib/components/TextField.svelte';

	// The demo reads the short-motion tokens from the page, so the tuning rows
	// and slow motion apply to it.
	let { family }: { family: ShortFamily } = $props();

	const uid = $props.id();

	// ---- Marks ---------------------------------------------------------------

	let hidden = $state(false);
	const channels = ['Email', 'Push', 'Text message'];
	let chosen = $state<Record<string, boolean>>({ Email: true, Push: false, 'Text message': false });
	const chosenCount = $derived(channels.filter((c) => chosen[c]).length);
	const allChosen = $derived(chosenCount === channels.length);
	function chooseAll(on: boolean) {
		for (const c of channels) chosen[c] = on;
	}
	let compact = $state(false);
	let grid = $state(true);
	let rulers = $state(false);
	let sort = $state('name');

	// ---- Panel ---------------------------------------------------------------

	// Two lines each: a panel takes focus, so it stays at least a 44px target on touch.
	type Section = TabsItem & { lines: [string, string] };
	const sections: Section[] = [
		{ value: 'overview', label: 'Overview', lines: ['Three tasks are due this week.', 'Two wait for review.'] },
		{ value: 'activity', label: 'Activity', lines: ['Omar Haddad edited the brief.', 'Lena Fischer added two files.'] },
		{ value: 'files', label: 'Files', lines: ['Twelve files, 48 MB in all.', 'The newest is from today.'] }
	];

	// ---- Segments ------------------------------------------------------------

	let progress = $state(40);
	const stepItems = [{ label: 'Details' }, { label: 'Members' }, { label: 'Review' }];
	let step = $state(1);

	// ---- Message -------------------------------------------------------------

	let email = $state('lena.fischer@example');
	let error = $state<string>();
	function check() {
		error = error ? undefined : 'Enter the whole address, such as lena@example.com.';
	}
</script>

{#snippet section(tab: Section)}
	<p>{tab.lines[0]}<br />{tab.lines[1]}</p>
{/snippet}

<div class="short" data-family={family}>
	{#if family === 'mark'}
		<Checkbox label="Show hidden files" bind:checked={hidden} />
		<div class="set">
			<Checkbox
				label="All channels"
				checked={allChosen}
				indeterminate={chosenCount > 0 && !allChosen}
				onCheckedChange={chooseAll}
				aria-controls="{uid}-channels"
			/>
			<div class="set nested" id="{uid}-channels">
				{#each channels as channel (channel)}
					<Checkbox label={channel} bind:checked={chosen[channel]} />
				{/each}
			</div>
		</div>
		<Switch label="Compact rows" bind:checked={compact} />
		<div>
			<Menu label="View">
				{#snippet trigger({ props })}
					<Button {...props}>View</Button>
				{/snippet}
				<MenuCheckboxItem bind:checked={grid} closeOnSelect={false}>Show grid</MenuCheckboxItem>
				<MenuCheckboxItem bind:checked={rulers} closeOnSelect={false}>Show rulers</MenuCheckboxItem>
				<MenuSeparator />
				<MenuRadioGroup label="Sort by" bind:value={sort}>
					<MenuRadioItem value="name" closeOnSelect={false}>Name</MenuRadioItem>
					<MenuRadioItem value="date" closeOnSelect={false}>Date</MenuRadioItem>
					<MenuRadioItem value="size" closeOnSelect={false}>Size</MenuRadioItem>
				</MenuRadioGroup>
			</Menu>
		</div>
	{:else if family === 'panel'}
		<Tabs tabs={sections} label="Project sections" panel={section} />
	{:else if family === 'segment'}
		<div class="pair-controls">
			<Progress label="Uploading files" value={progress} />
			<div class="buttons">
				<Button
					aria-label="Back, upload"
					aria-disabled={progress <= 0 ? 'true' : undefined}
					onclick={() => (progress = Math.max(0, progress - 10))}>Back</Button
				>
				<Button
					aria-label="Forward, upload"
					aria-disabled={progress >= 100 ? 'true' : undefined}
					onclick={() => (progress = Math.min(100, progress + 10))}>Forward</Button
				>
			</div>
		</div>
		<div class="pair-controls">
			<Steps steps={stepItems} current={step} rowFrom="expanded" aria-label="New project" />
			<div class="buttons">
				<Button
					aria-label="Back, steps"
					aria-disabled={step <= 0 ? 'true' : undefined}
					onclick={() => (step = Math.max(0, step - 1))}>Back</Button
				>
				<Button
					aria-label="Next, steps"
					aria-disabled={step >= stepItems.length ? 'true' : undefined}
					onclick={() => (step = Math.min(stepItems.length, step + 1))}>Next</Button
				>
			</div>
		</div>
	{:else}
		<TextField label="Email" type="email" autocomplete="off" bind:value={email} {error} />
		<div class="buttons">
			<Button onclick={check}>Check</Button>
		</div>
	{/if}
</div>

<style>
	/* Groups by space: 24px between the controls, 12px inside a pair. */
	.short {
		display: grid;
		align-content: start;
		gap: var(--space-6);
		min-width: 0;
		max-width: 26rem;
	}
	.set {
		display: grid;
		gap: var(--space-1);
	}
	/* The boxes the mixed box stands for, indented under its label. */
	.nested {
		padding-left: var(--space-8);
	}
	.pair-controls {
		display: grid;
		gap: var(--space-3);
		min-width: 0;
	}
	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
</style>
