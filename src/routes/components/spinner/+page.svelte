<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Spinner from '#lib/components/Spinner.svelte';

	// Waiting for work of unknown length. A load that ends before the delay
	// never shows the spinner.
	let loading = $state(false);
	let result = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;

	function load(ms: number) {
		clearTimeout(timer);
		loading = true;
		result = '';
		timer = setTimeout(() => {
			loading = false;
			result = `12 projects loaded in ${ms.toLocaleString('en-GB')} ms`;
		}, ms);
	}
	$effect(() => () => clearTimeout(timer));

	// The four states, drawn as the spinner draws them.
	const states = [
		['|', 'bar'],
		['/', 'slash'],
		['-', 'dash'],
		['\\', 'backslash']
	];
</script>

<svelte:head>
	<title>Spinner · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Spinner</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		Waiting for work of unknown length. <code>Spinner</code> follows the brief’s visual rule 7,
		discrete shapes: a line in Geist Pixel Square that steps through four states, 167 ms each, beside a
		text label. It appears only after 300 ms, so fast work never flashes it. Work whose size is known
		shows <a href="/components/progress">progress</a> instead.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Label.</strong> <code>label</code> says what the app is waiting for, such as
				<code>Loading projects</code>. It is shown beside the glyph in the muted ink.
			</li>
			<li>
				<strong>Delay.</strong> Mount the spinner when the wait starts and remove it when the work ends.
				Nothing shows for the first 300 ms (<code>--spinner-delay</code>); the row keeps its 32px
				height meanwhile, so nothing moves when it appears. Root <code>data-state</code> is
				<code>waiting</code>, then <code>visible</code>.
			</li>
			<li>
				<strong>Steps.</strong> A timer moves the glyph every 167 ms (<code>--spinner-step</code>, six
				steps a second), reading both tokens from the element, so an app can retune them. It is not a
				CSS animation.
			</li>
			<li>
				<strong>Placement.</strong> Start-align the spinner, at the text edge where the content will
				appear. Centring it in a wider box can put the glyph between pixels and blur its edges.
			</li>
			<li>
				<strong>Screen readers.</strong> The glyph is <code>aria-hidden</code> and sits outside the live
				region. The label is a <code>role="status"</code> region that stays empty until the spinner
				appears, so it is announced once, politely.
			</li>
			<li>
				<strong>Reduced motion.</strong> The spinner keeps stepping: it shows that work is still going,
				and a still glyph would look stuck.
			</li>
			<li>Extra attributes and <code>class</code> go to the root <code>span.hp-spinner</code>.</li>
		</ul>
	</section>

	<section aria-labelledby="waiting">
		<h2 id="waiting" class="hp-section-title">Waiting</h2>
		<p class="lede">Mounted with this page: it appeared 300 ms after load and steps until the page closes.</p>
		<Spinner label="Loading projects" />
	</section>

	<section aria-labelledby="states">
		<h2 id="states" class="hp-section-title">The four states</h2>
		<p class="lede">
			Bar, slash, dash and backslash, in order, at 26.32px, where the font’s pixel grid lands on whole
			pixels. Pixel stairs draw the diagonals.
		</p>
		<ol class="states">
			{#each states as [glyph, name], i (name)}
				<li>
					<span class="glyph" aria-hidden="true" data-step={i}>{glyph}</span>
					<span class="hp-caption name">{name}</span>
				</li>
			{/each}
		</ol>
	</section>

	<section aria-labelledby="delay">
		<h2 id="delay" class="hp-section-title">Fast work never shows it</h2>
		<p class="lede">
			Both buttons load the same list. The fast load ends before 300 ms, so no spinner appears; the slow
			one shows it until the list arrives.
		</p>
		<div class="row">
			<Button onclick={() => load(150)}>Load in 150 ms</Button>
			<Button onclick={() => load(2400)}>Load in 2.4 s</Button>
		</div>
		<div class="result">
			{#if loading}
				<Spinner label="Loading projects" />
			{:else if result}
				<p>{result}</p>
			{/if}
		</div>
	</section>

	<section aria-labelledby="region">
		<h2 id="region" class="hp-section-title">In an empty region</h2>
		<p class="lede">
			At the text edge where the rows will appear, under a table’s header band while they load.
		</p>
		<div class="table-region">
			<div class="band hp-label" aria-hidden="true">
				<span>Name</span><span>Owner</span><span>Due</span>
			</div>
			<div class="placeholder">
				<Spinner label="Loading tasks" />
			</div>
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

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-6);
	}

	/* The spinner's own glyph box, repeated for each state. */
	.states {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-6);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	/* Each state starts on a whole pixel: no centring in odd free space. */
	.states li {
		display: grid;
		justify-items: start;
		gap: var(--space-1);
		width: var(--space-16);
	}
	.glyph {
		width: 12px;
		font-family: var(--pixel);
		font-size: var(--type-pixel);
		line-height: var(--type-pixel-leading);
	}
	.glyph[data-step='0'] {
		padding-inline-start: 3px;
	}
	.glyph[data-step='2'] {
		padding-inline-start: 1px;
	}
	.name {
		color: var(--muted);
	}

	/* Holds the spinner's row height, so the result does not jump. */
	.result {
		min-height: var(--type-pixel-leading);
		margin-top: var(--space-5);
		display: flex;
		align-items: center;
	}

	/* A header band like the table's, then the space its rows will fill. */
	.table-region {
		margin: 0 calc(-1 * var(--bleed));
	}
	.band {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr);
		gap: var(--space-4);
		padding: var(--space-2) var(--bleed);
		background: var(--surface-band);
	}
	/* The first row's place: the text edge, below the band. */
	.placeholder {
		display: flex;
		align-items: flex-start;
		min-height: 12rem;
		padding: var(--space-4) var(--bleed) 0;
	}
</style>
