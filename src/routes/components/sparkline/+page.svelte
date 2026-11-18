<script lang="ts">
	import Sparkline, { type SparklineColor, type SparklineTone } from '#lib/components/Sparkline.svelte';
	import Stat from '#lib/components/Stat.svelte';

	// Fixed formulas, so the server and the browser draw the same lines.
	const series = (length: number, f: (i: number) => number) =>
		Array.from({ length }, (_, i) => Math.round(f(i)));
	const grouped = (n: number) => n.toLocaleString('en-US');

	const users = series(30, (i) => 980 + i * 9 + 60 * Math.sin(i / 2.5));
	const response = series(30, (i) => 180 + 40 * Math.sin(i / 4) + ((i * 17) % 23));
	const failed = series(30, (i) => (i > 22 ? 14 + (i - 22) * 3 : 2 + ((i * 7) % 5)));
	const signups = series(14, (i) => 20 + i * 2 + ((i * 5) % 9));

	const colours: { name: string; color?: SparklineColor; tone?: SparklineTone }[] = [
		{ name: 'Text (default)', color: 'text' },
		{ name: 'Muted', color: 'muted' },
		{ name: 'Category 1', color: 'category-1' },
		{ name: 'Category 2', color: 'category-2' },
		{ name: 'Category 3', color: 'category-3' },
		{ name: 'Category 4', color: 'category-4' },
		{ name: 'Category 5', color: 'category-5' },
		{ name: 'Ok', tone: 'ok' },
		{ name: 'Warn', tone: 'warn' },
		{ name: 'Danger', tone: 'danger' }
	];
	const wave = series(24, (i) => 50 + 30 * Math.sin(i / 3) + ((i * 11) % 13));

	// Weekly readings with gaps where no reading came in.
	const weekly: (number | null)[] = [42, 45, null, 51, 49, null, null, 58, 61, 57, null, 66];

	// Two lines on one scale from zero: the smaller one stays small.
	const north = series(20, (i) => 70 + 20 * Math.sin(i / 3));
	const south = series(20, (i) => 18 + 6 * Math.sin(i / 2));
</script>

<svelte:head>
	<title>Sparkline · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Sparkline</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		A trend at a glance, the size of a word. <code>Sparkline</code> draws a line of readings with a
		quiet area under it and a square at the last one. It has no axes and no readout; when the numbers
		matter, show them beside it or use a <a href="/components/bar-chart">Bar chart</a>.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Readings.</strong> <code>values</code> holds the readings, oldest first and evenly spaced.
				<code>null</code> is a missing reading: it keeps its place and the line joins across it. Two
				readings draw a line; one draws the end square alone.
			</li>
			<li>
				<strong>Name.</strong> The sparkline is an image. <code>label</code> says what it shows and the
				last reading follows it, as in “Active users: 1,240”. <code>format</code> writes that reading, and
				<code>valueText</code> replaces it with words of the app’s own. The label is not shown, so put the
				same words on screen beside it.
			</li>
			<li>
				<strong>Scale.</strong> The line runs from its lowest reading to its highest. <code>min</code> and
				<code>max</code> widen that, for a line that should start from zero or several lines on one
				scale.
			</li>
			<li>
				<strong>Colour.</strong> Titanium by default. <code>color</code> takes the muted ink or a data
				category, which needs a label or a legend that names it. <code>tone</code> takes a status hue,
				only where the line means that status.
			</li>
			<li>
				<strong>Size.</strong> 96 by 24px, inline on the text’s middle. Set <code>--sparkline-width</code>
				and <code>--sparkline-height</code> in the app’s class for another size, up to the full width. The
				line keeps its 2px at every size and the end square stays a 6px square.
			</li>
			<li>
				<strong>Semantics.</strong> The root is a <code>span</code> with <code>role="img"</code> and the
				name above; the drawing is hidden from assistive technology. It carries <code>data-color</code> or
				<code>data-tone</code>. Extra attributes and <code>class</code> go to the root.
			</li>
			<li>
				<strong>Motion.</strong> None. New readings redraw the line at once.
			</li>
		</ul>
	</section>

	<section aria-labelledby="figures">
		<h2 id="figures" class="hp-section-title">Beside a figure</h2>
		<p class="lede">
			Three stats with the last 30 days under each. Failed jobs takes the danger hue, because the line
			means failures.
		</p>
		<div class="stats">
			<div class="stat">
				<Stat label="Active users" value={users.at(-1)!} format={grouped} />
				<Sparkline class="wide" label="Active users, last 30 days" values={users} format={grouped} />
			</div>
			<div class="stat">
				<Stat label="Median response" value={response.at(-1)!} unit="ms" />
				<Sparkline
					class="wide"
					label="Median response, last 30 days"
					values={response}
					format={(n) => `${n} ms`}
				/>
			</div>
			<div class="stat">
				<Stat label="Failed jobs" value={failed.at(-1)!} tone="danger" delta="+3" deltaNote="since yesterday" />
				<Sparkline class="wide" label="Failed jobs, last 30 days" values={failed} tone="danger" />
			</div>
		</div>
	</section>

	<section aria-labelledby="inline">
		<h2 id="inline" class="hp-section-title">In a sentence</h2>
		<p class="lede">At the default size it sits in a line of text.</p>
		<p class="sentence">
			Sign-ups over the last two weeks
			<Sparkline label="Sign-ups, last 14 days" values={signups} />
			reached {signups.at(-1)} a day.
		</p>
	</section>

	<section aria-labelledby="colours">
		<h2 id="colours" class="hp-section-title">Colours</h2>
		<p class="lede">
			The two inks, the five categories and the three status hues. Each line here has its name beside
			it, as a category line always needs.
		</p>
		<ul class="colours">
			{#each colours as c (c.name)}
				<li>
					<span class="colour-name">{c.name}</span>
					<Sparkline label={c.name} values={wave} color={c.color} tone={c.tone} />
				</li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="size">
		<h2 id="size" class="hp-section-title">Size</h2>
		<p class="lede">
			The app’s class sets the size: 200 by 40px, then the full width at 48px high. The line stays 2px
			and the end square 6px.
		</p>
		<div class="sizes">
			<Sparkline class="mid" label="Active users, 200 by 40" values={users} format={grouped} />
			<Sparkline class="full" label="Active users, full width" values={users} format={grouped} />
		</div>
	</section>

	<section aria-labelledby="gaps">
		<h2 id="gaps" class="hp-section-title">Missing readings</h2>
		<p class="lede">
			Weekly readings with four weeks missing. Each keeps its place; the line joins across the gaps.
		</p>
		<Sparkline class="mid" label="Weekly score" values={weekly} />
	</section>

	<section aria-labelledby="scale">
		<h2 id="scale" class="hp-section-title">One scale from zero</h2>
		<p class="lede">
			Two sites with <code>min</code> 0 and the same <code>max</code>: the smaller one stays low
			instead of filling its box.
		</p>
		<ul class="colours">
			<li>
				<span class="colour-name">North site</span>
				<Sparkline class="mid" label="North site" values={north} min={0} max={100} />
			</li>
			<li>
				<span class="colour-name">South site</span>
				<Sparkline class="mid" label="South site" values={south} min={0} max={100} />
			</li>
		</ul>
	</section>

	<section aria-labelledby="edges">
		<h2 id="edges" class="hp-section-title">Few readings</h2>
		<p class="lede">
			A flat line sits in the middle. One reading is the square alone. No readings leave the box
			empty, and the name is the label alone; say why in the app’s own text.
		</p>
		<ul class="colours">
			<li>
				<span class="colour-name">Flat</span>
				<Sparkline label="Flat" values={[5, 5, 5, 5, 5, 5]} />
			</li>
			<li>
				<span class="colour-name">One reading</span>
				<Sparkline label="One reading" values={[12]} />
			</li>
			<li>
				<span class="colour-name">No readings yet</span>
				<Sparkline label="No readings yet" values={[]} />
			</li>
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

	.stats {
		display: grid;
		gap: var(--space-8);
	}
	@media (min-width: 600px) {
		.stats {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	.stat {
		display: grid;
		gap: var(--space-2);
		align-content: start;
	}

	.sentence {
		margin: 0;
	}

	.colours {
		display: grid;
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.colours li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
	}
	.colour-name {
		width: 9rem;
		flex: none;
		color: var(--muted);
	}

	.sizes {
		display: grid;
		gap: var(--space-6);
	}

	:global(.hp-sparkline.wide) {
		--sparkline-width: 100%;
		--sparkline-height: 40px;
	}
	:global(.hp-sparkline.mid) {
		--sparkline-width: 200px;
		--sparkline-height: 40px;
	}
	:global(.hp-sparkline.full) {
		--sparkline-width: 100%;
		--sparkline-height: 48px;
	}
</style>
