<script lang="ts">
	import LabelsTable from '../../LabelsTable.svelte';
	import Steps, { type StepsItem } from '#lib/components/Steps.svelte';

	const setup: StepsItem[] = [
		{ label: 'Account', detail: 'Name and email' },
		{ label: 'Project', detail: 'Title, team and due date' },
		{ label: 'Members', detail: 'Invite people by email' },
		{ label: 'Review', detail: 'Check and create' }
	];

	const upload: StepsItem[] = [{ label: 'Choose files' }, { label: 'Add details' }, { label: 'Upload' }];

	const release: StepsItem[] = [
		{ label: 'Details' },
		{ label: 'Files' },
		{ label: 'Members' },
		{ label: 'Permissions' },
		{ label: 'Notifications' },
		{ label: 'Review' }
	];
</script>

<svelte:head>
	<title>Steps · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Steps</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		Where a person is in a process of several steps, such as a setup form split over pages.
		<code>Steps</code> follows the brief’s visual rule 7, discrete shapes: each step has a 3px edge,
		titanium once reached and grey while upcoming, so the edges read as a segmented bar. The current step
		takes the selection tint. A row from 600px; stacked on phones.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Steps.</strong> <code>steps</code> lists them in order, each with a caps
				<code>label</code> and an optional <code>detail</code> line, as written. It renders an
				<code>&lt;ol&gt;</code>; give it an <code>aria-label</code> that names the process.
			</li>
			<li>
				<strong>Current.</strong> <code>current</code> is the index of the current step, from 0. Steps
				before it are done and show a check; steps after it are upcoming, in the muted ink.
				<code>steps.length</code> marks every step done.
			</li>
			<li>
				<strong>Row or stack.</strong> The steps sit in a row of equal columns from <code>rowFrom</code>
				and stack below it: <code>medium</code> (600px, the default), <code>expanded</code> (900px) or
				<code>large</code> (1200px). Pick a later width when many steps or long labels would not fit their
				columns; a word too long for its column breaks rather than widen the page.
			</li>
			<li>
				<strong>Screen readers.</strong> The current step carries <code>aria-current="step"</code>. A done
				step adds hidden text after its label, <code>done</code> by default; set <code>doneLabel</code> to
				translate it.
			</li>
			<li>
				<strong>Display only.</strong> Steps are not links or buttons. When the current step changes, a
				step’s edge and tint fade their colour over <code>--dur-segment</code> (120ms); the text and the
				check change at once. The app moves between steps with its own actions.
			</li>
			<li>
				Each <code>&lt;li&gt;</code> carries <code>data-state</code>: <code>done</code>,
				<code>current</code> or <code>upcoming</code>. Extra attributes and <code>class</code> go to the
				<code>&lt;ol&gt;</code>.
			</li>
		</ul>
	</section>

	<section aria-labelledby="progress">
		<h2 id="progress" class="hp-section-title">In progress</h2>
		<p class="lede">A new project form on its second page: one step done, one current, two upcoming.</p>
		<Steps aria-label="New project" steps={setup} current={1} />
	</section>

	<section aria-labelledby="first">
		<h2 id="first" class="hp-section-title">First step</h2>
		<p class="lede">Nothing done yet, and no detail lines.</p>
		<Steps aria-label="Upload files" steps={upload} current={0} />
	</section>

	<section aria-labelledby="done">
		<h2 id="done" class="hp-section-title">All done</h2>
		<p class="lede"><code>current</code> set to the number of steps: every step shows a check.</p>
		<Steps aria-label="New project" steps={setup} current={setup.length} />
	</section>

	<section aria-labelledby="many">
		<h2 id="many" class="hp-section-title">Six steps</h2>
		<p class="lede">
			Six steps with long labels do not fit six columns below 1200px, so this one sets
			<code>rowFrom="large"</code>: stacked up to 1199px, a row from 1200px.
		</p>
		<Steps aria-label="Project settings" steps={release} current={3} rowFrom="large" />
	</section>

	<section aria-labelledby="labels">
		<h2 id="labels" class="hp-section-title">Labels</h2>
		<LabelsTable
			rows={[
				{ prop: 'doneLabel', value: 'done', shows: 'Read by screen readers after the label of each finished step. Not drawn.' }
			]}
		/>
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
</style>
