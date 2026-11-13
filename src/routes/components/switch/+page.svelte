<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Switch from '#lib/components/Switch.svelte';

	let completed = $state(false);
	let compact = $state(true);
	let email = $state(true);
	let reminders = $state(false);

	const projects = [
		{ id: 'PRJ-0142', name: 'Customer portal redesign' },
		{ id: 'PRJ-0157', name: 'Quarterly report' },
		{ id: 'PRJ-0163', name: 'Office move' }
	];
	let watching = $state<Record<string, boolean>>({ 'PRJ-0142': true, 'PRJ-0157': false, 'PRJ-0163': false });

	// A switch in a form: the page validates, the switch shows the error it
	// is given. On submit, focus goes to the switch; turning it on clears
	// the error.
	let backups = $state(false);
	let backupsError = $state<string>();
	let backupsRef = $state<HTMLElement | null>(null);
	let started = $state('');
	$effect(() => {
		if (backups) backupsError = undefined;
	});
	function submitBackups(event: SubmitEvent) {
		event.preventDefault();
		started = '';
		if (!backups) {
			backupsError = 'Turn on backups before you start the migration.';
			backupsRef?.focus();
			return;
		}
		started = 'Migration started.';
	}
</script>

<svelte:head>
	<title>Switch · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Switch</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		An on/off setting that applies at once. <code>Switch</code> is a black box with a 3:1 boundary and a
		square thumb. On, the edge and the thumb turn titanium and the thumb shows at the end; the box stays
		black, because selection is never a fill. The thumb never slides: it fades in at its new place over
		<code>--dur-mark</code> (80ms).
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Label.</strong> <code>label</code> names the setting, as written, never in caps. It fills
				the line and the switch sits at its end, as in omp-remote’s settings rows. Pressing anywhere on
				the label turns the switch on or off. <code>hint</code> adds a muted line under the label that is
				read out as the switch’s description. Every switch needs a name, and the types ask for exactly
				one of <code>label</code>, <code>aria-label</code> or <code>aria-labelledby</code>: a switch
				without a visible label takes an <code>aria-label</code>.
			</li>
			<li>
				<strong>Error.</strong> <code>error</code> shows a message with an icon 8px under the row, sets
				<code>aria-invalid</code> on the button and turns the track’s edge red; a switch has one
				boundary, as a text field’s well. The error is linked by <code>aria-describedby</code>, before
				the hint and your own ids. Say how to fix the problem. An error that appears after the first
				render fades in with the red edge over <code>--dur-message</code> (120ms); one that clears goes
				at once. The app validates; on submit it focuses the switch through <code>bind:ref</code>.
			</li>
			<li>
				<strong>Value.</strong> <code>bind:checked</code> holds the state. <code>name</code> and
				<code>value</code> submit it with a form.
			</li>
			<li>
				<strong>When.</strong> A switch acts at once, like a light switch. A choice that waits for a Save
				button is a <a href="/components/checkbox">Checkbox</a>.
			</li>
			<li>
				<strong>Targets.</strong> The switch is 40 by 24px. Its hit area is at least 24px high on a mouse
				and 44px square on touch, and its label line is as tall.
			</li>
			<li>
				State is on the button: <code>aria-checked</code>, <code>data-state</code> (checked, unchecked) and
				<code>data-disabled</code>. Extra attributes, event handlers and <code>class</code> go to the
				button.
			</li>
		</ul>
	</section>

	<section aria-labelledby="settings">
		<h2 id="settings" class="hp-section-title">Settings</h2>
		<p class="lede">
			Off, on, with a hint, a long label that wraps beside its switch, and disabled. A disabled switch takes
			the quieter <code>--border</code>; on, its thumb stays at the end. Press <kbd>Tab</kbd> to see the
			focus contour: 4px outside the switch, so it never looks like the on edge.
		</p>
		<div class="settings">
			<Switch label="Show completed tasks" bind:checked={completed} />
			<Switch label="Compact rows" bind:checked={compact} />
			<Switch
				label="Email notifications"
				hint="A message for each comment and mention."
				bind:checked={email}
			/>
			<Switch
				label="Remind me the day before a task in one of my projects is due, and again on the morning it is due"
				bind:checked={reminders}
			/>
			<Switch label="Sync over mobile data" hint="Turned off by your workspace." disabled />
			<Switch label="Two-step sign-in" hint="Your workspace requires it." checked disabled />
		</div>
		<p class="value hp-caption">
			<span class="hp-mono">completed = {completed}</span> ·
			<span class="hp-mono">compact = {compact}</span> ·
			<span class="hp-mono">email = {email}</span> ·
			<span class="hp-mono">reminders = {reminders}</span>
		</p>
	</section>

	<section aria-labelledby="error">
		<h2 id="error" class="hp-section-title">Hint and error</h2>
		<p class="lede">
			The error sits 8px under the row, under the hint if there is one, and the track’s edge turns red,
			on or off. A disabled switch keeps its quiet boundary. Start the migration with backups off: the
			error appears and the switch takes focus. Turn it on and the error clears.
		</p>
		<div class="settings">
			<Switch
				label="Public profile"
				hint="Anyone with the link can see your projects."
				error="Your workspace does not allow public profiles."
				checked
			/>
			<Switch label="Two-step sign-in" error="Your workspace requires it." disabled />
		</div>
		<form class="form" novalidate onsubmit={submitBackups}>
			<Switch
				label="Back up before migrating"
				hint="Keeps a copy for 30 days."
				error={backupsError}
				bind:checked={backups}
				bind:ref={backupsRef}
			/>
			<div class="actions">
				<Button type="submit" variant="primary">Start migration</Button>
			</div>
			<p class="sent hp-dense" role="status">{started}</p>
		</form>
	</section>

	<section aria-labelledby="unlabelled">
		<h2 id="unlabelled" class="hp-section-title">Without a visible label</h2>
		<p class="lede">
			A setting per row of a list or table: each switch has an <code>aria-label</code> and its own hit
			area, and the row’s text stays as it is.
		</p>
		<ul class="projects">
			{#each projects as project (project.id)}
				<li>
					<span class="hp-dense hp-mono id">{project.id}</span>
					<span class="hp-dense">{project.name}</span>
					<Switch aria-label={`Follow ${project.name}`} bind:checked={watching[project.id]} />
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

	/* One setting per row, 12px apart. */
	.settings {
		display: grid;
		gap: var(--space-3);
		max-width: 480px;
	}

	/* The settings, a button and the status line, more than twice as far
	   apart as the rows. */
	.form {
		display: grid;
		gap: var(--space-6);
		max-width: 480px;
		margin-top: var(--space-6);
	}
	.actions {
		display: flex;
	}
	/* The status region stays rendered, so a screen reader announces the
	   text when it appears. */
	.sent {
		margin: 0;
	}

	.projects {
		display: grid;
		gap: var(--space-2);
		max-width: 480px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.projects li {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--space-4);
	}
	.id {
		color: var(--muted);
	}

	.value {
		margin-top: var(--space-3);
		color: var(--muted);
	}
</style>
