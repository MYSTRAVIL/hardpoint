<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Dialog from '#lib/components/Dialog.svelte';
	import NativeSelect from '#lib/components/NativeSelect.svelte';
	import Select, { type SelectItem } from '#lib/components/Select.svelte';

	// Confirmation
	let archived = $state('');

	// Form, full screen on phones
	const people: SelectItem[] = [
		{ value: 'mara', label: 'Mara Ilves' },
		{ value: 'tomas', label: 'Tomás Reyes' },
		{ value: 'ana', label: 'Ana Kovač' },
		{ value: 'joel', label: 'Joel Brandt' },
		{ value: 'ines', label: 'Ines Duarte' }
	];
	const priorities = [
		{ value: 'low', label: 'Low' },
		{ value: 'normal', label: 'Normal' },
		{ value: 'high', label: 'High' }
	];
	let taskOpen = $state(false);
	let created = $state('');
	function createTask(e: SubmitEvent & { currentTarget: HTMLFormElement }) {
		e.preventDefault();
		const data = new FormData(e.currentTarget);
		created = new URLSearchParams(data as unknown as Record<string, string>).toString();
		taskOpen = false;
	}

	// Long content
	const versions = [
		['v14', '2026-11-08', 'Mara Ilves', 'Moved the budget table under the summary.'],
		['v13', '2026-11-06', 'Tomás Reyes', 'Replaced the cover image.'],
		['v12', '2026-11-03', 'Ana Kovač', 'Fixed the totals in the second quarter.'],
		['v11', '2026-10-30', 'Mara Ilves', 'Added the supplier list.'],
		['v10', '2026-10-27', 'Joel Brandt', 'Renamed the file.'],
		['v9', '2026-10-21', 'Ines Duarte', 'Shared with the Design team.'],
		['v8', '2026-10-18', 'Mara Ilves', 'Split the introduction into two sections.'],
		['v7', '2026-10-14', 'Tomás Reyes', 'Corrected three dates in the schedule.'],
		['v6', '2026-10-09', 'Ana Kovač', 'Added the risks section.'],
		['v5', '2026-10-02', 'Joel Brandt', 'Updated the cost estimate.'],
		['v4', '2026-09-28', 'Mara Ilves', 'Added the timeline.'],
		['v3', '2026-09-22', 'Ines Duarte', 'Wrote the goals.'],
		['v2', '2026-09-19', 'Mara Ilves', 'Added the outline.'],
		['v1', '2026-09-18', 'Mara Ilves', 'Created the file.']
	];

	// Opened from code
	let renameOpen = $state(false);
	let fileName = $state('budget-2027.xlsx');
	let draftName = $state('');
	function startRename() {
		draftName = fileName;
		renameOpen = true;
	}
	function rename(e: SubmitEvent) {
		e.preventDefault();
		if (draftName.trim()) fileName = draftName.trim();
		renameOpen = false;
	}

	const layers = [
		['--layer-sticky', '3', 'Sticky parts of the content, such as the table header band.'],
		['--layer-shell', '5', 'The app shell’s header and bottom bar.'],
		['--layer-dialog', '40', 'Dialogs, their sheets and full-screen forms, the drawer, with their scrim.'],
		['--layer-popover', '50', 'Popovers, menus, select lists and comboboxes, and their sheets: over a dialog.'],
		['--layer-tooltip', '60', 'Tooltips, over everything.']
	];
</script>

<svelte:head>
	<title>Dialog · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Dialog</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		A short task or a confirmation that needs an answer before the page goes on. One component picks its
		form by width: from 600px a dialog centred over the dimmed page; below 600px a bottom sheet with a
		close button, at most half the screen high, that swipes down to close. Long or complex forms set
		<code>fullscreen</code> and fill the phone’s screen instead.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<code>title</code> is required: the caps title and the dialog’s accessible name. Keep it a fixed
				string; a name the user wrote goes in <code>description</code>, which sets a line in the supporting
				ink and becomes the accessible description. A long title wraps onto more lines, and the close button
				stays beside its first line.
			</li>
			<li>
				Open it from <code>trigger</code>, a snippet that spreads <code>props</code> onto a button, or bind
				<code>open</code> from anywhere. Closing returns focus to the element that had it.
			</li>
			<li>
				<code>actions</code> renders the action row and receives <code>close</code>. The primary action
				goes last and is the dialog’s one solid block.
			</li>
			<li>
				Keys: <kbd>Tab</kbd> and <kbd>Shift</kbd> <kbd>Tab</kbd> stay inside the dialog, <kbd>Escape</kbd>
				closes it. A press on the dimmed page closes it too, except for a <code>fullscreen</code> form, which
				would lose its input. Focus starts on the close button, so a phone’s keyboard does not cover the
				sheet as it opens. Once a field in the sheet takes focus, the sheet sits on top of the keyboard and
				may grow into the space above it, and the field stays in sight. A <code>fullscreen</code> form
				shrinks to the space above the keyboard instead, title row and actions included.
			</li>
			<li>
				Extra attributes go to the dialog element, with Bits UI’s <code>onOpenAutoFocus</code>,
				<code>onCloseAutoFocus</code>, <code>onEscapeKeydown</code> and <code>onInteractOutside</code>.
			</li>
		</ul>
	</section>

	<section aria-labelledby="confirm">
		<h2 id="confirm" class="hp-section-title">Confirmation</h2>
		<p class="lede">A title, a description and two actions. On a phone it opens as a sheet.</p>
		<div class="row">
			<Dialog
				title="Archive project"
				description="Website redesign moves to the archive. Members keep read access, and an owner can restore it from Settings."
			>
				{#snippet trigger({ props })}
					<Button {...props}>Archive project</Button>
				{/snippet}
				{#snippet actions({ close })}
					<Button
						onclick={() => {
							archived = 'cancelled';
							close();
						}}>Cancel</Button
					>
					<Button
						variant="primary"
						onclick={() => {
							archived = 'archived';
							close();
						}}>Archive</Button
					>
				{/snippet}
			</Dialog>
			<p class="hp-caption readout" aria-live="polite">
				{#if archived}last answer: <code>{archived}</code>{:else}No answer yet.{/if}
			</p>
		</div>
	</section>

	<section aria-labelledby="form">
		<h2 id="form" class="hp-section-title">Form, full screen on phones</h2>
		<p class="lede">
			<code>fullscreen</code> fills a phone’s screen, with the actions pinned at the bottom; while the
			on-screen keyboard is up, it fills the space above it. From 600px it is centred like any other, and a
			press outside it does not close it. The select’s list opens over the dialog.
		</p>
		<div class="row">
			<Dialog title="New task" fullscreen bind:open={taskOpen}>
				{#snippet trigger({ props })}
					<Button {...props}>New task</Button>
				{/snippet}
				<form id="new-task" class="form" onsubmit={createTask}>
					<div class="field">
						<label class="hp-label field-label" for="task-title">Title</label>
						<input id="task-title" class="hp-well" name="title" autocomplete="off" enterkeyhint="next" required />
					</div>
					<Select label="Assignee" name="assignee" items={people} placeholder="Choose a person" />
					<NativeSelect label="Priority" name="priority" options={priorities} value="normal" />
					<div class="field">
						<label class="hp-label field-label" for="task-due">Due date</label>
						<input id="task-due" class="hp-well" name="due" type="date" />
					</div>
				</form>
				{#snippet actions({ close })}
					<Button onclick={close}>Cancel</Button>
					<Button variant="primary" type="submit" form="new-task">Create task</Button>
				{/snippet}
			</Dialog>
			<p class="hp-caption readout" aria-live="polite">
				{#if created}created: <code>{created}</code>{:else}No task created yet.{/if}
			</p>
		</div>
	</section>

	<section aria-labelledby="long">
		<h2 id="long" class="hp-section-title">Long content</h2>
		<p class="lede">
			The body scrolls inside the dialog; the title row stays. No actions: the close button, Escape or a
			press outside closes it.
		</p>
		<div class="row">
			<Dialog title="Version history" description="budget-2027.xlsx, newest first.">
				{#snippet trigger({ props })}
					<Button {...props}>Version history</Button>
				{/snippet}
				<ol class="versions">
					{#each versions as [version, date, person, change] (version)}
						<li>
							<span class="hp-mono version">{version}</span>
							<span class="change">{change}</span>
							<span class="hp-caption meta"><span class="hp-mono">{date}</span> · {person}</span>
						</li>
					{/each}
				</ol>
			</Dialog>
		</div>
	</section>

	<section aria-labelledby="code">
		<h2 id="code" class="hp-section-title">Opened from code</h2>
		<p class="lede">
			No <code>trigger</code>: the button sets a bound <code>open</code>. Focus still returns to it on close.
		</p>
		<div class="row">
			<Button onclick={startRename}>Rename file</Button>
			<p class="hp-caption readout" aria-live="polite">file: <code>{fileName}</code></p>
			<Dialog title="Rename file" bind:open={renameOpen}>
				<form id="rename-file" class="form" onsubmit={rename}>
					<div class="field">
						<label class="hp-label field-label" for="file-name">Name</label>
						<input
							id="file-name"
							class="hp-well"
							name="name"
							autocomplete="off"
							enterkeyhint="done"
							bind:value={draftName}
						/>
					</div>
				</form>
				{#snippet actions({ close })}
					<Button onclick={close}>Cancel</Button>
					<Button variant="primary" type="submit" form="rename-file">Rename</Button>
				{/snippet}
			</Dialog>
		</div>
	</section>

	<section aria-labelledby="layers">
		<h2 id="layers" class="hp-section-title">Layers</h2>
		<p class="lede">
			Every library layer has a z-index token in <code>tokens.css</code>. Overlays render at the end of the
			page, so a later layer of the same token paints over an earlier one.
		</p>
		<dl class="layers">
			{#each layers as [token, value, use] (token)}
				<div class="layer">
					<dt><code>{token}</code> <span class="hp-num value">{value}</span></dt>
					<dd>{use}</dd>
				</div>
			{/each}
		</dl>
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

	code,
	kbd {
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

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-6);
	}
	.readout {
		color: var(--muted);
		overflow-wrap: anywhere;
	}

	/* Content inside the dialogs. */
	.form {
		display: grid;
		gap: var(--space-5);
	}
	.field {
		display: grid;
		gap: var(--space-1);
	}
	.field-label {
		color: var(--muted);
	}
	.field .hp-well {
		width: 100%;
	}

	.versions {
		display: grid;
		gap: var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.versions li {
		display: grid;
		grid-template-columns: var(--space-10) minmax(0, 1fr);
		column-gap: var(--space-3);
	}
	.version {
		color: var(--muted);
	}
	.meta {
		grid-column: 2;
		color: var(--muted);
	}

	.layers {
		display: grid;
		gap: var(--space-4);
		max-width: var(--measure);
		margin: 0;
	}
	.layer dt {
		display: flex;
		gap: var(--space-3);
	}
	.layer .value {
		color: var(--muted);
	}
	.layer dd {
		margin: var(--space-1) 0 0;
		color: var(--muted);
	}
</style>
