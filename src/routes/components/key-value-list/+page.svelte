<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import KeyValueList, { type KeyValueItem } from '#lib/components/KeyValueList.svelte';
	import { Motion } from '#lib/motion/index.js';

	const project: KeyValueItem[] = [
		{ key: 'Owner', value: 'Mara Ilves' },
		{ key: 'Team', value: 'Web platform' },
		{ key: 'Priority', value: 'High' },
		{ key: 'Started', value: '2026-08-18' },
		{ key: 'Due', value: '2026-12-15' },
		{ key: 'Open tasks', value: 18 },
		{ key: 'Members', value: 6 },
		{ key: 'Budget', value: '48,200 EUR' }
	];

	const settings: KeyValueItem[] = [
		{ key: 'Default branch', value: 'main' },
		{ key: 'Required reviews', value: 2 },
		{ key: 'Notification email', value: 'web-team@example.com' },
		{ key: 'Retention period', value: '90 days' }
	];

	// Extra fields for the value snippet; the list itself shows key and value.
	type TaskDetail = KeyValueItem & { href?: string; tone?: 'ok' | 'warn' | 'danger' };

	const task: TaskDetail[] = [
		{ key: 'Task', value: 'TSK-2318' },
		{ key: 'Project', value: 'PRJ-0142', href: '/specimen/record' },
		{ key: 'Status', value: 'Waiting on review', tone: 'warn' },
		{ key: 'Assignee', value: 'Jonas Berg' }
	];

	const release: KeyValueItem[] = [
		{ key: 'Version', value: '4.2.0' },
		{ key: 'Commit', value: '3f9c2a7e1b4d8c6f0a5e2d9b7c1f4a8e6d3b0c25' },
		{ key: 'Archive', value: '/releases/customer-portal/2026-11/customer-portal-4.2.0-linux-x64.tar.gz' }
	];

	let staged = $state.raw(project);
	let replay = $state(0);
	const addItem = () => (staged = [...staged, { key: `Item ${staged.length + 1}`, value: 'Added' }]);
	const replayEntrance = () => {
		staged = project;
		replay += 1;
	};
</script>

<svelte:head>
	<title>Key-value list · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Key-value list</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		The details of one record: a column of caps labels and a column of Geist Mono values.
		<code>KeyValueList</code> follows the brief’s visual rule 6: structure comes from alignment, so there
		are no separators, boxes or fills. It renders a <code>&lt;dl&gt;</code>. Below 600px each label
		stacks over its value.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Items.</strong> <code>items</code> takes <code>{'{ key, value }'}</code> pairs in the
				order shown. <code>key</code> is the caps label, a fixed string the app defines.
				<code>value</code> is a string or a number, set in Geist Mono: 16px on touch, 14px on a fine
				pointer. Items may carry extra fields, such as an <code>href</code> or a <code>tone</code>, that
				the <code>value</code> snippet reads.
			</li>
			<li>
				<strong>Label column.</strong> <code>keyWidth</code> sets the label column’s width from 600px up,
				as any CSS width; the default is <code>9rem</code>. Below 600px the label stacks over its value
				and the width does not apply.
			</li>
			<li>
				<strong>Custom values.</strong> The <code>value</code> snippet receives each whole item, extra
				fields included, and renders its value, for a link or a status. Without it a value shows as
				text. Branch on the item’s fields, never on its label, and give a status a word as well as a
				hue.
			</li>
			<li>
				A long value with no spaces, such as a hash or a path, breaks anywhere rather than widen the
				page.
			</li>
			<li>Extra attributes and <code>class</code> go to the <code>&lt;dl&gt;</code>.</li>
		</ul>
	</section>

	<section aria-labelledby="default">
		<h2 id="default" class="hp-section-title">Default</h2>
		<p class="lede">
			A project’s details: people, dates, a count and an amount. From 600px the label column is 9rem
			wide; narrow the window below 600px to see each label stack over its value.
		</p>
		<KeyValueList items={project} />
	</section>

	<section aria-labelledby="key-width">
		<h2 id="key-width" class="hp-section-title">Wider label column</h2>
		<p class="lede">
			Settings with longer labels. <code>keyWidth="12rem"</code> keeps each label on one line from
			600px, so the values share one edge.
		</p>
		<KeyValueList items={settings} keyWidth="12rem" />
	</section>

	<section aria-labelledby="snippet">
		<h2 id="snippet" class="hp-section-title">Rendering a value</h2>
		<p class="lede">
			The Project and Status items carry extra fields, <code>href</code> and <code>tone</code>. The
			<code>value</code> snippet branches on those, not on the label: it renders a link to the project’s
			page and a yellow square before the status words, so the status reads without colour. The other
			values stay text. The link keeps the row’s height; its hit area reaches 44px on touch.
		</p>
		<KeyValueList items={task}>
			{#snippet value(item: TaskDetail)}
				{#if item.href}
					<a class="ref" href={item.href}>{item.value}</a>
				{:else if item.tone}
					<span class="status" data-tone={item.tone}>{item.value}</span>
				{:else}
					{item.value}
				{/if}
			{/snippet}
		</KeyValueList>
	</section>

	<section aria-labelledby="long">
		<h2 id="long" class="hp-section-title">Long values</h2>
		<p class="lede">
			A 40-character commit hash and a long file path. They break anywhere inside the value column, so a
			320px phone shows them on two or three lines and the page never scrolls sideways.
		</p>
		<KeyValueList items={release} />
	</section>

	<section aria-labelledby="expressive">
		<h2 id="expressive" class="hp-section-title">Expressive entrance</h2>
		<p class="lede">
			Inside <code>&lt;Motion tier="expressive"&gt;</code> the items of the first render enter one after
			another, 30ms apart, done by 300ms. Items added later never animate, and nothing moves in the
			quiet tier or with reduced motion. Replay remounts the list to play the entrance again; Add item
			changes it, which shows that a change does not animate.
		</p>
		<div class="demo-controls">
			<Button onclick={replayEntrance}>Replay entrance</Button>
			<Button onclick={addItem}>Add item</Button>
		</div>
		<div data-testid="expressive-demo">
			<Motion tier="expressive">
				{#key replay}
					<KeyValueList items={staged} />
				{/key}
			</Motion>
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

	code {
		font-size: 0.875em;
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

	/* A link value keeps the row's rhythm; the pseudo-element extends its
	   hit area to --hit-target (44px on touch), centred on the text. */
	.ref {
		position: relative;
	}
	.ref::after {
		content: '';
		position: absolute;
		inset: calc((100% - var(--hit-target)) / 2) 0;
	}

	/* An 8px square in the status hue before the word, as in Table. */
	.status::before {
		content: '';
		display: inline-block;
		width: 8px;
		height: 8px;
		margin-right: var(--space-2);
		vertical-align: 1px;
	}
	.status[data-tone='ok']::before {
		background: var(--ok);
	}
	.status[data-tone='warn']::before {
		background: var(--warn);
	}
	.status[data-tone='danger']::before {
		background: var(--danger);
	}
	.demo-controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-4) var(--space-6);
		margin-bottom: var(--space-6);
	}
</style>
