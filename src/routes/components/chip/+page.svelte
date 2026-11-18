<script lang="ts">
	import { tick } from 'svelte';
	import LabelsTable from '../../LabelsTable.svelte';
	import Button from '#lib/components/Button.svelte';
	import Chip, { type ChipCategory } from '#lib/components/Chip.svelte';

	// Documents and the labels people gave them: values, so they stay as written.
	const documents = [
		{ title: 'Release checklist', labels: ['Process', 'Web app', 'draft'] },
		{ title: 'Colour tokens for the light theme', labels: ['Design', 'Accessibility'] },
		{ title: 'Interview notes, round 2', labels: ['Research'] }
	];

	// Every label with how many documents carry it. Each one links to the
	// documents it names.
	const counts = [
		{ label: 'Design', count: 42 },
		{ label: 'Research', count: 17 },
		{ label: 'Accessibility', count: 9 },
		{ label: 'Process', count: 128 },
		{ label: 'Web app', count: 3 }
	];

	// Labels a reviewer has not confirmed yet.
	const proposed = [
		{ label: 'Onboarding', tentative: false },
		{ label: 'Mobile', tentative: true },
		{ label: 'Billing', tentative: true }
	];

	// Five areas, each with its colour; the legend names them.
	const areas: { name: string; category: ChipCategory }[] = [
		{ name: 'Design', category: 1 },
		{ name: 'Engineering', category: 2 },
		{ name: 'Research', category: 3 },
		{ name: 'Operations', category: 4 },
		{ name: 'Marketing', category: 5 }
	];
	const areaOf = (name: string) => areas.find((a) => a.name === name)!.category;
	const areaLabels = [
		{ label: 'Type scale', area: 'Design' },
		{ label: 'Build cache', area: 'Engineering' },
		{ label: 'Diary study', area: 'Research', tentative: true },
		{ label: 'On-call rota', area: 'Operations' },
		{ label: 'Launch post', area: 'Marketing' },
		{ label: 'Icon set', area: 'Design' }
	];

	// Active filters: each chip removes its filter. The app removes the chip;
	// Chip moves focus to the next one, or the previous one. When the last
	// one goes, the page moves focus to the line that says so.
	const allFilters = ['Owner: Mara Ilves', 'Status: Waiting on review', 'Label: Web app', 'Updated: this week'];
	let filters = $state([...allFilters]);
	let empty: HTMLElement | null = $state(null);
	let clear: HTMLButtonElement | HTMLAnchorElement | null = $state(null);
	async function setFilters(next: string[]) {
		filters = next;
		await tick();
		(next.length ? clear : empty)?.focus();
	}
	function removeFilter(filter: string) {
		const rest = filters.filter((f) => f !== filter);
		if (rest.length) filters = rest;
		else setFilters(rest);
	}

	// Linked documents that can be unlinked: link and remove side by side.
	const allLinked = ['Release checklist', 'Brand guidelines 2026', 'Q4 roadmap'];
	let linked = $state([...allLinked]);

	const allLong = [
		'https://docs.example.com/guides/accessibility/forms/error-messages-and-recovery',
		'Quarterly planning for the web, mobile and desktop releases'
	];
	let longValues = $state([...allLong]);

	// Saved views: a press applies one, a remove button deletes it. Names
	// are the user's, so they stay as written.
	const allViews = ['Waiting on me', 'design reviews (old)', 'This week, web only'];
	let views = $state([...allViews]);
	let applied = $state('');
</script>

<svelte:head>
	<title>Chip · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Chip</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		A value in an outlined block. <code>Chip</code> shows data as written: a label someone gave an item,
		a source, an active filter. It has the 1px boundary of an outlined control, no fill, and Geist as
		written, never caps. A <a href="/components/tag">Tag</a> is the other block: a fixed label the app
		defines, solid and in caps.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Value.</strong> <code>label</code> is required and shows as written. Chips are data, so a
				table row or a filter bar can hold many: they never count as the view's one group of solid
				blocks.
			</li>
			<li>
				<strong>Link or action.</strong> <code>href</code> makes the chip a link, with the hover, press and
				focus of an outlined button. Without <code>href</code>, <code>onclick</code> makes it a button with the
				same states, for an action such as applying a saved view. Other attributes and handlers go to the
				link, the button, or the text of a display chip; <code>class</code> goes to the root.
			</li>
			<li>
				<strong>Count.</strong> <code>count</code> adds a number after the value in the muted ink, with
				tabular figures. A screen reader hears it after the value.
			</li>
			<li>
				<strong>Tentative.</strong> <code>tentative</code> dashes the edge and adds hidden words after the
				value (<code>tentativeLabel</code>, default <code>tentative</code>), so the line is never the only
				cue.
			</li>
			<li>
				<strong>Category.</strong> <code>category</code> (1 to 5) draws a 3px edge on the start side in
				<code>--category-1</code> to <code>--category-5</code>. Data only, never a status: the colour
				repeats a category the page names in a legend or a label.
			</li>
			<li>
				<strong>Remove.</strong> <code>onremove</code> adds a remove button after the text, named
				<code>Remove</code> and the value unless <code>removeLabel</code> says otherwise. It is never inside
				a link. The app removes the chip. When the removed chip held focus, focus moves to the next chip in
				the same list, or the previous one; after the last chip, the page decides.
			</li>
			<li>
				<strong>Rows.</strong> Put chips in a <code>ul</code> with <code>flex-wrap</code> and an 8px gap.
				Chips move to the next line whole. A link or a remove button keeps its 44px target on touch inside
				the chip's own margin, so the row needs no extra space.
			</li>
			<li>
				<strong>Width.</strong> A chip is never wider than its container; a longer value wraps inside it,
				never cut. To cap chips lower, cap their container, such as each list item.
			</li>
		</ul>
	</section>

	<section aria-labelledby="values">
		<h2 id="values" class="hp-section-title">Values in rows</h2>
		<p class="lede">
			Display chips under each item: the labels its owner chose, as they wrote them, lowercase included.
			In a mono list they keep Geist.
		</p>
		<ul class="documents">
			{#each documents as doc (doc.title)}
				<li>
					<p class="doc-title">{doc.title}</p>
					<ul class="row" aria-label="Labels">
						{#each doc.labels as label (label)}
							<li><Chip {label} /></li>
						{/each}
					</ul>
				</li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="links">
		<h2 id="links" class="hp-section-title">Links with counts</h2>
		<p class="lede">
			Each label links to its documents and shows how many there are. Hover, press and the focus contour
			follow the outlined button. On touch the target is 44px high.
		</p>
		<ul class="row" aria-label="All labels">
			{#each counts as item (item.label)}
				<li><Chip label={item.label} count={item.count} href="#links" /></li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="tentative">
		<h2 id="tentative" class="hp-section-title">Tentative</h2>
		<p class="lede">
			Labels a reviewer has not confirmed yet. The dashed edge shows it; a screen reader hears “Mobile,
			tentative”. A tentative chip can be a link, have a count or a category, and be removed.
		</p>
		<ul class="row" aria-label="Proposed labels">
			{#each proposed as item (item.label)}
				<li><Chip label={item.label} tentative={item.tentative} /></li>
			{/each}
			<li><Chip label="Pricing" tentative count={4} href="#tentative" /></li>
		</ul>
	</section>

	<section aria-labelledby="categories">
		<h2 id="categories" class="hp-section-title">Categories</h2>
		<p class="lede">
			The edge repeats a colour the legend names. The legend comes first and every colour in it has a
			word, so the chips never rely on the hue.
		</p>
		<ul class="legend hp-caption" aria-label="Areas">
			{#each areas as area (area.name)}
				<li data-category={area.category}>{area.name}</li>
			{/each}
		</ul>
		<ul class="row" aria-label="Work items">
			{#each areaLabels as item (item.label)}
				<li>
					<Chip label={item.label} category={areaOf(item.area)} tentative={item.tentative} title={item.area} />
				</li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="remove">
		<h2 id="remove" class="hp-section-title">Removable: active filters</h2>
		<p class="lede">
			Each chip removes its filter. Reach a remove button with <kbd>Tab</kbd> and press <kbd>Enter</kbd>,
			<kbd>Space</kbd>, <kbd>Backspace</kbd> or <kbd>Delete</kbd>: focus moves to the next chip, or the
			previous one after the last. A mouse or a touch press leaves focus where it was. When no filter is
			left, the page moves focus to the line that says so; after Clear all too.
		</p>
		<div class="filter-bar">
			{#if filters.length}
				<ul class="row" aria-label="Active filters">
					{#each filters as filter (filter)}
						<li><Chip label={filter} onremove={() => removeFilter(filter)} /></li>
					{/each}
				</ul>
				<Button variant="tertiary" bind:ref={clear} onclick={() => setFilters([])}>Clear all</Button>
			{:else}
				<p class="empty" bind:this={empty} tabindex="-1">No filters. Every document shows.</p>
				<Button onclick={() => setFilters([...allFilters])}>Restore filters</Button>
			{/if}
		</div>
	</section>

	<section aria-labelledby="unlink">
		<h2 id="unlink" class="hp-section-title">Link and remove</h2>
		<p class="lede">
			A chip that links and can be removed: the link and the remove button are siblings, with a line
			between the two targets. With a mouse the remove button is a 24px square; on touch it is 44px wide.
		</p>
		<ul class="row" aria-label="Linked documents">
			{#each linked as doc (doc)}
				<li>
					<Chip label={doc} href="#unlink" removeLabel={`Unlink ${doc}`} onremove={() => (linked = linked.filter((d) => d !== doc))} />
				</li>
			{/each}
		</ul>
		<div class="again">
			<Button variant="tertiary" onclick={() => (linked = [...allLinked])}>Link all again</Button>
		</div>
	</section>

	<section aria-labelledby="action">
		<h2 id="action" class="hp-section-title">Action and remove: saved views</h2>
		<p class="lede">
			Names people gave their saved views, as written. A press applies a view through
			<code>onclick</code>; the remove button deletes it. The button and the remove button are siblings,
			with a line between the two targets, as on a link.
		</p>
		<ul class="row" aria-label="Saved views">
			{#each views as view (view)}
				<li>
					<Chip
						label={view}
						onclick={() => (applied = view)}
						removeLabel={`Delete view ${view}`}
						onremove={() => (views = views.filter((v) => v !== view))}
					/>
				</li>
			{/each}
		</ul>
		<p class="applied hp-caption"><span class="hp-mono">applied = {applied || 'none'}</span></p>
		<div class="again">
			<Button variant="tertiary" onclick={() => (views = [...allViews])}>Restore views</Button>
		</div>
	</section>

	<section aria-labelledby="long">
		<h2 id="long" class="hp-section-title">Long values</h2>
		<p class="lede">
			A value longer than its line wraps inside the chip; nothing is cut. Chips in the row still move to
			the next line whole.
		</p>
		<ul class="row" aria-label="Sources">
			{#each longValues as value (value)}
				<li><Chip label={value} onremove={() => (longValues = longValues.filter((v) => v !== value))} /></li>
			{/each}
			<li><Chip label="Short" /></li>
		</ul>
		<div class="again">
			<Button variant="tertiary" onclick={() => (longValues = [...allLong])}>Restore sources</Button>
		</div>
		<p class="lede capped-lede">
			With <code>max-width: 16rem</code> on each list item, long values wrap at 16rem.
		</p>
		<ul class="row capped" aria-label="Sources, capped">
			{#each allLong as value (value)}
				<li><Chip label={value} /></li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="labels">
		<h2 id="labels" class="hp-section-title">Labels</h2>
		<LabelsTable
			rows={[
				{ prop: 'tentativeLabel', value: 'tentative', shows: 'Hidden words a screen reader hears after a tentative value.' },
				{ prop: 'removeLabel', value: 'Remove <label>', shows: 'The accessible name of the remove button.' }
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
	.intro a {
		color: var(--text);
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

	/* A row of chips: whole chips wrap, 8px apart. */
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.row > li {
		display: flex;
		max-width: 100%;
	}

	/* Items in Geist Mono, each with its row of chips. */
	.documents {
		display: grid;
		gap: var(--space-5);
		max-width: 640px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.doc-title {
		margin-bottom: var(--space-2);
		font-family: var(--mono);
	}

	/* The legend: a square in each category colour, then its name. */
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-5);
		margin: 0 0 var(--space-4);
		padding: 0;
		list-style: none;
		color: var(--muted);
	}
	.legend li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	.legend li::before {
		content: '';
		flex: none;
		width: 12px;
		height: 12px;
	}
	.legend [data-category='1']::before {
		background: var(--category-1);
	}
	.legend [data-category='2']::before {
		background: var(--category-2);
	}
	.legend [data-category='3']::before {
		background: var(--category-3);
	}
	.legend [data-category='4']::before {
		background: var(--category-4);
	}
	.legend [data-category='5']::before {
		background: var(--category-5);
	}

	.filter-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
	}
	.empty {
		margin: 0;
		color: var(--muted);
	}

	.again {
		margin-top: var(--space-3);
	}
	.applied {
		margin: var(--space-3) 0 0;
		color: var(--muted);
	}

	.capped-lede {
		margin-top: var(--space-6);
	}
	.capped > li {
		max-width: min(100%, 16rem);
	}
</style>
