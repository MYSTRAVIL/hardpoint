<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import KeyValueList, { type KeyValueItem } from '#lib/components/KeyValueList.svelte';
	import Tabs, { type TabsItem } from '#lib/components/Tabs.svelte';

	// One project's sections.
	const projectTabs: TabsItem[] = [
		{ value: 'overview', label: 'Overview' },
		{ value: 'tasks', label: 'Tasks' },
		{ value: 'files', label: 'Files' },
		{ value: 'activity', label: 'Activity' }
	];
	const overview: KeyValueItem[] = [
		{ key: 'Owner', value: 'Mara Ilves' },
		{ key: 'Team', value: 'Web platform' },
		{ key: 'Started', value: '2026-08-18' },
		{ key: 'Due', value: '2026-12-15' }
	];
	const tasks = [
		['TSK-2318', 'Review the checkout copy'],
		['TSK-2321', 'Move invoices to the new API'],
		['TSK-2330', 'Fix the date picker on phones']
	];
	const files = [
		['brief.pdf', '2.4 MB'],
		['wireframes.fig', '18.1 MB'],
		['copy-deck.docx', '96 KB']
	];
	const activity = [
		['2026-11-08', 'Jonas Berg closed TSK-2304.'],
		['2026-11-06', 'Ana Kovač uploaded wireframes.fig.'],
		['2026-11-03', 'Mara Ilves moved the due date to 2026-12-15.']
	];

	// Settings: more tabs than a phone can show.
	const settingsTabs: TabsItem[] = [
		{ value: 'general', label: 'General' },
		{ value: 'members', label: 'Members' },
		{ value: 'notifications', label: 'Notifications' },
		{ value: 'integrations', label: 'Integrations' },
		{ value: 'webhooks', label: 'Webhooks' },
		{ value: 'billing', label: 'Billing' },
		{ value: 'security', label: 'Security' },
		{ value: 'advanced', label: 'Advanced' }
	];
	const settings: Record<string, { text: string; items: KeyValueItem[] }> = {
		general: {
			text: 'The project’s name, key and default branch.',
			items: [
				{ key: 'Name', value: 'Customer portal' },
				{ key: 'Key', value: 'PRJ-0142' }
			]
		},
		members: {
			text: 'Six people work on this project; two of them can change its settings.',
			items: [
				{ key: 'Members', value: 6 },
				{ key: 'Admins', value: 2 }
			]
		},
		notifications: {
			text: 'Who hears about new tasks, comments and releases.',
			items: [
				{ key: 'Email', value: 'web-team@example.com' },
				{ key: 'Digest', value: 'Daily' }
			]
		},
		integrations: {
			text: 'Services that read from or write to this project.',
			items: [
				{ key: 'Calendar', value: 'Connected' },
				{ key: 'Chat', value: 'Not connected' }
			]
		},
		webhooks: {
			text: 'Addresses that receive an event when a task changes.',
			items: [
				{ key: 'Endpoints', value: 1 },
				{ key: 'Last delivery', value: '2026-11-09 14:02' }
			]
		},
		billing: {
			text: 'The cost centre this project charges.',
			items: [
				{ key: 'Cost centre', value: 'CC-3104' },
				{ key: 'Budget', value: '48,200 EUR' }
			]
		},
		security: {
			text: 'Sign-in rules for everyone on this project.',
			items: [
				{ key: 'Two-step sign-in', value: 'Required' },
				{ key: 'Session length', value: '12 hours' }
			]
		},
		advanced: {
			text: 'Archive or transfer the project.',
			items: [
				{ key: 'Archived', value: 'No' },
				{ key: 'Transfers', value: 0 }
			]
		}
	};
	let settingsValue = $state('security');

	// A task whose reviews open once it has a pull request.
	const taskTabs: TabsItem[] = [
		{ value: 'details', label: 'Details' },
		{ value: 'comments', label: 'Comments' },
		{ value: 'reviews', label: 'Reviews', disabled: true },
		{ value: 'history', label: 'History' }
	];
	const task: KeyValueItem[] = [
		{ key: 'Task', value: 'TSK-2318' },
		{ key: 'Assignee', value: 'Jonas Berg' },
		{ key: 'Priority', value: 'High' }
	];
	const comments = [
		['Ana Kovač', 'The second paragraph still uses the old prices.'],
		['Jonas Berg', 'Fixed; the prices come from the price list now.']
	];
	const history = [
		['2026-11-07', 'Jonas Berg took the task.'],
		['2026-11-05', 'Mara Ilves created the task.']
	];

	let boundValue = $state('general');
	let manualValue = $state('overview');
</script>

<svelte:head>
	<title>Tabs · Components · Hardpoint</title>
</svelte:head>

{#snippet projectPanel(tab: TabsItem)}
	{#if tab.value === 'overview'}
		<KeyValueList items={overview} />
	{:else if tab.value === 'tasks'}
		<ul class="rows">
			{#each tasks as [id, title]}
				<li><span class="hp-mono">{id}</span> {title}</li>
			{/each}
		</ul>
	{:else if tab.value === 'files'}
		<ul class="rows">
			{#each files as [name, size]}
				<li><span class="hp-mono">{name}</span> <span class="muted">{size}</span></li>
			{/each}
		</ul>
	{:else}
		<ul class="rows">
			{#each activity as [date, text]}
				<li><span class="hp-mono muted">{date}</span> {text}</li>
			{/each}
		</ul>
	{/if}
{/snippet}

{#snippet settingsPanel(tab: TabsItem)}
	<div class="stack">
		<p>{settings[tab.value].text}</p>
		<KeyValueList items={settings[tab.value].items} keyWidth="10rem" />
	</div>
{/snippet}

<header><h1 class="hp-view-title">Tabs</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		Sections of one view, one at a time. <code>Tabs</code> is Bits UI Tabs with caps labels (visual rule
		4). The selected tab gets the selection mark of visual rule 2: a 3px titanium edge on the side that
		faces its panel and the selected tint, with its label unchanged. The mark moves at once, never
		sliding (motion rule 3). A panel chosen with a pointer or a tap fades in over
		<code>--dur-panel</code> (100ms); a panel chosen with the keys appears at once, so holding an arrow
		key never stacks fades. When the tabs do not fit, the list scrolls sideways and the page does not.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Tabs.</strong> <code>tabs</code> takes <code>{'{ value, label, disabled? }'}</code> items in
				order. <code>label</code> is a short fixed string the app defines; it shows in caps. Items may carry
				extra fields that the <code>panel</code> snippet reads.
			</li>
			<li>
				<strong>Panels.</strong> The <code>panel</code> snippet receives each tab and renders its panel. Every
				panel stays mounted; the hidden ones carry <code>hidden</code>, so a form keeps what was typed when the
				reader switches tabs. Each panel is in the tab order, so the tab key moves from the selected tab into
				its panel.
			</li>
			<li>
				<strong>Value.</strong> <code>bind:value</code> holds the selected tab’s <code>value</code>; it
				defaults to the first tab that is not disabled. <code>label</code> names the tab list for screen
				readers.
			</li>
			<li>
				<strong>Keys.</strong> Arrow keys move between tabs and wrap at the ends; Home and End jump to the first
				and last. By default a tab is selected as it takes focus. <code>activationMode="manual"</code> moves
				focus only, and Enter or Space selects. Disabled tabs are skipped.
			</li>
			<li>
				<strong>Narrow screens.</strong> The list scrolls sideways when the tabs do not fit. The selected tab
				is scrolled into view on the first render and whenever the selection changes, with part of the next
				tab showing. Only the list scrolls, never the page.
			</li>
			<li>
				Tabs are <code>--control-height</code> high: 36px with a mouse, 32px in compact density and 44px on
				touch. Extra attributes, <code>class</code> and Bits UI root props such as
				<code>activationMode</code> go to the root <code>div.hp-tabs</code>.
			</li>
		</ul>
	</section>

	<section aria-labelledby="default">
		<h2 id="default" class="hp-section-title">Default</h2>
		<p class="lede">
			A project’s four sections. The first tab is selected; the panel below it shows the project’s details.
		</p>
		<Tabs tabs={projectTabs} label="Project sections" panel={projectPanel} />
	</section>

	<section aria-labelledby="many">
		<h2 id="many" class="hp-section-title">More tabs than fit</h2>
		<p class="lede">
			Eight settings sections, with Security selected. On a phone the list scrolls sideways and starts
			scrolled so Security shows, with the start of Advanced after it. The page itself never scrolls
			sideways.
		</p>
		<Tabs tabs={settingsTabs} label="Project settings" bind:value={settingsValue} panel={settingsPanel} />
	</section>

	<section aria-labelledby="disabled">
		<h2 id="disabled" class="hp-section-title">Disabled tab</h2>
		<p class="lede">
			Reviews open once the task has a pull request, so the tab shows in the muted ink and cannot be
			selected. Arrow keys skip it.
		</p>
		<Tabs tabs={taskTabs} label="Task sections">
			{#snippet panel(tab)}
				{#if tab.value === 'details'}
					<KeyValueList items={task} />
				{:else if tab.value === 'comments'}
					<ul class="rows">
						{#each comments as [name, text]}
							<li><span class="muted">{name}</span> {text}</li>
						{/each}
					</ul>
				{:else}
					<ul class="rows">
						{#each history as [date, text]}
							<li><span class="hp-mono muted">{date}</span> {text}</li>
						{/each}
					</ul>
				{/if}
			{/snippet}
		</Tabs>
	</section>

	<section aria-labelledby="bound">
		<h2 id="bound" class="hp-section-title">Selecting from outside</h2>
		<p class="lede">
			The app may set the bound value itself, for example from a link elsewhere on the page. The tab list
			follows at once: on a phone it scrolls so the selected tab shows. Selected: <code>{boundValue}</code>.
		</p>
		<div class="actions">
			<Button onclick={() => (boundValue = 'advanced')}>Show advanced</Button>
			<Button onclick={() => (boundValue = 'general')}>Show general</Button>
		</div>
		<Tabs tabs={settingsTabs} label="Project settings, selected from outside" bind:value={boundValue} panel={settingsPanel} />
	</section>

	<section aria-labelledby="manual">
		<h2 id="manual" class="hp-section-title">Manual activation</h2>
		<p class="lede">
			With <code>activationMode="manual"</code>, arrow keys move focus between tabs without changing the
			panel; Enter or Space selects the focused tab. Use it when a panel is slow to render. Selected:
			<code>{manualValue}</code>.
		</p>
		<Tabs
			tabs={projectTabs}
			label="Project sections, manual"
			activationMode="manual"
			bind:value={manualValue}
			panel={projectPanel}
		/>
	</section>

	<section aria-labelledby="compact">
		<h2 id="compact" class="hp-section-title">Compact density</h2>
		<p class="lede">
			Inside <code>data-density="compact"</code> the tabs are 32px high with a mouse. Touch keeps 44px.
		</p>
		<div data-density="compact">
			<Tabs tabs={projectTabs} label="Project sections, compact" panel={projectPanel} />
		</div>
	</section>
</main>

<style>
	.intro,
	.lede {
		max-width: var(--measure);
		color: var(--muted);
	}
	.lede {
		margin: var(--space-2) 0 var(--space-5);
	}

	section {
		margin-top: var(--space-12);
	}

	/* Token names never break at their hyphens. */
	code {
		font-size: 0.875em;
		white-space: nowrap;
	}

	.notes {
		display: grid;
		gap: var(--space-3);
		max-width: var(--measure);
		margin: var(--space-3) 0 0;
		padding-left: var(--space-5);
		color: var(--muted);
	}
	.notes strong {
		color: var(--text);
		font-weight: 500;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		margin-bottom: var(--space-5);
	}

	.stack {
		display: grid;
		gap: var(--space-4);
	}

	.rows {
		display: grid;
		gap: var(--space-3);
		max-width: var(--measure);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.rows .hp-mono {
		margin-right: var(--space-2);
	}
	.muted {
		color: var(--muted);
	}
</style>
