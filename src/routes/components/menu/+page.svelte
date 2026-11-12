<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Menu from '#lib/components/Menu.svelte';
	import MenuCheckboxItem from '#lib/components/MenuCheckboxItem.svelte';
	import MenuGroup from '#lib/components/MenuGroup.svelte';
	import MenuItem from '#lib/components/MenuItem.svelte';
	import MenuRadioGroup from '#lib/components/MenuRadioGroup.svelte';
	import MenuRadioItem from '#lib/components/MenuRadioItem.svelte';
	import MenuSeparator from '#lib/components/MenuSeparator.svelte';

	// Actions
	let lastAction = $state('');

	// Icon-only trigger
	const fileLabel = 'File actions';
	let fileAction = $state('');

	// Groups and a disabled item
	let documentAction = $state('');

	// Checkbox and radio items
	let showHidden = $state(false);
	let showSizes = $state(true);
	let sortBy = $state('name');
	const files = [
		{ name: 'budget-2027.xlsx', modified: '2026-11-08', bytes: 2_400_000, size: '2.4 MB', hidden: false },
		{ name: 'brief-v3.pdf', modified: '2026-11-02', bytes: 860_000, size: '860 KB', hidden: false },
		{ name: 'roadmap.md', modified: '2026-11-06', bytes: 12_000, size: '12 KB', hidden: false },
		{ name: 'logo-pack.zip', modified: '2026-10-21', bytes: 18_300_000, size: '18.3 MB', hidden: false },
		{ name: '.review-notes.md', modified: '2026-11-09', bytes: 4_000, size: '4 KB', hidden: true }
	];
	const shownFiles = $derived(
		files
			.filter((file) => showHidden || !file.hidden)
			.sort((a, b) =>
				sortBy === 'modified'
					? b.modified.localeCompare(a.modified)
					: sortBy === 'size'
						? b.bytes - a.bytes
						: a.name.localeCompare(b.name)
			)
	);
	const onOff = (on: boolean) => (on ? 'on' : 'off');
</script>

<svelte:head>
	<title>Menu · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Menu</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		A short list of actions or options behind a button. From 600px it opens under its trigger; below 600px it
		opens as the bottom sheet that dialogs use, titled with the menu’s label, with a close button and a swipe
		down to close. Items read as written, never in caps, and a destructive action takes the status red.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<code>label</code> is required: the menu’s accessible name and, on a phone, the sheet’s title. Give it
				the trigger’s accessible name: the button’s text, or an icon button’s <code>aria-label</code>. The label is
				a fixed string the app defines, shown in caps as the sheet title on phones, so it never carries user data;
				name the row’s item through the trigger’s <code>aria-describedby</code>.
			</li>
			<li>
				<code>trigger</code> is a snippet that spreads <code>props</code> onto a button; <code>bind:open</code>
				also opens and closes the menu from code. Extra attributes go to the menu element, with Bits UI’s
				placement props <code>side</code> (default <code>bottom</code>), <code>align</code> (default
				<code>start</code>) and <code>sideOffset</code>, which apply from 600px only.
			</li>
			<li>
				<code>MenuItem</code> runs <code>onSelect</code> and closes the menu; <code>variant="danger"</code> marks
				an action that deletes or removes something. <code>MenuGroup</code> takes a <code>label</code> for a caps
				heading, and <code>MenuSeparator</code> divides groups.
			</li>
			<li>
				<code>MenuCheckboxItem</code> binds <code>checked</code>; <code>MenuRadioGroup</code> binds
				<code>value</code>, takes a <code>label</code> like a group and holds <code>MenuRadioItem</code>s. Give
				them <code>closeOnSelect={'{false}'}</code> so the menu stays open and the change shows.
			</li>
			<li>
				Keys: the arrow keys move the highlight and wrap around, <kbd>Home</kbd> and <kbd>End</kbd> jump to the
				ends, a letter jumps to the next item that starts with it, <kbd>Enter</kbd> or <kbd>Space</kbd> runs the
				item. <kbd>Escape</kbd> closes the menu and returns focus to the trigger; <kbd>Tab</kbd> closes it and
				moves on. A highlight the keys moved draws the focus contour, a pointer’s only the tint.
			</li>
			<li>
				There are no submenus. A long or nested set of choices belongs in a
				<a href="/components/select">select</a> or a <a href="/components/dialog">dialog</a>.
			</li>
		</ul>
	</section>

	<section aria-labelledby="actions">
		<h2 id="actions" class="hp-section-title">Actions</h2>
		<p class="lede">
			A few actions on one file, the destructive one last, after a separator. Choosing an action closes the menu.
		</p>
		<div class="row">
			<Menu label="Actions">
				{#snippet trigger({ props })}
					<Button {...props}>Actions</Button>
				{/snippet}
				<MenuItem onSelect={() => (lastAction = 'rename')}>Rename</MenuItem>
				<MenuItem onSelect={() => (lastAction = 'duplicate')}>Duplicate</MenuItem>
				<MenuItem onSelect={() => (lastAction = 'move to folder')}>Move to folder</MenuItem>
				<MenuSeparator />
				<MenuItem variant="danger" onSelect={() => (lastAction = 'delete')}>Delete</MenuItem>
			</Menu>
			<p id="menu-last-action" class="hp-caption readout" aria-live="polite">
				{#if lastAction}last action: <code>{lastAction}</code>{:else}No action yet.{/if}
			</p>
		</div>
	</section>

	<section aria-labelledby="icon">
		<h2 id="icon" class="hp-section-title">Icon-only trigger</h2>
		<p class="lede">
			At the end of a row, a square button opens the row’s actions. Its <code>aria-label</code> and the menu’s
			<code>label</code> are the same fixed text, and its <code>aria-describedby</code> points at the file name,
			so a screen reader hears which file. <code>align="end"</code> lines the menu up with the button’s end, so
			it opens towards the row.
		</p>
		<div class="file-row">
			<div class="file">
				<span id="menu-file-name" class="hp-mono file-name">budget-2027.xlsx</span>
				<span class="hp-caption muted">2.4 MB · modified <span class="hp-mono">2026-11-08</span></span>
			</div>
			<Menu label={fileLabel} align="end">
				{#snippet trigger({ props })}
					<Button {...props} variant="tertiary" icon aria-label={fileLabel} aria-describedby="menu-file-name">
						<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
							<path d="M2 7h2v2H2zM7 7h2v2H7zM12 7h2v2h-2z" />
						</svg>
					</Button>
				{/snippet}
				<MenuItem onSelect={() => (fileAction = 'open')}>Open</MenuItem>
				<MenuItem onSelect={() => (fileAction = 'download')}>Download</MenuItem>
				<MenuItem onSelect={() => (fileAction = 'copy link')}>Copy link</MenuItem>
				<MenuSeparator />
				<MenuItem variant="danger" onSelect={() => (fileAction = 'remove from project')}>Remove from project</MenuItem>
			</Menu>
		</div>
		<p id="menu-file-action" class="hp-caption readout" aria-live="polite">
			{#if fileAction}last action: <code>{fileAction}</code>{:else}No action yet.{/if}
		</p>
	</section>

	<section aria-labelledby="groups">
		<h2 id="groups" class="hp-section-title">Groups and a disabled item</h2>
		<p class="lede">
			Caps headings name the groups, and a separator divides them. A disabled item stays in place in the muted
			ink, so the menu keeps its shape; the arrow keys skip it and a pointer does not highlight it.
		</p>
		<div class="row">
			<Menu label="Document">
				{#snippet trigger({ props })}
					<Button {...props}>Document</Button>
				{/snippet}
				<MenuGroup label="Edit">
					<MenuItem onSelect={() => (documentAction = 'cut')}>Cut</MenuItem>
					<MenuItem onSelect={() => (documentAction = 'copy')}>Copy</MenuItem>
					<MenuItem disabled onSelect={() => (documentAction = 'paste')}>Paste</MenuItem>
				</MenuGroup>
				<MenuSeparator />
				<MenuGroup label="Share">
					<MenuItem onSelect={() => (documentAction = 'copy link')}>Copy link</MenuItem>
					<MenuItem onSelect={() => (documentAction = 'invite people')}>Invite people</MenuItem>
				</MenuGroup>
			</Menu>
			<p id="menu-document-action" class="hp-caption readout" aria-live="polite">
				{#if documentAction}last action: <code>{documentAction}</code>{:else}No action yet.{/if}
			</p>
		</div>
	</section>

	<section aria-labelledby="options">
		<h2 id="options" class="hp-section-title">Checkbox and radio items</h2>
		<p class="lede">
			Options that change the view, each with a black box beside it: checked boxes take a titanium edge and
			check, the chosen sort a titanium square. A disabled option keeps its box, with the quieter edge and a
			muted mark. These items keep the menu open, so the list below changes while the menu shows.
		</p>
		<div class="row">
			<Menu label="View">
				{#snippet trigger({ props })}
					<Button {...props}>View</Button>
				{/snippet}
				<MenuCheckboxItem bind:checked={showHidden} closeOnSelect={false}>Show hidden files</MenuCheckboxItem>
				<MenuCheckboxItem bind:checked={showSizes} closeOnSelect={false}>Show file sizes</MenuCheckboxItem>
				<MenuCheckboxItem checked disabled closeOnSelect={false}>Show thumbnails</MenuCheckboxItem>
				<MenuSeparator />
				<MenuRadioGroup label="Sort by" bind:value={sortBy}>
					<MenuRadioItem value="name" closeOnSelect={false}>Name</MenuRadioItem>
					<MenuRadioItem value="modified" closeOnSelect={false}>Date modified</MenuRadioItem>
					<MenuRadioItem value="size" closeOnSelect={false}>Size</MenuRadioItem>
					<MenuRadioItem value="type" disabled closeOnSelect={false}>Type</MenuRadioItem>
				</MenuRadioGroup>
			</Menu>
			<p id="menu-view-state" class="hp-caption readout" aria-live="polite">
				hidden files: <code>{onOff(showHidden)}</code> · file sizes: <code>{onOff(showSizes)}</code> · sort by:
				<code>{sortBy}</code>
			</p>
		</div>
		<ul class="files" aria-label="Project files">
			{#each shownFiles as file (file.name)}
				<li>
					<span class="hp-mono file-name">{file.name}</span>
					<span class="hp-mono muted">{file.modified}</span>
					{#if showSizes}
						<span class="hp-mono muted size">{file.size}</span>
					{/if}
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
	.muted {
		color: var(--muted);
	}

	/* One row of a file list: the name and its details, the actions button at
	   the row's end. */
	.file-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		max-width: 40rem;
		padding-block: var(--space-2);
		border-bottom: 1px solid var(--border);
	}
	.file {
		display: grid;
		gap: var(--space-1);
		min-width: 0;
	}
	.file-name {
		overflow-wrap: anywhere;
	}
	.file-row + .readout {
		margin-top: var(--space-3);
	}

	/* The files the View menu acts on. */
	.files {
		display: grid;
		gap: var(--space-2);
		max-width: 40rem;
		margin: var(--space-5) 0 0;
		padding: 0;
		list-style: none;
	}
	.files li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		column-gap: var(--space-4);
	}
	.size {
		min-width: 7ch;
		text-align: end;
	}
</style>
