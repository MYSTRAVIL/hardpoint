<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Checkbox from '#lib/components/Checkbox.svelte';
	import CheckboxGroup, { type CheckboxGroupItem } from '#lib/components/CheckboxGroup.svelte';

	let archive = $state(false);
	let extensions = $state(true);
	let offline = $state(true);
	let overdue = $state(false);

	const files = ['brief.pdf', 'wireframes-v3.fig', 'copy-deck.docx'];
	let shared = $state<Record<string, boolean>>({
		'brief.pdf': true,
		'wireframes-v3.fig': false,
		'copy-deck.docx': true
	});
	const sharedCount = $derived(files.filter((f) => shared[f]).length);
	const allShared = $derived(sharedCount === files.length);
	const someShared = $derived(sharedCount > 0 && !allShared);

	function shareAll(on: boolean) {
		for (const f of files) shared[f] = on;
	}

	const notifyItems: CheckboxGroupItem[] = [
		{ value: 'comments', label: 'Comments on my tasks' },
		{ value: 'mentions', label: 'Mentions', hint: 'When someone writes your name in a comment or a task.' },
		{ value: 'assigned', label: 'Tasks assigned to me' },
		{ value: 'digest', label: 'Weekly digest', disabled: true }
	];
	let notify = $state(['comments', 'assigned']);
	let formats = $state(['csv']);

	const reportItems: CheckboxGroupItem[] = [
		{
			value: 'activity',
			label: 'Activity summary',
			hint: 'Tasks opened, closed and moved.',
			tag: 'Recommended'
		},
		{ value: 'time', label: 'Time tracked', hint: 'Hours by person and by project.' },
		{ value: 'overdue', label: 'Overdue tasks', hint: 'Every task past its due date, oldest first.' }
	];
	let reports = $state(['activity']);

	// The live form: the page validates, the group shows the error it is
	// given. On submit, focus goes to the first box; a checked box clears
	// the error.
	const topicItems: CheckboxGroupItem[] = [
		{ value: 'design', label: 'Design' },
		{ value: 'engineering', label: 'Engineering' },
		{ value: 'research', label: 'Research' }
	];
	let topics = $state<string[]>([]);
	let topicsError = $state<string>();
	let topicsRef = $state<HTMLElement | null>(null);
	let topicsSaved = $state('');

	function submitTopics(event: SubmitEvent) {
		event.preventDefault();
		topicsSaved = '';
		if (!topics.length) {
			topicsError = 'Choose a topic to follow.';
			topicsRef?.querySelector<HTMLElement>('[role="checkbox"]:not(:disabled)')?.focus();
			return;
		}
		topicsSaved = `Following ${topics.length} ${topics.length === 1 ? 'topic' : 'topics'}.`;
	}

	// A single box in a form: the page validates, the box shows the error it
	// is given. On submit, focus goes to the box; checking it clears the
	// error.
	let accepted = $state(false);
	let acceptedError = $state<string>();
	let acceptedRef = $state<HTMLElement | null>(null);
	let joined = $state('');
	$effect(() => {
		if (accepted) acceptedError = undefined;
	});
	function submitTerms(event: SubmitEvent) {
		event.preventDefault();
		joined = '';
		if (!accepted) {
			acceptedError = 'Accept the terms to join the workspace.';
			acceptedRef?.focus();
			return;
		}
		joined = 'You joined the workspace.';
	}

	const rows = [
		{ name: 'Mara Ilves', role: 'Owner' },
		{ name: 'Jonas Berg', role: 'Editor' },
		{ name: 'Priya Natarajan', role: 'Viewer' }
	];
	let picked = $state<Record<string, boolean>>({ 'Mara Ilves': false, 'Jonas Berg': true, 'Priya Natarajan': false });
</script>

<svelte:head>
	<title>Checkbox · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Checkbox</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		An independent yes or no. <code>Checkbox</code> is a black box with a 3:1 boundary. Checked, its
		edge and its check turn titanium and the box stays black, because selection is never a fill. A box
		for a partly chosen set shows a titanium dash. The check fades in at its place over
		<code>--dur-mark</code> (80ms) and never moves; nothing fades when the page loads.
		<code>CheckboxGroup</code> puts several boxes under one name: a caps label or a question.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Label.</strong> <code>label</code> is the text beside the box, as written, never in caps.
				<code>hint</code> adds a muted line under it that is read out as the box’s description.
				<code>tag</code> adds a <a href="/components/tag">Tag</a> after the label, such as Recommended,
				which is part of the box’s name. Every box needs a name, and the types ask for exactly one of
				<code>label</code>, <code>aria-label</code> or <code>aria-labelledby</code>: a box without a
				visible label, such as a row’s selection in a table, takes an <code>aria-label</code>.
			</li>
			<li>
				<strong>Error.</strong> <code>error</code> shows a message with an icon 8px under the row, sets
				<code>aria-invalid</code> on the button and turns the box’s edge red; a box has one boundary,
				as a text field’s well. The error is linked by <code>aria-describedby</code>, before the hint
				and your own ids. Say how to fix the problem. An error that appears after the first render fades
				in with the red edge over <code>--dur-message</code> (120ms); one that clears goes at once. The
				app validates; on submit it focuses the box through <code>bind:ref</code>.
			</li>
			<li>
				<strong>Value.</strong> <code>bind:checked</code> holds the state. <code>indeterminate</code>
				(bindable) shows the mixed dash for a set that is partly chosen; pressing it checks the box.
				<code>name</code> and <code>value</code> submit it with a form.
			</li>
			<li>
				<strong>Group.</strong> <code>CheckboxGroup</code> is named by a caps <code>label</code>, or by a
				<code>legend</code> snippet set as written in 16px at weight 500, such as a question. It takes an
				optional <code>hint</code>, and <code>items</code>, each with a <code>value</code>, a
				<code>label</code> and an optional <code>hint</code>, <code>tag</code> and <code>disabled</code>,
				or <code>Checkbox</code> children that each have a <code>value</code>. <code>bind:value</code>
				holds the checked values.
				<code>disabled</code> and <code>name</code> apply to every box. <code>error</code> shows a
				message with an icon under the boxes and sets <code>aria-invalid</code> on the group, which is
				described by the error, then the hint.
			</li>
			<li>
				<strong>Targets.</strong> A press anywhere on a box’s row toggles it: the box, the label, the tag,
				the hint and the space between them. The box is 20px. Its hit area is at least 24px square on a
				mouse and 44px on touch, and its label line is as tall. Boxes in a group sit 8px apart.
			</li>
			<li>
				State is on the button: <code>aria-checked</code>, <code>data-state</code> (checked, unchecked,
				indeterminate) and <code>data-disabled</code>. Extra attributes, event handlers and
				<code>class</code> go to the button. For an on/off setting that applies at once, use a
				<a href="/components/switch">Switch</a>.
			</li>
		</ul>
	</section>

	<section aria-labelledby="states">
		<h2 id="states" class="hp-section-title">States</h2>
		<p class="lede">
			Unchecked, checked, with a hint, a long label that wraps beside its box, and disabled. A disabled
			box takes the quieter <code>--border</code> and muted ink. Press <kbd>Tab</kbd> to see the focus
			contour: 4px outside the box, so it never looks like the checked edge.
		</p>
		<div class="stack">
			<Checkbox label="Archive finished tasks" bind:checked={archive} />
			<Checkbox label="Show file extensions" bind:checked={extensions} />
			<Checkbox
				label="Keep a copy on this device"
				hint="Uses up to 2 GB of storage."
				bind:checked={offline}
			/>
			<Checkbox
				label="Email the project owner when a task in this project is more than a day overdue"
				bind:checked={overdue}
			/>
			<Checkbox label="Sync over mobile data" disabled />
			<Checkbox label="Required by your workspace" checked disabled />
			<Checkbox label="Some members chosen" indeterminate disabled />
		</div>
		<p class="value hp-caption">
			<span class="hp-mono">archive = {archive}</span> ·
			<span class="hp-mono">extensions = {extensions}</span> ·
			<span class="hp-mono">offline = {offline}</span> ·
			<span class="hp-mono">overdue = {overdue}</span>
		</p>
	</section>

	<section aria-labelledby="error">
		<h2 id="error" class="hp-section-title">Hint and error</h2>
		<p class="lede">
			The error sits 8px under the row, under the hint if there is one, and the box’s edge turns red,
			checked or not. A disabled box keeps its quiet boundary. Send the form without checking the box:
			the error appears and the box takes focus. Check it and the error clears.
		</p>
		<div class="stack">
			<Checkbox
				label="Share the file with everyone in the workspace"
				hint="Anyone in the workspace can read it."
				error="Choose who may read the file, or turn sharing off."
				checked
			/>
			<Checkbox label="Allow comments" error="Comments are on for the whole workspace." />
			<Checkbox label="Sync over mobile data" error="Your workspace turned this off." disabled />
		</div>
		<form class="form" novalidate onsubmit={submitTerms}>
			<Checkbox
				label="I accept the workspace terms"
				error={acceptedError}
				bind:checked={accepted}
				bind:ref={acceptedRef}
			/>
			<div class="actions">
				<Button type="submit" variant="primary">Join workspace</Button>
			</div>
			<p class="sent hp-dense" role="status">{joined}</p>
		</form>
	</section>

	<section aria-labelledby="mixed">
		<h2 id="mixed" class="hp-section-title">Partly chosen</h2>
		<p class="lede">
			A box over a set is checked when every item is, mixed when some are, and empty when none are.
			Pressing it while mixed checks every item. The app works out the state from the items.
		</p>
		<div class="stack">
			<Checkbox
				label="All files"
				checked={allShared}
				indeterminate={someShared}
				onCheckedChange={shareAll}
				aria-controls="shared-files"
			/>
			<div class="stack nested" id="shared-files">
				{#each files as file (file)}
					<Checkbox label={file} bind:checked={shared[file]} />
				{/each}
			</div>
		</div>
		<p class="value hp-caption">
			<span class="hp-mono">shared = {sharedCount} of {files.length}</span>
		</p>
	</section>

	<section aria-labelledby="group">
		<h2 id="group" class="hp-section-title">Group</h2>
		<p class="lede">
			<code>CheckboxGroup</code>: a caps label names the group for screen readers too. One choice in the
			first group is disabled; the second group is disabled whole.
		</p>
		<div class="groups">
			<CheckboxGroup label="Notify me about" items={notifyItems} bind:value={notify} />
			<CheckboxGroup
				label="Export formats"
				hint="Your workspace sets the formats."
				disabled
				bind:value={formats}
			>
				<Checkbox value="csv" label="CSV" />
				<Checkbox value="json" label="JSON" />
				<Checkbox value="xlsx" label="Spreadsheet (.xlsx)" />
			</CheckboxGroup>
		</div>
		<p class="value hp-caption">
			<span class="hp-mono">notify = [{notify.map((v) => `'${v}'`).join(', ')}]</span> ·
			<span class="hp-mono">formats = [{formats.map((v) => `'${v}'`).join(', ')}]</span>
		</p>

		<p class="lede more">
			A legend names the group as written, here a question with a counter before it. Each choice has a
			hint and one carries a Recommended tag; a press on a hint toggles its box. Send the second group
			with no box checked: the error appears under the boxes and the first box takes focus.
		</p>
		<div class="groups">
			<CheckboxGroup items={reportItems} bind:value={reports}>
				{#snippet legend()}
					<span class="counter hp-num">3 / 3</span> Which reports should go out each week?
				{/snippet}
			</CheckboxGroup>
			<form class="form" novalidate onsubmit={submitTopics}>
				<CheckboxGroup
					label="Topics to follow"
					hint="Choose at least one."
					items={topicItems}
					error={topicsError}
					bind:value={topics}
					bind:ref={topicsRef}
					onValueChange={(next) => {
						if (next.length) topicsError = undefined;
					}}
				/>
				<div class="actions">
					<Button type="submit" variant="primary">Follow</Button>
				</div>
				<p class="sent hp-dense" role="status">{topicsSaved}</p>
			</form>
		</div>
		<p class="value hp-caption">
			<span class="hp-mono">reports = [{reports.map((v) => `'${v}'`).join(', ')}]</span> ·
			<span class="hp-mono">topics = [{topics.map((v) => `'${v}'`).join(', ')}]</span>
		</p>
	</section>

	<section aria-labelledby="unlabelled">
		<h2 id="unlabelled" class="hp-section-title">Without a visible label</h2>
		<p class="lede">
			A row’s selection in a list or table: the box has an <code>aria-label</code> and its own hit area,
			and the row’s text stays as it is.
		</p>
		<ul class="people">
			{#each rows as row (row.name)}
				<li>
					<Checkbox aria-label={`Select ${row.name}`} bind:checked={picked[row.name]} />
					<span class="hp-dense">{row.name}</span>
					<span class="role hp-dense">{row.role}</span>
				</li>
			{/each}
		</ul>
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
	code,
	kbd {
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

	/* Boxes 8px apart, so neighbouring targets never touch. */
	.stack {
		display: grid;
		gap: var(--space-2);
		max-width: 480px;
	}
	/* Items under a box for the set line up with its label: the 20px box
	   plus the 12px gap. */
	.nested {
		padding-left: var(--space-8);
	}

	.groups {
		display: grid;
		gap: var(--space-10);
	}
	@media (min-width: 600px) {
		.groups {
			grid-template-columns: repeat(2, minmax(0, 280px));
			gap: var(--space-8);
		}
	}
	/* A second set of examples in the same section. */
	.more {
		margin-top: var(--space-10);
	}
	.stack + .form {
		margin-top: var(--space-6);
		max-width: 480px;
	}
	/* The counter before a question, quieter than the question. */
	.counter {
		margin-right: var(--space-2);
		color: var(--muted);
	}
	/* A group, its button and the status line, more than twice as far apart
	   as the boxes. */
	.form {
		display: grid;
		align-content: start;
		gap: var(--space-6);
	}
	.actions {
		display: flex;
	}
	/* The status region stays rendered, so a screen reader announces the
	   text when it appears. */
	.sent {
		margin: 0;
	}

	.people {
		display: grid;
		gap: var(--space-2);
		max-width: 480px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.people li {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--space-3);
	}
	.role {
		color: var(--muted);
	}

	.value {
		margin-top: var(--space-3);
		color: var(--muted);
	}
</style>
