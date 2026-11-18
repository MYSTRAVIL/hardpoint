<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	/** A status hue for a series that means that status: `ok`, `warn` or `danger`. */
	export type BarChartTone = 'ok' | 'warn' | 'danger';

	/**
	 * A series colour: a data category (`category-1` to `category-5`) or one
	 * of the two inks (`text`, `muted`).
	 */
	export type BarChartColor =
		| 'category-1'
		| 'category-2'
		| 'category-3'
		| 'category-4'
		| 'category-5'
		| 'text'
		| 'muted';

	export type BarChartSeries = {
		/** The key of this series' value in each item's `values`. */
		key: string;
		/** The series name, as written, in the readout and the table. */
		label: string;
		/**
		 * The series colour. Without it a series takes the next data category
		 * that no other series names, in order: `category-1`, then
		 * `category-2`. There are five categories; a sixth series repeats
		 * the first, so group the rest or give them an ink.
		 */
		color?: BarChartColor;
		/**
		 * A status hue instead of `color`, only where the series means that
		 * status, such as failed runs in `danger`.
		 */
		tone?: BarChartTone;
	};

	export type BarChartItem = {
		/**
		 * The bar's name, as written, in the readout, the keyboard
		 * announcement and the table: `14:00`, `Monday`, `2026-11-18`.
		 */
		label: string;
		/**
		 * A shorter name under the bar, such as `14` for `14:00 to 15:00`.
		 * Default: `label`. An empty string leaves the bar without one.
		 */
		axisLabel?: string;
		/**
		 * One value per series `key`. A missing key, `NaN` or an infinite
		 * value counts as 0. Positive values stack up from zero in series
		 * order and negative values stack down from it.
		 */
		values: Record<string, number>;
	};

	export type BarChartProps = Omit<
		HTMLAttributes<HTMLDivElement>,
		'children' | 'aria-label' | 'aria-labelledby'
	> & {
		/** The bars, from left to right, also on a right-to-left page. */
		items: BarChartItem[];
		/** The series of each bar, bottom up. Two or more stack. */
		series: BarChartSeries[];
		/**
		 * The chart's accessible name, as for a table: what the bars count.
		 * It names the plot and the table that holds every value. It is not
		 * shown; the app's own heading says it on screen.
		 */
		label: string;
		/**
		 * Formats every value in the readout, the table and the scale, for
		 * example `(n) => n.toLocaleString('en-US')`. Default: `String(n)`.
		 */
		format?: (value: number) => string;
		/**
		 * The scale reaches at least this value, so several charts can share
		 * one scale. Data above it extends the scale.
		 */
		max?: number;
		/** The name of the stacked total in the readout and the table. Default `Total`. */
		totalLabel?: string;
		/**
		 * Read by assistive technology when the plot takes focus. Default
		 * `Arrow keys move between bars.`
		 */
		keysText?: string;
	};
</script>

<script lang="ts">
	let {
		items,
		series,
		label,
		format = (value: number) => String(value),
		max,
		totalLabel = 'Total',
		keysText = 'Arrow keys move between bars.',
		class: className,
		...rest
	}: BarChartProps = $props();

	const uid = $props.id();
	const keysId = `${uid}-keys`;

	const CATEGORIES = ['category-1', 'category-2', 'category-3', 'category-4', 'category-5'] as const;
	// Under the plot: the bottom hairline's row, a 1px gap, then the 3px
	// edge of the active bar.
	const UNDER = 5;
	// Bars never grow wider than this; a wider slot centres its bar.
	const MAX_BAR = 40;
	// Axis labels: 12px Geist Mono, 0.6em a glyph, 8px apart at least.
	const AXIS_GLYPH = 7.2;
	const AXIS_GAP = 8;
	// Steps for thinning axis labels when no divisor of the count fits.
	const AXIS_STEPS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 25, 30, 50, 100];

	/** Clears float noise, so 0.1 + 0.2 shows as 0.3. */
	const clean = (n: number) => Number(n.toPrecision(12));
	const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

	// ---- Colour -----------------------------------------------------------

	// A series without a colour takes the next category no series names.
	const paints = $derived.by(() => {
		const named = new Set(series.map((s) => (s.tone ? undefined : s.color)));
		const free = CATEGORIES.filter((c) => !named.has(c));
		const pool = free.length ? free : CATEGORIES;
		let next = 0;
		return series.map((s) =>
			s.tone
				? { tone: s.tone, color: undefined }
				: { tone: undefined, color: s.color ?? pool[next++ % pool.length] }
		);
	});

	// ---- Data -------------------------------------------------------------

	type Part = { series: number; from: number; to: number };
	const stacked = $derived(series.length > 1);
	const bars = $derived(
		items.map((item) => {
			let up = 0;
			let down = 0;
			let total = 0;
			const parts: Part[] = [];
			series.forEach((s, i) => {
				const v = num(item.values[s.key]);
				total += v;
				if (v > 0) {
					parts.push({ series: i, from: up, to: clean(up + v) });
					up = clean(up + v);
				} else if (v < 0) {
					parts.push({ series: i, from: down, to: clean(down + v) });
					down = clean(down + v);
				}
			});
			return { parts, up, down, total: clean(total) };
		})
	);
	const n = $derived(items.length);
	const value = (i: number, s: BarChartSeries) => num(items[i]?.values[s.key]);
	const whole = $derived(
		items.every((item) => series.every((s) => Number.isInteger(num(item.values[s.key]))))
	);

	// ---- Size -------------------------------------------------------------

	// Measured, so every bar, gap and hairline sits on whole pixels. Before
	// the first measurement (a server render) the drawing scales from these.
	let boxWidth = $state(0);
	let boxHeight = $state(0);
	const W = $derived(boxWidth || 640);
	const H = $derived(boxHeight || 160);
	const plotH = $derived(Math.max(8, H - UNDER));

	// ---- Scale ------------------------------------------------------------

	// Hairlines at round steps, at least 28px apart. Of the steps that fit,
	// the one whose scale ends closest to the data wins, then the one nearest
	// a hairline every 40px. Whole-number data gets whole-number steps.
	const scale = $derived.by(() => {
		const hi = Math.max(0, num(max), ...bars.map((b) => b.up));
		const lo = Math.min(0, ...bars.map((b) => b.down));
		const most = Math.max(2, Math.floor(plotH / 28));
		const aim = Math.max(2, Math.round(plotH / 40));
		const mag = 10 ** Math.floor(Math.log10((hi - lo || 1) / most));
		let best: { step: number; bottom: number; top: number; k: number } | undefined;
		for (const e of [mag, mag * 10]) {
			for (const m of [1, 2, 2.5, 5]) {
				const step = clean(m * e);
				if (whole && !Number.isInteger(step)) continue;
				const bottom = clean(Math.floor(lo / step) * step);
				const top = Math.max(clean(Math.ceil(hi / step) * step), clean(bottom + step));
				const k = Math.round((top - bottom) / step);
				if (k < 2 || k > most) continue;
				if (
					!best ||
					top - bottom < best.top - best.bottom ||
					(top - bottom === best.top - best.bottom && Math.abs(k - aim) < Math.abs(best.k - aim))
				)
					best = { step, bottom, top, k };
			}
		}
		const { step, bottom, top } = best ?? { step: 1, bottom: Math.floor(lo), top: Math.max(1, Math.ceil(hi)) };
		const ticks: number[] = [];
		for (let k = 0; clean(bottom + k * step) <= top; k++) ticks.push(clean(bottom + k * step));
		return { top, bottom, ticks };
	});
	/** The pixel row of a value: the top at 0, the bottom at plotH. */
	const yOf = (v: number) =>
		Math.round(((scale.top - v) / (scale.top - scale.bottom)) * plotH);

	// ---- Bars -------------------------------------------------------------

	// The first bar starts at the plot's start and the last ends at its end.
	const gap = $derived.by(() => {
		if (n < 2) return 0;
		const s = W / n;
		return s >= 12 ? 4 : s >= 6 ? 2 : s >= 3 ? 1 : 0;
	});
	const slot = $derived(n ? (W + gap) / n : W);
	const columns = $derived(
		items.map((_, i) => {
			let x = Math.round(i * slot);
			let w = Math.max(1, Math.round((i + 1) * slot - gap) - x);
			if (w > MAX_BAR) {
				x += Math.floor((w - MAX_BAR) / 2);
				w = MAX_BAR;
			}
			return { x, w };
		})
	);

	type Rect = { series: number; y: number; h: number };
	/** A bar's parts in pixel rows, a 1px gap between stacked parts. */
	function rects(i: number): Rect[] {
		return bars[i].parts.map((p) => {
			let y0: number;
			let y1: number;
			if (p.to > 0) {
				y0 = yOf(p.to);
				y1 = yOf(p.from);
				if (y1 - y0 < 1) y0 = y1 - 1;
				if (p.from > 0 && y1 - y0 >= 2) y1 -= 1;
			} else {
				// Under the zero line's own row.
				y0 = yOf(p.from) + 1;
				y1 = yOf(p.to) + 1;
				if (y1 - y0 < 1) y1 = y0 + 1;
				if (p.from < 0 && y1 - y0 >= 2) y0 += 1;
			}
			return { series: p.series, y: y0, h: y1 - y0 };
		});
	}

	// ---- Axes -------------------------------------------------------------

	const tickText = $derived(scale.ticks.map((t) => format(t)));
	const tickChars = $derived(Math.max(1, ...tickText.map((t) => t.length)));

	const axisText = (i: number) => items[i].axisLabel ?? items[i].label;
	/** Where a label sits in pixels: centred under its bar, held inside the plot. */
	function axisSpan(i: number): [number, number] {
		const c = columns[i];
		const w = axisText(i).length * AXIS_GLYPH;
		const left = Math.min(Math.max(0, c.x + c.w / 2 - w / 2), W - w);
		return [left, left + w];
	}
	// Every k-th axis label from the first, with k the first step whose
	// labels keep 8px apart where they really sit, the ends held inside the
	// plot. A divisor of the count comes first when one is close, so the
	// labels fall on round steps, such as every sixth hour of 24.
	const axisEvery = $derived.by(() => {
		if (n < 2) return 1;
		const widest = Math.max(...items.map((_, i) => axisText(i).length));
		const least = Math.max(1, Math.ceil((widest * AXIS_GLYPH + AXIS_GAP) / slot));
		const divisors: number[] = [];
		for (let k = least; k <= 2 * least && k <= n; k++) if (n % k === 0) divisors.push(k);
		const steps = AXIS_STEPS.filter((k) => k >= least);
		const fits = (k: number) => {
			let end = -Infinity;
			for (let i = 0; i < n; i += k) {
				if (!axisText(i)) continue;
				const [l, r] = axisSpan(i);
				if (l < end + AXIS_GAP) return false;
				end = r;
			}
			return true;
		};
		const found = [...divisors, ...steps].find(fits);
		if (found) return found;
		for (let k = least; k < n; k++) if (fits(k)) return k;
		return n;
	});
	const axis = $derived(
		items.flatMap((_, i) => {
			const text = axisText(i);
			if (i % axisEvery !== 0 || !text) return [];
			const c = columns[i];
			// The same place in CSS: `ch` is the label's own Geist Mono glyph,
			// so the clamp holds at any width before the first measurement.
			const centre = ((c.x + c.w / 2) / W) * 100;
			const ch = text.length;
			return [{ i, text, left: `clamp(0px, calc(${centre}% - ${ch / 2}ch), calc(100% - ${ch}ch))` }];
		})
	);

	// ---- Readout ----------------------------------------------------------

	// The bar a mouse or pen points at; the bar a tap or the keys chose.
	let hover = $state<number | null>(null);
	let pinned = $state<number | null>(null);
	let pinnedBy = $state<'touch' | 'keys' | null>(null);
	// What the status line says after an arrow key.
	let announcement = $state('');

	const within = (i: number | null) => (i !== null && i < n ? i : null);
	/** The bar the readout describes and the plot marks. */
	const active = $derived(within(hover) ?? within(pinned));
	/** With no bar chosen, the readout shows the last one, unmarked. */
	const shown = $derived(active ?? (n ? n - 1 : null));

	const text = (i: number, s: BarChartSeries) => format(value(i, s));
	const labelChars = $derived(Math.max(0, ...items.map((item) => item.label.length)));
	const valueChars = $derived(
		series.map((s) => Math.max(1, ...items.map((_, i) => text(i, s).length)))
	);
	const totalChars = $derived(Math.max(1, ...bars.map((b) => format(b.total).length)));

	function sentence(i: number): string {
		const parts = series.map((s) => `${s.label} ${text(i, s)}`);
		if (stacked) parts.push(`${totalLabel} ${format(bars[i].total)}`);
		return `${items[i].label}: ${parts.join(', ')}`;
	}

	function pin(i: number | null, by: 'touch' | 'keys') {
		if (i === null) return;
		pinned = i;
		pinnedBy = by;
	}

	/** The bar under a pointer, by its slot, gap included. */
	function indexAt(e: PointerEvent): number | null {
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		if (!n || r.width <= 0) return null;
		const x = ((e.clientX - r.left) / r.width) * W;
		return Math.min(n - 1, Math.max(0, Math.floor(x / slot)));
	}

	// Touch: a tap chooses a bar, and a sideways drag moves along the bars.
	// The plot lets the page scroll up and down (touch-action: pan-y), which
	// cancels the pointer, so a scroll never changes the readout.
	let touch: { id: number; x: number; scrubbing: boolean } | null = null;

	function onpointerdown(e: PointerEvent) {
		if (e.pointerType === 'touch') touch = { id: e.pointerId, x: e.clientX, scrubbing: false };
	}
	function onpointermove(e: PointerEvent) {
		if (e.pointerType !== 'touch') {
			hover = indexAt(e);
			return;
		}
		if (!touch || touch.id !== e.pointerId) return;
		if (!touch.scrubbing && Math.abs(e.clientX - touch.x) < 8) return;
		touch.scrubbing = true;
		pin(indexAt(e), 'touch');
	}
	function onpointerup(e: PointerEvent) {
		if (!touch || touch.id !== e.pointerId) return;
		pin(indexAt(e), 'touch');
		touch = null;
	}
	function onpointercancel(e: PointerEvent) {
		if (touch?.id === e.pointerId) touch = null;
	}
	function onpointerleave(e: PointerEvent) {
		if (e.pointerType !== 'touch') hover = null;
	}

	// Keys: the plot is one tab stop. Focus from the keyboard marks the bar
	// the readout shows; the arrows, Home and End move along the bars and
	// the status line says each one.
	function onfocus(e: FocusEvent) {
		if (!n || !(e.currentTarget as HTMLElement).matches(':focus-visible')) return;
		if (within(pinned) === null) pin(within(hover) ?? n - 1, 'keys');
	}
	function onblur() {
		if (pinnedBy === 'keys') {
			pinned = null;
			pinnedBy = null;
		}
		announcement = '';
	}
	function onkeydown(e: KeyboardEvent) {
		if (!n || e.altKey || e.ctrlKey || e.metaKey) return;
		const from = within(pinned) ?? within(hover) ?? n - 1;
		let to: number;
		if (e.key === 'ArrowLeft') to = Math.max(0, from - 1);
		else if (e.key === 'ArrowRight') to = Math.min(n - 1, from + 1);
		else if (e.key === 'Home') to = 0;
		else if (e.key === 'End') to = n - 1;
		else return;
		e.preventDefault();
		hover = null;
		pin(to, 'keys');
		announcement = sentence(to);
	}

	// A bar a tap chose stays in the readout until a tap lands outside the
	// chart.
	let root: HTMLDivElement | undefined = $state();
	$effect(() => {
		if (pinnedBy !== 'touch') return;
		const away = (e: PointerEvent) => {
			if (root && !root.contains(e.target as Node)) {
				pinned = null;
				pinnedBy = null;
			}
		};
		document.addEventListener('pointerdown', away, true);
		return () => document.removeEventListener('pointerdown', away, true);
	});
</script>

<!--
	Vertical bars, stacked by series, over a scale of hairlines (BRIEF, visual
	rules 1, 4 and 6). The readout above the plot is the legend: each series'
	swatch and name with its value for one bar, and the stacked total. It
	shows the bar a mouse points at, the bar a tap or the keys chose, and the
	last bar otherwise. Reserved widths keep every item in place as the
	values change. The plot is one tab stop (role group, named by `label`);
	the arrows, Home and End move along the bars and a visually hidden status
	line says each one. Every value is also in a visually hidden table. The
	readout and the drawing are aria-hidden. Bars and marks change at once:
	no motion on data changes or on pointing. Extra attributes and `class` go
	to the root.
-->
<div
	bind:this={root}
	{...rest}
	class={['hp-bar-chart', className]}
	data-active={active ?? undefined}
	data-stacked={stacked ? '' : undefined}
>
	<div class="hp-bar-chart-readout" aria-hidden="true">
		<span class="hp-bar-chart-readout-label" style:min-width="{labelChars}ch"
			>{shown === null ? '' : items[shown].label}</span
		>
		{#each series as s, si (s.key)}
			<span class="hp-bar-chart-key">
				<span
					class="hp-bar-chart-swatch"
					data-color={paints[si].color}
					data-tone={paints[si].tone}
				></span>
				<span class="hp-bar-chart-name">{s.label}</span>
				<span class="hp-bar-chart-value" style:min-width="{valueChars[si]}ch"
					>{shown === null ? '' : text(shown, s)}</span
				>
			</span>
		{/each}
		{#if stacked}
			<span class="hp-bar-chart-key">
				<span class="hp-bar-chart-name">{totalLabel}</span>
				<span class="hp-bar-chart-value" style:min-width="{totalChars}ch"
					>{shown === null ? '' : format(bars[shown].total)}</span
				>
			</span>
		{/if}
	</div>

	<div class="hp-bar-chart-figure">
		<div class="hp-bar-chart-scale" aria-hidden="true" style:width="{tickChars}ch">
			{#each scale.ticks as t, ti (t)}
				<span class="hp-bar-chart-tick" style:top="{((yOf(t) + 0.5) / H) * 100}%"
					>{tickText[ti]}</span
				>
			{/each}
		</div>
		<!--
			A named group that takes focus and keys is the plot's honest role: it
			holds no control, so `slider`, `listbox` or `application` would promise
			behaviour it lacks. One tab stop for the whole plot, not one per bar,
			because bars on a phone are narrower than a touch target.
		-->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
		<div
			class="hp-bar-chart-plot"
			role="group"
			tabindex="0"
			aria-label={label}
			aria-describedby={keysId}
			bind:clientWidth={boxWidth}
			bind:clientHeight={boxHeight}
			{onpointerdown}
			{onpointermove}
			{onpointerup}
			{onpointercancel}
			{onpointerleave}
			{onfocus}
			{onblur}
			{onkeydown}
		>
			<svg aria-hidden="true" focusable="false" viewBox="0 0 {W} {H}" preserveAspectRatio="none">
				{#if active !== null}
					<rect
						class="hp-bar-chart-tint"
						x={columns[active].x}
						y="0"
						width={columns[active].w}
						height={plotH + 1}
					/>
				{/if}
				{#each scale.ticks as t (t)}
					<rect class="hp-bar-chart-rule" x="0" y={yOf(t)} width={W} height="1" />
				{/each}
				{#each columns as c, i (i)}
					<g class="hp-bar-chart-bar" data-index={i} data-active={i === active ? '' : undefined}>
						{#each rects(i) as r (r.series)}
							<rect
								class="hp-bar-chart-part"
								data-series={series[r.series].key}
								data-color={paints[r.series].color}
								data-tone={paints[r.series].tone}
								x={c.x}
								y={r.y}
								width={c.w}
								height={r.h}
							/>
						{/each}
					</g>
				{/each}
				{#if active !== null}
					<rect
						class="hp-bar-chart-mark"
						x={columns[active].x}
						y={plotH + 2}
						width={columns[active].w}
						height="3"
					/>
				{/if}
			</svg>
		</div>
		<div class="hp-bar-chart-axis" aria-hidden="true">
			{#each axis as a (a.i)}
				<span class="hp-bar-chart-tick" style:left={a.left}>{a.text}</span>
			{/each}
		</div>
	</div>

	<span id={keysId} hidden>{keysText}</span>
	<p class="hp-visually-hidden" role="status">{announcement}</p>

	<!-- A table box ignores a 1px width, so the hidden box is a div around it. -->
	<div class="hp-visually-hidden">
		<table>
			<caption>{label}</caption>
			<thead>
				<tr>
					<td></td>
					{#each series as s (s.key)}
						<th scope="col">{s.label}</th>
					{/each}
					{#if stacked}
						<th scope="col">{totalLabel}</th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each items as item, i (i)}
					<tr>
						<th scope="row">{item.label}</th>
						{#each series as s (s.key)}
							<td>{text(i, s)}</td>
						{/each}
						{#if stacked}
							<td>{format(bars[i].total)}</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	/* The chart fills the width it is given; the app sets a narrower one. */
	.hp-bar-chart {
		position: relative;
		display: grid;
		gap: var(--space-4);
		min-width: 0;
	}

	/* ---- Readout: the legend with one bar's values --------------------- */

	/* 16px on touch, the dense 14px on fine pointers. Each key keeps its
	   width whichever bar it shows, so nothing moves as the values change. */
	.hp-bar-chart-readout {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-1) var(--space-4);
		font-size: var(--type-body);
		line-height: 24px;
	}
	@media (pointer: fine) {
		.hp-bar-chart-readout {
			font-size: var(--type-dense);
			line-height: 20px;
		}
	}
	.hp-bar-chart-readout-label,
	.hp-bar-chart-value {
		font-family: var(--mono);
		font-variant-numeric: tabular-nums;
		color: var(--text);
		white-space: nowrap;
	}
	.hp-bar-chart-key {
		display: inline-flex;
		align-items: baseline;
		gap: var(--space-2);
		min-width: 0;
	}
	/* Series names stay as written: they may be user data. */
	.hp-bar-chart-name {
		min-width: 0;
		color: var(--muted);
		overflow-wrap: anywhere;
	}
	.hp-bar-chart-swatch {
		flex: none;
		align-self: center;
		width: 8px;
		height: 8px;
		background: var(--hp-paint);
	}

	/* ---- Plot ---------------------------------------------------------- */

	/* The scale column, the bars, and the axis labels under the bars. The
	   app sets the plot's height with --bar-chart-height (default 160px).
	   The drawing runs left to right in every direction, as the arrow keys
	   and the pointer read it; the readout follows the page. */
	.hp-bar-chart-figure {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		grid-template-rows: var(--bar-chart-height, 160px) auto;
		column-gap: var(--space-2);
		row-gap: var(--space-1);
		direction: ltr;
	}

	/* Geist Mono in the muted ink with tabular figures. */
	.hp-bar-chart-scale,
	.hp-bar-chart-axis {
		position: relative;
		font-family: var(--mono);
		font-size: var(--type-label);
		line-height: 16px;
		font-variant-numeric: tabular-nums;
		color: var(--muted);
	}
	.hp-bar-chart-tick {
		position: absolute;
		white-space: nowrap;
	}
	/* Each scale label sits on its hairline, against the plot. */
	.hp-bar-chart-scale .hp-bar-chart-tick {
		right: 0;
		transform: translateY(-50%);
	}
	.hp-bar-chart-axis {
		grid-column: 2;
		height: 16px;
	}
	.hp-bar-chart-axis .hp-bar-chart-tick {
		top: 0;
	}

	/* One tab stop with the focus contour from base.css. Pointing never
	   selects text, and the page still scrolls up and down from it. */
	.hp-bar-chart-plot {
		position: relative;
		min-width: 0;
		touch-action: pan-y;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}
	.hp-bar-chart-plot svg {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
		shape-rendering: crispEdges;
	}

	/* Hairlines in --border; the active bar takes the selected tint over
	   the plot's height and a 3px titanium edge under the zero line. */
	.hp-bar-chart-rule {
		fill: var(--border);
	}
	.hp-bar-chart-tint {
		fill: var(--surface-selected);
	}
	.hp-bar-chart-mark {
		fill: var(--accent);
	}
	.hp-bar-chart-part {
		fill: var(--hp-paint);
	}

	/* Colour comes through CSS, because SVG presentation attributes do not
	   read custom properties. Categories for data, the inks, or a status hue
	   where a series means that status. */
	.hp-bar-chart [data-color='category-1'] {
		--hp-paint: var(--category-1);
	}
	.hp-bar-chart [data-color='category-2'] {
		--hp-paint: var(--category-2);
	}
	.hp-bar-chart [data-color='category-3'] {
		--hp-paint: var(--category-3);
	}
	.hp-bar-chart [data-color='category-4'] {
		--hp-paint: var(--category-4);
	}
	.hp-bar-chart [data-color='category-5'] {
		--hp-paint: var(--category-5);
	}
	.hp-bar-chart [data-color='text'] {
		--hp-paint: var(--text);
	}
	.hp-bar-chart [data-color='muted'] {
		--hp-paint: var(--muted);
	}
	.hp-bar-chart [data-tone='ok'] {
		--hp-paint: var(--ok);
	}
	.hp-bar-chart [data-tone='warn'] {
		--hp-paint: var(--warn);
	}
	.hp-bar-chart [data-tone='danger'] {
		--hp-paint: var(--danger);
	}
</style>
