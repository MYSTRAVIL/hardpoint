<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import KeyValueList from '#lib/components/KeyValueList.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import Section from '#lib/components/Section.svelte';
	import Status from '#lib/components/Status.svelte';
	import Table, { type Column, type TableMark } from '#lib/components/Table.svelte';

	type Sync = 'Synced' | 'Queued' | 'Failed' | 'Local only';
	type FileRow = { id: string; name: string; owner: string; modified: string; size: string; sync: Sync };

	const syncMark: Partial<Record<Sync, TableMark>> = { Synced: 'ok', Queued: 'warn', Failed: 'danger' };

	const files: FileRow[] = [
		{ id: 'F-01', name: 'quarterly-report.pdf', owner: 'Lena Fischer', modified: '2026-11-08', size: '2.3 MB', sync: 'Synced' },
		{ id: 'F-02', name: 'meeting-notes.md', owner: 'Omar Haddad', modified: '2026-11-08', size: '18 KB', sync: 'Queued' },
		{ id: 'F-03', name: 'budget-2027.xlsx', owner: 'Priya Nair', modified: '2026-11-07', size: '642 KB', sync: 'Synced' },
		{ id: 'F-04', name: 'team-photo.jpg', owner: 'Sam Okafor', modified: '2026-11-06', size: '5.4 MB', sync: 'Failed' },
		{ id: 'F-05', name: 'onboarding-guide.docx', owner: 'Ingrid Berg', modified: '2026-11-05', size: '1.2 MB', sync: 'Local only' }
	];

	const columns: Column<FileRow>[] = [
		{ key: 'name', label: 'Name' },
		{ key: 'owner', label: 'Owner', width: 'calc(14ch + var(--space-6))', hideBelow: 'expanded' },
		{ key: 'sync', label: 'Sync', width: 'calc(10ch + var(--space-10))', mark: (f) => syncMark[f.sync] },
		{ key: 'size', label: 'Size', width: 'calc(8ch + var(--bleed))', numeric: true }
	];

	let page = $state(1);

	const details = [
		{ key: 'Plan', value: 'Team' },
		{ key: 'Seats', value: '14 of 20' },
		{ key: 'Renews', value: '2026-12-01' }
	];
</script>

<svelte:head>
	<title>Section · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Section</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		A block of a page: a head row with a title, supporting text and actions, a body, and an optional foot.
		It has no frame, no fill and no rule. Sections are told apart by space alone.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<code>title</code> is required, as written, never caps. It is a heading in the section-title role:
				<code>h2</code> by default. <code>titleAs</code> sets <code>h2</code> to <code>h6</code>; pick the
				level the page’s outline needs, as on Disclosure.
			</li>
			<li>
				<code>meta</code> is a string, or a snippet when it holds markup, in <code>--muted</code> after the
				title: a count, a date, a range. <code>actions</code> is a snippet of Buttons or links at the end of
				the head row.
			</li>
			<li>
				The children are the body. It has no padding and clips nothing, so text keeps the page edge and a
				Table inside runs its band into the gutter, as it does anywhere. <code>foot</code> is a snippet
				under the body in <code>--muted</code>: a count, a page control, a note.
			</li>
			<li>
				There is no card. A Section draws no frame, fill or rule, and has no <code>flush</code> mode:
				its body is always flush, and padding is the content’s job. A key figure in a grid is a Stat, and a
				coloured edge on an item is a Status mark.
			</li>
			<li>
				Sections stack 48px apart through <code>.hp-section + .hp-section</code>. That is four times the
				12px between a head and its body, so the page groups by space (the gap between groups is at least
				twice the gap within one). An app that wants other spacing sets its own margin.
			</li>
			<li>
				The root is a <code>section</code> named by its title. <code>ref</code> binds it; <code>id</code>,
				<code>class</code> and other attributes go to it.
			</li>
		</ul>
	</section>

	<section aria-labelledby="full">
		<h2 id="full" class="hp-section-title">Head, table body and foot</h2>
		<p class="lede">
			A string <code>meta</code>, one action and a Table in the body. The band starts under the head and
			bleeds into the gutter; the foot sits under the last row.
		</p>
		<Section title="Recent files" meta="5 of 38">
			{#snippet actions()}
				<Button variant="tertiary">Filter</Button>
				<Button>Upload</Button>
			{/snippet}
			<Table label="Recent files" rows={files} {columns} key="id" />
			{#snippet foot()}
				<span>Synced files stay on this device for 30 days.</span>
				<Pagination bind:page count={38} perPage={5} />
			{/snippet}
		</Section>
	</section>

	<section aria-labelledby="levels">
		<h2 id="levels" class="hp-section-title">Title level and meta as markup</h2>
		<p class="lede">
			Nested sections take the next level down (<code>titleAs="h3"</code>). A <code>meta</code> snippet may
			hold a Status.
		</p>
		<Section title="Plan" titleAs="h2">
			{#snippet meta()}
				<Status tone="ok">Active</Status>
			{/snippet}
			<KeyValueList items={details} />
			<div class="nested">
				<Section title="Billing contact" titleAs="h3" meta="Changes apply on the next invoice">
					<p class="text">Lena Fischer, lena@example.com</p>
				</Section>
			</div>
		</Section>
	</section>

	<section aria-labelledby="rhythm">
		<h2 id="rhythm" class="hp-section-title">Stacked sections</h2>
		<p class="lede">
			Three sections in a row. Nothing separates them but 48px of space, and each head sits 12px above its
			body.
		</p>
		<div class="stackbox">
			<Section title="Overview" meta="Updated today">
				<p class="text">14 members share 38 files. Four files wait to sync.</p>
			</Section>
			<Section title="Members" meta="14">
				{#snippet actions()}
					<Button variant="tertiary">Invite</Button>
				{/snippet}
				<p class="text">Lena Fischer, Omar Haddad, Priya Nair and 11 others.</p>
			</Section>
			<Section title="Danger zone">
				<p class="text">Deleting the workspace removes every file in it.</p>
				{#snippet foot()}
					<span>This cannot be undone.</span>
				{/snippet}
			</Section>
		</div>
	</section>

	<section aria-labelledby="narrow">
		<h2 id="narrow" class="hp-section-title">Narrow columns</h2>
		<p class="lede">
			In 20rem the row wraps: the title first, then the meta, then the actions. The actions end the row
			beside a short meta and start a line of their own under a long one, as here. A long title wraps
			inside the row and never truncates.
		</p>
		<div class="narrow">
			<Section title="Quarterly planning notes for the whole design team" meta="Last edited by Lena Fischer">
				{#snippet actions()}
					<Button variant="tertiary">Share</Button>
					<Button>Edit</Button>
				{/snippet}
				<p class="text">The body keeps the page edge at every width.</p>
			</Section>
		</div>
	</section>

	<section aria-labelledby="a11y">
		<h2 id="a11y" class="hp-section-title">Accessibility</h2>
		<ul class="notes">
			<li>
				The section is a region labelled by its title, so a screen reader lists it among the landmarks.
				A page with many sections gets a long landmark list. Pass <code>role="none"</code> or
				<code>role="presentation"</code> to a section that does not need one. The section then leaves out
				<code>aria-labelledby</code> as well, because a browser keeps a named section a region whatever
				role it has; the heading still marks it.
			</li>
			<li>
				The title is a real heading. Keep the levels in order: a Section inside a Section takes the next
				level down.
			</li>
			<li>
				Actions are ordinary Buttons, 44px high on touch screens and 8px apart. Meta and foot text are
				16px on touch screens and 14px with a mouse, in <code>--muted</code> at 4.5:1 or more in both
				themes.
			</li>
			<li>A Section has no motion.</li>
		</ul>
		<div class="nested">
			<Section title="Grouping only" meta="role=none" role="none">
				<p class="text">This section is not in the landmark list. Its heading is still a heading.</p>
			</Section>
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

	main > section {
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

	.text {
		margin: 0;
	}

	.nested {
		margin-top: var(--space-8);
	}

	.stackbox {
		display: block;
	}

	.narrow {
		max-width: 20rem;
	}
</style>
