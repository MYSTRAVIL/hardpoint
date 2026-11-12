<script lang="ts">
	import NativeSelect from '#lib/components/NativeSelect.svelte';
	import Pagination from '#lib/components/Pagination.svelte';

	// The caption names where the page sits, so it stays true as the steps move it.
	function position(page: number, pages: number) {
		if (pages === 1) return 'One page: both steps disabled';
		if (page === 1) return 'First page: previous disabled';
		if (page === pages) return 'Last page: next disabled';
		return 'Middle page: both steps work';
	}

	// 95 files, 10 per page: 10 pages.
	let first = $state(1);
	let middle = $state(5);
	let last = $state(10);

	// 31,240 events, 25 per page: 1,250 pages.
	let many = $state(1184);

	// A filter that leaves fewer items.
	const ownerOptions = [
		{ value: 'everyone', label: 'Everyone' },
		{ value: 'lena', label: 'Lena Fischer' }
	];
	let owner = $state('everyone');
	let filtered = $state(8);
	const fileCount = $derived(owner === 'everyone' ? 95 : 14);

	let activity = $state(1);
</script>

<svelte:head>
	<title>Pagination · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Pagination</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		Moves through a long list one page at a time. <code>Pagination</code> shows a caps label, the page
		figure in Geist Mono and two square steps. It usually sits in a table’s footer row, beside the
		count: see <a href="/components/table">Table</a>.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Pages.</strong> <code>count</code> is the number of items and <code>perPage</code> the
				items on one page. With the default <code>perPage</code> of 1, <code>count</code> is the number of
				pages. <code>bind:page</code> holds the current page, from 1.
			</li>
			<li>
				<strong>Steps.</strong> The two steps are the list view’s one group of solid blocks: 24px on a
				mouse and 44px on touch, 8px apart. A step at an end disables itself and drops to the band grey.
				Arrow keys move focus between the steps.
			</li>
			<li>
				<strong>The figure.</strong> Geist Mono with tabular figures. It changes in place, without
				animation, and a screen reader reads the new page.
			</li>
			<li>
				<strong>Fewer items.</strong> When <code>count</code> shrinks so the current page is past the last
				one, for example after a filter, the page moves back to the last page.
			</li>
			<li>
				<strong>Labels.</strong> <code>label</code> names the navigation landmark (Pages).
				<code>pageLabel</code> is the caps label before the figure (Page). <code>previousLabel</code> and
				<code>nextLabel</code> name the steps, which have no visible text. Give each pagination its own
				<code>label</code> when a view has two.
			</li>
			<li>Extra attributes and <code>class</code> go to the root element, <code>.hp-pagination</code>.</li>
		</ul>
	</section>

	<section aria-labelledby="positions">
		<h2 id="positions" class="hp-section-title">First, middle and last page</h2>
		<p class="lede">
			95 files, 10 per page. On the first page the previous step is disabled; on the last page the next
			step is. The steps work, and each caption follows its page.
		</p>
		<div class="pagers">
			<div class="pager-demo">
				<span class="hp-caption state">{position(first, 10)}</span>
				<Pagination bind:page={first} count={95} perPage={10} label="File pages, example 1" />
			</div>
			<div class="pager-demo">
				<span class="hp-caption state">{position(middle, 10)}</span>
				<Pagination bind:page={middle} count={95} perPage={10} label="File pages, example 2" />
			</div>
			<div class="pager-demo">
				<span class="hp-caption state">{position(last, 10)}</span>
				<Pagination bind:page={last} count={95} perPage={10} label="File pages, example 3" />
			</div>
		</div>
	</section>

	<section aria-labelledby="one-page">
		<h2 id="one-page" class="hp-section-title">One page</h2>
		<p class="lede">
			4 tasks, 10 per page. Both steps are disabled, and the pagination stays in place so the footer
			row keeps its layout.
		</p>
		<div class="pager-demo">
			<span class="hp-caption state">{position(1, 1)}</span>
			<Pagination count={4} perPage={10} label="Task pages" />
		</div>
	</section>

	<section aria-labelledby="many">
		<h2 id="many" class="hp-section-title">Many pages</h2>
		<p class="lede">
			31,240 events, 25 per page: 1,250 pages. A four-digit figure and two 44px steps still fit a 320px
			screen.
		</p>
		<div class="pager-demo">
			<span class="hp-caption state">{position(many, 1250)}</span>
			<Pagination bind:page={many} count={31240} perPage={25} label="Event pages" />
		</div>
	</section>

	<section aria-labelledby="fewer">
		<h2 id="fewer" class="hp-section-title">Fewer items</h2>
		<p class="lede">
			This list starts on page 8 of 95 files. Choose Lena Fischer: her 14 files make two pages, so the
			page moves back to 2.
		</p>
		<div class="filter">
			<NativeSelect label="Owner" labelBeside bind:value={owner} options={ownerOptions} />
		</div>
		<div class="pager-demo">
			<span class="hp-caption state">{fileCount} files, 10 per page</span>
			<Pagination bind:page={filtered} count={fileCount} perPage={10} label="Filtered file pages" />
		</div>
	</section>

	<section aria-labelledby="labels">
		<h2 id="labels" class="hp-section-title">Labels</h2>
		<p class="lede">
			An activity feed, newest first. The visible parts stay the same; the landmark and the steps get
			names that fit the list.
		</p>
		<pre><code>{`<Pagination label="Activity pages" previousLabel="Newer activity" nextLabel="Older activity" … />`}</code></pre>
		<div class="pager-demo labelled">
			<Pagination
				bind:page={activity}
				count={240}
				perPage={20}
				label="Activity pages"
				previousLabel="Newer activity"
				nextLabel="Older activity"
			/>
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
	pre {
		margin: 0;
		overflow-x: auto;
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

	.pagers {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-8) var(--space-12);
	}
	.pager-demo {
		display: grid;
		justify-items: start;
		gap: var(--space-2);
	}
	.pager-demo.labelled {
		margin-top: var(--space-5);
	}
	.state {
		color: var(--muted);
	}

	/* A flex row, so the select takes its own width instead of the page's. */
	.filter {
		display: flex;
		margin-bottom: var(--space-6);
	}
</style>
