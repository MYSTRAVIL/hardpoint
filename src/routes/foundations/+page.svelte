<script lang="ts">
	import { onMount } from 'svelte';

	type Need = 'text' | 'boundary' | 'none';
	const swatches: { token: string; role: string; need: Need }[] = [
		{ token: '--canvas', role: 'Page, panels, idle wells', need: 'none' },
		{ token: '--surface-hover', role: 'Hover, active and expanded regions', need: 'none' },
		{ token: '--surface-selected', role: 'The selected tint, under a 3px titanium edge', need: 'none' },
		{ token: '--surface-band', role: 'The table header band, nothing else', need: 'none' },
		{ token: '--surface-raised', role: 'Bubbles, option lists and tracks', need: 'none' },
		{ token: '--text', role: 'Text, focus contour, titanium blocks and tags', need: 'text' },
		{ token: '--muted', role: 'Supporting text and icons', need: 'text' },
		{ token: '--border', role: 'Dividers, frames and decorative lines only', need: 'none' },
		{ token: '--border-control', role: 'Boundaries of inputs, selects, outlined buttons', need: 'boundary' },
		{ token: '--danger', role: 'Errors and failures, nothing else', need: 'text' },
		{ token: '--warn', role: 'Waiting, blocked, needs you', need: 'text' },
		{ token: '--ok', role: 'Done, success, online', need: 'text' }
	];
	const minimum: Record<Need, number> = { text: 4.5, boundary: 3, none: 0 };

	const roles = [
		{ name: 'Label', cls: 'hp-label', use: 'Buttons, tabs, tags, column headers, field and key-value labels', sample: 'Status' },
		{ name: 'View title', cls: 'hp-view-title', use: 'The header row only; 16px on compact', sample: 'Projects' },
		{ name: 'Caption', cls: 'hp-caption', use: 'Hints and notes beside other text', sample: 'Updated 4 minutes ago' },
		{ name: 'Dense', cls: 'hp-dense', use: 'Rows on fine pointers; 16px on touch', sample: 'Quarterly report draft, shared with three people' },
		{ name: 'Body', cls: 'hp-body', use: 'Reading text, messages, inputs', sample: 'Changes save when you leave the field. You can undo them from the history panel.' },
		{ name: 'Section title', cls: 'hp-section-title', use: 'Groups within a page', sample: 'Recent activity' },
		{ name: 'Page title', cls: 'hp-page-title', use: 'Names a user wrote; 20px on compact', sample: 'Customer portal redesign' },
		{ name: 'Display, identifier', cls: 'hp-display hp-mono', use: 'The subject only, one per view, 32 to 56px', sample: 'PRJ-0142' },
		{ name: 'Display, figure', cls: 'hp-display', use: 'Or a key figure in Geist with tabular numbers', sample: '12,480' },
		{ name: 'Mono', cls: 'hp-mono hp-dense', use: 'Table cells, values, identifiers, timestamps, code', sample: 'a3f9c21 · 2026-11-09 14:32:07' },
		{ name: 'Pixel', cls: 'hp-pixel', use: 'Wordmark; one short fixed display line per screen', sample: 'NO RESULTS' },
		{ name: 'Pixel large', cls: 'hp-pixel-lg', use: 'Brand moments only; 2px modules', sample: 'READY' }
	];

	const spaces = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16];
	const heights = [
		{ px: 44, when: 'Coarse pointer, any density' },
		{ px: 36, when: 'Fine pointer' },
		{ px: 32, when: 'Fine pointer, compact density' }
	];
	const bandRows = [
		{ id: 'PRJ-0142', name: 'Customer portal redesign', updated: '2026-11-08' },
		{ id: 'PRJ-0139', name: 'Invoice export to CSV', updated: '2026-11-07' },
		{ id: 'PRJ-0137', name: 'Onboarding checklist v2', updated: '2026-11-06' }
	];

	let tokens = $state<Record<string, string>>({});
	let specs = $state<Record<string, string>>({});
	let pointer = $state('');
	let density = $state<Record<string, string>>({});

	const typeEls: Record<string, HTMLElement> = {};
	const densityEls: Record<string, HTMLElement> = {};

	function channel(c: number) {
		const s = c / 255;
		return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	}
	function luminance(hex: string) {
		const n = hex.replace('#', '');
		const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
		return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
	}
	function contrast(a: string, b: string) {
		const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
		return (hi + 0.05) / (lo + 0.05);
	}

	function measure() {
		const root = getComputedStyle(document.documentElement);
		const read: Record<string, string> = {};
		for (const name of [
			...swatches.map((s) => s.token),
			...spaces.map((n) => `--space-${n}`),
			'--control-height',
			'--hit-target',
			'--density',
			'--gutter',
			'--bleed',
			'--header-height'
		]) {
			read[name] = root.getPropertyValue(name).trim();
		}
		tokens = read;

		const next: Record<string, string> = {};
		for (const [cls, el] of Object.entries(typeEls)) {
			const cs = getComputedStyle(el);
			const face = cs.fontFamily.split(',')[0].replaceAll(/["']/g, '');
			const size = parseFloat(cs.fontSize);
			const leading = parseFloat(cs.lineHeight);
			const caps = cs.textTransform === 'uppercase' ? `, caps ${cs.letterSpacing}` : '';
			next[cls] = `${face} ${+size.toFixed(2)}/${+leading.toFixed(2)} ${cs.fontWeight}${caps}`;
		}
		specs = next;

		const d: Record<string, string> = {};
		for (const [key, el] of Object.entries(densityEls)) {
			const cs = getComputedStyle(el);
			d[key] = `--density ${cs.getPropertyValue('--density').trim()}, control ${el.offsetHeight}px`;
		}
		density = d;

		pointer = matchMedia('(pointer: coarse)').matches
			? 'coarse'
			: matchMedia('(pointer: fine)').matches
				? 'fine'
				: 'none';
	}

	onMount(() => {
		measure();
		const queries = [
			'(pointer: coarse)',
			'(max-width: 599px)',
			'(min-width: 600px)',
			'(min-width: 900px)',
			'(prefers-color-scheme: light)'
		].map((q) => matchMedia(q));
		for (const q of queries) q.addEventListener('change', measure);
		addEventListener('resize', measure);
		// The swatches and ratios read live tokens, so a theme change re-reads them.
		const theme = new MutationObserver(measure);
		theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
		return () => {
			for (const q of queries) q.removeEventListener('change', measure);
			removeEventListener('resize', measure);
			theme.disconnect();
		};
	});

	function ratioText(token: string, on: string) {
		const fg = tokens[token];
		const bg = tokens[on];
		if (!fg || !bg) return '';
		return `${contrast(fg, bg).toFixed(1)}:1`;
	}
	function verdict(token: string, need: Need) {
		if (need === 'none' || !tokens[token]) return need === 'none' ? 'No minimum' : '';
		const worst = Math.min(
			contrast(tokens[token], tokens['--canvas']),
			contrast(tokens[token], tokens['--surface-hover'])
		);
		return `${minimum[need]}:1 ${need}, ${worst >= minimum[need] ? 'passes' : 'FAILS'}`;
	}
	function bandVerdict(token: string) {
		const fg = tokens[token];
		const bg = tokens['--surface-band'];
		if (!fg || !bg) return '';
		return contrast(fg, bg) >= minimum.text ? 'passes 4.5:1' : 'FAILS 4.5:1';
	}
</script>

<svelte:head>
	<title>Foundations · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Foundations</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		Tokens and base styles from <code>tokens.css</code> and <code>base.css</code>. Values on this page
		are read from the live styles, so they change with the pointer, the width and the density.
	</p>

	<section aria-labelledby="colour">
		<h2 id="colour" class="hp-section-title">Colour</h2>
		<p class="lede">
			Two inks on the canvas: black in the dark theme, warm paper in the light one. Titanium is the
			accent; red, yellow and green mean status only. Ratios are measured on <code>--canvas</code> and on
			<code>--surface-hover</code>.
		</p>
		<div class="colour-rows" role="table" aria-label="Colour tokens">
			<div class="colour-row head" role="row">
				<span class="hp-label" role="columnheader"><span class="hp-visually-hidden">Swatch</span></span>
				<span class="hp-label" role="columnheader">Token</span>
				<span class="hp-label" role="columnheader">Role</span>
				<span class="hp-label num" role="columnheader">On canvas</span>
				<span class="hp-label num" role="columnheader">On hover</span>
				<span class="hp-label" role="columnheader">Minimum</span>
			</div>
			{#each swatches as s (s.token)}
				<div class="colour-row" role="row">
					<span role="cell"><span class="swatch" style:background="var({s.token})"></span></span>
					<span class="token" role="cell">
						<code>{s.token}</code>
						<code class="value">{tokens[s.token] ?? ''}</code>
					</span>
					<span class="role hp-dense" role="cell">{s.role}</span>
					<span class="num hp-mono hp-dense" role="cell"
						><span class="cell-label hp-label" aria-hidden="true">On canvas</span>{ratioText(s.token, '--canvas')}</span
					>
					<span class="num hp-mono hp-dense" role="cell"
						><span class="cell-label hp-label" aria-hidden="true">On hover</span>{ratioText(s.token, '--surface-hover')}</span
					>
					<span class="need hp-dense" role="cell">{verdict(s.token, s.need)}</span>
				</div>
			{/each}
		</div>
	</section>

	<section aria-labelledby="theme">
		<h2 id="theme" class="hp-section-title">Theme</h2>
		<p class="lede">
			Hardpoint is dark unless an app says otherwise. Set <code>data-theme</code> on
			<code>&lt;html&gt;</code> to <code>light</code>, <code>dark</code> or <code>system</code>, which
			follows the device; with none, the theme is dark. Set it on the root only, because overlays
			render in a portal on <code>&lt;body&gt;</code> and would miss a theme set on a subtree. Set it
			before first paint so the page never flashes the other theme, and set
			<code>&lt;meta name="theme-color"&gt;</code> to the canvas, <code>#000000</code> or
			<code>#f7f5f0</code>, so the browser chrome matches.
		</p>
		<p class="snippet"><code>{'<html lang="en" data-theme="system">'}</code></p>
	</section>

	<section aria-labelledby="band">
		<h2 id="band" class="hp-section-title">Header band</h2>
		<p class="lede">
			A table has one filled band in <code>--surface-band</code> with caps column labels, then rows of
			Geist Mono with no dividers, zebra or cell borders. The band and the row tints reach
			<code>--bleed</code> (now <code>{tokens['--bleed'] ?? ''}</code>) past the text edge, so text
			keeps the page edge. The selected row has a 3px titanium edge and the hover tint.
		</p>
		<table class="band-sample">
			<thead>
				<tr>
					<th class="hp-label" scope="col">ID</th>
					<th class="hp-label" scope="col">Name</th>
					<th class="hp-label muted-label" scope="col">Updated</th>
				</tr>
			</thead>
			<tbody class="hp-mono hp-dense">
				{#each bandRows as r, i (r.id)}
					<tr class:is-selected={i === 0} aria-current={i === 0 ? 'true' : undefined}>
						<td>{r.id}</td>
						<td>{r.name}</td>
						<td>{r.updated}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<dl class="band-ratios">
			<div>
				<dt class="hp-label">Text on band</dt>
				<dd class="hp-mono hp-dense">
					<span>{ratioText('--text', '--surface-band')}</span><span class="value">{bandVerdict('--text')}</span>
				</dd>
			</div>
			<div>
				<dt class="hp-label">Muted on band</dt>
				<dd class="hp-mono hp-dense">
					<span>{ratioText('--muted', '--surface-band')}</span><span class="value">{bandVerdict('--muted')}</span>
				</dd>
			</div>
			<div>
				<dt class="hp-label">Band on canvas</dt>
				<dd class="hp-mono hp-dense">
					<span>{ratioText('--surface-band', '--canvas')}</span><span class="value">a fill, no minimum</span>
				</dd>
			</div>
		</dl>
	</section>

	<section aria-labelledby="type">
		<h2 id="type" class="hp-section-title">Type roles</h2>
		<p class="lede">
			Geist for UI, reading text and numbers. Geist Mono for data: table cells, values, identifiers
			and timestamps. Geist Pixel Square for the wordmark and one short display line per screen, at
			multiples of 26.32px.
		</p>
		<div class="type-rows">
			{#each roles as r (r.cls)}
				<div class="type-row">
					<div class="type-meta">
						<span class="hp-dense">{r.name}</span>
						<code class="value">.{r.cls.split(' ').join(' .')}</code>
						<span class="value hp-caption">{specs[r.cls] ?? ''}</span>
						<span class="value hp-caption">{r.use}</span>
					</div>
					<div class="type-sample {r.cls}" bind:this={typeEls[r.cls]}>{r.sample}</div>
				</div>
			{/each}
		</div>
	</section>

	<section aria-labelledby="space">
		<h2 id="space" class="hp-section-title">Space</h2>
		<p class="lede">
			A 4px grid. Gaps between groups are at least twice the gap within a group. Page edges use
			<code>--gutter</code>, now <code>{tokens['--gutter'] ?? ''}</code>; the header row is
			<code>--header-height</code>, <code>{tokens['--header-height'] ?? ''}</code> plus the top safe
			area.
		</p>
		<div class="space-rows">
			{#each spaces as n (n)}
				<div class="space-row">
					<code>--space-{n}</code>
					<span class="value hp-mono hp-dense">{tokens[`--space-${n}`] ?? ''}</span>
					<span class="bar" style:width="var(--space-{n})"></span>
				</div>
			{/each}
		</div>
	</section>

	<section aria-labelledby="states">
		<h2 id="states" class="hp-section-title">Focus and selection</h2>
		<p class="lede">
			Focus is a 2px titanium contour 4px outside the control, inset on clipped rows. Selection is a
			3px titanium edge and a <code>--surface-selected</code> tint, never a fill. The two never look
			alike. Tab to the first sample to see the live contour.
		</p>
		<div class="states">
			<div class="state-controls">
				<button type="button" class="control-sample hp-label">Focusable</button>
				<div class="control-sample hp-label show-focus" aria-hidden="true">Focus contour</div>
			</div>
			<ul class="state-rows" aria-label="Row states">
				<li>Row at rest</li>
				<li class="is-selected" aria-current="true">Selected row</li>
				<li class="show-focus-inset">Focused row</li>
			</ul>
		</div>
	</section>

	<section aria-labelledby="controls">
		<h2 id="controls" class="hp-section-title">Controls and density</h2>
		<p class="lede">
			Control height follows the pointer. This device has a <strong>{pointer}</strong> pointer:
			<code>--control-height</code> is <code>{tokens['--control-height'] ?? ''}</code> and the minimum
			hit area is <code>{tokens['--hit-target'] ?? ''}</code>. Compact density never shrinks touch
			targets.
		</p>
		<ul class="heights">
			{#each heights as h (h.px)}
				<li class:is-selected={tokens['--control-height'] === `${h.px}px`}>
					<span class="height-box" style:height="{h.px}px">
						<span class="hp-mono hp-dense">{h.px}px</span>
					</span>
					<span class="hp-dense when">{h.when}</span>
				</li>
			{/each}
		</ul>
		<p class="lede density-note">
			Rows below use the <code>ruled</code> variant, 1px <code>--border</code> dividers, so the rhythm
			shows. Tables are unruled by default; long dense tables may opt in.
		</p>
		<div class="densities">
			{#each ['comfortable', 'compact'] as mode (mode)}
				<div class="density" data-density={mode === 'compact' ? 'compact' : undefined}>
					<h3 class="hp-label">{mode}</h3>
					<ul class="density-rows">
						<li>Inbox</li>
						<li>Drafts</li>
						<li>Archive</li>
					</ul>
					<span class="height-box density-control" bind:this={densityEls[mode]}>
						<span class="hp-dense">Control</span>
					</span>
					<span class="value hp-caption hp-num">{density[mode] ?? ''}</span>
				</div>
			{/each}
		</div>
	</section>
</main>

<style>
	.intro,
	.lede {
		max-width: var(--measure);
		color: var(--muted);
	}

	section {
		margin-top: var(--space-12);
	}
	.lede {
		margin: var(--space-2) 0 var(--space-5);
	}

	.snippet {
		margin: 0;
	}
	.snippet > code {
		display: block;
		padding: var(--space-3) var(--space-4);
		background: var(--surface-raised);
	}

	code {
		font-size: 0.875em;
	}
	.value {
		color: var(--muted);
	}

	.is-selected {
		background: var(--surface-selected);
		box-shadow: inset 3px 0 0 var(--accent);
	}

	/* ---- Colour --------------------------------------------------------- */

	/* Compact and medium: a stacked list, each ratio labelled in its cell,
	   rows grouped by space. Expanded: a table under one header band. */
	.colour-rows {
		display: grid;
		gap: var(--space-5);
	}
	.colour-row {
		display: grid;
		align-items: center;
		gap: var(--space-1) var(--space-4);
		grid-template-columns: 32px minmax(0, 1fr) minmax(0, 1fr);
		grid-template-areas:
			'swatch token token'
			'swatch role role'
			'swatch black hover'
			'swatch need need';
	}
	.colour-row > :nth-child(1) {
		grid-area: swatch;
		align-self: start;
	}
	.colour-row > :nth-child(2) {
		grid-area: token;
	}
	.colour-row > :nth-child(3) {
		grid-area: role;
	}
	.colour-row > :nth-child(4) {
		grid-area: black;
	}
	.colour-row > :nth-child(5) {
		grid-area: hover;
	}
	.colour-row > :nth-child(6) {
		grid-area: need;
	}
	.colour-row.head {
		display: none;
	}
	.cell-label {
		display: block;
		color: var(--muted);
	}
	.token code {
		white-space: nowrap;
	}
	@media (min-width: 900px) {
		.colour-rows {
			gap: 0;
			margin-inline: calc(-1 * var(--bleed));
		}
		.colour-row,
		.colour-row.head {
			display: grid;
			grid-template-columns: 32px 220px minmax(0, 1fr) 88px 88px 200px;
			grid-template-areas: 'swatch token role black hover need';
			padding: calc(var(--space-1) * var(--density)) var(--bleed);
		}
		.colour-row.head {
			min-height: 36px;
			margin-bottom: var(--space-2);
			background: var(--surface-band);
		}
		.colour-row > :nth-child(1) {
			align-self: center;
		}
		.colour-row .num {
			text-align: right;
		}
		.cell-label {
			display: none;
		}
	}
	.swatch {
		display: block;
		width: 32px;
		height: 32px;
		outline: 1px solid var(--border);
		outline-offset: -1px;
	}
	.token {
		display: flex;
		flex-wrap: wrap;
		gap: 0 var(--space-3);
	}
	.need {
		color: var(--muted);
	}

	/* ---- Band ----------------------------------------------------------- */

	.band-sample {
		width: calc(100% + 2 * var(--bleed));
		max-width: calc(720px + 2 * var(--bleed));
		margin-inline: calc(-1 * var(--bleed));
		border-collapse: collapse;
		table-layout: fixed;
	}
	.band-sample th,
	.band-sample td {
		padding: 0 var(--space-3);
		overflow: hidden;
		text-align: left;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.band-sample th:first-child,
	.band-sample td:first-child {
		padding-left: var(--bleed);
	}
	.band-sample th:last-child,
	.band-sample td:last-child {
		padding-right: var(--bleed);
	}
	.band-sample th:first-child {
		width: calc(96px + var(--bleed));
	}
	.band-sample th:last-child {
		width: calc(112px + var(--bleed));
	}
	.band-sample thead th {
		height: 36px;
		background: var(--surface-band);
	}
	.band-sample .muted-label {
		color: var(--muted);
	}
	/* Space between the band and the first row, not a line. */
	.band-sample tbody::before {
		content: '';
		display: table-row;
		height: var(--space-2);
	}
	.band-sample td {
		height: var(--control-height);
	}

	.band-ratios {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3) var(--space-10);
		margin-top: var(--space-6);
	}
	.band-ratios div {
		display: grid;
		gap: var(--space-1);
	}
	.band-ratios dt {
		color: var(--muted);
	}
	.band-ratios dd {
		display: flex;
		gap: var(--space-2);
	}

	/* ---- Type ----------------------------------------------------------- */

	.type-rows {
		display: grid;
		gap: var(--space-8);
	}
	.type-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-2);
		/* Top-aligned so pixel samples sit on whole pixels. */
		align-items: start;
	}
	@media (min-width: 900px) {
		.type-rows {
			gap: var(--space-6);
		}
		.type-row {
			grid-template-columns: 320px minmax(0, 1fr);
			gap: var(--space-6);
		}
	}
	.type-meta {
		display: grid;
		gap: 2px;
	}
	.type-sample {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	/* ---- Space ---------------------------------------------------------- */

	.space-rows {
		display: grid;
		gap: var(--space-1);
	}
	.space-row {
		display: grid;
		grid-template-columns: 100px 48px minmax(0, 1fr);
		align-items: center;
		gap: var(--space-4);
	}
	.bar {
		display: block;
		height: 12px;
		background: var(--muted);
	}

	/* ---- Focus and selection ------------------------------------------- */

	.states {
		display: grid;
		gap: var(--space-8);
	}
	@media (min-width: 900px) {
		.states {
			grid-template-columns: auto minmax(0, 480px);
			align-items: start;
		}
	}
	.state-controls {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-8);
		padding: var(--space-2);
	}
	.control-sample {
		display: inline-flex;
		align-items: center;
		height: var(--control-height);
		padding: 0 var(--space-4);
		border: 1px solid var(--border-control);
		background: none;
	}
	.show-focus {
		outline: 2px solid var(--focus);
		outline-offset: 4px;
	}
	.state-rows {
		margin: 0 calc(-1 * var(--bleed));
		padding: 0;
		list-style: none;
	}
	.state-rows li {
		display: flex;
		align-items: center;
		min-height: var(--control-height);
		padding: 0 var(--bleed);
	}
	.show-focus-inset {
		outline: 2px solid var(--focus);
		outline-offset: -2px;
	}

	/* ---- Controls and density ------------------------------------------ */

	.heights {
		display: grid;
		gap: var(--space-2);
		margin: 0 calc(-1 * var(--bleed));
		padding: 0;
		list-style: none;
	}
	.heights li {
		display: grid;
		grid-template-columns: 120px minmax(0, 1fr);
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-2) var(--bleed);
	}
	.height-box {
		display: flex;
		align-items: center;
		padding: 0 var(--space-3);
		border: 1px solid var(--border-control);
	}
	.when {
		color: var(--muted);
	}
	.heights li.is-selected .when {
		color: var(--text);
	}

	.density-note {
		margin-top: var(--space-8);
	}
	.densities {
		display: grid;
		gap: var(--space-8);
	}
	@media (min-width: 600px) {
		.densities {
			grid-template-columns: repeat(2, minmax(0, 320px));
		}
	}
	.density {
		display: grid;
		align-content: start;
		gap: var(--space-3);
	}
	.density h3 {
		color: var(--muted);
	}
	.density-rows {
		margin: 0;
		padding: 0;
		list-style: none;
		border-top: 1px solid var(--border);
	}
	.density-rows li {
		padding: calc(var(--space-3) * var(--density)) 0;
		border-bottom: 1px solid var(--border);
	}
	.density-control {
		width: 160px;
		height: var(--control-height);
	}
</style>
