<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import MediaFrame from '#lib/components/MediaFrame.svelte';
	import MediaImage from '#lib/components/MediaImage.svelte';
	import Switch from '#lib/components/Switch.svelte';
	import { Motion } from '#lib/motion/index.js';
	import { delayedPhoto, staircase } from '../../staircase';

	// ---- MediaImage demo ----------------------------------------------------

	// The photo starts as the bundled file, there before hydration, so it
	// shows at once. Each button holds the next one back as a slow network
	// would: `src` is undefined while it waits, then a fresh object URL. The
	// broken file is an object URL of a few bytes of text, so the error makes
	// no network request and logs nothing.
	let photoSrc = $state<string | undefined>(staircase.src);
	let photoStatus = $state('');
	let expressive = $state(false);
	let request: AbortController | undefined;
	let objectUrl: string | undefined;

	function release() {
		request?.abort();
		request = undefined;
		if (objectUrl) URL.revokeObjectURL(objectUrl);
		objectUrl = undefined;
	}

	function startLoad(): AbortSignal {
		release();
		photoSrc = undefined;
		photoStatus = 'Loading the photo';
		return (request = new AbortController()).signal;
	}

	function loadPhoto(ms: number) {
		const signal = startLoad();
		delayedPhoto(ms, signal).then(
			(url) => {
				request = undefined;
				objectUrl = photoSrc = url;
			},
			() => {
				if (!signal.aborted) photoStatus = 'The photo did not load';
			}
		);
	}

	function loadBroken(ms: number) {
		const signal = startLoad();
		const timer = setTimeout(() => {
			request = undefined;
			objectUrl = photoSrc = URL.createObjectURL(new Blob(['Not an image'], { type: 'image/jpeg' }));
		}, ms);
		signal.addEventListener('abort', () => clearTimeout(timer));
	}

	$effect(() => release);

	// ---- Charts ---------------------------------------------------------------

	// The record specimen's approved chart, tasks closed per week. Chart
	// styles wait for their own design pass; this page only reuses it. Drawn
	// in pixel units at the frame's real size, so lines stay on whole pixels
	// and labels stay 12px at every width.
	const weeks = [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45];
	const closed = [3, 5, 4, 7, 9, 6, 8, 12, 10, 7, 3, 2];
	const scale = 15;
	const ticks = [0, 5, 10, 15];
	const chartLabel = `Tasks closed per week, weeks ${weeks[0]} to ${weeks[weeks.length - 1]}: ${closed.join(', ')}.`;

	function drawChart(width: number, height: number) {
		const pad = { top: 40, right: 40, bottom: 44, left: 48 };
		const plotW = Math.max(0, width - pad.left - pad.right);
		const plotH = Math.max(0, height - pad.top - pad.bottom);
		const base = Math.round(pad.top + plotH);
		const unit = plotH / scale;
		const band = plotW / weeks.length;
		const barW = Math.max(4, Math.min(16, Math.round(band * 0.4)));
		const every = band < 36 ? 2 : 1;
		const bars = weeks.map((week, i) => {
			const x = Math.round(pad.left + band * i + (band - barW) / 2);
			const segments = Array.from({ length: closed[i] }, (_, k) => {
				const top = Math.round(base - unit * (k + 1));
				const bottom = Math.round(base - unit * k);
				return { y: top, h: Math.max(1, bottom - top - 2) };
			});
			const current = i === weeks.length - 1;
			const label = (weeks.length - 1 - i) % every === 0;
			return { week, x, segments, current, label, cx: x + barW / 2, count: closed[i] };
		});
		const grid = ticks.map((t) => ({ t, y: Math.round(base - unit * t) + 0.5 }));
		return { width, height, pad, base, barW, bars, grid, right: width - pad.right };
	}
	type Chart = ReturnType<typeof drawChart>;

	let fixedWidth = $state(0);
	let fixedHeight = $state(0);
	let responsiveWidth = $state(0);
	let responsiveHeight = $state(0);

	const fixedChart = $derived(drawChart(fixedWidth, fixedHeight));
	const responsiveChart = $derived(drawChart(responsiveWidth, responsiveHeight));

	// Text lines of the wireframe preview: widths in viewBox units.
	const bodyLines = [320, 304, 328, 288, 312, 200];
	const navLines = [80, 64, 72, 56];
</script>

<svelte:head>
	<title>Media frame · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Media frame</h1></header>

<main id="main" tabindex="-1">
	{#snippet chart(c: Chart)}
		<svg class="chart" width={c.width} height={c.height} viewBox="0 0 {c.width} {c.height}" role="img" aria-label={chartLabel}>
			{#each c.grid as g (g.t)}
				<line class={g.t === 0 ? 'baseline' : 'gridline'} x1={c.pad.left} x2={c.right} y1={g.y} y2={g.y} />
				<text class="tick" x={c.pad.left - 12} y={g.y + 4} text-anchor="end">{g.t}</text>
			{/each}
			{#each c.bars as b (b.week)}
				{#each b.segments as s, k (k)}
					<rect class:current={b.current} x={b.x} y={s.y} width={c.barW} height={s.h} />
				{/each}
				{#if b.label}
					<text class="tick" x={b.cx} y={c.base + 24} text-anchor="middle">W{b.week}</text>
				{/if}
				{#if b.current}
					<text class="value" x={b.cx} y={(b.segments.at(-1)?.y ?? c.base) - 10} text-anchor="middle"
						>{b.count}</text
					>
				{/if}
			{/each}
		</svg>
	{/snippet}

	<p class="intro">
		A 1px hairline frame for an image, a chart or a diagram, with five small <code>+</code> registration
		marks at its corners and top centre. <code>MediaFrame</code> follows the brief’s visual rule 8:
		images and diagrams sit in a hairline frame, and text blocks never get one. The marks paint over the
		content. <code>MediaImage</code> fills a frame with a photo that may still be loading.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Ratio.</strong> <code>ratio</code> takes any CSS <code>aspect-ratio</code> value, such as
				<code>'16 / 9'</code>. Without it the frame takes its content’s height, unless an ancestor sets
				the custom property <code>--media-frame-ratio</code>; a page sets that in its media queries to
				change the ratio by breakpoint.
			</li>
			<li>
				<strong>Size.</strong> <code>bind:width</code> and <code>bind:height</code> give the inner size in
				px, inside the 1px frame. They are read-only: bind them, never set them. Draw a chart at that
				size and its lines land on whole pixels and its labels keep their size at every width.
			</li>
			<li>
				<strong>Content.</strong> The children: an image, a chart or a diagram, never a block of text.
				Content that fills a ratio frame positions itself with
				<code>position: absolute; inset: 0</code>. Content with its own height, such as an
				<code>&lt;svg&gt;</code> with a fixed <code>viewBox</code>, stays in the flow and sets the
				frame’s height. For a photo, use <code>MediaImage</code> below.
			</li>
			<li>
				<strong>Marks.</strong> The five marks sit 12px in from the inner corners and at the top centre,
				and paint over the content. Keep labels and data about 32px clear of the edges.
			</li>
			<li>Extra attributes and <code>class</code> go to the root element, <code>.hp-media-frame</code>.</li>
		</ul>
	</section>

	<section aria-labelledby="image">
		<h2 id="image" class="hp-section-title">Image</h2>
		<p class="lede">
			<code>MediaImage</code> fills a frame with a photo. While the photo loads, a skeleton block holds its
			place. When it arrives, it takes over from the block.
		</p>
		<pre><code
				>{`<MediaFrame ratio="3 / 2">
  <MediaImage
    src={url}
    alt="A staircase seen from above"
  />
</MediaFrame>`}</code
			></pre>
		<ul class="notes">
			<li>
				<strong>Props.</strong> <code>src</code> is the image’s URL. Leave it undefined while the app does
				not know it yet: the frame waits, as it does while the image loads. A different
				<code>src</code> starts a new load; the same one changes nothing. <code>alt</code> is required:
				<code>""</code> marks a decorative image. <code>bind:ref</code> gives the
				<code>&lt;img&gt;</code>. <code>class</code> and every other attribute go to the
				<code>&lt;img&gt;</code>, such as <code>srcset</code>, <code>sizes</code>, <code>loading</code>,
				<code>width</code>, <code>height</code>, <code>onload</code> and <code>onerror</code>. The app’s
				own <code>onload</code> and <code>onerror</code> still fire.
			</li>
			<li>
				<strong>Fit.</strong> The image lies over the frame’s inner box and covers it
				(<code>object-fit: cover</code>): a frame crops a photo, it never letterboxes one. Cover is the only
				fit for now. So the frame needs a size of its own: a <code>ratio</code>, or
				<code>--media-frame-ratio</code>. Without one the frame takes its content’s height, and the image
				has none, so the frame shrinks to its two border lines.
			</li>
			<li>
				<strong>Three ways an image appears.</strong> A skeleton block fills the frame after 300ms
				(<code>--skeleton-delay</code>), as everywhere else. An image that is already there when it mounts
				(cached, or loaded before the page hydrated), or that arrives before the block showed, appears at
				once. A later image waits until it is decoded, so its first frame is never blank, and then takes
				over from the block. In the expressive tier it resolves from a mosaic: square blocks of about 32,
				16, 8, 4 and 2px, one <code>--resolve-step</code> (42ms) each, then the image, about 210ms after
				the first blocks. Everywhere else, and so with reduced motion, it fades in over the block for
				<code>--dur-reveal</code> on <code>--settle</code>, as content replaces skeletons in a
				<a href="/components/states">load region</a>. The fade changes only opacity, so it runs with
				reduced motion too.
			</li>
			<li>
				<strong>Other origins.</strong> An image from another origin, served without CORS headers, resolves
				like any other. The mosaic is drawn from the image and never read back, so the browser never
				blocks it and nothing throws.
			</li>
			<li>
				<strong>Errors.</strong> When the image fails to load, the block goes and no broken-image icon
				shows. The frame shows the <code>alt</code> text in its middle as a muted caption, so a sighted
				user still learns what the image held; a decorative image leaves the frame empty. The app’s
				<code>onerror</code> fires. A different <code>src</code> tries again.
			</li>
			<li>
				<strong>Focus and screen readers.</strong> The <code>&lt;img&gt;</code> and its
				<code>alt</code> are in the page and the accessibility tree from the moment there is a
				<code>src</code>. While it waits, only its opacity hides it. The block, the mosaic and the error
				caption are hidden from screen readers, and presses pass through them. There is no live region
				per image: the page says what loads, as the status line of this demo does. The image never takes
				focus. To make it open something, put the frame in a link or a button with its own name.
			</li>
		</ul>

		<div class="image-demo">
			<p class="lede">
				Each button holds the photo back, as a slow network would. The switch sets the tier for this frame.
			</p>
			<div class="image-controls">
				<div class="tier"><Switch label="Expressive tier" bind:checked={expressive} /></div>
				<div class="buttons">
					<Button onclick={() => loadPhoto(1200)}>Load in 1.2s</Button>
					<Button onclick={() => loadPhoto(150)}>Load in 150ms</Button>
					<Button onclick={() => loadBroken(1200)}>Load a broken file</Button>
				</div>
			</div>
			<p class="hp-visually-hidden" role="status">{photoStatus}</p>
			<figure class="figure">
				<Motion tier={expressive ? 'expressive' : 'quiet'}>
					<MediaFrame ratio="3 / 2">
						<MediaImage
							src={photoSrc}
							alt={staircase.alt}
							width={staircase.width}
							height={staircase.height}
							onload={() => {
								if (photoStatus) photoStatus = 'Photo loaded';
							}}
							onerror={() => (photoStatus = 'The photo did not load')}
						/>
					</MediaFrame>
				</Motion>
				<figcaption class="hp-caption">Staircase at Küppersmühle museum, Duisburg. Duesseljan, CC0</figcaption>
			</figure>
		</div>
	</section>

	<section aria-labelledby="fixed">
		<h2 id="fixed" class="hp-section-title">Fixed ratio</h2>
		<p class="lede">
			<code>ratio="16 / 9"</code> at every width, around the record specimen’s chart. The chart reads the
			inner size through <code>bind:width</code> and <code>bind:height</code> and draws in pixel units,
			so its gridlines and bar segments sit on whole pixels and its labels stay 12px. Resize the window:
			the size below changes and the chart redraws. On a phone this frame gets short.
		</p>
		<figure class="figure">
			<MediaFrame ratio="16 / 9" bind:width={fixedWidth} bind:height={fixedHeight}>
				{#if fixedWidth > 0 && fixedHeight > 0}
					{@render chart(fixedChart)}
				{/if}
			</MediaFrame>
			<figcaption class="hp-caption">Tasks closed per week, W{weeks[0]} to W{weeks[weeks.length - 1]}</figcaption>
		</figure>
		<p class="size hp-caption"><span class="hp-mono">{fixedWidth} × {fixedHeight}</span></p>
	</section>

	<section aria-labelledby="by-width">
		<h2 id="by-width" class="hp-section-title">Ratio by breakpoint</h2>
		<p class="lede">
			No <code>ratio</code> here: the page sets <code>--media-frame-ratio</code> on the figure, 4:3 below
			600px and 16:9 from 600px, so the same chart gets more height on a phone. It redraws at each size.
		</p>
		<pre><code
				>{`.by-width {
  --media-frame-ratio: 4 / 3;
}
@media (min-width: 600px) {
  .by-width {
    --media-frame-ratio: 16 / 9;
  }
}`}</code
			></pre>
		<figure class="figure by-width">
			<MediaFrame bind:width={responsiveWidth} bind:height={responsiveHeight}>
				{#if responsiveWidth > 0 && responsiveHeight > 0}
					{@render chart(responsiveChart)}
				{/if}
			</MediaFrame>
			<figcaption class="hp-caption">Tasks closed per week, W{weeks[0]} to W{weeks[weeks.length - 1]}</figcaption>
		</figure>
		<p class="size hp-caption"><span class="hp-mono">{responsiveWidth} × {responsiveHeight}</span></p>
	</section>

	<section aria-labelledby="content-height">
		<h2 id="content-height" class="hp-section-title">Content height</h2>
		<p class="lede">
			No ratio at all: the frame takes its content’s height. This file preview is an
			<code>&lt;svg&gt;</code> with a fixed <code>viewBox</code> and <code>width: 100%</code>, so it scales
			with the column and sets the frame’s height. Its outlines use
			<code>vector-effect: non-scaling-stroke</code> to stay 1px at any scale.
		</p>
		<figure class="figure">
			<MediaFrame>
				<svg
					class="preview"
					viewBox="0 0 640 400"
					role="img"
					aria-label="Wireframe of a page layout: a header bar, a sidebar and a column of text."
				>
					<rect class="outline" x="64" y="64" width="512" height="272" vector-effect="non-scaling-stroke" />
					<rect class="shape" x="64" y="64" width="512" height="32" />
					<line class="outline" x1="192" x2="192" y1="96" y2="336" vector-effect="non-scaling-stroke" />
					{#each navLines as w, i (i)}
						<rect class="shape" x="80" y={120 + 24 * i} width={w} height="8" />
					{/each}
					<rect class="heading" x="224" y="120" width="192" height="16" />
					{#each bodyLines as w, i (i)}
						<rect class="shape" x="224" y={160 + 20 * i} width={w} height="8" />
					{/each}
				</svg>
			</MediaFrame>
			<figcaption class="hp-caption">Preview of wireframes-v3.fig, page 2</figcaption>
		</figure>
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
	/* Token names never break at their hyphens. */
	:not(pre) > code {
		white-space: nowrap;
	}
	pre {
		margin: 0 0 var(--space-5);
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

	/* ---- The MediaImage demo ---------------------------------------------- */

	.image-demo {
		margin-top: var(--space-8);
	}
	.image-controls {
		display: grid;
		gap: var(--space-4);
		margin-bottom: var(--space-5);
	}
	/* The switch sits at the end of its label line; keep the line short. */
	.tier {
		max-width: 20rem;
	}
	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
	}

	/* ---- Figures --------------------------------------------------------- */

	.figure {
		max-width: 45rem;
	}
	figcaption {
		margin-top: var(--space-3);
		color: var(--muted);
	}
	.size {
		margin-top: var(--space-1);
		color: var(--muted);
	}

	/* The page picks the ratio by breakpoint. */
	.by-width {
		--media-frame-ratio: 4 / 3;
	}
	@media (min-width: 600px) {
		.by-width {
			--media-frame-ratio: 16 / 9;
		}
	}

	/* ---- The record specimen's chart, unchanged --------------------------- */

	.chart {
		position: absolute;
		inset: 0;
		shape-rendering: crispEdges;
	}
	.chart rect {
		fill: var(--muted);
	}
	.chart rect.current {
		fill: var(--accent);
	}
	.gridline {
		stroke: var(--border);
		stroke-dasharray: 2 4;
	}
	.baseline {
		stroke: var(--border);
	}
	.tick,
	.value {
		font-family: var(--mono);
		font-size: 12px;
	}
	.tick {
		fill: var(--muted);
	}
	.value {
		fill: var(--text);
	}

	/* ---- A file preview: a fixed viewBox that scales ---------------------- */

	.preview {
		width: 100%;
		height: auto;
		shape-rendering: crispEdges;
	}
	.outline {
		fill: none;
		stroke: var(--border);
	}
	.shape {
		fill: var(--border);
	}
	.heading {
		fill: var(--muted);
	}
</style>
