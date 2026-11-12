<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Progress from '#lib/components/Progress.svelte';

	// Following real work: three uploads, one after another. Each tick sends
	// an uneven chunk, and some ticks send nothing, as a slow network does.
	const files = [
		{ name: 'brief.pdf', size: 2400 },
		{ name: 'budget-2027.xlsx', size: 860 },
		{ name: 'site-photos.zip', size: 6400 }
	];
	const chunks = [310, 0, 520, 140, 0, 880, 260, 410, 0, 90];
	let sent = $state(files.map(() => 0));
	let timer: ReturnType<typeof setInterval> | undefined;
	let running = $state(false);
	let n = 0;

	const finished = $derived(sent.filter((s, i) => s >= files[i].size).length);

	function tick() {
		const i = sent.findIndex((s, k) => s < files[k].size);
		if (i === -1) {
			stop();
			return;
		}
		sent[i] = Math.min(files[i].size, sent[i] + chunks[n++ % chunks.length]);
	}
	function start() {
		if (finished === files.length) reset();
		running = true;
		timer = setInterval(tick, 200);
	}
	function stop() {
		clearInterval(timer);
		running = false;
	}
	function reset() {
		stop();
		n = 0;
		sent = files.map(() => 0);
	}
	$effect(() => stop);

	const kb = (v: number) => `${v.toLocaleString('en-GB')} KB`;

	// Rows that name their bar: the project name labels it, the count is text.
	const projects = [
		{ id: 'website', name: 'Website redesign', done: 18, total: 24 },
		{ id: 'mobile', name: 'Mobile app 2.0', done: 5, total: 31 },
		{ id: 'handbook', name: 'Staff handbook', done: 12, total: 12 }
	];
</script>

<svelte:head>
	<title>Progress · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Progress</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		How much of a known amount of work is done. <code>Progress</code> follows the brief’s visual rule
		7, discrete shapes: a bar of separate segments that light in titanium as the real figure passes
		each one’s share. It moves only when the app passes a new value, and a segment fades its colour over
		<code>--dur-segment</code> (120ms) as it lights or goes out. Work of unknown length shows a
		<a href="/components/spinner">spinner</a> instead.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Value.</strong> <code>value</code> runs from <code>min</code> (default 0) to
				<code>max</code> (default 100). Values outside the range are held at its ends.
			</li>
			<li>
				<strong>Segments.</strong> <code>segments</code> sets how many (default 20). A segment lights only
				once its whole share is done, so the bar never shows more than has happened: at 58 percent, 11
				of 20 are lit.
			</li>
			<li>
				<strong>Label.</strong> <code>label</code> is a line above the bar, as written, never in caps,
				because it often holds a file or project name. It names the progress bar. Without it, name the
				bar with <code>aria-label</code> or <code>aria-labelledby</code>.
			</li>
			<li>
				<strong>Value in words.</strong> <code>valueText</code>, such as <code>3 of 12 files</code>, ends
				the label line and is read as <code>aria-valuetext</code>. Without it both give the percentage,
				rounded down, so a screen reader hears the number on screen.
			</li>
			<li>
				<strong>Semantics.</strong> Bits UI Progress gives the root <code>role="progressbar"</code> with
				<code>aria-valuemin</code>, <code>aria-valuemax</code> and <code>aria-valuenow</code>, and
				<code>data-state</code> <code>loading</code> or <code>loaded</code>. The root also carries
				<code>data-lit</code> (segments lit) and <code>data-segments</code>; each segment has
				<code>data-lit</code> once lit. <code>id</code>, extra attributes and <code>class</code> go to the
				root.
			</li>
			<li>
				<strong>Width.</strong> The bar fills the width it is given and its segments share it. Give it a
				narrower container where a full-width bar would read as a divider.
			</li>
			<li>
				<strong>Motion.</strong> A segment fades its colour over <code>--dur-segment</code> as it lights or
				goes out; nothing moves, and nothing fades on the first render. Reduced motion keeps the fade,
				because it changes only colour.
			</li>
		</ul>
	</section>

	<section aria-labelledby="live">
		<h2 id="live" class="hp-section-title">Following real work</h2>
		<p class="lede">
			Three uploads, one after another, over a slow network: chunks arrive unevenly and some moments
			send nothing, so the bars pause. Each file shows its percentage; the overall bar counts files in
			words.
		</p>
		<div class="row">
			<Button variant={running ? 'secondary' : 'primary'} onclick={running ? stop : start}
				>{running ? 'Pause' : finished === files.length ? 'Upload again' : 'Upload files'}</Button
			>
			<Button variant="tertiary" onclick={reset}>Reset</Button>
		</div>
		<div class="stack demo">
			<Progress
				label="Uploading to Website redesign"
				value={finished}
				max={files.length}
				segments={files.length * 4}
				valueText="{finished} of {files.length} files"
			/>
			{#each files as file, i (file.name)}
				<div class="file">
					<Progress label={file.name} value={sent[i]} max={file.size} />
					<p class="hp-caption size">{kb(sent[i])} of {kb(file.size)}</p>
				</div>
			{/each}
		</div>
	</section>

	<section aria-labelledby="states">
		<h2 id="states" class="hp-section-title">States</h2>
		<p class="lede">
			Not started, partway and done. Done is <code>data-state="loaded"</code>: every segment lit, still
			titanium. The bar shows how much is done; the app says in words whether the work succeeded.
		</p>
		<div class="stack">
			<Progress label="Syncing tasks" value={0} />
			<Progress label="Syncing tasks" value={58} />
			<Progress label="Syncing tasks" value={100} />
		</div>
	</section>

	<section aria-labelledby="words">
		<h2 id="words" class="hp-section-title">Value in words</h2>
		<p class="lede">
			A count the reader knows beats a percentage. Here <code>max</code> is the number of files or steps,
			and <code>valueText</code> says it.
		</p>
		<div class="stack">
			<Progress label="Exporting project files" value={3} max={12} valueText="3 of 12 files" />
			<Progress
				label="Checking links in Staff handbook"
				value={2}
				max={5}
				segments={5}
				valueText="Step 2 of 5"
			/>
		</div>
	</section>

	<section aria-labelledby="range">
		<h2 id="range" class="hp-section-title">Any range</h2>
		<p class="lede">
			<code>min</code> and <code>max</code> take the app’s own figures, so a fraction needs no
			conversion: <code>value={'{0.58}'}</code> with <code>max={'{1}'}</code> is 58 percent.
		</p>
		<div class="stack">
			<Progress label="Indexing files" value={0.58} max={1} />
		</div>
	</section>

	<section aria-labelledby="segments">
		<h2 id="segments" class="hp-section-title">Segments</h2>
		<p class="lede">
			10, 20 (the default) and 40 segments at 64 percent: 6, 12 and 25 lit. More segments follow the
			value more closely and need more width.
		</p>
		<div class="stack">
			<Progress label="10 segments" value={64} segments={10} />
			<Progress label="20 segments" value={64} />
			<Progress label="40 segments" value={64} segments={40} />
		</div>
	</section>

	<section aria-labelledby="unlabelled">
		<h2 id="unlabelled" class="hp-section-title">Named by its row</h2>
		<p class="lede">
			No label line: each bar takes its name from the project beside it through
			<code>aria-labelledby</code>, and the count is plain text, also read as
			<code>aria-valuetext</code>.
		</p>
		<ul class="projects">
			{#each projects as p (p.id)}
				<li>
					<span id="project-{p.id}">{p.name}</span>
					<Progress
						value={p.done}
						max={p.total}
						valueText="{p.done} of {p.total} tasks done"
						aria-labelledby="project-{p.id}"
					/>
					<span class="hp-num count">{p.done} of {p.total}</span>
				</li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="full">
		<h2 id="full" class="hp-section-title">Full width</h2>
		<p class="lede">
			The same 20 segments across the whole content width. This bar has an <code>id</code>, which lands
			on the progressbar, so other elements can point at it.
		</p>
		<Progress id="search-index-progress" label="Rebuilding search index" value={35} />
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

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-6);
	}

	/* A column the width of an upload list or a dialog. */
	.stack {
		display: grid;
		gap: var(--space-6);
		max-width: 32rem;
	}
	.demo {
		margin-top: var(--space-6);
	}
	.file {
		display: grid;
		gap: var(--space-1);
	}
	.size {
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}

	/* Name, bar and count on one line from 600px; the bar under the name on
	   phones. */
	.projects {
		display: grid;
		gap: var(--space-4);
		max-width: 40rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.projects li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--space-2) var(--space-4);
	}
	.projects li :global(.hp-progress) {
		grid-column: 1 / -1;
		grid-row: 2;
	}
	.count {
		color: var(--muted);
	}
	@media (min-width: 600px) {
		.projects li {
			grid-template-columns: 12rem minmax(0, 1fr) 4rem;
		}
		.projects li :global(.hp-progress) {
			grid-column: 2;
			grid-row: 1;
		}
		.count {
			text-align: right;
		}
	}
</style>
